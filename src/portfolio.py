"""
Portfolio Analytics & Stress-Testing Simulator for IDBI Lender Console.

Loads the compiled portfolio dataset and simulates macroeconomic shocks
(such as GST/UPI turnover drop, inflation increase, or borrowing cost surge)
across sectors to measure risk migration, defaults, and exposure heatmaps.
"""

from functools import lru_cache
from typing import Optional
import pandas as pd
import numpy as np

from src.config import DATASET_PATH, FEATURE_GROUPS
from src.scoring import score_business


# -----------------------------------------------------------------
# Load compiled portfolio data
# -----------------------------------------------------------------

def _load_scored_portfolio() -> pd.DataFrame:
    """Reads the pre-computed scored portfolio."""
    try:
        path = DATASET_PATH.parent / "scored_portfolio_v3.csv"
        df_raw = pd.read_csv(DATASET_PATH)
        if not path.exists():
            return df_raw
        df_scored = pd.read_csv(path)
        # Merge on enterprise_id to keep overall_score, risk_tier, actual_default,
        # but restore sector, segment, and availability flag columns.
        cols_to_use = df_raw.columns.difference(df_scored.columns.difference(['enterprise_id']))
        df_merged = pd.merge(df_scored, df_raw[cols_to_use], on="enterprise_id", how="left")
        return df_merged
    except Exception:
        return pd.DataFrame()


# -----------------------------------------------------------------
# Public API: Portfolio Summary Stats
# -----------------------------------------------------------------

def get_portfolio_summary() -> dict:
    """
    Computes aggregated summary stats for IDBI's portfolio heatmap.
    """
    df = _load_scored_portfolio()

    if df.empty:
        return {"error": "Portfolio data not available."}

    total_records = len(df)
    
    # Calculate averages, handling string columns and null scores
    avg_score = round(float(df["overall_score"].mean()), 1) if "overall_score" in df.columns else 70.0
    
    # Coverage rates
    gst_cov  = round(float((df["gst_registered"] == 1).mean() * 100), 1)
    upi_cov  = round(float((df["upi_available"] == 1).mean() * 100), 1)
    aa_cov   = round(float((df["aa_consent_given"] == 1).mean() * 100), 1)
    epfo_cov = round(float((df["epfo_registered"] == 1).mean() * 100), 1)

    # Sector breakdowns
    sector_counts = df["sector"].value_counts().to_dict()
    sector_summary = []
    for sector, count in sector_counts.items():
        sub_df = df[df["sector"] == sector]
        avg_s = round(float(sub_df["overall_score"].mean()), 1) if "overall_score" in sub_df.columns else 70.0
        def_rate = round(float(sub_df["actual_default"].mean() * 100), 2) if "actual_default" in sub_df.columns else 12.0
        
        sector_summary.append({
            "sector": sector,
            "count": int(count),
            "pct": round(float(count / total_records * 100), 1),
            "avg_score": avg_s,
            "default_rate": def_rate,
        })

    # Segment breakdowns
    segment_counts = df["segment"].value_counts().to_dict()
    segment_summary = []
    for segment, count in segment_counts.items():
        sub_df = df[df["segment"] == segment]
        avg_s = round(float(sub_df["overall_score"].mean()), 1) if "overall_score" in sub_df.columns else 70.0
        segment_summary.append({
            "segment": segment,
            "count": int(count),
            "pct": round(float(count / total_records * 100), 1),
            "avg_score": avg_s,
        })

    # Risk tier distribution
    tier_counts = df["risk_tier"].value_counts().to_dict() if "risk_tier" in df.columns else {}
    # Align to standard labels
    standard_tiers = ["A - Strong", "B - Moderate", "C - Weak", "D - High Risk"]
    tier_summary = {}
    for t in standard_tiers:
        # Match substring or full key
        match_count = 0
        for k, v in tier_counts.items():
            if t[:3].lower() in k.lower() or t.lower() in k.lower():
                match_count += v
        tier_summary[t] = int(match_count)

    # Defaults flagged
    def_count = int(df["actual_default"].sum()) if "actual_default" in df.columns else 0
    def_rate = round(float(df["actual_default"].mean() * 100), 2) if "actual_default" in df.columns else 0.0

    return {
        "total_exposure":    total_records,
        "average_score":     avg_score,
        "default_count":     def_count,
        "default_rate":      def_rate,
        "coverage": {
            "gst":  gst_cov,
            "upi":  upi_cov,
            "aa":   aa_cov,
            "epfo": epfo_cov,
        },
        "sectors":  sector_summary,
        "segments": segment_summary,
        "tiers":    tier_summary,
    }


# -----------------------------------------------------------------
# Public API: Macroeconomic Stress Simulation
# -----------------------------------------------------------------

def run_stress_test(
    sector: str,
    stress_type: str = "turnover_shock",
    severity_pct: float = 0.15,
    stress_pct: Optional[float] = None,
) -> dict:
    """
    Simulates macroeconomic stress on the portfolio and returns comparisons.

    Args:
        sector:        "all" or a specific sector name (e.g. "Textile", "Trading/Retail")
        stress_type:   "turnover_shock" (drops GST/UPI inflows) | 
                       "liquidity_stress" (doubles payable days + reduces AA cash flow ratio) |
                       "leverage_surge" (increases EMI ratio & OD utilization)
        severity_pct:  Float representing severity (0.0 to 1.0, e.g. 0.20 = 20% stress)
        stress_pct:    Alternative severity parameter (absolute value used as severity, e.g. -0.15 = 15% shock)

    Returns:
        A comparison dictionary of before vs after risk statistics.
    """
    if stress_pct is not None:
        severity_pct = abs(stress_pct)
        stress_type = "turnover_shock"

    df = pd.read_csv(DATASET_PATH) # Load raw dataset to re-run scoring pipelines

    # Filter rows to apply stress
    if sector != "all":
        mask = df["sector"] == sector
    else:
        mask = pd.Series(True, index=df.index)

    df_stressed = df.copy()

    # ── Apply Shock ──
    if stress_type == "turnover_shock":
        # Drop turnovers/inflows
        factor = 1.0 - severity_pct
        df_stressed.loc[mask, "gst_avg_monthly_turnover_inr"] *= factor
        df_stressed.loc[mask, "upi_avg_inflow_inr"] *= factor
        # Turnover drop usually correlates with increased late GST filings
        df_stressed.loc[mask, "gst_late_filing_count_12m"] += severity_pct * 4
        
    elif stress_type == "liquidity_stress":
        # Lengthen payment delay, worsen cash flow ratios
        df_stressed.loc[mask, "aa_trade_payable_days"] *= (1.0 + severity_pct * 1.5)
        df_stressed.loc[mask, "aa_cash_flow_ratio"] *= (1.0 - severity_pct * 0.5)
        
    elif stress_type == "leverage_surge":
        # Raise EMI burden, max out overdraft
        df_stressed.loc[mask, "aa_emi_to_inflow_ratio"] *= (1.0 + severity_pct * 0.8)
        df_stressed.loc[mask, "aa_overdraft_utilization_pct"] = np.minimum(
            df_stressed.loc[mask, "aa_overdraft_utilization_pct"] * (1.0 + severity_pct * 0.6),
            100.0
        )

    # ── Score the Portfolio Before and After ──
    # Note: For performance, we score the filtered subset to compare
    sub_df_orig = df[mask].copy()
    sub_df_stress = df_stressed[mask].copy()

    orig_scores = []
    stressed_scores = []

    for _, row in sub_df_orig.iterrows():
        # Score without computing SHAP to optimize speed
        res = score_business(row.to_dict(), explain=False)
        orig_scores.append(res)

    for _, row in sub_df_stress.iterrows():
        res = score_business(row.to_dict(), explain=False)
        stressed_scores.append(res)

    orig_scores_df = pd.DataFrame(orig_scores)
    stressed_scores_df = pd.DataFrame(stressed_scores)

    # Compute comparison metrics
    orig_avg = round(float(orig_scores_df["overall_score"].mean()), 1)
    stressed_avg = round(float(stressed_scores_df["overall_score"].mean()), 1)

    orig_tiers = orig_scores_df["risk_tier"].value_counts().to_dict()
    stressed_tiers = stressed_scores_df["risk_tier"].value_counts().to_dict()

    orig_rejects = int(orig_scores_df["decision"].eq("Reject").sum())
    stressed_rejects = int(stressed_scores_df["decision"].eq("Reject").sum())

    standard_tiers = ["A - Strong", "B - Moderate", "C - Weak", "D - High Risk"]

    return {
        "sector":         sector,
        "stress_type":    stress_type,
        "severity_pct":   severity_pct * 100,
        "affected_rows":  int(mask.sum()),
        "original_avg":   orig_avg,
        "stressed_avg":   stressed_avg,
        "original_default_count": orig_rejects,
        "stressed_default_count": stressed_rejects,
        "original_reject_rate": round(orig_rejects / max(len(orig_scores_df), 1) * 100, 1),
        "stressed_reject_rate": round(stressed_rejects / max(len(stressed_scores_df), 1) * 100, 1),
        "tiers_comparison": {
            t: {
                "original": int(orig_tiers.get(t, 0)),
                "stressed": int(stressed_tiers.get(t, 0)),
            }
            for t in standard_tiers
        }
    }
