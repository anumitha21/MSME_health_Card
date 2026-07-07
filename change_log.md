# MSME Health Card — Model Optimization & ULI Implementation Changelog

This document provides a comprehensive log of the updates made to the MSME Health Card project, from initial model upgrades and accuracy enhancements to the recent dual-dashboard ULI-OCEN console implementation.

---

## 1. Machine Learning Model Optimization (Baseline vs. v3 XGBoost)

We upgraded the alternative credit underwriting models from baseline **Logistic Regression** estimators to optimized, non-linear **XGBoost Classifier** models.

### Key Architecture Enhancements
*   **Hyperparameter Search**: Integrated `RandomizedSearchCV` (5-fold stratified cross-validation, 30 search iterations per data pillar) to find optimal parameters (`max_depth`, `n_estimators`, `learning_rate`, `subsample`, etc.).
*   **Native Missing Value Handling**: Leveraged XGBoost's native split-direction optimization for `NaN` values, removing the need for manual imputation steps that distort raw feature statistics.
*   **Addressing Class Imbalance**: Set dynamic `scale_pos_weight` based on the negative-to-positive ratio in the training subsets to improve sensitivity on rare default flags.
*   **Feature Engineering**: Added cross-pillar interaction features and global business metadata features:
    *   `tax_to_income_ratio`: Relative GST scale vs. UPI cash inflows.
    *   `financial_leverage`: AA EMI burden relative to GST turnover growth rate.
    *   `wage_leverage`: Total EPFO payroll obligations relative to active AA bank balances.

### Performance & Accuracy Gains (AUC Metrics)
The XGBoost upgrade significantly improved underwriting accuracy across all alt-data source pillars:

| Pillar / Model | Baseline AUC (Logistic Regression) | New AUC (XGBoost v3) | Change (Delta) | Portfolio Coverage |
| :--- | :---: | :---: | :---: | :---: |
| **GST Pillar** | 0.7659 | 0.7970 | **+0.0311** | 60.86% |
| **UPI Pillar** | 0.7348 | 0.7938 | **+0.0590** | 80.05% |
| **AA Pillar** | 0.7686 | 0.8019 | **+0.0333** | 48.68% |
| **EPFO Pillar** | 0.7812 | 0.8211 | **+0.0399** | 25.26% |
| **FUSED MODEL** | **0.7609** | **0.8014** | **+0.0405** | **97.37%** |

---

## 2. Backend API Modifications (FastAPI Router v3.2)

We transitioned the backend from a static scorer to a live decisioning and simulation router.

### Underwriting & Score Enhancements
*   **Confidence Intervals**: Implemented dynamic low/high score margins based on alt-data completeness:
    *   *Gold*: $\pm 3.0$ points (all 4 sources present)
    *   *Silver*: $\pm 6.0$ points (GST + UPI + AA)
    *   *Bronze*: $\pm 10.0$ points ($\ge 2$ sources present)
    *   *Minimal*: $\pm 15.0$ points (1 source present)
*   **Hard Knock-Out Rule Engine**: Integrated regulatory & solvency checks (EMI burden > 50%, Overdraft utilization > 85%, UPI bounce rate > 15%, GST late filings $\ge$ 6 in 12 months) that run before ML inference to instantly flag or reject high-risk borrowers.
*   **Actionable Borrower Coach**: Added a rule parser translating negative SHAP feature contributions into custom suggestions detailing exact potential score gains (e.g. *“File GSTR-3B on time for 3 consecutive months to gain +8.0 points”*).
*   **SHAP Safety Checks**: Added validation checks to bypass SHAP computations when `explain=False` is requested (optimized simulation runs), preventing runtime errors.

### ULI & OCEN Integrations
*   **Consent Payload Endpoint**: Created a `GET /uli/payload/{enterprise_id}` route formatting scoring output into secure, ULI Consent-Driven Information Provider (IP) metadata schemas.

### Macroeconomic Stress Simulation
*   **Simulator Endpoint**: Built a `/portfolio/simulate-stress` POST endpoint that applies macro shocks (revenue shock, liquidity stress, or leverage surge) across matching portfolio sectors to evaluate migration across risk tiers and default flags.
*   **Robust Input Schemas**: Updated `StressSimulationRequest` to dynamically map both frontend payloads (`stress_type`, `severity_pct`) and curl commands (`turnover_shock_pct`, `stress_pct`) seamlessly.
*   **Portfolio Loading Bug Fix**: Resolved a `KeyError: 'gst_registered'` by joining pre-computed `scored_portfolio_v3.csv` with original features from `msme_alternate_data_synthetic.csv`.

---

## 3. UI Console Enhancements (Vite & React)

Built a dual-interface console supporting lender auditing and borrower credit coaching.

*   **Lender Dashboard**: Includes total exposure metrics, portfolio average score, sector heatmap summaries, live stress-testing panel sliders with comparison views, and raw ULI consent JSON schema inspectors.
*   **Borrower Mobile App**: Displays a simulated mobile screen with language translation (English/Hindi), continuous Early Warning System (EWS) trend flags, and a prioritized coach task list showing point rewards.
*   **Global Command Bar**: Integrated global `Ctrl + K` modal dialog box allowing lenders to search and jump to any MSME record in the portfolio instantly.
*   **TypeScript Verification**: Cleaned up unused React hook variables and imports to ensure successful build compilation with Vite.

---

## 4. Multi-Modal Autoencoder & Self-Supervised Embedding Engine

We designed, trained, and integrated a 4-layer neural network autoencoder pipeline to compress multi-modal alternative features, extract deep self-supervised credit embeddings, and optimize missing data handling.

### Key Architecture Details
*   **Neural Network Topology**: The autoencoder uses an MLP structure: `17 -> 12 -> 6 -> 12 -> 17` units.
    *   **Input Layer (17D)**: Receives the full suite of continuous alternative credit features across GST, UPI, Account Aggregator (AA), and EPFO.
    *   **Encoder Layer 1 (12D)**: Reduces dimensionality, learning basic linear and non-linear combinations of intra-pillar features.
    *   **Bottleneck Layer (6D)**: Compresses all features into a 6-dimensional latent representation ($Z_0, Z_1, Z_2, Z_3, Z_4, Z_5$) representing the self-supervised credit profile embedding.
    *   **Decoder Layer 3 (12D)**: Reconstructs the compressed features.
    *   **Output Layer (17D)**: Approximates the original input features.
*   **Activation Functions**: Hidden layers use Rectified Linear Units (ReLU):
    $$f(x) = \max(0, x)$$
    The output layer uses a linear identity activation to reconstruct the scale of continuous values.
*   **Self-Supervised Training**: Trained on Complete-Data (Gold tier) MSME records (~753 enterprises with all 4 modalities registered) using the Adam optimizer with early stopping. Saves parameters to `autoencoder.pkl` and standardizer values to `imputation_scaler.pkl`. Achieved a final Reconstruction Mean Squared Error (MSE) of **0.1587** (scaled).

### Mathematical Bottleneck Extraction
Since scikit-learn's `MLPRegressor` does not natively expose activations of hidden layers, we extract the fitted weight matrices ($W_i$) and intercept vectors ($B_i$) and execute manual forward propagation in NumPy to extract the 6D embedding:
1.  **First Hidden Layer (12D)**:
    $$H_1 = \max(0, X_{\text{scaled}} \cdot W_0 + B_0)$$
2.  **Bottleneck Layer (6D Embedding)**:
    $$Z = \max(0, H_1 \cdot W_1 + B_1)$$
3.  **Third Hidden Layer (12D)**:
    $$H_3 = \max(0, Z \cdot W_2 + B_2)$$
4.  **Reconstruction (17D Scaled Features)**:
    $$X_{\text{recon\_scaled}} = H_3 \cdot W_3 + B_3$$

---

## 5. Inference Architecture & AUC Accuracy Benchmarks

We evaluated the classification accuracy (AUC) of the Fused Underwriting Model across the entire 12,000-business portfolio under three different missing-data imputation strategies to determine the optimal production pipeline.

### AUC Performance Matrix

| Configuration / Modality Strategy | Fused Model AUC | Delta vs. Baseline | Impact & Rationale |
| :--- | :---: | :---: | :--- |
| **Baseline (Logistic Regression)** | 0.7609 | -- | Standard median imputation of missing features. |
| **XGBoost + Pure Autoencoder Imputer** | 0.7723 | +0.0114 | Replaces all missing values with reconstructed features. Dilutes the informative "missingness" signal that trees rely on. |
| **XGBoost + Modality-Aware Imputer** | 0.7873 | +0.0264 | Imputes missing fields only if the modality is registered. Preserves tree-level NaN splits for unregistered pillars. |
| **Optimized Hybrid (Production)** | **0.8014** | **+0.0405** | Passes raw records with NaNs to XGBoost to maintain peak prediction splits, while extracting 6D embeddings for UI drift tracking. |

### Rationale for the Optimized Hybrid Solution
1.  **The Predictive Risk of Missingness**: XGBoost learns optimal tree split directions for missing values (`NaN`). The absence of a modality (e.g., a borrower not consenting to Account Aggregator) is an informative behavioral marker of enterprise size, financial sophistication, or credit default risk. Overwriting these `NaN`s with continuous reconstructed values dilutes this strong category split, resulting in lower predictive AUC.
2.  **Best-of-Both-Worlds Solution**: 
    *   We run the autoencoder pipeline on incoming records *solely* to generate the **6D latent vector** ($Z_0 \dots Z_5$) returned via the API and shown in the UI.
    *   We feed the raw features (with original `NaN`s intact) to the XGBoost inference models. This maintains our peak predictive accuracy of **0.8014 Fused AUC** while delivering the full drift-tracking capabilities of self-supervised representations.

### Production Implementations
*   **FastAPI API Schema**: Extended the `/score` response model to return `self_supervised_embedding: list[float]`.
*   **Lender Dashboard**: Added a dedicated latent space panel showing the raw $Z$-values inside the underwriting card.
*   **TypeScript Compilation**: Cleaned up React imports to build production assets under Vite with 0 errors.


