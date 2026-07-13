"""
Advanced Missing Data Imputation & Self-Supervised Embedding Engine.
Uses a Multi-Modal Autoencoder (17 -> 12 -> 6 -> 12 -> 17) to reconstruct
missing alt-data fields based on learned dependencies across GST, UPI, AA, and EPFO.
"""

from functools import lru_cache
from pathlib import Path
import json
import joblib
import numpy as np
import pandas as pd
from sklearn.neural_network import MLPRegressor
from sklearn.preprocessing import StandardScaler

from src.config import DATASET_PATH, MODEL_DIR

AUTOENCODER_PATH = MODEL_DIR / "autoencoder.pkl"
SCALER_PATH = MODEL_DIR / "imputation_scaler.pkl"
MEDIANS_PATH = MODEL_DIR / "imputation_medians.json"

IMPUTATION_FEATURES = [
    "gst_filing_consistency_pct",
    "gst_turnover_growth_rate",
    "gst_avg_monthly_turnover_inr",
    "gst_late_filing_count_12m",
    "upi_monthly_txn_count",
    "upi_avg_inflow_inr",
    "upi_inflow_volatility",
    "upi_bounce_rate_pct",
    "aa_avg_bank_balance_inr",
    "aa_trade_payable_days",
    "aa_cash_flow_ratio",
    "aa_emi_to_inflow_ratio",
    "aa_overdraft_utilization_pct",
    "epfo_employee_count",
    "epfo_contribution_consistency_pct",
    "epfo_avg_wage_inr",
    "epfo_employee_growth_rate",
]


# -----------------------------------------------------------------
# Load Imputation Artifacts
# -----------------------------------------------------------------

@lru_cache(maxsize=1)
def load_imputation_artifacts():
    """Loads autoencoder, scaler, and medians."""
    if not AUTOENCODER_PATH.exists() or not SCALER_PATH.exists() or not MEDIANS_PATH.exists():
        # Fallback values if not trained yet
        return None, None, {}
    
    mlp = joblib.load(AUTOENCODER_PATH)
    scaler = joblib.load(SCALER_PATH)
    with open(MEDIANS_PATH, "r") as f:
        medians = json.load(f)
    return mlp, scaler, medians


# -----------------------------------------------------------------
# Custom Layer weight forward propagation (Bottleneck extraction)
# -----------------------------------------------------------------

def _forward_pass(mlp, X_scaled: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    """
    Manual forward pass to extract intermediate layers.
    Architecture: (12, 6, 12)
      h1: Layer 0 -> Layer 1 (ReLU)
      embedding: Layer 1 -> Layer 2 (ReLU) [Bottleneck]
      h3: Layer 2 -> Layer 3 (ReLU)
      out: Layer 3 -> Output (Linear)
    """
    # Convert input to 2D if 1D
    X = np.atleast_2d(X_scaled)

    # Hidden 1 (size 12)
    h1 = np.dot(X, mlp.coefs_[0]) + mlp.intercepts_[0]
    h1 = np.maximum(h1, 0)  # ReLU

    # Bottleneck/Embedding (size 6)
    embedding = np.dot(h1, mlp.coefs_[1]) + mlp.intercepts_[1]
    embedding = np.maximum(embedding, 0)  # ReLU

    # Hidden 3 (size 12)
    h3 = np.dot(embedding, mlp.coefs_[2]) + mlp.intercepts_[2]
    h3 = np.maximum(h3, 0)  # ReLU

    # Output (size 17, Linear activation)
    out = np.dot(h3, mlp.coefs_[3]) + mlp.intercepts_[3]

    return embedding, out


# -----------------------------------------------------------------
# Public Imputation and Embedding API
# -----------------------------------------------------------------

def impute_and_embed(record: dict) -> tuple[dict, list[float]]:
    """
    Imputes missing values in record and extracts the self-supervised embedding.
    Only imputes missing fields if the corresponding data modality is registered/available.
    """
    mlp, scaler, medians = load_imputation_artifacts()
    
    # Initialize defaults
    default_embedding = [0.0] * 6
    
    if mlp is None or scaler is None or not medians:
        return record.copy(), default_embedding

    # Convert record dict to numpy array, identifying missing indices
    vec = np.zeros(len(IMPUTATION_FEATURES))
    missing_indices = []
    
    # Check registration status of modalities
    gst_avail = record.get("gst_registered", 0) == 1
    upi_avail = record.get("upi_available", 0) == 1
    aa_avail = record.get("aa_consent_given", 0) == 1
    epfo_avail = record.get("epfo_registered", 0) == 1

    feature_availabilities = {
        "gst_filing_consistency_pct": gst_avail,
        "gst_turnover_growth_rate": gst_avail,
        "gst_avg_monthly_turnover_inr": gst_avail,
        "gst_late_filing_count_12m": gst_avail,
        "upi_monthly_txn_count": upi_avail,
        "upi_avg_inflow_inr": upi_avail,
        "upi_inflow_volatility": upi_avail,
        "upi_bounce_rate_pct": upi_avail,
        "aa_avg_bank_balance_inr": aa_avail,
        "aa_trade_payable_days": aa_avail,
        "aa_cash_flow_ratio": aa_avail,
        "aa_emi_to_inflow_ratio": aa_avail,
        "aa_overdraft_utilization_pct": aa_avail,
        "epfo_employee_count": epfo_avail,
        "epfo_contribution_consistency_pct": epfo_avail,
        "epfo_avg_wage_inr": epfo_avail,
        "epfo_employee_growth_rate": epfo_avail,
    }

    for i, feat in enumerate(IMPUTATION_FEATURES):
        val = record.get(feat)
        if val is None or pd.isna(val) or pd.isnull(val):
            # Fill with complete-data median for the autoencoder pass
            vec[i] = medians.get(feat, 0.0)
            if feature_availabilities[feat]:
                missing_indices.append(i)
        else:
            vec[i] = float(val)

    # Convert to DataFrame with feature names to suppress warnings
    df_feat = pd.DataFrame([vec], columns=IMPUTATION_FEATURES)
    vec_scaled = scaler.transform(df_feat)
    
    # Forward pass through MLP to get embedding and reconstructed features
    embedding, reconstructed_scaled = _forward_pass(mlp, vec_scaled)
    
    # Inverse scale to original feature domain
    df_recon_scaled = pd.DataFrame(reconstructed_scaled, columns=IMPUTATION_FEATURES)
    reconstructed = scaler.inverse_transform(df_recon_scaled)[0]
    
    # Create copy of record and fill missing values ONLY for available modalities
    imputed_record = record.copy()
    for idx in missing_indices:
        feat = IMPUTATION_FEATURES[idx]
        imputed_record[feat] = round(float(reconstructed[idx]), 4)
        
    embedding_vector = [round(float(v), 4) for v in embedding[0]]
    return imputed_record, embedding_vector


# -----------------------------------------------------------------
# Model Training Logic
# -----------------------------------------------------------------

def train_autoencoder_model() -> dict:
    """
    Trains the Multi-Modal Autoencoder on the Gold-tier (complete cases) MSMEs.
    Saves scaler.pkl, autoencoder.pkl, and medians.json.
    """
    print("Loading data for Autoencoder training...")
    df = pd.read_csv(DATASET_PATH)
    
    # Standardize available pillars
    gst_avail = df["gst_registered"] == 1
    upi_avail = df["upi_available"] == 1
    aa_avail = df["aa_consent_given"] == 1
    epfo_avail = df["epfo_registered"] == 1
    
    # Filter for Gold records (All 4 available)
    gold_df = df[gst_avail & upi_avail & aa_avail & epfo_avail].copy()
    
    if len(gold_df) < 500:
        print(f"Warning: Only {len(gold_df)} complete cases found. Training on all records with column medians...")
        gold_df = df.copy().fillna(df.median(numeric_only=True))

    X_train = gold_df[IMPUTATION_FEATURES].apply(pd.to_numeric, errors="coerce")
    
    # Save overall complete case medians for inference fallbacks
    medians = X_train.median().to_dict()
    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    with open(MEDIANS_PATH, "w") as f:
        json.dump(medians, f, indent=4)
        
    print(f"Fitting StandardScaler on {len(X_train)} complete records...")
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X_train)
    joblib.dump(scaler, SCALER_PATH)
    
    # Instantiate Autoencoder hidden architecture (12 -> 6 -> 12)
    # Output layer size = 17 features
    print("Training MLP Autoencoder (17 -> 12 -> 6 -> 12 -> 17)...")
    mlp = MLPRegressor(
        hidden_layer_sizes=(12, 6, 12),
        activation="relu",
        solver="adam",
        max_iter=800,
        random_state=42,
        tol=1e-5,
        early_stopping=True,
        validation_fraction=0.1,
    )
    
    mlp.fit(X_scaled, X_scaled)
    joblib.dump(mlp, AUTOENCODER_PATH)
    
    # Compute reconstruction loss
    preds_scaled = mlp.predict(X_scaled)
    mse = float(np.mean((X_scaled - preds_scaled) ** 2))
    print(f"Training Complete. Reconstruction Mean Squared Error (MSE): {mse:.6f}")
    
    return {
        "complete_cases": len(gold_df),
        "reconstruction_mse": mse,
        "parameters": mlp.get_params(),
    }
