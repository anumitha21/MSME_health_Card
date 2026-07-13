"""
Hard knock-out rule engine for the MSME Health Card.

Rules run BEFORE the ML score and can override it.
Thresholds are based on standard RBI/NBFC underwriting norms.

Decision logic (applied after rules + ML score are both available):
    1. Any knock-out rule triggered   → "Reject"   (hard override)
    2. overall_score >= 65 & no rules → "Auto-Approve"
    3. 40 <= overall_score < 65       → "Flag for Manual Review"
    4. overall_score < 40             → "Reject"   (ML-driven)
    5. overall_score is None          → "Reject"   (unscoreable)

Thresholds reasoning:
    Auto-Approve   (≥65): Corresponds to risk tier A-B boundary;
                          empirically ~top 35% of scored portfolio.
    Manual Review (40-65): Uncertain zone; lender officer evaluates.
    Reject         (<40): High-risk tier C/D boundary.
"""

from dataclasses import dataclass
from typing import Optional


# -----------------------------------------------------------------
# Knock-out rule definitions
# -----------------------------------------------------------------

@dataclass
class KnockOutRule:
    name: str
    description: str
    check: callable   # callable(record: dict) -> bool; True = triggered


KNOCK_OUT_RULES = [
    KnockOutRule(
        name="High EMI Burden",
        description=(
            "EMI-to-inflow ratio > 0.50: debt repayment exceeds 50% of "
            "cash inflow — structural insolvency risk (RBI FLDG guideline)."
        ),
        check=lambda r: (
            r.get("aa_consent_given") == 1
            and r.get("aa_emi_to_inflow_ratio") is not None
            and r["aa_emi_to_inflow_ratio"] > 0.50
        ),
    ),
    KnockOutRule(
        name="Overdraft Maxed Out",
        description=(
            "Overdraft utilization > 85%: persistent maxed overdraft "
            "indicates structural liquidity crisis."
        ),
        check=lambda r: (
            r.get("aa_consent_given") == 1
            and r.get("aa_overdraft_utilization_pct") is not None
            and r["aa_overdraft_utilization_pct"] > 85.0
        ),
    ),
    KnockOutRule(
        name="High UPI Bounce Rate",
        description=(
            "UPI bounce rate > 15%: more than 1-in-7 payments failing "
            "signals chronic inability to honor obligations."
        ),
        check=lambda r: (
            r.get("upi_available") == 1
            and r.get("upi_bounce_rate_pct") is not None
            and r["upi_bounce_rate_pct"] > 15.0
        ),
    ),
    KnockOutRule(
        name="Chronic GST Non-Compliance",
        description=(
            "Late GST filings ≥ 6 in 12 months: half-year non-compliance "
            "signals severe regulatory risk and likely revenue concealment."
        ),
        check=lambda r: (
            r.get("gst_registered") == 1
            and r.get("gst_late_filing_count_12m") is not None
            and r["gst_late_filing_count_12m"] >= 6
        ),
    ),
]


# -----------------------------------------------------------------
# Thresholds
# -----------------------------------------------------------------

APPROVE_THRESHOLD = 65.0   # overall_score >= this → Auto-Approve
REJECT_THRESHOLD  = 40.0   # overall_score <  this → Reject (ML)


# -----------------------------------------------------------------
# Public API
# -----------------------------------------------------------------

def evaluate_rules(record: dict) -> list[str]:
    """
    Returns a list of triggered rule names for the given MSME record.
    Empty list → no knock-out rules fired.
    """
    triggered = []
    for rule in KNOCK_OUT_RULES:
        try:
            if rule.check(record):
                triggered.append(rule.name)
        except Exception:
            pass   # If a field is missing/malformed, skip the rule gracefully
    return triggered


def make_decision(
    overall_score: Optional[float],
    triggered_rules: list[str],
) -> str:
    """
    Returns the final underwriting decision string.

    Priority:
      1. Hard knock-out (any rule)   → "Reject"
      2. ML score ≥ 65               → "Auto-Approve"
      3. 40 ≤ ML score < 65          → "Flag for Manual Review"
      4. ML score < 40 or None       → "Reject"
    """
    if triggered_rules:
        return "Reject"

    if overall_score is None:
        return "Reject"

    if overall_score >= APPROVE_THRESHOLD:
        return "Auto-Approve"

    if overall_score >= REJECT_THRESHOLD:
        return "Flag for Manual Review"

    return "Reject"
