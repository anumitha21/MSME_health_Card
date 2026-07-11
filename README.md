    # IDBI MSME Sahay — AI-Powered Credit Underwriting & Alternative Credit Gateway

    An alternative credit underwriting console and borrower coaching gateway built for the **IDBI Innovate 2026 Hackathon**. The platform evaluates capital risk migration, PSL eligibility, and credit profiles by fusing alternative transactional data streams (GST, UPI, Account Aggregator, EPFO).

    ---

    ## 🚀 Key Features

    *   **Optimized XGBoost Risk Modeling**: Upgraded baseline classifiers to non-linear XGBoost estimators, achieving a peak **0.8014 Fused AUC** with native missing value splits.
    *   **Multi-Modal Autoencoder Embedding**: Uses a self-supervised autoencoder bottleneck layer `(17 -> 12 -> 6 -> 12 -> 17)` to extract 6D latent vector representations ($Z_0 \dots Z_5$) to monitor borrower drift.
    *   **Business Impact Hero Console**: Displays Alt-Data Onboarding volumes, derived Addressable Lending Exposure (scaled in Crores at a ₹15 Lakhs average multiplier), and PSL compliance counts.
    *   **Technical Accordion (Model Evidence)**: Wraps technical indices, rule knock-outs, and SHAP contributors under a collapsible accordion styled in evidence-teal, featuring a single-run animated gold ECG pulse overlay on load.
    *   **Dynamic ULI consent Registry**: Compiles dynamic JSON payload blocks dynamically using active database row lookups rather than hardcoded mock objects.
    *   **Conditional Completeness Coach**: Identifies missing data sources, runs autoencoder simulations to estimate point lift, and automatically filters out negative-gain results.

    ---

    ## ❄️ Model Freeze Warning (Submission Critical)

    > [!WARNING]
    > The trained model pickle files in `models_v3/` are **frozen and final** for submission. 
    > Do **NOT** run the training scripts `python training/train_models_v3.py` or `python training/train_autoencoder.py`. 
    > Since these scripts utilize randomized search iterations and Adam optimizers, re-running them will stochastically shift model weights, decision boundaries, and imputed EPFO scores. A backup of the frozen artifacts is securely stored at `models_v3_frozen_backup/`.

    ---

    ## 📂 Project Structure

    ```
    MSME/
    ├── api/
    │   └── main.py             # FastAPI entry points
    ├── src/
    │   ├── config.py           # Core constants & path variables
    │   ├── imputation.py       # Autoencoder forward pass & training logic
    │   ├── portfolio.py        # Portfolio simulations & PSL statistics
    │   ├── rules.py            # Rule engine criteria (Auto-Approve/Manual/Reject)
    │   ├── scoring.py          # Pillar scoring & completeness gap simulations
    │   └── uli.py              # ULI registry data block builders
    ├── training/
    │   ├── train_models_v3.py  # XGBoost training runner (Do not run!)
    │   ├── train_autoencoder.py# Autoencoder training runner (Do not run!)
    │   └── evaluate_models_v3.py# Evaluates AUC metrics on scored_portfolio_v3.csv
    ├── data/
    │   └── msme_alternate_data_synthetic.csv   # Synthetic borrower database
    ├── models_v3/              # Frozen model pickle artifacts
    ├── models_v3_frozen_backup/# Secure backup of the frozen models
    └── frontend/               # React + Vite dashboard web application
    ```

    ---

    ## 🛠️ Installation & Setup

    ### 1. Backend Server Setup
    Ensure Python 3.11+ is active in your terminal. From the root directory:
    ```bash
    # Activate virtual environment
    .venv/Scripts/activate

    # Install dependencies
    pip install -r requirements.txt

    # Start the FastAPI server (runs on port 8000)
    uvicorn api.main:app --reload
    ```

    ### 2. Frontend Application Setup
    From the `frontend` directory:
    ```bash
    # Install Node modules
    npm install

    # Start the local development server (runs on port 5173)
    npm run dev

    # Compile assets for production build
    npm run build
    ```

    ---

    ## 🔌 API Gateway Endpoints

    ### Scoring & Auditing
    *   `GET /score/{enterprise_id}`: Looks up the CSV row for the enterprise, runs XGBoost evaluations, and returns pillar scores, fused score, SHAP contributors, embeddings, and verdict flags.
    *   `POST /score/custom`: Same as above, but allows the lender to override the default weights mapping (`GST: 0.35`, `UPI: 0.25`, `AA: 0.30`, `EPFO: 0.10`).

    ### Borrower Gaps & Integration
    *   `GET /borrower/completeness-gap/{enterprise_id}`: Runs autoencoder completeness simulations, returning projected scores/tiers for missing sources that yield positive score-gaps.
    *   `GET /uli/payload/{enterprise_id}`: Compiles standard-compliant digital consent payloads dynamically from database parameters.

    ### Portfolio Analysis
    *   `GET /portfolio/summary`: Aggregates active exposure, averages, defaults, and coverage rates.
    *   `GET /portfolio/inclusion-impact`: Aggregates Alt-Data onboarding statistics and PSL healthy-tier breakdowns.
    *   `POST /portfolio/simulate-stress`: Performs capital risk migrations and default projections under macroeconomic shocks.

    ---

    ## 📊 Technical Performance Matrix

    | Configuration / Modality Strategy | Fused Model AUC | Delta vs. Baseline | Impact & Rationale |
    | :--- | :---: | :---: | :--- |
    | **Baseline (Logistic Regression)** | 0.7609 | -- | Standard median imputation of missing features. |
    | **XGBoost + Pure Autoencoder Imputer** | 0.7723 | +0.0114 | Replaces all missing values with reconstructed features. Dilutes the informative "missingness" signal that trees rely on. |
    | **XGBoost + Modality-Aware Imputer** | 0.7873 | +0.0264 | Imputes missing fields only if the modality is registered. Preserves tree-level NaN splits for unregistered pillars. |
    | **Optimized Hybrid (Production)** | **0.8014** | **+0.0405** | Passes raw records with NaNs to XGBoost to maintain peak prediction splits, while extracting 6D embeddings for UI drift tracking. |