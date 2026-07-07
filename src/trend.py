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
    Compute EWS trend report for a single enterprise.

    Returns:
        {
          "enterprise_id": str,
          "trend_flag": "Upward Trend" | "Stable" | "Deteriorating",
          "alert_flags": [ { "metric": str, "change_pct": float, "message": str } ],
          "metrics": {
              "upi_monthly_txn_count": { "T-90": v, "T-60": v, "T-30": v, "mom_30d_pct": v },
              ...
          },
          "data_available": bool
        }
    """
    df = _load_trend_data()

    if df.empty:
        return {
            "enterprise_id": enterprise_id,
            "trend_flag":    "Stable",
            "alert_flags":   [],
            "metrics":       {},
            "data_available":False,
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
            "message":       f"No trend data found for enterprise {enterprise_id}.",
        }

    # Pivot to period-indexed view
    ent_df = ent_df.set_index("period")
    period_order = ["T-90", "T-60", "T-30"]
    ent_df = ent_df.reindex(period_order)

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

    # Overall trend
    if deterioration_count >= 2:
        trend_flag = "Deteriorating"
    elif improvement_count >= 2:
        trend_flag = "Upward Trend"
    else:
        trend_flag = "Stable"

    return {
        "enterprise_id":  enterprise_id,
        "trend_flag":     trend_flag,
        "alert_flags":    alert_flags,
        "metrics":        metrics_output,
        "data_available": True,
    }
