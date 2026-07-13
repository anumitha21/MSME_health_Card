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

from src.scoring   import score_business, get_completeness_gap
from src.trend     import compute_trend
from src.config    import FUSION_WEIGHTS
from src.portfolio import get_portfolio_summary, run_stress_test, get_inclusion_impact
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
    audit_justification: Optional[str] = None


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
    
    # Generate audit justification using Gemini
    from src.explain import generate_audit_justification
    result["audit_justification"] = generate_audit_justification(result, record.model_dump())
    
    return result


@app.get("/score/{enterprise_id}", response_model=ScoreResponse, tags=["Scoring"])
def get_score_by_id(enterprise_id: str):
    from src.config import DATASET_PATH
    import pandas as pd
    df = pd.read_csv(DATASET_PATH)
    record_row = df[df["enterprise_id"] == enterprise_id]
    if record_row.empty:
        raise HTTPException(status_code=404, detail=f"Enterprise {enterprise_id} not found.")
    raw_record = record_row.iloc[0].to_dict()
    record = {k: (None if pd.isna(v) else v) for k, v in raw_record.items()}
    for flag in ["gst_registered", "upi_available", "aa_consent_given", "epfo_registered"]:
        if flag in record and record[flag] is not None:
            record[flag] = int(float(record[flag]))
    result = score_business(record, explain=True)
    result["enterprise_id"] = enterprise_id
    
    # Generate audit justification using Gemini
    from src.explain import generate_audit_justification
    result["audit_justification"] = generate_audit_justification(result, record)
    
    return result


@app.get("/enterprise/{enterprise_id}", tags=["Enterprise"])
def get_enterprise_record(enterprise_id: str):
    from src.config import DATASET_PATH
    import pandas as pd
    df = pd.read_csv(DATASET_PATH)
    record_row = df[df["enterprise_id"] == enterprise_id]
    if record_row.empty:
        raise HTTPException(status_code=404, detail=f"Enterprise {enterprise_id} not found.")
    raw_record = record_row.iloc[0].to_dict()
    record = {k: (None if pd.isna(v) else v) for k, v in raw_record.items()}
    # Convert flags to int
    for flag in ["gst_registered", "upi_available", "aa_consent_given", "epfo_registered", "is_ntc", "is_ntb"]:
        if flag in record and record[flag] is not None:
            record[flag] = int(float(record[flag]))
    return record


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
    
    # Generate audit justification using Gemini
    from src.explain import generate_audit_justification
    result["audit_justification"] = generate_audit_justification(result, record_dict)
    
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
    from src.config import DATASET_PATH
    import pandas as pd
    df = pd.read_csv(DATASET_PATH)
    record_row = df[df["enterprise_id"] == enterprise_id]
    if record_row.empty:
        raise HTTPException(status_code=404, detail=f"Enterprise {enterprise_id} not found.")
    raw_record = record_row.iloc[0].to_dict()
    record = {k: (None if pd.isna(v) else v) for k, v in raw_record.items()}
    for flag in ["gst_registered", "upi_available", "aa_consent_given", "epfo_registered"]:
        if flag in record and record[flag] is not None:
            record[flag] = int(float(record[flag]))
    scores = score_business(record, explain=True)
    return get_uli_consent_profile(enterprise_id, scores, record)


@app.get("/borrower/completeness-gap/{enterprise_id}", tags=["Borrower"])
def completeness_gap(enterprise_id: str):
    res = get_completeness_gap(enterprise_id)
    if "error" in res:
        raise HTTPException(status_code=404, detail=res["error"])
    return res


@app.get("/portfolio/inclusion-impact", tags=["Portfolio"])
def inclusion_impact():
    res = get_inclusion_impact()
    if "error" in res:
        raise HTTPException(status_code=404, detail=res["error"])
    return res