# CreditPulse AI — AI-Powered Credit Underwriting & Alternative Credit Gateway

**IDBI MSME Sahay** is a production-grade alternative credit underwriting console and borrower coaching gateway developed for the **IDBI Innovate 2026 Hackathon**. The platform evaluates capital risk migration, Priority Sector Lending (PSL) eligibility, and alternative credit profiles by fusing transactional data streams—GST, UPI, Account Aggregator (AA), and EPFO—into a single, explainable credit health metric.

By transitioning from traditional paper-based/bureau-only assessment to digital, consent-driven alternate data pipelines, the system lowers underwriting thresholds for New-to-Credit (NTC) and New-to-Bank (NTB) borrowers while keeping portfolio credit risks secure.

---

## 🚀 Key Features Implemented

The platform is designed around two core interfaces: the **Lender Console** (for underwriting, compliance, and risk simulation) and the **Borrower Mobile Gateway** (for credit education and profile optimization).

### 1. Advanced Alternate Credit Underwriting
*   **Multi-Pillar Credit Scoring**: Independently scores alternative datasets (GST filings, UPI transactions, Account Aggregator balances, EPFO payroll consistency) using optimized, pillar-specific XGBoost estimators.
*   **Weighted Data Fusion**: Consolidates active data pillars into a single score based on normalized weights (default: GST: 35%, UPI: 25%, AA: 30%, EPFO: 10%).
*   **Completeness Confidence Bands**: Automatically estimates score volatility and assigns a rating range based on available source registry coverage:
    *   *Gold* ($\pm 3.0$ points range): GST + UPI + AA + EPFO connected.
    *   *Silver* ($\pm 6.0$ points range): GST + UPI + AA connected.
    *   *Bronze* ($\pm 10.0$ points range): At least 2 sources connected.
    *   *Minimal* ($\pm 15.0$ points range): 1 source connected.

### 2. Hard Solvency & Regulatory Knock-Out Rules
Implements immediate underwriting vetoes before ML inference runs, matching Reserve Bank of India (RBI) and NBFC prudential limits:
*   **High Debt Burden**: Rejects if EMI-to-inflow ratio exceeds 50%.
*   **Overdraft Exhaustion**: Rejects if overdraft utilization exceeds 85%.
*   **High UPI Bounce Rate**: Rejects if transaction bounce rate exceeds 15%.
*   **Regulatory Non-Compliance**: Rejects if late GST filings are $\ge 6$ in the past 12 months.

### 3. Explainable AI (XAI) & Automated Justification
*   **SHAP Force Driver Attribution**: Extracts local feature contributions to display positive and negative score drivers in real-time.
*   **Audit-Ready GenAI Rationale**: Integrates Google Gemini API to analyze the credit scores, SHAP values, and rules logs, generating an automated audit statement to justify underwriting decisions for credit committees.

### 4. Interactive Portfolio Management & Stress Testing
*   **Portfolio Health Dashboard**: Visualizes exposure distribution, sector heatmaps, default rates, and alternate-data coverage across the bank's active portfolio.
*   **Financial Inclusion Funnel**: Quantifies the percentage and volume of NTC/NTB borrowers onboarded exclusively via alternate data streams.
*   **Macroeconomic Shock Simulator**: Models risk migration across portfolios under severe turnover shocks, liquidity crunches, or leverage surges.

### 5. Borrower Coaching & Ecosystem Integration
*   **Actionable Credit Coach**: Translates negative SHAP drivers into prioritized tasks showing direct projected point increases (e.g., filing returns on time).
*   **Bilingual Translation**: Fully supports on-the-fly toggling between English and Hindi across the mobile device screen, translating static UI labels and dynamic completeness recommendations.
*   **Completeness Gap Insight**: Simulates missing source connections using a multi-modal neural network autoencoder to project potential score upgrades and confidence tier jumps.
*   **ULI Consent Gateway**: Formats data sharing metadata structures compliant with the standard Unified Lending Interface (ULI) and OCEN JSON specifications.

---

## 📊 Technical Performance & Accuracy Benchmarks

We evaluated the classification accuracy (Area Under the ROC Curve - AUC) of the Fused Underwriting Model across the entire 12,000-business portfolio under three different missing-data imputation strategies to determine the optimal production pipeline.

### Model Accuracy Board

| Data Modality / Configuration | Baseline AUC (Logistic Regression) | Production AUC (XGBoost v3) | Change (Delta) | Portfolio Coverage |
| :--- | :---: | :---: | :---: | :---: |
| **GST Pillar** | 0.7659 | 0.7974 | **+0.0315** | 60.86% |
| **UPI Pillar** | 0.7348 | 0.7939 | **+0.0591** | 80.05% |
| **AA Pillar** | 0.7686 | 0.8019 | **+0.0333** | 48.68% |
| **EPFO Pillar** | 0.7812 | 0.8210 | **+0.0398** | 25.26% |
| **FUSED MODEL** | **0.7609** | **0.8016** | **+0.0407** | **97.37%** |

### Imputation Strategies & Rationale

We benchmarked three different missing-data handling techniques to find the optimal inference configuration for the final model:

| Strategy | Imputation Approach | Fused Model AUC | Delta vs. Baseline | Rationale & Practical Impact |
| :--- | :--- | :---: | :---: | :--- |
| **Baseline** | Median Imputation | 0.7609 | -- | Fills missing features with cohort-wide medians. Standard median imputation masks category variances. |
| **Pure Autoencoder** | Full Reconstruction | 0.7723 | +0.0114 | Replaces all missing values with autoencoder reconstructions. Dilutes the informative "missingness" signal that XGBoost trees rely on. |
| **Modality-Aware Autoencoder** | Conditional Imputation | 0.7873 | +0.0264 | Reconstructs missing features conditionally only if the parent pillar is registered/available. Preserves NaN splits for unregistered pillars. |
| **Optimized Hybrid (Production)** | Native `NaN` Splits + Latent Embeddings | **0.8016** | **+0.0407** | Passes raw metrics with `NaN`s directly to XGBoost to maximize prediction splits, using the autoencoder's 6D bottleneck vector ($Z_0 \dots Z_5$) exclusively for UI drift tracking and completeness simulations. |

---

## 📂 Project Structure

```
MSME/
├── api/
│   └── main.py             # FastAPI REST endpoints & route bindings
├── src/
│   ├── config.py           # Core variables, feature mapping, and weights
│   ├── imputation.py       # MLP Autoencoder model forward pass & training logic
│   ├── portfolio.py        # Aggregation statistics, default rates, and stress simulation
│   ├── rules.py            # Hard regulatory knock-out rules & underwriting decision matrix
│   ├── scoring.py          # Pillar inference, SHAP explanations, and completeness gaps
│   ├── trend.py            # Early Warning System (EWS) 3-period velocity tracking
│   └── uli.py              # ULI/OCEN metadata block payload builders
├── training/
│   ├── train_models_v3.py  # XGBoost cross-validation training script (Do not run!)
│   ├── train_autoencoder.py# MLP Autoencoder training script (Do not run!)
│   ├── evaluate_models_v3.py# Compiles ROC AUC validation metrics on portfolio
│   └── evaluate_imputation_auc.py # Compiles AUC metrics with autoencoder imputation
├── data/
│   └── msme_alternate_data_synthetic.csv   # Unified synthetic borrower database
├── models_v3/              # Active serialized models & standardizers
├── models_v3_frozen_backup/# Secure duplicate backup of submission-ready models
└── frontend/               # React + TypeScript + Vite dashboard application
```

---

## 🛠️ Installation & Setup

Ensure Python 3.11+ and Node.js v18+ are installed.

### 1. Backend Server Setup
From the project root directory:
```bash
# Activate the virtual environment
.venv\Scripts\activate

# Install required Python dependencies
pip install -r requirements.txt

# Start the FastAPI Uvicorn server (defaults to port 8000)
uvicorn api.main:app --reload
```

### 2. Frontend Console Setup
From the `frontend` directory:
```bash
# Install node packages
npm install

# Start the local development server (runs on port 5173)
npm run dev

# Compile assets for static deployment
npm run build
```

---

## 🔌 API Gateway Specifications

*   `GET /score/{enterprise_id}`: Fetches metrics, runs multi-pillar credit evaluations, retrieves SHAP drivers, extracts 6D embeddings, and fetches Gemini audit justifications.
*   `POST /score/custom`: Performs custom credit scoring using lender-defined pillar weights.
*   `GET /borrower/completeness-gap/{enterprise_id}`: Simulates connections of missing streams, outputting estimated point boosts and confidence range contractions.
*   `GET /trend/{enterprise_id}`: Computes MoM credit velocity for the selected enterprise and calls Gemini to report early warning diagnostics.
*   `GET /uli/payload/{enterprise_id}`: Compiles standard-compliant JSON payloads for the Unified Lending Interface gateway.
*   `POST /portfolio/simulate-stress`: Performs sector-specific macroeconomic stress testing simulations.
