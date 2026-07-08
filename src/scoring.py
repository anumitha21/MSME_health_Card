"""
Core inference logic for the MSME Health Card (v3.2 — XGBoost + SHAP + Rules + ULI Coaching).

Used by:
    - FastAPI (api/main.py)
    - Batch Evaluation (training/evaluate_models_v3.py)

Single source of truth for business scoring.
"""

from functools import lru_cache
from typing import Optional

import joblib
import numpy as np
import pandas as pd
import shap

from src.config import (
    FEATURE_GROUPS,
    FUSION_WEIGHTS,
    RISK_TIERS,
    model_path,
    assign_confidence_tier,
    add_interaction_features,
    add_global_encoded_features,
    SEGMENT_MAP,
    SECTOR_MAP,
)
from src.rules import evaluate_rules, make_decision


# -----------------------------------------------------------
# Load models + SHAP explainers once (per process)
# -----------------------------------------------------------

@lru_cache(maxsize=1)
def load_artifacts():
    models    = {}
    explainers = {}

    for pillar in FEATURE_GROUPS:
        m = joblib.load(model_path(pillar))
        models[pillar]     = m
        explainers[pillar] = shap.TreeExplainer(m)

    return models, explainers


# -----------------------------------------------------------
# Risk Tier
# -----------------------------------------------------------

def assign_risk(score: Optional[float]) -> str:
    if score is None:
        return "Unscoreable"
    for threshold, label in RISK_TIERS:
        if score >= threshold:
            return label
    return RISK_TIERS[-1][1]


# -----------------------------------------------------------
# Feature preparation (single record dict → DataFrame row)
# -----------------------------------------------------------

def _prepare_record_df(record: dict) -> pd.DataFrame:
    df = pd.DataFrame([record])

    # Encode segment / sector if present as strings
    if "segment" in df.columns:
        df["segment_encoded"] = df["segment"].map(SEGMENT_MAP).fillna(-1).astype(int)
    else:
        df["segment_encoded"] = -1

    if "sector" in df.columns:
        df["sector_encoded"] = df["sector"].map(SECTOR_MAP).fillna(-1).astype(int)
    else:
        df["sector_encoded"] = -1

    df = add_interaction_features(df)
    return df


# -----------------------------------------------------------
# Score + Explain one pillar
# -----------------------------------------------------------

def score_and_explain_pillar(
    record_df: pd.DataFrame,
    pillar: str,
    model,
    explainer,
    top_n: int = 5,
) -> tuple[Optional[float], list[dict]]:
    cfg              = FEATURE_GROUPS[pillar]
    availability_flag = cfg["availability_flag"]
    features         = cfg["features"]

    raw = record_df.iloc[0].to_dict()
    if raw.get(availability_flag, 0) != 1:
        return None, []

    X = record_df[features].apply(pd.to_numeric, errors="coerce")

    default_prob = model.predict_proba(X)[0][1]
    health_score = round(float((1 - default_prob) * 100), 1)

    if explainer is None:
        return health_score, []

    # SHAP values
    shap_vals = explainer.shap_values(X)
    if isinstance(shap_vals, list):
        sv = np.array(shap_vals[1])[0]
    else:
        sv = np.array(shap_vals)[0]

    health_impact = -sv * 100   # flip sign: higher = healthier contribution

    feature_impacts = sorted(
        zip(features, health_impact),
        key=lambda x: abs(x[1]),
        reverse=True,
    )[:top_n]

    drivers = []
    for feat, impact in feature_impacts:
        if abs(impact) < 0.01:
            continue
        drivers.append({
            "feature": feat,
            "impact":  round(float(impact), 2),
            "type":    "Positive Driver" if impact >= 0 else "Negative Driver",
        })

    return health_score, drivers


# -----------------------------------------------------------
# Aggregate cross-pillar drivers
# -----------------------------------------------------------

def _aggregate_drivers(
    pillar_drivers: dict[str, list[dict]],
    pillar_weights: dict[str, float],
    top_n: int = 6,
) -> list[dict]:
    total_weight = sum(pillar_weights.values()) or 1.0
    merged: dict[str, float] = {}

    for pillar, drivers in pillar_drivers.items():
        w = pillar_weights.get(pillar, 0) / total_weight
        for d in drivers:
            key    = d["feature"]
            impact = d["impact"] * w
            merged[key] = merged.get(key, 0.0) + impact

    sorted_drivers = sorted(merged.items(), key=lambda x: abs(x[1]), reverse=True)

    return [
        {
            "feature": feat,
            "impact":  round(impact, 2),
            "type":    "Positive Driver" if impact >= 0 else "Negative Driver",
        }
        for feat, impact in sorted_drivers[:top_n]
    ]


# -----------------------------------------------------------
# Confidence Band Calculation
# -----------------------------------------------------------

def compute_confidence_band(tier: str) -> tuple[float, float]:
    """
    Returns (low_offset, high_offset) for the score based on data completeness.
    Allows plotting confidence intervals (bands) around the score.
    """
    if tier == "Gold":
        return -3.0, 3.0
    elif tier == "Silver":
        return -6.0, 6.0
    elif tier == "Bronze":
        return -10.0, 10.0
    else:
        return -15.0, 15.0


# -----------------------------------------------------------
# Borrower Coaching Logic
# -----------------------------------------------------------

def generate_coaching_recommendations(record: dict, key_drivers: list[dict]) -> list[dict]:
    """
    Generates borrower-friendly, actionable suggestions to improve
    their MSME credit score, sorted by potential score boost.
    """
    recommendations = []

    # Map negative drivers
    neg_drivers = {d["feature"]: d["impact"] for d in key_drivers if d["type"] == "Negative Driver"}

    # 1. GST Compliance recommendation
    if record.get("gst_registered") == 1:
        late_filings = record.get("gst_late_filing_count_12m")
        late_filings = 0 if late_filings is None else late_filings
        if late_filings > 0:
            impact = abs(neg_drivers.get("gst_late_filing_count_12m", -5.0))
            lift = round(impact * 0.8, 1)
            recommendations.append({
                "pillar": "GST",
                "title": "Ensure timely GST filing",
                "recommendation": f"Avoid filing GST late. You had {int(late_filings)} late filing(s) in the last 12 months. File GSTR-3B on time for 3 consecutive months to gain +{lift} points.",
                "estimated_lift": lift,
            })
        consistency = record.get("gst_filing_consistency_pct")
        consistency = 100 if consistency is None else consistency
        if consistency < 90:
            impact = abs(neg_drivers.get("gst_filing_consistency_pct", -4.0))
            lift = round(impact * 0.9, 1)
            recommendations.append({
                "pillar": "GST",
                "title": "Maintain consistent GST returns",
                "recommendation": f"Your GST filing consistency is currently at {consistency}%. Target filing every single reporting period to gain +{lift} points.",
                "estimated_lift": lift,
            })

    # 2. UPI Cash Flow recommendation
    if record.get("upi_available") == 1:
        bounce_rate = record.get("upi_bounce_rate_pct")
        bounce_rate = 0 if bounce_rate is None else bounce_rate
        if bounce_rate > 3.0:
            impact = abs(neg_drivers.get("upi_bounce_rate_pct", -6.0))
            lift = round(impact * 1.2, 1)
            recommendations.append({
                "pillar": "UPI",
                "title": "Minimize payment bounces",
                "recommendation": f"Your transaction bounce rate is {bounce_rate}%. Keep sufficient balance to prevent failed auto-debits and customer bounces to gain +{lift} points.",
                "estimated_lift": lift,
            })
        volatility = record.get("upi_inflow_volatility")
        volatility = 0 if volatility is None else volatility
        if volatility > 0.4:
            impact = abs(neg_drivers.get("upi_inflow_volatility", -3.0))
            lift = round(impact * 0.7, 1)
            recommendations.append({
                "pillar": "UPI",
                "title": "Stabilize monthly inflows",
                "recommendation": f"Encourage clients to split bulk payments into predictable weekly or monthly receipts to reduce cash flow volatility to gain +{lift} points.",
                "estimated_lift": lift,
            })

    # 3. Account Aggregator Bank balance / leverage
    if record.get("aa_consent_given") == 1:
        od_util = record.get("aa_overdraft_utilization_pct")
        od_util = 0 if od_util is None else od_util
        if od_util > 60:
            impact = abs(neg_drivers.get("aa_overdraft_utilization_pct", -8.0))
            lift = round(impact * 1.1, 1)
            recommendations.append({
                "pillar": "AA",
                "title": "Reduce overdraft utilization",
                "recommendation": f"Your OD utilization is high ({od_util}%). Try to keep it below 50% to show lenders you have comfortable liquidity room to gain +{lift} points.",
                "estimated_lift": lift,
            })
        emi_ratio = record.get("aa_emi_to_inflow_ratio")
        emi_ratio = 0 if emi_ratio is None else emi_ratio
        if emi_ratio > 0.35:
            impact = abs(neg_drivers.get("aa_emi_to_inflow_ratio", -7.0))
            lift = round(impact * 1.0, 1)
            recommendations.append({
                "pillar": "AA",
                "title": "Rationalize debt commitments",
                "recommendation": f"Monthly EMIs represent {round(emi_ratio*100)}% of bank inflow. Avoid taking fresh debt until current loan principal is partly reduced to gain +{lift} points.",
                "estimated_lift": lift,
            })
        cash_flow = record.get("aa_cash_flow_ratio")
        cash_flow = 1.5 if cash_flow is None else cash_flow
        if cash_flow < 1.1:
            impact = abs(neg_drivers.get("aa_cash_flow_ratio", -4.0))
            lift = round(impact * 0.8, 1)
            recommendations.append({
                "pillar": "AA",
                "title": "Improve cash surplus ratio",
                "recommendation": f"Cash flow coverage ratio ({cash_flow}) is tight. Optimize collection terms with suppliers to increase liquid reserves to gain +{lift} points.",
                "estimated_lift": lift,
            })

    # 4. EPFO Employment stability
    if record.get("epfo_registered") == 1:
        contrib = record.get("epfo_contribution_consistency_pct")
        contrib = 100 if contrib is None else contrib
        if contrib < 95:
            impact = abs(neg_drivers.get("epfo_contribution_consistency_pct", -5.0))
            lift = round(impact * 1.0, 1)
            recommendations.append({
                "pillar": "EPFO",
                "title": "Clear EPFO dues strictly",
                "recommendation": f"EPFO deposit consistency is {contrib}%. Timely social security payments to staff are critical to prove operational stability to gain +{lift} points.",
                "estimated_lift": lift,
            })

    # If no negative drivers are identified, provide positive reinforcement
    if not recommendations:
        recommendations.append({
            "pillar": "ALL",
            "title": "Excel in alternate credit",
            "recommendation": "Great work! All metrics are showing healthy levels. Continue filing GST, routing receipts via UPI, and maintaining liquidity to secure lower loan rates.",
            "estimated_lift": 0.0,
        })

    # Sort by descending potential lift
    recommendations = sorted(recommendations, key=lambda x: x["estimated_lift"], reverse=True)
    return recommendations[:3]


# -----------------------------------------------------------
# Full business score (public entry point)
# -----------------------------------------------------------

def score_business(record: dict, explain: bool = True) -> dict:
    models, explainers = load_artifacts()

    # ── Autoencoder Imputation & Self-Supervised Embedding ──
    embedding = []
    if explain:
        from src.imputation import impute_and_embed
        # Compute the self-supervised embedding
        _, embedding = impute_and_embed(record)

    # Pass the raw record (with NaNs intact) to maximize XGBoost native split AUC
    record_df = _prepare_record_df(record)

    pillar_scores   = {}
    pillar_drivers  = {}
    pillar_weights  = {}
    available_pillars = []

    for pillar in FEATURE_GROUPS:
        score, drivers = score_and_explain_pillar(
            record_df,
            pillar,
            models[pillar],
            explainers[pillar] if explain else None,
        )

        pillar_scores[pillar] = score

        if score is not None:
            available_pillars.append(pillar)
            pillar_weights[pillar] = FUSION_WEIGHTS[pillar]
            pillar_drivers[pillar] = drivers

    # ── Fusion ──────────────────────────────────────────────────
    if not pillar_weights:
        overall_score = None
        confidence    = "0/4 sources available"
    else:
        total = sum(pillar_weights.values())
        overall_score = round(
            sum(pillar_scores[p] * pillar_weights[p] / total for p in pillar_weights),
            1,
        )
        confidence = f"{len(pillar_weights)}/4 sources available"

    # ── Confidence tier & bands ─────────────────────────────────
    confidence_tier = assign_confidence_tier(available_pillars)
    low_offset, high_offset = compute_confidence_band(confidence_tier)

    # ── Aggregated cross-pillar drivers ─────────────────────────
    key_drivers = (
        _aggregate_drivers(pillar_drivers, pillar_weights)
        if explain
        else []
    )

    # ── Rule engine ─────────────────────────────────────────────
    triggered_rules = evaluate_rules(record)
    decision        = make_decision(overall_score, triggered_rules)

    # ── Borrower Coaching recommendations ────────────────────────
    recommendations = generate_coaching_recommendations(record, key_drivers)

    return {
        "gst_score":       pillar_scores["gst"],
        "upi_score":       pillar_scores["upi"],
        "aa_score":        pillar_scores["aa"],
        "epfo_score":      pillar_scores["epfo"],
        "overall_score":   overall_score,
        "score_range_low":  round(max(overall_score + low_offset, 0), 1) if overall_score is not None else None,
        "score_range_high": round(min(overall_score + high_offset, 100), 1) if overall_score is not None else None,
        "risk_tier":       assign_risk(overall_score),
        "data_confidence": confidence,
        "confidence_tier": confidence_tier,
        "key_drivers":     key_drivers,
        "triggered_rules": triggered_rules,
        "decision":        decision,
        "recommendations": recommendations,
        "self_supervised_embedding": embedding,
    }


# -----------------------------------------------------------
# Data Completeness Gap Insight
# -----------------------------------------------------------

def get_completeness_gap(enterprise_id: str) -> dict:
    """
    Identifies missing data modalities for a given enterprise, simulates
    connecting each missing source using autoencoder reconstruction,
    and returns projected tiers, scores, and interval deltas.
    """
    from src.config import DATASET_PATH
    
    df = pd.read_csv(DATASET_PATH)
    record_row = df[df["enterprise_id"] == enterprise_id]
    if record_row.empty:
        return {"error": f"Enterprise {enterprise_id} not found."}
        
    raw_record = record_row.iloc[0].to_dict()
    record = {k: (None if pd.isna(v) else v) for k, v in raw_record.items()}
    
    # Cast flags to integers if present
    for flag in ["gst_registered", "upi_available", "aa_consent_given", "epfo_registered"]:
        if flag in record and record[flag] is not None:
            record[flag] = int(float(record[flag]))

    # Get current scores
    current_res = score_business(record, explain=False)
    current_score = current_res["overall_score"]
    current_tier = current_res["confidence_tier"]
    
    # Calculate confidence interval from band offsets
    current_low_offset, _ = compute_confidence_band(current_tier)
    current_ci = abs(current_low_offset)

    if current_tier == "Gold":
        return {
            "enterprise_id": enterprise_id,
            "current_tier": "Gold",
            "current_score": current_score,
            "current_confidence_interval": current_ci,
            "gaps": [],
            "message": "All data sources connected — you're at the highest confidence tier."
        }

    pillars = ["gst", "upi", "aa", "epfo"]
    flags = {
        "gst": "gst_registered",
        "upi": "upi_available",
        "aa": "aa_consent_given",
        "epfo": "epfo_registered"
    }
    
    missing_pillars = [p for p in pillars if record.get(flags[p], 0) != 1]
    
    from src.imputation import impute_and_embed
    gaps = []
    
    for s in missing_pillars:
        sim_record = record.copy()
        # Mark modality as present
        sim_record[flags[s]] = 1
        
        # Reconstruct missing features via the autoencoder
        imputed_sim_record, _ = impute_and_embed(sim_record)
        
        # Score the imputed record
        sim_res = score_business(imputed_sim_record, explain=False)
        projected_score = sim_res["overall_score"]
        projected_tier = sim_res["confidence_tier"]
        
        projected_low_offset, _ = compute_confidence_band(projected_tier)
        projected_ci = abs(projected_low_offset)
        
        estimated_point_gain = round(projected_score - current_score, 1)
        
        if estimated_point_gain <= 0:
            continue
            
        source_display_names = {
            "gst": "GST",
            "upi": "UPI",
            "aa": "Account Aggregator",
            "epfo": "EPFO"
        }
        source_name = source_display_names[s]
        
        message = (
            f"Connecting {source_name} could move you from {current_tier} to {projected_tier} tier "
            f"and may increase your score by an estimated +{estimated_point_gain:.1f} points, "
            f"tightening your confidence range from ±{int(current_ci)} to ±{int(projected_ci)}."
        )
        
        gaps.append({
            "missing_source": s.upper(),
            "projected_tier": projected_tier,
            "projected_score": projected_score,
            "projected_confidence_interval": projected_ci,
            "estimated_point_gain": estimated_point_gain,
            "message": message
        })
        
    gaps.sort(key=lambda x: x["estimated_point_gain"], reverse=True)
    
    res = {
        "enterprise_id": enterprise_id,
        "current_tier": current_tier,
        "current_score": current_score,
        "current_confidence_interval": current_ci,
        "gaps": gaps
    }
    
    if not gaps:
        res["message"] = "No further score improvements are projected from additional data source connections."
        
    return res