# MSME Credit Gateway — Project Changes Log (Updated)

Here is the log of all the updates, visual redesigns, backend enhancements, and bug fixes applied to the IDBI ULI Alternate Credit Gateway.

---

## 1. Visual Redesign & Typography Overhaul
*   **Stone Light Theme (Previous Pass)**: Shifted the initial layout from a dark neon template to a stone light theme with navy primary fonts, custom serif headings (`Fraunces`), and monospace values.
*   **Vite Compiler Fix**: Cleaned up React imports to resolve strict TypeScript warnings (`TS6133`) under `noUnusedLocals: true`, ensuring production assets compile with 0 warnings.
*   **Sleek Dark Vault Theme (Current Pass)**: Fully re-themed the portal to a premium graphite dark theme (`#0B0F14` canvas background, `#141A22` card surfaces, and `#232B36` hairline borders).
*   **Borrower Mobile Bezel and Contrast Fix**: Shifted the `.mobile-device` and `.mobile-screen` backgrounds from cream white (`#FAFAF9`) to the vault background (`var(--bg)`), resolving contrast issues where off-white text values clashed on light backgrounds.
*   **Stress Testing Selects and Sliders**: Configured dropdown select boxes with high-contrast surfaces (`#141A22` / `var(--surface-hi)`) and styled range slider thumbs (`::-webkit-slider-thumb`) in evidence-teal (`var(--accent)`).

---

## 2. Integrated Visual Vitals & ECG Pulses
*   **KPI Sparklines**: Integrated inline SVG sparklines under the portfolio summary cards to represent financial trends.
*   **ECG Pulse-Line Overlay**: Added a dual-path ECG animation where a golden pulse overlays and travels once along a static teal path on page load, visually representing the dynamic data ingestion streams.
*   **Monospace Columns**: Restyled the portfolio sector concentration table with monospace default rates and neat risk status tags.

---

## 3. Dynamic Consent-Registry Parser (Syntax Highlighting)
*   **Registry Output Styling**: Implemented `renderJson()` in `App.tsx` to parse the gateway consent registry JSON payloads.
*   *Key Highlighting*: Highlights JSON keys in primary trust navy or evidence-teal.
*   *Value Styling*: Automatically styles string tokens in teal and numeric metrics in bold mono styling.

---

## 4. Extended Translation Engine (Hindi Toggle)
*   **Credit Coach Suggestions**: Created `getTranslatedRecommendation()` to dynamically parse and translate the backend's Actionable Credit Coach recommendations to Hindi when the global translation toggle is flipped.
*   **Data Extraction & Alignment**: The parser extracts real-time statistics (such as count of late filings, overdraft utilization ratios, and cash flow coverage values) from the English string payload and interpolates them cleanly into the Hindi translation equivalents.

---

## 5. Double Sign Formatting Fix (`+-` bug)
*   **Point-Gain Badges**: Resolved the formatting bug on the borrower's completeness checklist cards where point-gains rendered as `+-1.3 pts`. Prepending the positive sign `+` is now conditional:
    ```tsx
    {gap.estimated_point_gain >= 0 ? '+' : ''}{gap.estimated_point_gain.toFixed(1)} pts
    ```
    This ensures that positive changes show `+X.X pts` and negative changes show `-X.X pts` without sign duplication.

---

## 6. Business Impact Hero Console
*   **Hero Card Integration**: Placed a new full-width gold-accented top card highlighting the Alt-Data Onboarding volume, derived rupee Crore exposure (at a ₹15L average multiplier), and PSL compliance counts. 
*   **KPI Row Demotion**: Demoted the secondary portfolio aggregate cards to a smaller 4-column stats row.
*   **Collapsible Technical Evidence**: Wrapped Gauges, verdict metadata, 6D embeddings, and SHAP charts inside a collapsible subheader section.

---

## 7. Dynamic ULI Payloads
*   **Dynamic Gateway Blocks**: Upgraded `/uli/payload/{enterprise_id}` in `api/main.py` and `get_uli_consent_profile` in `src/uli.py` to query the database row from `data/msme_alternate_data_synthetic.csv` dynamically, mapping the actual GST filing, UPI bounce, AA balance, and EPFO employee values of the search target rather than returning a static mock record.

---

## 8. Point-Gain Logic & EPFO Modality Resolution (Autoencoder)
*   **The Autoencoder Drop Rationale**: 
    *   In the synthetic dataset CSV, `MSME100001` is missing EPFO (`epfo_registered = 0`).
    *   Simulating EPFO connection triggers the **Multi-Modal Autoencoder** to reconstruct EPFO features based on GST, UPI, and AA metrics.
    *   Under the currently trained XGBoost model parameters on disk, these reconstructed features are evaluated as an EPFO score contribution of **`63.1`** (which is lower than the active Silver average of `77.8`).
    *   Fusing this fourth pillar pulls the overall score down to **`76.5`** (resulting in a **`-1.3`** drop).
*   **Generic Gain Filter**: To prevent recommending score-decreasing actions to borrowers, we implemented an application-level filter in `get_completeness_gap` (`src/scoring.py`) that filters out any missing sources with `estimated_point_gain <= 0`.
*   **UI Fallbacks**: If all missing sources for a borrower are simulated to yield zero or negative gains, the gaps list returns empty `[]` and displays the informational message: `"No further score improvements are projected from additional data source connections."`
*   **Verification**: Verified across multiple missing-source combinations (`MSME100001`, `MSME100006`, and `MSME100020`), confirming the threshold filters out negative results generics-wide. All backend integration tests pass.

---

## 9. Full-Stack Real-Time Context Sync & Backend Integration
*   **FastAPI Alternate-Data API**: Appended GET `/enterprise/{id}` endpoint in uvicorn to fetch raw parameters from the CSV synthetic database row.
*   **Vite Global React Context Provider**: Created `CreditDataContext.tsx` to handle parallel data queries (`fetchScoreById`, `fetchTrend`, and `fetchEnterpriseRecord`) when the user selects a different MSME.
*   **NavBar Selector select dropdown**: Mounted a corporate MSME dropdown menu in the navbar (`NavBar.tsx`) for global real-time profile shifting.
*   **Dashboard Dynamic Bindings**:
    *   *Borrower Dashboard*: Connected score meters to context outputs, SHAP drivers to dynamic strengths/risks, and coach advices to model recommendation payloads.
    *   *Banker Dashboard*: Integrated checkmarks for knock-out rules, dynamic PD ratios, and live Gemini-generated audit justifications.
    *   *Drill-down Dashboard*: Connected heatmaps and filing calendar counts to raw feature parameters.
    *   *Simulator Dashboard*: Debounces slider changes and posts weight arrays directly to `/score/custom` on the live ML model, updating scores instantly.
*   **Robust Failsafe Catch Handler**: Added try-catch blocks to prevent screen freezes, falling back to mock data if the backend server is run without reload or uvicorn caching old routes.
