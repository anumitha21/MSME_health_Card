export const API_BASE = 'http://127.0.0.1:8000';

export interface DriverItem {
  feature: string;
  impact: number;
  type: 'Positive Driver' | 'Negative Driver';
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
  self_supervised_embedding?: number[];
}

export interface TrendMetric {
  label: string;
  'T-90': number | null;
  'T-60': number | null;
  'T-30': number | null;
  mom_30d_pct: number | null;
}

export interface AlertFlag {
  metric: string;
  change_pct: number;
  message: string;
}

export interface TrendResponse {
  enterprise_id: string;
  trend_flag: 'Upward Trend' | 'Stable' | 'Deteriorating';
  alert_flags: AlertFlag[];
  metrics: Record<string, TrendMetric>;
  data_available: boolean;
  message?: string;
}

export interface SectorSummary {
  sector: string;
  count: number;
  pct: number;
  avg_score: number;
  default_rate: number;
}

export interface SegmentSummary {
  segment: string;
  count: number;
  pct: number;
  avg_score: number;
}

export interface PortfolioSummary {
  total_exposure: number;
  average_score: number;
  default_count: number;
  default_rate: number;
  coverage: {
    gst: number;
    upi: number;
    aa: number;
    epfo: number;
  };
  sectors: SectorSummary[];
  segments: SegmentSummary[];
  tiers: Record<string, number>;
}

export interface StressSimulationResponse {
  sector: string;
  stress_type: string;
  severity_pct: number;
  affected_rows: number;
  original_avg: number;
  stressed_avg: number;
  original_reject_rate: number;
  stressed_reject_rate: number;
  tiers_comparison: Record<string, { original: number; stressed: number }>;
}

export type FusionWeights = { gst: number; upi: number; aa: number; epfo: number };

/* ── Demo record for easy testing ── */
export const DEMO_RECORD = {
  enterprise_id: 'MSME100001',
  segment: 'Small',
  sector: 'Manufacturing',
  years_in_operation: 7.5,
  is_ntc: 0,
  is_ntb: 0,
  gst_registered: 1,
  gst_filing_consistency_pct: 91,
  gst_turnover_growth_rate: 12,
  gst_avg_monthly_turnover_inr: 420000,
  gst_late_filing_count_12m: 1,
  upi_available: 1,
  upi_monthly_txn_count: 320,
  upi_avg_inflow_inr: 1800,
  upi_inflow_volatility: 0.21,
  upi_bounce_rate_pct: 0.8,
  aa_consent_given: 1,
  aa_avg_bank_balance_inr: 250000,
  aa_trade_payable_days: 28,
  aa_cash_flow_ratio: 1.4,
  aa_emi_to_inflow_ratio: 0.23,
  aa_overdraft_utilization_pct: 18,
  epfo_registered: 1,
  epfo_employee_count: 42,
  epfo_contribution_consistency_pct: 96,
  epfo_avg_wage_inr: 24500,
  epfo_employee_growth_rate: 0.14,
};
