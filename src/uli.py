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

def get_uli_consent_profile(enterprise_id: str, score_results: dict, record: Optional[dict] = None) -> dict:
    """
    Wraps the scoring result in a format compliant with ULI Consent Data specs.
    Reflects the entity's profile as shared via ULI Gateway with consent.
    """
    rec_dict = record if record is not None else {}
    
    # Format dynamic values compliant with database fields
    gst_consistency_str = f"{float(rec_dict.get('gst_filing_consistency_pct')):.1f}%" if rec_dict.get('gst_filing_consistency_pct') is not None else "91.0%"
    gst_growth_str = f"{float(rec_dict.get('gst_turnover_growth_rate')):.1f}%" if rec_dict.get('gst_turnover_growth_rate') is not None else "12.0%"
    
    upi_txn_str = str(int(float(rec_dict.get('upi_monthly_txn_count')))) if rec_dict.get('upi_monthly_txn_count') is not None else "320"
    upi_bounce_str = f"{float(rec_dict.get('upi_bounce_rate_pct')):.1f}%" if rec_dict.get('upi_bounce_rate_pct') is not None else "0.8%"
    
    aa_emi_str = f"{round(float(rec_dict.get('aa_emi_to_inflow_ratio')) * 100, 1)}%" if rec_dict.get('aa_emi_to_inflow_ratio') is not None else "23.0%"
    aa_od_str = f"{float(rec_dict.get('aa_overdraft_utilization_pct')):.1f}%" if rec_dict.get('aa_overdraft_utilization_pct') is not None else "18.0%"
    
    epfo_emp_str = str(int(float(rec_dict.get('epfo_employee_count')))) if rec_dict.get('epfo_employee_count') is not None else "42"
    epfo_wage_str = f"{int(float(rec_dict.get('epfo_avg_wage_inr'))):,}" if rec_dict.get('epfo_avg_wage_inr') is not None else "24,500"

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
                    {"code": "GST_CON", "label": "Filing Consistency", "value": gst_consistency_str},
                    {"code": "GST_GRW", "label": "Turnover Growth Rate", "value": gst_growth_str},
                ]
            },
            "upi_pillar": {
                "available": score_results.get("upi_score") is not None,
                "score": score_results.get("upi_score"),
                "key_indices": [
                    {"code": "UPI_TXN", "label": "Monthly Txn Count", "value": upi_txn_str},
                    {"code": "UPI_BNC", "label": "UPI Bounce Rate", "value": upi_bounce_str},
                ]
            },
            "aa_pillar": {
                "available": score_results.get("aa_score") is not None,
                "score": score_results.get("aa_score"),
                "key_indices": [
                    {"code": "AA_EMI", "label": "EMI Inflow Burden", "value": aa_emi_str},
                    {"code": "AA_ODU", "label": "Overdraft Utilisation", "value": aa_od_str},
                ]
            },
            "epfo_pillar": {
                "available": score_results.get("epfo_score") is not None,
                "score": score_results.get("epfo_score"),
                "key_indices": [
                    {"code": "EPF_EMP", "label": "Employee Count", "value": epfo_emp_str},
                    {"code": "EPF_WAG", "label": "Average Wage (INR)", "value": epfo_wage_str},
                ]
            }
        },
        "regulatory_rule_flags": {
            "any_knockouts": len(score_results.get("triggered_rules", [])) > 0,
            "triggered_rules": score_results.get("triggered_rules", []),
        }
    }
