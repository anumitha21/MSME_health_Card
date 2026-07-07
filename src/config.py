"""
Central configuration for the MSME Health Card project.
Keeps all paths, feature definitions and fusion settings in one place.
"""

from pathlib import Path
import json

# -----------------------------------------------------------------------------
# Paths
# -----------------------------------------------------------------------------

ROOT_DIR = Path(__file__).resolve().parents[1]

DATA_DIR = ROOT_DIR / "data"
MODEL_DIR = ROOT_DIR / "models_v3"

DATASET_PATH = DATA_DIR / "msme_alternate_data_synthetic.csv"

MODEL_DIR.mkdir(parents=True, exist_ok=True)


# -----------------------------------------------------------------------------
# Target
# -----------------------------------------------------------------------------

TARGET_COLUMN = "default_flag"


# -----------------------------------------------------------------------------
# Feature Groups
# -----------------------------------------------------------------------------

FEATURE_GROUPS = {
    "gst": {
        "availability_flag": "gst_registered",
        "features": [
            "gst_filing_consistency_pct",
            "gst_turnover_growth_rate",
            "gst_avg_monthly_turnover_inr",
            "gst_late_filing_count_12m",
        ],
    },

    "upi": {
        "availability_flag": "upi_available",
        "features": [
            "upi_monthly_txn_count",
            "upi_avg_inflow_inr",
            "upi_inflow_volatility",
            "upi_bounce_rate_pct",
        ],
    },

    "aa": {
        "availability_flag": "aa_consent_given",
        "features": [
            "aa_avg_bank_balance_inr",
            "aa_trade_payable_days",
            "aa_cash_flow_ratio",
            "aa_emi_to_inflow_ratio",
            "aa_overdraft_utilization_pct",
        ],
    },

    "epfo": {
        "availability_flag": "epfo_registered",
        "features": [
            "epfo_employee_count",
            "epfo_contribution_consistency_pct",
            "epfo_avg_wage_inr",
            "epfo_employee_growth_rate",
        ],
    },
}


# -----------------------------------------------------------------------------
# Fusion Weights
# -----------------------------------------------------------------------------

FUSION_WEIGHTS = {
    "gst": 0.35,
    "upi": 0.25,
    "aa": 0.30,
    "epfo": 0.10,
}


# -----------------------------------------------------------------------------
# Risk Tiers
# -----------------------------------------------------------------------------

RISK_TIERS = [
    (75, "A - Strong"),
    (55, "B - Moderate"),
    (35, "C - Weak"),
    (0, "D - High Risk"),
]


# -----------------------------------------------------------------------------
# Helper Functions
# -----------------------------------------------------------------------------

def model_path(group: str):
    return MODEL_DIR / f"{group}_model.pkl"


def imputer_path(group: str):
    return MODEL_DIR / f"{group}_imputer.pkl"


def save_feature_groups():
    with open(MODEL_DIR / "feature_groups.json", "w") as f:
        json.dump(FEATURE_GROUPS, f, indent=2)


def save_fusion_weights():
    with open(MODEL_DIR / "fusion_weights.json", "w") as f:
        json.dump(FUSION_WEIGHTS, f, indent=2)


def load_feature_groups():
    with open(MODEL_DIR / "feature_groups.json") as f:
        return json.load(f)


def load_fusion_weights():
    with open(MODEL_DIR / "fusion_weights.json") as f:
        return json.load(f)