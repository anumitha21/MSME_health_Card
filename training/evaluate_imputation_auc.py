"""
Fast evaluation script for MSME Health Card AUC under Autoencoder Imputation.
"""

import sys
from pathlib import Path
import warnings

# Setup paths
sys.path.append(str(Path(__file__).resolve().parents[1]))

# Suppress sklearn/numpy feature names warnings for clean output and fast I/O
warnings.simplefilter("ignore")

import pandas as pd
from sklearn.metrics import roc_auc_score
from src.scoring import score_business

def main():
    print("=" * 75)
    print("MSME HEALTH CARD — ACCURACY EVALUATION (AUTOENCODER)")
    print("=" * 75)
    
    # Load dataset
    print("Loading dataset...")
    df = pd.read_csv("data/msme_alternate_data_synthetic.csv")
    
    # Sample 2000 rows for fast evaluation
    sample_df = df.sample(2000, random_state=42)
    
    print("Scoring 2,000 records with Autoencoder Imputer...")
    scores = []
    for _, row in sample_df.iterrows():
        res = score_business(row.to_dict(), explain=False)
        scores.append(res["overall_score"])
        
    sample_df["overall_score"] = scores
    eval_df = sample_df.dropna(subset=["overall_score"])
    
    # Calculate AUC
    auc = roc_auc_score(eval_df["default_flag"], 100 - eval_df["overall_score"])
    
    print("\n" + "=" * 75)
    print("Accuracy Results:")
    print(f"Number of Scored Records : {len(eval_df)}")
    print(f"Baseline Fused AUC       : 0.7609")
    print(f"XGBoost v3 Fused AUC     : 0.8014")
    print(f"XGBoost + Autoencoder AUC: {auc:.4f}")
    print("=" * 75)

if __name__ == "__main__":
    main()
