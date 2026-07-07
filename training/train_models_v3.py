"""
Train four independent MSME Health Card models.

Models:
    GST
    UPI
    AA
    EPFO

Outputs:
    models_v3/
        gst_model.pkl
        upi_model.pkl
        aa_model.pkl
        epfo_model.pkl

        gst_imputer.pkl
        upi_imputer.pkl
        aa_imputer.pkl
        epfo_imputer.pkl

        feature_groups.json
        fusion_weights.json
        metrics.json
"""

import sys
from pathlib import Path

# Add project root to sys.path to allow importing from src
sys.path.append(str(Path(__file__).resolve().parents[1]))

import json
import joblib
import pandas as pd

from sklearn.impute import SimpleImputer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import roc_auc_score
from sklearn.model_selection import train_test_split

from src.config import (
    DATASET_PATH,
    MODEL_DIR,
    FEATURE_GROUPS,
    FUSION_WEIGHTS,
    TARGET_COLUMN,
    model_path,
    imputer_path,
    save_feature_groups,
    save_fusion_weights,
)


RANDOM_STATE = 42


def load_dataset():
    df = pd.read_csv(DATASET_PATH)

    # Convert every feature column to numeric safely
    for cfg in FEATURE_GROUPS.values():
        cols = cfg["features"]
        df[cols] = df[cols].apply(pd.to_numeric, errors="coerce")

    return df


def train_single_model(df, group_name, cfg, train_idx, test_idx):

    features = cfg["features"]
    availability_flag = cfg["availability_flag"]

    pillar_df = df[df[availability_flag] == 1].copy()

    X = pillar_df[features]
    y = pillar_df[TARGET_COLUMN]

    imputer = SimpleImputer(strategy="median")
    X = imputer.fit_transform(X)

    train_mask = pillar_df.index.isin(train_idx)
    test_mask = pillar_df.index.isin(test_idx)

    X_train = X[train_mask]
    X_test = X[test_mask]

    y_train = y[train_mask]
    y_test = y[test_mask]

    model = LogisticRegression(
        max_iter=1000,
        class_weight="balanced",
        random_state=RANDOM_STATE,
    )

    model.fit(X_train, y_train)

    train_auc = roc_auc_score(
        y_train,
        model.predict_proba(X_train)[:, 1],
    )

    test_auc = roc_auc_score(
        y_test,
        model.predict_proba(X_test)[:, 1],
    )

    joblib.dump(model, model_path(group_name))
    joblib.dump(imputer, imputer_path(group_name))

    return {
        "pillar": group_name,
        "n_train_available": int(train_mask.sum()),
        "pct_of_book": round(
            len(pillar_df) / len(df) * 100,
            1,
        ),
        "default_rate_in_subset": round(float(y.mean()), 4),
        "train_auc": round(float(train_auc), 4),
        "test_auc": round(float(test_auc), 4),
        "n_features": len(features),
    }


def main():

    print("=" * 70)
    print("MSME HEALTH CARD MODEL TRAINING V3")
    print("=" * 70)

    df = load_dataset()

    train_idx, test_idx = train_test_split(
        df.index,
        test_size=0.20,
        stratify=df[TARGET_COLUMN],
        random_state=RANDOM_STATE,
    )

    metrics = {}

    for group_name, cfg in FEATURE_GROUPS.items():

        print(f"\nTraining {group_name.upper()} model...")

        result = train_single_model(
            df,
            group_name,
            cfg,
            train_idx,
            test_idx,
        )

        metrics[group_name] = result

        print(
            f" Train AUC : {result['train_auc']:.4f}\n"
            f" Test  AUC : {result['test_auc']:.4f}\n"
            f" Rows Used : {result['n_train_available']}"
        )

    save_feature_groups()
    save_fusion_weights()

    with open(MODEL_DIR / "metrics.json", "w") as f:
        json.dump(metrics, f, indent=4)

    print("\nTraining Complete.")
    print(f"Models saved to: {MODEL_DIR}")


if __name__ == "__main__":
    main()