"""
Training runner for the Multi-Modal Autoencoder & Embedding Engine.
"""

import sys
from pathlib import Path

# Setup paths
sys.path.append(str(Path(__file__).resolve().parents[1]))

from src.imputation import train_autoencoder_model

def main():
    print("=" * 75)
    print("MSME HEALTH CARD — AUTOENCODER & SELF-SUPERVISED EMBEDDING TRAINING")
    print("=" * 75)
    try:
        metrics = train_autoencoder_model()
        print("\n" + "=" * 75)
        print("Training succeeded!")
        print(f"Complete Cases Used    : {metrics['complete_cases']}")
        print(f"Reconstruction MSE (scaled): {metrics['reconstruction_mse']:.6f}")
        print("=" * 75)
    except Exception as e:
        print(f"\nTraining failed with error: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    main()
