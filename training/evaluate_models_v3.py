"""
Evaluate the trained MSME Health Card models.

Outputs
-------
data/scored_portfolio_v3.csv
models_v3/evaluation_summary.json
"""

import sys
from pathlib import Path

# Add project root to sys.path to allow importing from src
sys.path.append(str(Path(__file__).resolve().parents[1]))

import json
import joblib
import pandas as pd
from sklearn.metrics import roc_auc_score

from src.config import (
    DATASET_PATH,
    MODEL_DIR,
    TARGET_COLUMN,
    FEATURE_GROUPS,
    FUSION_WEIGHTS,
    RISK_TIERS,
    model_path,
    imputer_path,
)


# ---------------------------------------------------------
# Load everything once
# ---------------------------------------------------------

df = pd.read_csv(DATASET_PATH)

models = {
    pillar: joblib.load(model_path(pillar))
    for pillar in FEATURE_GROUPS
}

imputers = {
    pillar: joblib.load(imputer_path(pillar))
    for pillar in FEATURE_GROUPS
}


# ---------------------------------------------------------
# Helper
# ---------------------------------------------------------

def assign_risk(score):

    if score is None:
        return "Unscoreable"

    for threshold, label in RISK_TIERS:
        if score >= threshold:
            return label

    return RISK_TIERS[-1][1]


# ---------------------------------------------------------
# Score One Business
# ---------------------------------------------------------

def score_business(row):

    sub_scores = {}
    available_weights = {}

    for pillar, cfg in FEATURE_GROUPS.items():

        if row[cfg["availability_flag"]] != 1:
            sub_scores[pillar] = None
            continue

        X = row[cfg["features"]].to_frame().T

        X = X.apply(pd.to_numeric, errors="coerce")

        X = imputers[pillar].transform(X)

        default_probability = models[pillar].predict_proba(X)[0][1]

        health_score = (1 - default_probability) * 100

        sub_scores[pillar] = round(float(health_score), 1)

        available_weights[pillar] = FUSION_WEIGHTS[pillar]

    # ---------------------------------------

    if len(available_weights) == 0:

        overall_score = None

        confidence = "0/4"

    else:

        total_weight = sum(available_weights.values())

        overall_score = 0

        for pillar in available_weights:

            overall_score += (
                sub_scores[pillar]
                * available_weights[pillar]
                / total_weight
            )

        overall_score = round(overall_score, 1)

        confidence = f"{len(available_weights)}/4"

    return {
        "enterprise_id": row["enterprise_id"],

        "gst_score": sub_scores["gst"],
        "upi_score": sub_scores["upi"],
        "aa_score": sub_scores["aa"],
        "epfo_score": sub_scores["epfo"],

        "overall_score": overall_score,

        "risk_tier": assign_risk(overall_score),

        "confidence": confidence,

        "actual_default": row[TARGET_COLUMN],
    }


# ---------------------------------------------------------
# Score Portfolio
# ---------------------------------------------------------

print("\nScoring Portfolio...\n")

results = []

for _, row in df.iterrows():

    results.append(score_business(row))

results_df = pd.DataFrame(results)

results_df.to_csv(
    DATASET_PATH.parent / "scored_portfolio_v3.csv",
    index=False,
)

print(f"Scored {len(results_df)} businesses.")


# ---------------------------------------------------------
# Evaluate
# ---------------------------------------------------------

summary = {}

scoreable = results_df.dropna(subset=["overall_score"])

summary["fused_auc"] = round(
    roc_auc_score(
        scoreable["actual_default"],
        100 - scoreable["overall_score"],
    ),
    4,
)

summary["coverage"] = round(
    len(scoreable) / len(results_df),
    4,
)

summary["pillar_metrics"] = {}

for pillar in FEATURE_GROUPS:

    subset = results_df.dropna(
        subset=[f"{pillar}_score"]
    )

    auc = roc_auc_score(
        subset["actual_default"],
        100 - subset[f"{pillar}_score"],
    )

    summary["pillar_metrics"][pillar] = {
        "auc": round(float(auc), 4),
        "coverage": round(
            len(subset) / len(results_df),
            4,
        ),
    }


with open(
    MODEL_DIR / "evaluation_summary.json",
    "w",
) as f:

    json.dump(summary, f, indent=4)

print("\nEvaluation Complete\n")

print(json.dumps(summary, indent=4))