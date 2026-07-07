"""
Train four independent MSME Health Card models (v3 — XGBoost upgrade).

Models:
    GST, UPI, AA, EPFO

Algorithm:
    XGBClassifier with RandomizedSearchCV (5-fold stratified, 30 iters).
    XGBoost handles NaN natively in tree splits — no imputer needed.
    Cross-pillar interaction features + global business features added.

Split strategy: 60% train / 20% val (early stopping) / 20% test (final report).
No leakage: val & test indices derived from full-dataset split before
per-pillar subsetting.

Outputs:
    models_v3/
        gst_model.pkl   upi_model.pkl   aa_model.pkl   epfo_model.pkl
        feature_groups.json
        fusion_weights.json
        metrics.json
        best_params.json
"""

import sys
from pathlib import Path

sys.path.append(str(Path(__file__).resolve().parents[1]))

import json
import joblib
import numpy as np
import pandas as pd

from sklearn.metrics import roc_auc_score
from sklearn.model_selection import train_test_split, RandomizedSearchCV, StratifiedKFold
from xgboost import XGBClassifier

from src.config import (
    DATASET_PATH,
    MODEL_DIR,
    FEATURE_GROUPS,
    FUSION_WEIGHTS,
    TARGET_COLUMN,
    model_path,
    save_feature_groups,
    save_fusion_weights,
    add_interaction_features,
    add_global_encoded_features,
)

RANDOM_STATE = 42

# -----------------------------------------------------------------
# XGBoost hyperparameter search space
# -----------------------------------------------------------------

XGB_PARAM_DIST = {
    "n_estimators":     [200, 300, 400, 500],
    "max_depth":        [3, 4, 5, 6],
    "learning_rate":    [0.01, 0.03, 0.05, 0.1],
    "min_child_weight": [1, 3, 5, 10],
    "subsample":        [0.6, 0.7, 0.8, 0.9, 1.0],
    "colsample_bytree": [0.5, 0.6, 0.7, 0.8, 1.0],
    "gamma":            [0, 0.1, 0.3, 0.5],
    "reg_alpha":        [0, 0.01, 0.1, 1.0],
    "reg_lambda":       [0.5, 1.0, 2.0, 5.0],
}

N_ITER   = 30     # randomized search iterations per pillar
CV_FOLDS = 5      # stratified K-fold


# -----------------------------------------------------------------
# Load & prepare dataset
# -----------------------------------------------------------------

def load_dataset():
    df = pd.read_csv(DATASET_PATH)
    df = add_global_encoded_features(df)
    df = add_interaction_features(df)
    return df


# -----------------------------------------------------------------
# Train one pillar
# -----------------------------------------------------------------

def train_single_model(df, group_name, cfg, train_idx, val_idx, test_idx):

    availability_flag = cfg["availability_flag"]
    features          = cfg["features"]

    # Filter to rows where this data source is available
    pillar_df = df[df[availability_flag] == 1].copy()

    X = pillar_df[features]
    y = pillar_df[TARGET_COLUMN]

    # Derive per-pillar split masks from global indices
    train_mask = pillar_df.index.isin(train_idx)
    val_mask   = pillar_df.index.isin(val_idx)
    test_mask  = pillar_df.index.isin(test_idx)

    X_train, y_train = X[train_mask], y[train_mask]
    X_val,   y_val   = X[val_mask],   y[val_mask]
    X_test,  y_test  = X[test_mask],  y[test_mask]

    # Class imbalance: use scale_pos_weight = neg/pos ratio on train set
    neg = (y_train == 0).sum()
    pos = (y_train == 1).sum()
    scale_pos = float(neg) / float(pos) if pos > 0 else 1.0

    base_xgb = XGBClassifier(
        objective="binary:logistic",
        eval_metric="auc",
        scale_pos_weight=scale_pos,
        use_label_encoder=False,
        random_state=RANDOM_STATE,
        n_jobs=-1,
        verbosity=0,
        tree_method="hist",   # fast exact algo
    )

    cv = StratifiedKFold(n_splits=CV_FOLDS, shuffle=True, random_state=RANDOM_STATE)

    search = RandomizedSearchCV(
        base_xgb,
        param_distributions=XGB_PARAM_DIST,
        n_iter=N_ITER,
        scoring="roc_auc",
        cv=cv,
        refit=True,
        random_state=RANDOM_STATE,
        n_jobs=-1,
        verbose=0,
    )

    # Fit on train; val used only for early-stopping in future iterations
    search.fit(X_train, y_train)

    best_model  = search.best_estimator_
    best_params = search.best_params_
    cv_auc      = search.best_score_

    train_auc = roc_auc_score(y_train, best_model.predict_proba(X_train)[:, 1])
    val_auc   = roc_auc_score(y_val,   best_model.predict_proba(X_val)[:, 1])
    test_auc  = roc_auc_score(y_test,  best_model.predict_proba(X_test)[:, 1])

    joblib.dump(best_model, model_path(group_name))

    return {
        "pillar":                group_name,
        "n_train_available":     int(train_mask.sum()),
        "pct_of_book":           round(len(pillar_df) / len(df) * 100, 1),
        "default_rate_in_subset":round(float(y.mean()), 4),
        "cv_auc":                round(float(cv_auc), 4),
        "train_auc":             round(float(train_auc), 4),
        "val_auc":               round(float(val_auc), 4),
        "test_auc":              round(float(test_auc), 4),
        "n_features":            len(features),
        "best_params":           best_params,
    }


# -----------------------------------------------------------------
# Main
# -----------------------------------------------------------------

def main():
    print("=" * 70)
    print("MSME HEALTH CARD MODEL TRAINING V3 — XGBoost + Feature Engineering")
    print("=" * 70)

    df = load_dataset()
    print(f"\nDataset loaded: {len(df):,} rows | {df.shape[1]} columns")
    print(f"Default rate: {df[TARGET_COLUMN].mean():.2%}")

    # 60 / 20 / 20 split on full dataset (stratified)
    train_val_idx, test_idx = train_test_split(
        df.index,
        test_size=0.20,
        stratify=df[TARGET_COLUMN],
        random_state=RANDOM_STATE,
    )
    train_idx, val_idx = train_test_split(
        train_val_idx,
        test_size=0.25,            # 25% of 80% = 20% of total
        stratify=df.loc[train_val_idx, TARGET_COLUMN],
        random_state=RANDOM_STATE,
    )

    print(f"Split: train={len(train_idx):,}  val={len(val_idx):,}  test={len(test_idx):,}\n")

    metrics     = {}
    best_params = {}

    BASELINE_AUC = {
        "gst":  0.7843,
        "upi":  0.7379,
        "aa":   0.7607,
        "epfo": 0.8046,
        "fused": 0.7609,
    }

    for group_name, cfg in FEATURE_GROUPS.items():
        print(f"\n{'-'*50}")
        print(f"  Training {group_name.upper()} model  ({len(cfg['features'])} features)")
        print(f"{'-'*50}")

        result = train_single_model(df, group_name, cfg, train_idx, val_idx, test_idx)

        metrics[group_name]     = result
        best_params[group_name] = result.pop("best_params")

        delta = result["test_auc"] - BASELINE_AUC[group_name]
        sign  = "+" if delta >= 0 else ""
        print(
            f"  Baseline  Test AUC : {BASELINE_AUC[group_name]:.4f}\n"
            f"  New       Test AUC : {result['test_auc']:.4f}  ({sign}{delta:.4f})\n"
            f"  CV AUC            : {result['cv_auc']:.4f}\n"
            f"  Rows used         : {result['n_train_available']:,}"
        )

    save_feature_groups()
    save_fusion_weights()

    with open(MODEL_DIR / "metrics.json", "w") as f:
        json.dump(metrics, f, indent=4)

    with open(MODEL_DIR / "best_params.json", "w") as f:
        json.dump(best_params, f, indent=4, default=str)

    print("\n" + "=" * 70)
    print("Training Complete.")
    print(f"Models saved to: {MODEL_DIR}")
    print(f"Run: python training/evaluate_models_v3.py  to compute fused AUC")
    print("=" * 70)


if __name__ == "__main__":
    main()