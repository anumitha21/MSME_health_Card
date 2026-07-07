"""
Central configuration for the MSME Health Card project.
Keeps all paths, feature definitions and fusion settings in one place.
"""

from pathlib import Path
import json
import numpy as np
import pandas as pd

# -----------------------------------------------------------------------------
# Paths
# -----------------------------------------------------------------------------

ROOT_DIR = Path(__file__).resolve().parents[1]

DATA_DIR = ROOT_DIR / "data"
MODEL_DIR = ROOT_DIR / "models_v3"

DATASET_PATH = DATA_DIR / "msme_alternate_data_synthetic.csv"
TREND_DATA_PATH = DATA_DIR / "msme_trend_data_synthetic.csv"

MODEL_DIR.mkdir(parents=True, exist_ok=True)


# -----------------------------------------------------------------------------
# Target
# -----------------------------------------------------------------------------

TARGET_COLUMN = "default_flag"


# -----------------------------------------------------------------------------
# Global (cross-pillar) Features
# Always added to every pillar's feature set where available.
# -----------------------------------------------------------------------------

GLOBAL_FEATURES = [
    "years_in_operation",
    "is_ntc",           # New-to-credit flag
    "is_ntb",           # New-to-bank flag
    "segment_encoded",  # Micro=0, Small=1, Medium=2
    "sector_encoded",   # Label encoded sector
]

SEGMENT_MAP = {"Micro": 0, "Small": 1, "Medium": 2}

SECTOR_MAP = {
    "Agriculture & Allied": 0,
    "Construction": 1,
    "Food Processing": 2,
    "IT/ITES": 3,
    "Manufacturing": 4,
    "Services": 5,
    "Textile": 6,
    "Trading/Retail": 7,
}


# -----------------------------------------------------------------------------
# Interaction Feature Definitions
# Computed after raw feature loading; XGBoost handles NaN natively
# (division by zero / missing inputs → NaN, skipped in tree split).
# -----------------------------------------------------------------------------

def add_interaction_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Adds cross-pillar interaction features to the dataframe in-place.
    Uses numpy safe division so 0-denominators produce NaN (not Inf),
    which XGBoost then handles natively during tree splitting.
    """
    df = df.copy()

    # tax_to_income_ratio: relative GST scale vs UPI cash inflow
    df["tax_to_income_ratio"] = np.where(
        df.get("upi_avg_inflow_inr", pd.Series(np.nan, index=df.index)).fillna(0) == 0,
        np.nan,
        df.get("gst_avg_monthly_turnover_inr", pd.Series(np.nan, index=df.index))
        / df.get("upi_avg_inflow_inr", pd.Series(np.nan, index=df.index)),
    )

    # financial_leverage: EMI burden relative to GST growth rate
    df["financial_leverage"] = np.where(
        df.get("gst_turnover_growth_rate", pd.Series(np.nan, index=df.index)).fillna(0) == 0,
        np.nan,
        df.get("aa_emi_to_inflow_ratio", pd.Series(np.nan, index=df.index))
        / df.get("gst_turnover_growth_rate", pd.Series(np.nan, index=df.index)),
    )

    # wage_leverage: total payroll relative to liquid bank balance
    df["wage_leverage"] = np.where(
        df.get("aa_avg_bank_balance_inr", pd.Series(np.nan, index=df.index)).fillna(0) == 0,
        np.nan,
        (
            df.get("epfo_avg_wage_inr", pd.Series(np.nan, index=df.index))
            * df.get("epfo_employee_count", pd.Series(np.nan, index=df.index))
        )
        / df.get("aa_avg_bank_balance_inr", pd.Series(np.nan, index=df.index)),
    )

    return df


def add_global_encoded_features(df: pd.DataFrame) -> pd.DataFrame:
    """Encode segment and sector into numeric columns."""
    df = df.copy()
    df["segment_encoded"] = df["segment"].map(SEGMENT_MAP).fillna(-1).astype(int)
    df["sector_encoded"] = df["sector"].map(SECTOR_MAP).fillna(-1).astype(int)
    return df


INTERACTION_FEATURES = [
    "tax_to_income_ratio",
    "financial_leverage",
    "wage_leverage",
]


# -----------------------------------------------------------------------------
# Feature Groups
# Each pillar = its raw features + global features + interaction features
# (XGBoost ignores NaN columns gracefully via native missing-value handling)
# -----------------------------------------------------------------------------

FEATURE_GROUPS = {
    "gst": {
        "availability_flag": "gst_registered",
        "features": [
            "gst_filing_consistency_pct",
            "gst_turnover_growth_rate",
            "gst_avg_monthly_turnover_inr",
            "gst_late_filing_count_12m",
            # Global
            "years_in_operation",
            "is_ntc",
            "is_ntb",
            "segment_encoded",
            "sector_encoded",
            # Interactions
            "tax_to_income_ratio",
            "financial_leverage",
        ],
    },

    "upi": {
        "availability_flag": "upi_available",
        "features": [
            "upi_monthly_txn_count",
            "upi_avg_inflow_inr",
            "upi_inflow_volatility",
            "upi_bounce_rate_pct",
            # Global
            "years_in_operation",
            "is_ntc",
            "is_ntb",
            "segment_encoded",
            "sector_encoded",
            # Interactions
            "tax_to_income_ratio",
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
            # Global
            "years_in_operation",
            "is_ntc",
            "is_ntb",
            "segment_encoded",
            "sector_encoded",
            # Interactions
            "financial_leverage",
            "wage_leverage",
        ],
    },

    "epfo": {
        "availability_flag": "epfo_registered",
        "features": [
            "epfo_employee_count",
            "epfo_contribution_consistency_pct",
            "epfo_avg_wage_inr",
            "epfo_employee_growth_rate",
            # Global
            "years_in_operation",
            "is_ntc",
            "is_ntb",
            "segment_encoded",
            "sector_encoded",
            # Interactions
            "wage_leverage",
        ],
    },
}


# -----------------------------------------------------------------------------
# Fusion Weights (default)
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
    (0,  "D - High Risk"),
]


# -----------------------------------------------------------------------------
# Confidence Tiers
# -----------------------------------------------------------------------------

def assign_confidence_tier(available_pillars: list) -> str:
    """
    Gold:    All 4 pillars present
    Silver:  GST + UPI + AA (core 3)
    Bronze:  UPI and/or GST only
    Minimal: Only 1 pillar (any)
    """
    s = set(available_pillars)
    if s == {"gst", "upi", "aa", "epfo"}:
        return "Gold"
    if {"gst", "upi", "aa"}.issubset(s):
        return "Silver"
    if len(s) >= 2:
        return "Bronze"
    if len(s) == 1:
        return "Minimal"
    return "Unscoreable"


# -----------------------------------------------------------------------------
# Helper Functions
# -----------------------------------------------------------------------------

def model_path(group: str):
    return MODEL_DIR / f"{group}_model.pkl"


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