"""
Evaluate the trained MSME Health Card models (v3 — XGBoost).

Outputs
-------
data/scored_portfolio_v3.csv
models_v3/evaluation_summary.json
"""

import sys
from pathlib import Path

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
    add_interaction_features,
    add_global_encoded_features,
)


# ---------------------------------------------------------
# Load everything once
# ---------------------------------------------------------

df = pd.read_csv(DATASET_PATH)
df = add_global_encoded_features(df)
df = add_interaction_features(df)

models = {
    pillar: joblib.load(model_path(pillar))
    for pillar in FEATURE_GROUPS
}


# ---------------------------------------------------------
# Helpers
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

    sub_scores        = {}
    available_weights = {}

    for pillar, cfg in FEATURE_GROUPS.items():

        if row[cfg["availability_flag"]] != 1:
            sub_scores[pillar] = None
            continue

        X = pd.DataFrame([row[cfg["features"]].values],
                         columns=cfg["features"])
        X = X.apply(pd.to_numeric, errors="coerce")

        default_prob = models[pillar].predict_proba(X)[0][1]
        health_score = (1 - default_prob) * 100

        sub_scores[pillar]         = round(float(health_score), 1)
        available_weights[pillar]  = FUSION_WEIGHTS[pillar]

    # ── Fusion ──────────────────────────────────────────────
    if not available_weights:
        overall_score = None
        confidence    = "0/4"
    else:
        total_weight  = sum(available_weights.values())
        overall_score = sum(
            sub_scores[p] * available_weights[p] / total_weight
            for p in available_weights
        )
        overall_score = round(overall_score, 1)
        confidence    = f"{len(available_weights)}/4"

    return {
        "enterprise_id": row["enterprise_id"],
        "gst_score":     sub_scores["gst"],
        "upi_score":     sub_scores["upi"],
        "aa_score":      sub_scores["aa"],
        "epfo_score":    sub_scores["epfo"],
        "overall_score": overall_score,
        "risk_tier":     assign_risk(overall_score),
        "confidence":    confidence,
        "actual_default":row[TARGET_COLUMN],
    }


# ---------------------------------------------------------
# Score Portfolio
# ---------------------------------------------------------

print("\nScoring Portfolio...\n")

results    = []
for _, row in df.iterrows():
    results.append(score_business(row))

results_df = pd.DataFrame(results)

results_df.to_csv(
    DATASET_PATH.parent / "scored_portfolio_v3.csv",
    index=False,
)
print(f"Scored {len(results_df):,} businesses.")


# ---------------------------------------------------------
# Baseline (LogisticRegression) for comparison
# ---------------------------------------------------------

BASELINE = {
    "fused":  0.7609,
    "gst":    0.7659,
    "upi":    0.7348,
    "aa":     0.7686,
    "epfo":   0.7812,
}


# ---------------------------------------------------------
# Evaluate
# ---------------------------------------------------------

summary = {}

scoreable = results_df.dropna(subset=["overall_score"])

fused_auc = roc_auc_score(
    scoreable["actual_default"],
    100 - scoreable["overall_score"],
)
summary["fused_auc"]  = round(fused_auc, 4)
summary["coverage"]   = round(len(scoreable) / len(results_df), 4)
summary["pillar_metrics"] = {}

for pillar in FEATURE_GROUPS:
    subset = results_df.dropna(subset=[f"{pillar}_score"])
    auc    = roc_auc_score(
        subset["actual_default"],
        100 - subset[f"{pillar}_score"],
    )
    summary["pillar_metrics"][pillar] = {
        "auc":      round(float(auc), 4),
        "coverage": round(len(subset) / len(results_df), 4),
    }

with open(MODEL_DIR / "evaluation_summary.json", "w") as f:
    json.dump(summary, f, indent=4)


# ---------------------------------------------------------
# Print before/after table
# ---------------------------------------------------------

print("\n" + "=" * 60)
print("EVALUATION RESULTS — BEFORE vs AFTER (XGBoost Upgrade)")
print("=" * 60)

header = f"{'Pillar':<10}  {'Baseline AUC':>12}  {'New AUC':>10}  {'Delta':>8}  {'Coverage':>10}"
print(header)
print("-" * 60)

for pillar in FEATURE_GROUPS:
    b   = BASELINE[pillar]
    n   = summary["pillar_metrics"][pillar]["auc"]
    cov = summary["pillar_metrics"][pillar]["coverage"]
    d   = n - b
    sign = "+" if d >= 0 else ""
    print(f"{pillar.upper():<10}  {b:>12.4f}  {n:>10.4f}  {sign}{d:>7.4f}  {cov:>9.2%}")

print("-" * 60)
fb = BASELINE["fused"]
fn = summary["fused_auc"]
fd = fn - fb
sign = "+" if fd >= 0 else ""
print(f"{'FUSED':<10}  {fb:>12.4f}  {fn:>10.4f}  {sign}{fd:>7.4f}  {summary['coverage']:>9.2%}")
print("=" * 60)
print()
print(json.dumps(summary, indent=4))