"""
Early Warning System (EWS) / Financial Trend Analytics.

Loads the synthetic 3-period trend data and computes MoM velocity
for each enterprise. Returns a structured trend report with:
  - Metric-level change (T-60→T-30 vs T-90→T-60)
  - Alert flags for significant deterioration
  - Overall trend label: "Upward Trend" / "Stable" / "Deteriorating"
"""

from functools import lru_cache
from typing import Optional

import pandas as pd
import numpy as np

from src.config import TREND_DATA_PATH


# -----------------------------------------------------------------
# Load trend data once (cached)
# -----------------------------------------------------------------

@lru_cache(maxsize=1)
def _load_trend_data() -> pd.DataFrame:
    try:
        df = pd.read_csv(TREND_DATA_PATH)
        return df
    except FileNotFoundError:
        return pd.DataFrame()


# -----------------------------------------------------------------
# Trend thresholds
# -----------------------------------------------------------------

ALERT_THRESHOLDS = {
    "upi_monthly_txn_count": -0.20,    # -20% MoM decline = alert
    "upi_avg_inflow_inr":    -0.20,    # -20% MoM decline = alert
    "aa_trade_payable_days": +0.30,    # +30% MoM increase = alert (worsening)
    "aa_cash_flow_ratio":    -0.15,    # -15% MoM decline = alert
}

METRIC_LABELS = {
    "upi_monthly_txn_count": "UPI Transaction Count",
    "upi_avg_inflow_inr":    "UPI Avg Inflow (INR)",
    "aa_trade_payable_days": "Trade Payable Days",
    "aa_cash_flow_ratio":    "Cash Flow Ratio",
}


def _pct_change(old: float, new: float) -> Optional[float]:
    if pd.isna(old) or pd.isna(new) or old == 0:
        return None
    return round((new - old) / abs(old), 4)


# -----------------------------------------------------------------
# Public API
# -----------------------------------------------------------------

def compute_trend(enterprise_id: str) -> dict:
    """
    Compute EWS trend report for a single enterprise, re-scoring monthly feeds
    historically to evaluate score drift, and flagging Early Warning Signals (EWS) 
    using the Gemini API.
    """
    from src.config import DATASET_PATH
    from src.scoring import score_business
    from src.explain import generate_ews_justification

    df = _load_trend_data()

    if df.empty:
        return {
            "enterprise_id": enterprise_id,
            "trend_flag":    "Stable",
            "alert_flags":   [],
            "metrics":       {},
            "data_available":False,
            "score_history": [],
            "score_drift":   0.0,
            "ews_status":    "Green",
            "ews_justification": "Trend data not available.",
            "message":       "Trend data not loaded. Run data/generate_trend_data.py first.",
        }

    ent_df = df[df["enterprise_id"] == enterprise_id].copy()

    if ent_df.empty:
        return {
            "enterprise_id": enterprise_id,
            "trend_flag":    "Stable",
            "alert_flags":   [],
            "metrics":       {},
            "data_available":False,
            "score_history": [],
            "score_drift":   0.0,
            "ews_status":    "Green",
            "ews_justification": f"No trend data found for enterprise {enterprise_id}.",
            "message":       f"No trend data found for enterprise {enterprise_id}.",
        }

    # Pivot to period-indexed view
    ent_df = ent_df.set_index("period")
    period_order = ["T-90", "T-60", "T-30"]
    ent_df = ent_df.reindex(period_order)

    # ── Load baseline record for historical score simulation ──
    try:
        base_df = pd.read_csv(DATASET_PATH)
        base_row = base_df[base_df["enterprise_id"] == enterprise_id]
        if base_row.empty:
            base_record = {}
        else:
            raw_rec = base_row.iloc[0].to_dict()
            base_record = {k: (None if pd.isna(v) else v) for k, v in raw_rec.items()}
            # Cast flags to integers if present
            for flag in ["gst_registered", "upi_available", "aa_consent_given", "epfo_registered"]:
                if flag in base_record and base_record[flag] is not None:
                    base_record[flag] = int(float(base_record[flag]))
    except Exception:
        base_record = {}

    metrics_output = {}
    alert_flags    = []
    deterioration_count = 0
    improvement_count   = 0

    for col, threshold in ALERT_THRESHOLDS.items():
        if col not in ent_df.columns:
            continue

        v90 = ent_df.loc["T-90", col] if "T-90" in ent_df.index else np.nan
        v60 = ent_df.loc["T-60", col] if "T-60" in ent_df.index else np.nan
        v30 = ent_df.loc["T-30", col] if "T-30" in ent_df.index else np.nan

        # Most recent 30-day change (T-60 → T-30)
        mom_30d = _pct_change(v60, v30)

        metrics_output[col] = {
            "label":       METRIC_LABELS[col],
            "T-90":        round(float(v90), 2) if not pd.isna(v90) else None,
            "T-60":        round(float(v60), 2) if not pd.isna(v60) else None,
            "T-30":        round(float(v30), 2) if not pd.isna(v30) else None,
            "mom_30d_pct": round(mom_30d * 100, 1) if mom_30d is not None else None,
        }

        if mom_30d is not None:
            # For payable days: increasing is bad (positive threshold)
            # For others:       decreasing is bad (negative threshold)
            alert_triggered = (
                mom_30d <= threshold if threshold < 0 else mom_30d >= threshold
            )

            if alert_triggered:
                pct_display = f"{mom_30d * 100:+.1f}%"
                alert_flags.append({
                    "metric":     METRIC_LABELS[col],
                    "change_pct": round(mom_30d * 100, 1),
                    "message":    f"{METRIC_LABELS[col]} changed {pct_display} MoM (alert threshold: {threshold*100:+.0f}%)",
                })
                deterioration_count += 1
            elif (threshold < 0 and mom_30d > 0.05) or (threshold > 0 and mom_30d < -0.05):
                improvement_count += 1

    # ── Simulate historical scores ──
    score_history = []
    if base_record:
        for period in ["T-90", "T-60", "T-30"]:
            sim_record = base_record.copy()
            # Overlay historical snapshot values
            if period in ent_df.index:
                for col in ["upi_monthly_txn_count", "upi_avg_inflow_inr", "aa_trade_payable_days", "aa_cash_flow_ratio"]:
                    if col in ent_df.columns:
                        val = ent_df.loc[period, col]
                        if not pd.isna(val):
                            sim_record[col] = float(val)
            
            # Recalculate interaction features and run scorer
            try:
                res = score_business(sim_record, explain=False)
                score_val = res.get("overall_score")
                if score_val is not None:
                    score_history.append({"period": period, "score": score_val})
            except Exception as e:
                print(f"Failed to score historical record for {period}: {e}")

    # Compute score drift
    score_drift = 0.0
    if len(score_history) >= 2:
        score_drift = round(score_history[-1]["score"] - score_history[0]["score"], 1)

    # ── EWS Status Classification ──
    # Check for severe MoM metric declines
    has_critical_drop = False
    has_mild_drop = False
    is_default = int(base_record.get("default_flag", 0))
    if not is_default and not ent_df.empty:
        is_default = int(ent_df["default_flag"].iloc[0]) if "default_flag" in ent_df.columns else 0

    for col, threshold in ALERT_THRESHOLDS.items():
        v60 = ent_df.loc["T-60", col] if "T-60" in ent_df.index else np.nan
        v30 = ent_df.loc["T-30", col] if "T-30" in ent_df.index else np.nan
        mom_30d = _pct_change(v60, v30)
        
        if mom_30d is not None:
            if threshold < 0:
                if mom_30d <= -0.30:  # Drop of 30% or more
                    has_critical_drop = True
                elif mom_30d <= -0.15:
                    has_mild_drop = True
            else:
                if mom_30d >= 0.40:   # Surged 40% or more (worsened)
                    has_critical_drop = True
                elif mom_30d >= 0.20:
                    has_mild_drop = True

    if score_drift <= -10.0 or is_default == 1 or has_critical_drop:
        ews_status = "Red"
    elif score_drift <= -5.0 or has_mild_drop:
        ews_status = "Yellow"
    else:
        ews_status = "Green"

    # ── Call Gemini to generate audit-ready EWS justification ──
    loan_amount = "15,00,000"
    if base_record:
        seg = base_record.get("segment", "Micro")
        if seg == "Medium":
            loan_amount = "75,00,000"
        elif seg == "Small":
            loan_amount = "25,00,000"
        else:
            loan_amount = "10,00,000"

    trend_summary = {
        "enterprise_id": enterprise_id,
        "sector": base_record.get("sector", "Unknown") if base_record else "Unknown",
        "segment": base_record.get("segment", "Unknown") if base_record else "Unknown",
        "loan_amount": loan_amount,
        "score_history": score_history,
        "score_drift": score_drift,
        "metrics": metrics_output,
        "ews_status": ews_status
    }
    
    ews_justification = generate_ews_justification(trend_summary, score_history)

    # Determine trend flag based on score drift
    if score_drift <= -5.0:
        trend_flag = "Deteriorating"
    elif score_drift >= 5.0:
        trend_flag = "Upward Trend"
    else:
        trend_flag = "Stable"

    return {
        "enterprise_id":  enterprise_id,
        "trend_flag":     trend_flag,
        "alert_flags":    alert_flags,
        "metrics":        metrics_output,
        "data_available": True,
        "score_history":  score_history,
        "score_drift":    score_drift,
        "ews_status":     ews_status,
        "ews_justification": ews_justification,
    }
