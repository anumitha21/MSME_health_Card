"""
MSME Health Card API (v3.2 — XGBoost + XAI + Rules + EWS + ULI/OCEN + Portfolio)

Endpoints:
    GET  /              → health check
    GET  /health        → health check
    POST /score         → full score + SHAP drivers + rule engine + confidence tier + bands
    POST /score/custom  → same but with caller-supplied fusion weights
    GET  /trend/{id}    → 3-period EWS trend report for an enterprise
    GET  /portfolio/summary  → Portfolio summary aggregate statistics
    POST /portfolio/simulate-stress → Simulate sector-wide macroeconomic stress
    GET  /uli/payload/{id} → Get ULI-compliant consent payload

Run:
    uvicorn api.main:app --reload

Swagger:
    http://127.0.0.1:8000/docs
"""

from typing import Optional

from fastapi import FastAPI, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, ConfigDict, Field

from src.scoring   import score_business
from src.trend     import compute_trend
from src.config    import FUSION_WEIGHTS
from src.portfolio import get_portfolio_summary, run_stress_test
from src.uli       import get_uli_consent_profile

app = FastAPI(
    title="MSME Health Card API",
    version="3.2.0",
    description=(
        "Alternative Credit Underwriting Engine for MSMEs. "
        "Supports dynamic XGBoost models, SHAP drivers, RBI rules compliance, "
        "ULI/OCEN consent data mapping, and macro stress simulation."
    ),
)

# Allow requests from the Vite frontend dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─────────────────────────────────────────────────────────────
# Request Models
# ─────────────────────────────────────────────────────────────

class BusinessRecord(BaseModel):
    """Input fields for a single MSME business record."""

    model_config = ConfigDict(extra="allow")

    enterprise_id: Optional[str] = None

    # Business metadata (used as global features by the model)
    segment: Optional[str] = None          # "Micro" | "Small" | "Medium"
    sector: Optional[str]  = None
    years_in_operation: Optional[float] = None
    is_ntc: Optional[int] = 0              # New-to-credit flag
    is_ntb: Optional[int] = 0              # New-to-bank flag

    # ── GST ──────────────────────────────────────────────────
    gst_registered: Optional[int] = 0
    gst_filing_consistency_pct:   Optional[float] = None
    gst_turnover_growth_rate:      Optional[float] = None
    gst_avg_monthly_turnover_inr:  Optional[float] = None
    gst_late_filing_count_12m:     Optional[float] = None

    # ── UPI ──────────────────────────────────────────────────
    upi_available: Optional[int] = 0
    upi_monthly_txn_count:  Optional[float] = None
    upi_avg_inflow_inr:     Optional[float] = None
    upi_inflow_volatility:  Optional[float] = None
    upi_bounce_rate_pct:    Optional[float] = None

    # ── AA ───────────────────────────────────────────────────
    aa_consent_given: Optional[int] = 0
    aa_avg_bank_balance_inr:     Optional[float] = None
    aa_trade_payable_days:       Optional[float] = None
    aa_cash_flow_ratio:          Optional[float] = None
    aa_emi_to_inflow_ratio:      Optional[float] = None
    aa_overdraft_utilization_pct:Optional[float] = None

    # ── EPFO ─────────────────────────────────────────────────
    epfo_registered: Optional[int] = 0
    epfo_employee_count:              Optional[float] = None
    epfo_contribution_consistency_pct:Optional[float] = None
    epfo_avg_wage_inr:                Optional[float] = None
    epfo_employee_growth_rate:        Optional[float] = None


class CustomWeightRequest(BusinessRecord):
    """Same as BusinessRecord but with caller-supplied fusion weights."""
    fusion_weights: Optional[dict] = Field(
        default=None,
        description="Override fusion weights for the 4 pillars.",
        examples=[{"gst": 0.50, "upi": 0.10, "aa": 0.30, "epfo": 0.10}],
    )


class StressSimulationRequest(BaseModel):
    sector: str = Field(..., description="Target sector (e.g. 'Textile', 'Trading/Retail', or 'all')")
    stress_type: Optional[str] = Field(None, description="'turnover_shock' | 'liquidity_stress' | 'leverage_surge'")
    severity_pct: Optional[float] = Field(None, ge=0.0, le=1.0, description="Severity percentage of stress shock")
    turnover_shock_pct: Optional[float] = Field(None, ge=0.0, le=1.0, description="Severity percentage of turnover shock")
    stress_pct: Optional[float] = Field(None, description="Alternative stress percentage (e.g., negative shock)")


# ─────────────────────────────────────────────────────────────
# Response Models
# ─────────────────────────────────────────────────────────────

class DriverItem(BaseModel):
    feature: str
    impact: float
    type: str   # "Positive Driver" | "Negative Driver"


class CoachItem(BaseModel):
    pillar: str
    title: str
    recommendation: str
    estimated_lift: float


class ScoreResponse(BaseModel):
    enterprise_id: Optional[str]

    gst_score:  Optional[float]
    upi_score:  Optional[float]
    aa_score:   Optional[float]
    epfo_score: Optional[float]

    overall_score: Optional[float]
    score_range_low:  Optional[float]
    score_range_high: Optional[float]
    risk_tier:     str
    data_confidence: str

    confidence_tier: str
    key_drivers: list[DriverItem]

    triggered_rules: list[str]
    decision: str

    recommendations: list[CoachItem] = []
    self_supervised_embedding: list[float] = []


# ─────────────────────────────────────────────────────────────
# Helper — normalise custom fusion weights
# ─────────────────────────────────────────────────────────────

def _normalise_weights(raw: dict) -> dict:
    pillars = ["gst", "upi", "aa", "epfo"]
    w = {p: float(raw.get(p, FUSION_WEIGHTS[p])) for p in pillars}
    total = sum(w.values())
    if total == 0:
        return dict(FUSION_WEIGHTS)
    return {p: w[p] / total for p in pillars}


# ─────────────────────────────────────────────────────────────
# Routes
# ─────────────────────────────────────────────────────────────

@app.get("/")
def home():
    return {
        "message": "MSME Health Card API",
        "status":  "running",
        "version": "3.2.0",
        "docs":    "/docs",
    }


@app.get("/health")
def health():
    return {"status": "healthy"}


@app.post("/score", response_model=ScoreResponse, tags=["Scoring"])
def score(
    record: BusinessRecord,
    explain: bool = Query(default=True, description="Include SHAP drivers in response"),
):
    result = score_business(record.model_dump(), explain=explain)
    result["enterprise_id"] = record.enterprise_id
    return result


@app.post("/score/custom", response_model=ScoreResponse, tags=["Scoring"])
def score_custom(
    request: CustomWeightRequest,
    explain: bool = Query(default=True),
):
    custom_weights = (
        _normalise_weights(request.fusion_weights)
        if request.fusion_weights
        else dict(FUSION_WEIGHTS)
    )

    from src import config as cfg_module
    original = dict(cfg_module.FUSION_WEIGHTS)
    cfg_module.FUSION_WEIGHTS.update(custom_weights)

    try:
        record_dict = request.model_dump(exclude={"fusion_weights"})
        result = score_business(record_dict, explain=explain)
    finally:
        cfg_module.FUSION_WEIGHTS.update(original)

    result["enterprise_id"] = request.enterprise_id
    return result


@app.get("/trend/{enterprise_id}", tags=["EWS"])
def trend(enterprise_id: str):
    return compute_trend(enterprise_id)


# ─────────────────────────────────────────────────────────────
# Phase 2 — Portfolio & ULI Router Addition
# ─────────────────────────────────────────────────────────────

@app.get("/portfolio/summary", tags=["Portfolio"])
def portfolio_summary():
    res = get_portfolio_summary()
    if "error" in res:
        raise HTTPException(status_code=404, detail=res["error"])
    return res


@app.post("/portfolio/simulate-stress", tags=["Portfolio"])
def simulate_stress(request: StressSimulationRequest):
    try:
        stress_type = request.stress_type
        severity_pct = request.severity_pct
        stress_pct = request.stress_pct

        if request.turnover_shock_pct is not None:
            stress_type = "turnover_shock"
            severity_pct = request.turnover_shock_pct
        elif request.stress_pct is not None:
            stress_type = "turnover_shock"
            severity_pct = abs(request.stress_pct)
            stress_pct = request.stress_pct

        if stress_type is None:
            stress_type = "turnover_shock"
        if severity_pct is None:
            severity_pct = 0.15

        return run_stress_test(
            sector=request.sector,
            stress_type=stress_type,
            severity_pct=severity_pct,
            stress_pct=stress_pct
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/uli/payload/{enterprise_id}", tags=["ULI/OCEN Integration"])
def uli_payload(enterprise_id: str):
    # Retrieve base mock data structure
    demo_dict = {
        "enterprise_id": enterprise_id,
        "segment": "Small",
        "sector": "Manufacturing",
        "years_in_operation": 7.5,
        "is_ntc": 0,
        "is_ntb": 0,
        "gst_registered": 1,
        "gst_filing_consistency_pct": 91,
        "gst_turnover_growth_rate": 12,
        "gst_avg_monthly_turnover_inr": 420000,
        "gst_late_filing_count_12m": 1,
        "upi_available": 1,
        "upi_monthly_txn_count": 320,
        "upi_avg_inflow_inr": 1800,
        "upi_inflow_volatility": 0.21,
        "upi_bounce_rate_pct": 0.8,
        "aa_consent_given": 1,
        "aa_avg_bank_balance_inr": 250000,
        "aa_trade_payable_days": 28,
        "aa_cash_flow_ratio": 1.4,
        "aa_emi_to_inflow_ratio": 0.23,
        "aa_overdraft_utilization_pct": 18,
        "epfo_registered": 1,
        "epfo_employee_count": 42,
        "epfo_contribution_consistency_pct": 96,
        "epfo_avg_wage_inr": 24500,
        "epfo_employee_growth_rate": 0.14,
    }
    scores = score_business(demo_dict, explain=True)
    return get_uli_consent_profile(enterprise_id, scores)