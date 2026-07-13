"""
Generate synthetic 3-period trend data for the MSME Health Card EWS.

The current dataset has no timestamps. This script creates
data/msme_trend_data_synthetic.csv with 3 monthly snapshots per enterprise
(T-90 days, T-60 days, T-30 days) for the 4 most time-sensitive indicators.

Design rationale:
  - Defaulting MSMEs (default_flag=1) receive negative momentum drift:
    UPI inflows decline, trade payable days grow, cash flow ratios worsen.
  - Non-defaulting MSMEs receive mild positive or stable drift.
  - Gaussian noise added to all series to avoid perfect linearity.
  - Drift magnitude sampled from Beta distributions so outputs are realistic.

Run once:
    python data/generate_trend_data.py
"""

import sys
from pathlib import Path
sys.path.append(str(Path(__file__).resolve().parents[1]))

import numpy as np
import pandas as pd
from src.config import DATASET_PATH, TREND_DATA_PATH

RANDOM_STATE = 42
rng = np.random.default_rng(RANDOM_STATE)

PERIODS = ["T-90", "T-60", "T-30"]


def generate():
    df = pd.read_csv(DATASET_PATH)

    rows = []

    for _, rec in df.iterrows():
        eid      = rec["enterprise_id"]
        is_def   = int(rec["default_flag"])

        # ── Base values (T-90 snapshot = current dataset values ± noise) ──
        upi_txn_base  = float(rec.get("upi_monthly_txn_count", np.nan) or np.nan)
        upi_infl_base = float(rec.get("upi_avg_inflow_inr",   np.nan) or np.nan)
        payable_base  = float(rec.get("aa_trade_payable_days",np.nan) or np.nan)
        cashflow_base = float(rec.get("aa_cash_flow_ratio",   np.nan) or np.nan)

        # ── Drift direction: negative for defaulters, neutral/positive otherwise ──
        # Drift is multiplicative per 30-day step
        if is_def == 1:
            # Defaulters: declining transactions / inflows, rising payables
            upi_txn_drift  = -rng.beta(2, 5) * 0.15    # -0% to -15% per step
            upi_infl_drift = -rng.beta(2, 5) * 0.12
            payable_drift  = +rng.beta(2, 5) * 0.20     # growing payable days
            cf_drift       = -rng.beta(2, 5) * 0.10
        else:
            upi_txn_drift  = rng.uniform(-0.03, 0.06)
            upi_infl_drift = rng.uniform(-0.02, 0.05)
            payable_drift  = rng.uniform(-0.05, 0.03)
            cf_drift       = rng.uniform(-0.02, 0.04)

        for i, period in enumerate(PERIODS):
            step = i  # 0 = T-90, 1 = T-60, 2 = T-30

            def apply_drift(base, drift_per_step, noise_pct=0.03):
                if np.isnan(base):
                    return np.nan
                val = base * (1 + drift_per_step) ** step
                val += val * rng.normal(0, noise_pct)
                return round(max(val, 0), 2)

            rows.append({
                "enterprise_id":         eid,
                "period":                period,
                "upi_monthly_txn_count": apply_drift(upi_txn_base,  upi_txn_drift),
                "upi_avg_inflow_inr":    apply_drift(upi_infl_base, upi_infl_drift, 0.04),
                "aa_trade_payable_days": apply_drift(payable_base,  payable_drift,  0.05),
                "aa_cash_flow_ratio":    apply_drift(cashflow_base, cf_drift,       0.03),
                "default_flag":          is_def,
            })

    trend_df = pd.DataFrame(rows)
    trend_df.to_csv(TREND_DATA_PATH, index=False)
    print(f"Generated {len(trend_df):,} trend records -> {TREND_DATA_PATH}")
    print(trend_df.head(9).to_string(index=False))


if __name__ == "__main__":
    generate()
