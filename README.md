# MSME Health Card

An AI-powered MSME Financial Health Card that estimates the financial health of small businesses using alternative data sources.

## Features

- GST Health Model
- UPI Behaviour Model
- Account Aggregator Model
- EPFO Employment Model
- Dynamic Score Fusion
- FastAPI REST API
- Automatic handling of missing data

---

## Project Structure

```
msme-health-card/

api/
src/
training/
data/
models_v3/
```

---

## Training

```bash
python training/train_models_v3.py
```

---

## Evaluation

```bash
python training/evaluate_models_v3.py
```

---

## Run API

```bash
uvicorn api.main:app --reload
```

Open

```
http://127.0.0.1:8000/docs
```

---

## API Example

POST

```
/score
```

Example JSON

```json
{
    "enterprise_id":"MSME001",
    "gst_registered":1,
    "gst_filing_consistency_pct":91,
    "gst_turnover_growth_rate":12,
    "gst_avg_monthly_turnover_inr":420000,
    "gst_late_filing_count_12m":1,

    "upi_available":1,
    "upi_monthly_txn_count":320,
    "upi_avg_inflow_inr":1800,
    "upi_inflow_volatility":0.21,
    "upi_bounce_rate_pct":0.8,

    "aa_consent_given":1,
    "aa_avg_bank_balance_inr":250000,
    "aa_trade_payable_days":28,
    "aa_cash_flow_ratio":1.4,
    "aa_emi_to_inflow_ratio":0.23,
    "aa_overdraft_utilization_pct":18,

    "epfo_registered":1,
    "epfo_employee_count":42,
    "epfo_contribution_consistency_pct":96,
    "epfo_avg_wage_inr":24500,
    "epfo_employee_growth_rate":0.14
}
```

---

## Output

```json
{
    "gst_score":83.4,
    "upi_score":74.5,
    "aa_score":78.9,
    "epfo_score":69.1,
    "overall_score":77.4,
    "risk_tier":"A - Strong",
    "data_confidence":"4/4 sources available"
}
```

---

## Tech Stack

- Python
- Scikit-Learn
- FastAPI
- Pandas
- NumPy