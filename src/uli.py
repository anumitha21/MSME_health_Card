"""
Unified Lending Interface (ULI) & OCEN Data Provider Schema Integration.

This module formats credit profile structures compliant with the standard
ULI Consent-Driven Information Provider (IP) interface. Used by lenders
to fetch alternative credit profiles dynamically using a secure consent architecture.
"""

from typing import Optional


# -----------------------------------------------------------------
# Mock ULI Consent JSON Payload Builder
# -----------------------------------------------------------------

def get_uli_consent_profile(enterprise_id: str, score_results: dict) -> dict:
    """
    Wraps the scoring result in a format compliant with ULI Consent Data specs.
    Reflects the entity's profile as shared via ULI Gateway with consent.
    """
    return {
        "uli_metadata": {
            "gateway_version": "1.0.0-rc3",
            "provider_id": "IN-IP-IDBI-MSME-HC01",
            "provider_name": "IDBI Alternative MSME Health Card Provider",
            "consent_reference_id": f"CON-{enterprise_id}-88294B",
            "consent_timestamp": "2026-07-08T00:30:00Z",
            "digital_signature": "MEYCIQCc9dY1a5vW5D3m1...[HMAC-SHA256-SIGNATURE]",
        },
        "borrower_identity": {
            "enterprise_id": enterprise_id,
            "pan_masked": "XXXXX4910X",
            "gstin_masked": "27XXXXX9011X1Z2" if score_results.get("gst_score") is not None else None,
            "epfo_id_masked": "MH/BAN/XXXXXX" if score_results.get("epfo_score") is not None else None,
        },
        "score_profile": {
            "credit_health_score": score_results.get("overall_score"),
            "score_band_low":      score_results.get("score_range_low"),
            "score_band_high":     score_results.get("score_range_high"),
            "risk_tier":           score_results.get("risk_tier"),
            "confidence_tier":     score_results.get("confidence_tier"),
            "underwriting_decision": score_results.get("decision"),
        },
        "ocen_data_blocks": {
            "gst_pillar": {
                "available": score_results.get("gst_score") is not None,
                "score": score_results.get("gst_score"),
                "key_indices": [
                    {"code": "GST_CON", "label": "Filing Consistency", "value": "91.0%"},
                    {"code": "GST_GRW", "label": "Turnover Growth Rate", "value": "12.0%"},
                ]
            },
            "upi_pillar": {
                "available": score_results.get("upi_score") is not None,
                "score": score_results.get("upi_score"),
                "key_indices": [
                    {"code": "UPI_TXN", "label": "Monthly Txn Count", "value": "320"},
                    {"code": "UPI_BNC", "label": "UPI Bounce Rate", "value": "0.8%"},
                ]
            },
            "aa_pillar": {
                "available": score_results.get("aa_score") is not None,
                "score": score_results.get("aa_score"),
                "key_indices": [
                    {"code": "AA_EMI", "label": "EMI Inflow Burden", "value": "23.0%"},
                    {"code": "AA_ODU", "label": "Overdraft Utilisation", "value": "18.0%"},
                ]
            },
            "epfo_pillar": {
                "available": score_results.get("epfo_score") is not None,
                "score": score_results.get("epfo_score"),
                "key_indices": [
                    {"code": "EPF_EMP", "label": "Employee Count", "value": "42"},
                    {"code": "EPF_WAG", "label": "Average Wage (INR)", "value": "24,500"},
                ]
            }
        },
        "regulatory_rule_flags": {
            "any_knockouts": len(score_results.get("triggered_rules", [])) > 0,
            "triggered_rules": score_results.get("triggered_rules", []),
        }
    }
