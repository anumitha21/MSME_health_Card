"""
GenAI explainability engine for pre-disbursement underwriting and post-disbursement EWS monitoring.
Uses the Gemini API (google-generativeai) when an API key is present,
otherwise gracefully falls back to detailed, deterministic rule-based compliance justifications.
"""

import os
from typing import Optional
from src.config import GEMINI_MODEL

# Try importing google-generativeai. If not available, we use local fallback.
try:
    import google.generativeai as genai
    HAS_GENAI = True
except ImportError:
    HAS_GENAI = False


def _init_gemini():
    """Initializes and returns a Gemini generative model if API key is present."""
    if not HAS_GENAI:
        return None
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        return None
    try:
        genai.configure(api_key=api_key)
        return genai.GenerativeModel(GEMINI_MODEL)
    except Exception as e:
        print(f"Gemini initialization error: {e}")
        return None


def generate_audit_justification(score_data: dict, record: dict) -> str:
    """
    Generates a natural-language, audit-ready justification for a credit decision
    using the Gemini API (RBI fair-lending compliance).
    Falls back to a structured rule-based summary if API is unavailable or fails.
    """
    model = _init_gemini()
    
    if not model:
        return _local_fallback_audit_justification(score_data, record)
        
    try:
        drivers_text = "\n".join([
            f"- {d['feature']}: {d['impact']:+.2f} ({d['type']})"
            for d in score_data.get('key_drivers', [])
        ])
        
        triggered_rules = score_data.get('triggered_rules', [])
        rules_text = ", ".join(triggered_rules) if triggered_rules else "None"
        
        prompt = f"""
You are a senior credit risk auditor at the Reserve Bank of India (RBI).
Provide a formal, audited credit justification statement for the underwriting decision of this MSME applicant.

Applicant Profile:
- Enterprise ID: {score_data.get('enterprise_id', 'Unknown')}
- Sector: {record.get('sector', 'Unknown')}
- Segment: {record.get('segment', 'Unknown')}
- Years in Operation: {record.get('years_in_operation', 'Unknown')}

Credit Performance:
- Fused Credit Score: {score_data.get('overall_score', 'Unknown')}/100
- Risk Tier: {score_data.get('risk_tier', 'Unknown')}
- Underwriting Verdict: {score_data.get('decision', 'Unknown')}

Data Integrity & Modalities Connected:
- Data Confidence Tier: {score_data.get('confidence_tier', 'Unknown')} ({score_data.get('data_confidence', 'Unknown')})
- GST Score: {score_data.get('gst_score', 'N/A')}
- UPI Score: {score_data.get('upi_score', 'N/A')}
- Account Aggregator (AA) Score: {score_data.get('aa_score', 'N/A')}
- EPFO Score: {score_data.get('epfo_score', 'N/A')}

Key Underwriting Drivers (SHAP Credit Contribution):
{drivers_text}

Triggered Knock-out Rules:
{rules_text}

RBI Compliance Mandate:
Every credit decision must be fully explainable. Summarize:
1. Why this final verdict was reached (conforming to RBI's fair-lending guidelines).
2. How the key positive and negative credit drivers (GST consistency, UPI cash flow, overdraft usage, etc.) contributed to the score and decision.
3. Discuss specific knock-out rules triggered (if any) or if the account is in clear compliance.

Keep the explanation objective, professional, structured in clear paragraphs, and audit-ready. Keep it under 200 words. Do not use markdown headers or bold lists, just plain text with clean spacing.
"""
        response = model.generate_content(
            prompt,
            generation_config=genai.types.GenerationConfig(
                temperature=0.2,
                max_output_tokens=350,
            )
        )
        return response.text.strip()
    except Exception as e:
        print(f"Gemini API call failed, falling back: {e}")
        return _local_fallback_audit_justification(score_data, record)


def generate_ews_justification(trend_data: dict, score_history: list) -> str:
    """
    Generates a post-disbursement EWS monitoring report using the Gemini API.
    Identifies risk trajectories, metric drifts, and recommends proactive actions.
    Falls back to a structured rule-based summary if API is unavailable or fails.
    """
    model = _init_gemini()
    
    if not model:
        return _local_fallback_ews_justification(trend_data)
        
    try:
        history_text = "\n".join([
            f"- {item['period']}: {item['score']}" for item in score_history
        ])
        
        metrics_text = "\n".join([
            f"- {details['label']}: {details['mom_30d_pct']}% MoM (current: {details['T-30']})"
            for m, details in trend_data.get('metrics', {}).items()
            if details.get('mom_30d_pct') is not None
        ])
        
        prompt = f"""
You are a senior credit monitoring officer at the bank.
Evaluate the monthly credit monitoring and score drift data for an active MSME loan.

Active Borrower Profile:
- Enterprise ID: {trend_data.get('enterprise_id', 'Unknown')}
- Sector: {trend_data.get('sector', 'Unknown')}
- Segment: {trend_data.get('segment', 'Unknown')}
- Loan Amount: INR {trend_data.get('loan_amount', 'Unknown')}

Historical Scoring & Drift Trend:
{history_text}
- Overall Score Drift: {trend_data.get('score_drift', 0.0):+.1f} points

Refreshed Alternative Feed Metrics (MoM Change):
{metrics_text}

Current Post-Disbursement EWS Status: {trend_data.get('ews_status', 'Unknown')}

Write a concise, professional post-disbursement monitoring audit report for the bank's credit risk committee.
Explain:
1. The borrower's credit trend (stable, improving, or deteriorating).
2. Highlight any significant drift warnings (e.g., a drop in UPI inflows or increasing trade payable days).
3. Recommend specific proactive bank interventions (e.g., restructure debt, reduce overdraft limits, contact borrower, request updated GST filings) to prevent the loan from turning into a Non-Performing Asset (NPA).

Keep the report objective, professional, structured, and audit-ready. Keep it under 200 words. Do not use markdown headers or bold lists, just plain text with clean spacing.
"""
        response = model.generate_content(
            prompt,
            generation_config=genai.types.GenerationConfig(
                temperature=0.2,
                max_output_tokens=350,
            )
        )
        return response.text.strip()
    except Exception as e:
        print(f"Gemini API call failed, falling back: {e}")
        return _local_fallback_ews_justification(trend_data)


def _local_fallback_audit_justification(score_data: dict, record: dict) -> str:
    decision = score_data.get('decision', 'Reject')
    score = score_data.get('overall_score', 0.0)
    risk_tier = score_data.get('risk_tier', 'D - High Risk')
    triggered_rules = score_data.get('triggered_rules', [])
    drivers = score_data.get('key_drivers', [])
    
    lines = []
    lines.append("[RBI Compliance Underwriting Justification - Local Audit Trail]")
    
    lines.append(
        f"Borrower {score_data.get('enterprise_id', 'Unknown')} has been evaluated using "
        f"the IDBI Fused Alternate Credit Underwriting model. The fused credit health score is "
        f"{score}/100, placing the applicant in the risk category '{risk_tier}'. The underwriting verdict "
        f"is: {decision}."
    )
    
    if triggered_rules:
        lines.append(
            f"CRITICAL OVERRIDE: The application was rejected due to the activation of the following regulatory "
            f"knock-out rules: {', '.join(triggered_rules)}. Conforming to RBI fair-lending guidelines, these metrics "
            f"represent severe risk levels that mandate rejection regardless of the baseline ML score."
        )
    elif decision == "Auto-Approve":
        lines.append(
            f"APPROVAL DECISION: The MSME demonstrates solid creditworthiness with a credit score of {score} "
            f"(above the approval threshold of 65.0) and triggers no regulatory knock-outs. The credit decision "
            f"is justified for automated disbursement under the RBI's fair-lending standards."
        )
    elif decision == "Flag for Manual Review":
        lines.append(
            f"MANUAL REVIEW RATIONALE: The applicant's credit score of {score} sits in the moderate risk range (40.0-65.0). "
            f"While no immediate knock-outs were activated, the credit profile is borderline. Under bank policy, "
            f"this record must undergo physical underwriting verification before disbursement."
        )
    else:
        lines.append(
            f"REJECTION DECISION: The applicant's fused credit score ({score}) falls below the minimum risk tolerance "
            f"threshold of 40.0. The borrower shows high default probabilities or inadequate credit history across "
            f"connected GST/UPI/AA feeds, justifying rejection."
        )
        
    if drivers:
        lines.append("Key credit impact factors analyzed:")
        for d in drivers[:3]:
            impact_desc = "positively influenced" if d['type'] == 'Positive Driver' else "negatively impacted"
            lines.append(f"- {d['feature'].replace('_', ' ').upper()} {impact_desc} the health score by {abs(d['impact']):.1f} points.")
            
    return "\n\n".join(lines)


def _local_fallback_ews_justification(trend_data: dict) -> str:
    ews_status = trend_data.get('ews_status', 'Green')
    drift = trend_data.get('score_drift', 0.0)
    eid = trend_data.get('enterprise_id', 'Unknown')
    
    lines = []
    lines.append("[RBI Post-Disbursement Credit Monitoring Log - EWS Trail]")
    
    lines.append(
        f"Borrower {eid} has been monitored on a 90-day lifecycle window. "
        f"Current Early Warning Signal (EWS) rating is: {ews_status.upper()} "
        f"(overall score drift: {drift:+.1f} points)."
    )
    
    if ews_status == "Red":
        lines.append(
            f"ALERT: Severe credit deterioration detected. The overall credit score has declined by {abs(drift):.1f} points "
            f"due to significant drops in monthly transaction inflows or rising payable timelines. "
            f"Immediate review is recommended to prevent this account from migrating into a Non-Performing Asset (NPA)."
        )
        lines.append(
            "Recommended Interventions:\n"
            "1. Initiate immediate review of active working capital limits.\n"
            "2. Freeze/reduce overdraft facilities to mitigate outstanding exposure.\n"
            "3. Dispatch a credit manager for direct business engagement and restructuring discussions."
        )
    elif ews_status == "Yellow":
        lines.append(
            f"CAUTION: Moderate credit drift detected (Drift: {drift:.1f} points). Alternate transaction feeds "
            f"show warning signs of downward cash flow momentum. Regular monitoring is advised."
        )
        lines.append(
            "Recommended Interventions:\n"
            "1. Schedule a telephonic check-in to discuss recent sales fluctuations.\n"
            "2. Track bank balance levels weekly for the next billing cycle."
        )
    else:
        lines.append(
            f"MONITORING STATUS: Account is stable. Score drift is within normal variance ({drift:+.1f} points) "
            f"and alternate transaction feeds demonstrate healthy operational velocity. No immediate action required."
        )
        
    return "\n\n".join(lines)
