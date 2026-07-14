// ─── API Service — connects prototype to FastAPI backend at localhost:8000 ────

export const BASE = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

// ─── Types matching backend ScoreResponse ─────────────────────────────────────
export interface DriverItem {
  feature: string;
  impact: number;
  type: string;
}

export interface CoachItem {
  pillar: string;
  title: string;
  recommendation: string;
  estimated_lift: number;
}

export interface ScoreResponse {
  enterprise_id: string | null;
  gst_score: number | null;
  upi_score: number | null;
  aa_score: number | null;
  epfo_score: number | null;
  overall_score: number | null;
  score_range_low: number | null;
  score_range_high: number | null;
  risk_tier: string;
  data_confidence: string;
  confidence_tier: string;
  key_drivers: DriverItem[];
  triggered_rules: string[];
  decision: string;
  recommendations: CoachItem[];
  self_supervised_embedding: number[];
  audit_justification: string | null;
}

export interface TrendResponse {
  enterprise_id: string;
  periods: Array<{
    label: string;
    overall_score: number;
    gst_score: number | null;
    upi_score: number | null;
    aa_score: number | null;
    epfo_score: number | null;
    risk_tier: string;
    drift_flags: string[];
  }>;
  ews_status: string;
  ews_message: string;
  drift_detected: boolean;
  recommendation: string;
}

export interface PortfolioSummary {
  total_enterprises: number;
  avg_score: number;
  tier_distribution: Record<string, number>;
  sector_breakdown: Record<string, { count: number; avg_score: number }>;
  data_confidence_distribution: Record<string, number>;
  ntc_ntb_stats: Record<string, number>;
}

export interface BusinessRecord {
  enterprise_id?: string;
  segment?: string;
  sector?: string;
  years_in_operation?: number;
  is_ntc?: number;
  is_ntb?: number;
  gst_registered?: number;
  gst_filing_consistency_pct?: number;
  gst_turnover_growth_rate?: number;
  gst_avg_monthly_turnover_inr?: number;
  gst_late_filing_count_12m?: number;
  upi_available?: number;
  upi_monthly_txn_count?: number;
  upi_avg_inflow_inr?: number;
  upi_inflow_volatility?: number;
  upi_bounce_rate_pct?: number;
  aa_consent_given?: number;
  aa_avg_bank_balance_inr?: number;
  aa_trade_payable_days?: number;
  aa_cash_flow_ratio?: number;
  aa_emi_to_inflow_ratio?: number;
  aa_overdraft_utilization_pct?: number;
  epfo_registered?: number;
  epfo_employee_count?: number;
  epfo_contribution_consistency_pct?: number;
  epfo_avg_wage_inr?: number;
  epfo_employee_growth_rate?: number;
}

// ─── Score a single enterprise by ID from the CSV dataset ────────────────────
export async function fetchScoreById(enterpriseId: string): Promise<ScoreResponse> {
  const res = await fetch(`${BASE}/score/${enterpriseId}`);
  if (!res.ok) throw new Error(`Score fetch failed: ${res.status} ${res.statusText}`);
  return res.json();
}

// ─── Fetch raw enterprise record features ────────────────────────────────────
export async function fetchEnterpriseRecord(enterpriseId: string): Promise<BusinessRecord> {
  const res = await fetch(`${BASE}/enterprise/${enterpriseId}`);
  if (!res.ok) throw new Error(`Enterprise fetch failed: ${res.status} ${res.statusText}`);
  return res.json();
}

// ─── Score by posting raw feature record ─────────────────────────────────────
export async function postScore(record: Record<string, unknown>): Promise<ScoreResponse> {
  const res = await fetch(`${BASE}/score`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(record),
  });
  if (!res.ok) throw new Error(`Score post failed: ${res.status}`);
  return res.json();
}

// ─── EWS Trend for enterprise ─────────────────────────────────────────────────
export async function fetchTrend(enterpriseId: string): Promise<TrendResponse> {
  const res = await fetch(`${BASE}/trend/${enterpriseId}`);
  if (!res.ok) throw new Error(`Trend fetch failed: ${res.status}`);
  const raw = await res.json();

  const periods = (raw.score_history || []).map((h: { period: string; score: number }) => {
    let risk_tier = 'C';
    if (h.score >= 80) risk_tier = 'A';
    else if (h.score >= 70) risk_tier = 'B+';
    else if (h.score >= 60) risk_tier = 'B';
    else if (h.score >= 50) risk_tier = 'C';
    else risk_tier = 'D';

    return {
      label: h.period,
      overall_score: h.score,
      gst_score: null,
      upi_score: null,
      aa_score: null,
      epfo_score: null,
      risk_tier,
      drift_flags: raw.score_drift <= -5.0 && h.period === 'T-30' ? ['score_drift'] : [],
    };
  });

  const drift_detected = raw.score_drift <= -5.0;
  const recommendation = drift_detected
    ? "Review account status immediately — recommend limit reduction or security refresh"
    : "Maintain standard monitoring; account status is stable.";

  return {
    enterprise_id: raw.enterprise_id,
    periods,
    ews_status: raw.ews_status,
    ews_message: raw.ews_justification || `Trend flag: ${raw.trend_flag}. ${raw.alert_flags?.length || 0} active alerts.`,
    drift_detected,
    recommendation,
  };
}

// ─── Portfolio summary ────────────────────────────────────────────────────────
export async function fetchPortfolio(): Promise<PortfolioSummary> {
  const res = await fetch(`${BASE}/portfolio/summary`);
  if (!res.ok) throw new Error(`Portfolio fetch failed: ${res.status}`);
  return res.json();
}

// ─── Backend health check ──────────────────────────────────────────────────────
export async function checkHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${BASE}/health`, { signal: AbortSignal.timeout(2000) });
    return res.ok;
  } catch {
    return false;
  }
}

// ─── Enterprise IDs available in the dataset (first 10) ──────────────────────
export const SAMPLE_ENTERPRISE_IDS = [
  'MSME100001', 'MSME100002', 'MSME100003', 'MSME100004', 'MSME100005',
  'MSME100006', 'MSME100007', 'MSME100008', 'MSME100009', 'MSME100010',
];

// ─── Map backend score response to tier display ────────────────────────────────
export function tierToDisplay(tier: string) {
  const map: Record<string, { color: string; label: string; bg: string }> = {
    'A+': { color: '#10B981', bg: 'rgba(16,185,129,0.15)', label: 'Prime — Approve' },
    'A':  { color: '#34D399', bg: 'rgba(52,211,153,0.12)', label: 'Strong — Approve' },
    'B+': { color: '#60A5FA', bg: 'rgba(96,165,250,0.12)', label: 'Moderate — Approve w/ Monitoring' },
    'B':  { color: '#93C5FD', bg: 'rgba(147,197,253,0.12)', label: 'Moderate — Review' },
    'C':  { color: '#FBBF24', bg: 'rgba(251,191,36,0.12)', label: 'Watchlist — Manual Review' },
    'D':  { color: '#F97316', bg: 'rgba(249,115,22,0.12)', label: 'High Risk — Decline' },
    'E':  { color: '#EF4444', bg: 'rgba(239,68,68,0.12)',  label: 'Decline' },
  };
  return map[tier] || map['C'];
}

// ─── Confidence level colour ───────────────────────────────────────────────────
export function confidenceColor(level: string): string {
  const map: Record<string, string> = {
    Gold: '#C9A15A', Silver: '#94A3B8', Bronze: '#B45309', Insufficient: '#64748B'
  };
  return map[level] || '#64748B';
}
