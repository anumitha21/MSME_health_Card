"""
MSME Health Card API

Run:
    uvicorn api.main:app --reload

Swagger:
    http://127.0.0.1:8000/docs
"""

from fastapi import FastAPI
from pydantic import BaseModel, ConfigDict

from src.scoring import score_business

app = FastAPI(
    title="MSME Health Card API",
    version="3.0.0",
    description="Financial Health Scoring API for MSMEs",
)


# ---------------------------------------------------------
# Request Model
# ---------------------------------------------------------

class BusinessRecord(BaseModel):

    model_config = ConfigDict(extra="allow")

    enterprise_id: str | None = None

    # ---------------- GST ----------------

    gst_registered: int | None = 0
    gst_filing_consistency_pct: float | None = None
    gst_turnover_growth_rate: float | None = None
    gst_avg_monthly_turnover_inr: float | None = None
    gst_late_filing_count_12m: float | None = None

    # ---------------- UPI ----------------

    upi_available: int | None = 0
    upi_monthly_txn_count: float | None = None
    upi_avg_inflow_inr: float | None = None
    upi_inflow_volatility: float | None = None
    upi_bounce_rate_pct: float | None = None

    # ---------------- AA ----------------

    aa_consent_given: int | None = 0
    aa_avg_bank_balance_inr: float | None = None
    aa_trade_payable_days: float | None = None
    aa_cash_flow_ratio: float | None = None
    aa_emi_to_inflow_ratio: float | None = None
    aa_overdraft_utilization_pct: float | None = None

    # ---------------- EPFO ----------------

    epfo_registered: int | None = 0
    epfo_employee_count: float | None = None
    epfo_contribution_consistency_pct: float | None = None
    epfo_avg_wage_inr: float | None = None
    epfo_employee_growth_rate: float | None = None


# ---------------------------------------------------------
# Response Model
# ---------------------------------------------------------

class ScoreResponse(BaseModel):

    enterprise_id: str | None

    gst_score: float | None
    upi_score: float | None
    aa_score: float | None
    epfo_score: float |None

    overall_score: float | None

    risk_tier: str

    data_confidence: str


# ---------------------------------------------------------
# Routes
# ---------------------------------------------------------

@app.get("/")
def home():

    return {
        "message": "MSME Health Card API",
        "status": "running",
        "version": "3.0.0",
    }


@app.get("/health")
def health():

    return {
        "status": "healthy"
    }


@app.post(
    "/score",
    response_model=ScoreResponse,
)
def score(record: BusinessRecord):

    result = score_business(record.model_dump())

    result["enterprise_id"] = record.enterprise_id

    return result