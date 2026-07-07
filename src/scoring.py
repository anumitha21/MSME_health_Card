"""
Core inference logic for the MSME Health Card.

Used by:
    - FastAPI
    - Batch Evaluation

Single source of truth for business scoring.
"""

from functools import lru_cache

import joblib
import pandas as pd

from src.config import (
    FEATURE_GROUPS,
    FUSION_WEIGHTS,
    RISK_TIERS,
    model_path,
    imputer_path,
)


# -----------------------------------------------------
# Load Once
# -----------------------------------------------------

@lru_cache(maxsize=1)
def load_artifacts():

    models = {}
    imputers = {}

    for pillar in FEATURE_GROUPS:

        models[pillar] = joblib.load(model_path(pillar))
        imputers[pillar] = joblib.load(imputer_path(pillar))

    return models, imputers


# -----------------------------------------------------
# Risk Tier
# -----------------------------------------------------

def assign_risk(score):

    if score is None:
        return "Unscoreable"

    for threshold, label in RISK_TIERS:

        if score >= threshold:
            return label

    return RISK_TIERS[-1][1]


# -----------------------------------------------------
# Score One Pillar
# -----------------------------------------------------

def score_pillar(record, pillar, model, imputer):

    cfg = FEATURE_GROUPS[pillar]

    if record.get(cfg["availability_flag"], 0) != 1:
        return None

    X = pd.DataFrame(
        [[record.get(col) for col in cfg["features"]]],
        columns=cfg["features"],
    )

    X = X.apply(pd.to_numeric, errors="coerce")

    X = imputer.transform(X)

    default_probability = model.predict_proba(X)[0][1]

    health_score = (1 - default_probability) * 100

    return round(float(health_score), 1)


# -----------------------------------------------------
# Overall Business Score
# -----------------------------------------------------

def score_business(record):

    models, imputers = load_artifacts()

    pillar_scores = {}
    weights = {}

    for pillar in FEATURE_GROUPS:

        score = score_pillar(
            record,
            pillar,
            models[pillar],
            imputers[pillar],
        )

        pillar_scores[pillar] = score

        if score is not None:
            weights[pillar] = FUSION_WEIGHTS[pillar]

    # -------------------------------------------------

    if not weights:

        overall = None
        confidence = "0/4 sources available"

    else:

        total = sum(weights.values())

        overall = sum(
            pillar_scores[p] * weights[p] / total
            for p in weights
        )

        overall = round(overall, 1)

        confidence = f"{len(weights)}/4 sources available"

    return {

        "gst_score": pillar_scores["gst"],
        "upi_score": pillar_scores["upi"],
        "aa_score": pillar_scores["aa"],
        "epfo_score": pillar_scores["epfo"],

        "overall_score": overall,

        "risk_tier": assign_risk(overall),

        "data_confidence": confidence,
    }