import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  fetchScoreById, fetchTrend, fetchEnterpriseRecord, checkHealth,
  type ScoreResponse, type TrendResponse, type BusinessRecord
} from '../data/api';

interface CreditDataContextType {
  enterpriseId: string;
  setEnterpriseId: (id: string) => void;
  score: ScoreResponse | null;
  trend: TrendResponse | null;
  record: BusinessRecord | null;
  loading: boolean;
  error: string | null;
  backendAlive: boolean | null;
  refreshData: () => Promise<void>;
  simulateScore: (customWeights: Record<string, number>) => Promise<ScoreResponse>;
}

const CreditDataContext = createContext<CreditDataContextType | undefined>(undefined);

export function CreditDataProvider({ children }: { children: React.ReactNode }) {
  const [enterpriseId, setEnterpriseIdState] = useState<string>(() => {
    return localStorage.getItem('active_msme_id') || 'MSME100001';
  });
  const [score, setScore] = useState<ScoreResponse | null>(null);
  const [trend, setTrend] = useState<TrendResponse | null>(null);
  const [record, setRecord] = useState<BusinessRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [backendAlive, setBackendAlive] = useState<boolean | null>(null);

  // Check health on mount
  useEffect(() => {
    checkHealth().then(alive => {
      setBackendAlive(alive);
    });
  }, []);

  const loadData = async (id: string, isAlive: boolean) => {
    if (!isAlive) {
      // Mock fallback: set mock structures based on mock.ts values
      // (This will be dynamically overridden by local page mocks if needed, 
      // but let's load a standard fallback record to prevent page crashes)
      setRecord({
        enterprise_id: id,
        segment: 'Micro',
        sector: 'Textile Manufacturing',
        years_in_operation: 6,
        is_ntc: 0,
        is_ntb: 0,
        gst_registered: 1,
        gst_filing_consistency_pct: 91.7,
        gst_turnover_growth_rate: 12.5,
        gst_avg_monthly_turnover_inr: 930000,
        gst_late_filing_count_12m: 2,
        upi_available: 1,
        upi_monthly_txn_count: 75,
        upi_avg_inflow_inr: 777000,
        upi_inflow_volatility: 0.24,
        upi_bounce_rate_pct: 3.2,
        aa_consent_given: 1,
        aa_avg_bank_balance_inr: 430000,
        aa_trade_payable_days: 38,
        aa_cash_flow_ratio: 0.85,
        aa_emi_to_inflow_ratio: 0.22,
        aa_overdraft_utilization_pct: 42,
        epfo_registered: 1,
        epfo_employee_count: 24,
        epfo_contribution_consistency_pct: 91.7,
        epfo_avg_wage_inr: 14500,
        epfo_employee_growth_rate: 9,
      });

      setScore({
        enterprise_id: id,
        overall_score: 74,
        gst_score: 81,
        upi_score: 76,
        aa_score: 68,
        epfo_score: 71,
        risk_tier: 'B+',
        score_range_low: 69,
        score_range_high: 79,
        data_confidence: 'Gold',
        confidence_tier: 'Gold',
        decision: 'Approve with Monitoring',
        triggered_rules: ['High Overdraft Utilisation', 'EPFO Contribution Gap'],
        key_drivers: [
          { feature: 'gst_filing_consistency_pct', impact: 8.2, type: 'Positive Driver' },
          { feature: 'upi_avg_inflow_inr', impact: 6.4, type: 'Positive Driver' },
          { feature: 'aa_overdraft_utilization_pct', impact: -5.1, type: 'Negative Driver' },
          { feature: 'epfo_employee_growth_rate', impact: 3.5, type: 'Positive Driver' },
        ],
        recommendations: [
          { pillar: 'aa', title: 'Reduce Overdraft Utilization', recommendation: 'Pay down overdraft below 35% utilization.', estimated_lift: 6 },
          { pillar: 'gst', title: 'On-time GST Filing', recommendation: 'File next 3 filings before the due date.', estimated_lift: 4 },
        ],
        self_supervised_embedding: [],
        audit_justification: 'Mock justification: Customer exhibits steady cash receipts with minor EPFO calendar gap.',
      });

      setTrend({
        enterprise_id: id,
        ews_status: 'Green',
        ews_message: 'Mock EWS: Cash flow shows stable MoM metrics.',
        drift_detected: false,
        recommendation: 'Maintain standard monitoring.',
        periods: [
          { label: 'T-90', overall_score: 73, gst_score: null, upi_score: null, aa_score: null, epfo_score: null, risk_tier: 'B+', drift_flags: [] },
          { label: 'T-60', overall_score: 74, gst_score: null, upi_score: null, aa_score: null, epfo_score: null, risk_tier: 'B+', drift_flags: [] },
          { label: 'T-30', overall_score: 74, gst_score: null, upi_score: null, aa_score: null, epfo_score: null, risk_tier: 'B+', drift_flags: [] },
        ]
      });
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const [scoreData, trendData, recordData] = await Promise.all([
        fetchScoreById(id),
        fetchTrend(id),
        fetchEnterpriseRecord(id).catch(err => {
          console.warn('Enterprise record not found or route offline, using fallback:', err);
          return {
            enterprise_id: id,
            segment: 'Micro',
            sector: 'Textile Manufacturing',
            years_in_operation: 6,
            is_ntc: 0,
            is_ntb: 0,
            gst_registered: 1,
            gst_filing_consistency_pct: 91.7,
            gst_turnover_growth_rate: 12.5,
            gst_avg_monthly_turnover_inr: 930000,
            gst_late_filing_count_12m: 2,
            upi_available: 1,
            upi_monthly_txn_count: 75,
            upi_avg_inflow_inr: 777000,
            upi_inflow_volatility: 0.24,
            upi_bounce_rate_pct: 3.2,
            aa_consent_given: 1,
            aa_avg_bank_balance_inr: 430000,
            aa_trade_payable_days: 38,
            aa_cash_flow_ratio: 0.85,
            aa_emi_to_inflow_ratio: 0.22,
            aa_overdraft_utilization_pct: 42,
            epfo_registered: 1,
            epfo_employee_count: 24,
            epfo_contribution_consistency_pct: 91.7,
            epfo_avg_wage_inr: 14500,
            epfo_employee_growth_rate: 9,
          };
        }),
      ]);
      setScore(scoreData);
      setTrend(trendData);
      setRecord(recordData);
    } catch (e: any) {
      setError(e.message || 'Failed to fetch enterprise data from API');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkHealth().then(alive => {
      setBackendAlive(alive);
      loadData(enterpriseId, alive);
    });
  }, [enterpriseId]);

  const setEnterpriseId = (id: string) => {
    localStorage.setItem('active_msme_id', id);
    setEnterpriseIdState(id);
  };

  const refreshData = async () => {
    const alive = await checkHealth();
    setBackendAlive(alive);
    await loadData(enterpriseId, alive);
  };

  const simulateScore = async (customWeights: Record<string, number>): Promise<ScoreResponse> => {
    if (!backendAlive || !record) {
      // In mock mode, simply return simulated score directly
      const gstScore = Math.min(100, 50 + ((record?.gst_filing_consistency_pct ?? 80) * 0.5));
      const upiScore = Math.min(100, 55 + ((record?.gst_turnover_growth_rate ?? 12) * 0.4));
      const aaScore = Math.max(10, 100 - (record?.aa_overdraft_utilization_pct ?? 40) * 0.7);
      const epfoScore = Math.min(100, 55 + ((record?.epfo_contribution_consistency_pct ?? 90) / 100) * 45);

      const w = {
        gst: customWeights.gst ?? 0.28,
        upi: customWeights.upi ?? 0.25,
        aa: customWeights.aa ?? 0.30,
        epfo: customWeights.epfo ?? 0.17
      };
      const totalW = w.gst + w.upi + w.aa + w.epfo;
      const gstW = w.gst / totalW;
      const upiW = w.upi / totalW;
      const aaW = w.aa / totalW;
      const epfoW = w.epfo / totalW;

      const overall = Math.round(gstScore * gstW + upiScore * upiW + aaScore * aaW + epfoScore * epfoW);
      return {
        enterprise_id: enterpriseId,
        overall_score: overall,
        gst_score: Math.round(gstScore),
        upi_score: Math.round(upiScore),
        aa_score: Math.round(aaScore),
        epfo_score: Math.round(epfoScore),
        risk_tier: overall >= 80 ? 'A' : overall >= 70 ? 'B+' : 'C',
        score_range_low: overall - 5,
        score_range_high: overall + 5,
        data_confidence: 'Gold',
        confidence_tier: 'Gold',
        decision: 'Approve',
        triggered_rules: [],
        key_drivers: [],
        recommendations: [],
        self_supervised_embedding: [],
        audit_justification: 'Simulated justification based on custom weights.'
      };
    }

    const payload = {
      ...record,
      fusion_weights: customWeights
    };

    const res = await fetch('http://127.0.0.1:8000/score/custom', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('Simulation score failed');
    return res.json();
  };

  return (
    <CreditDataContext.Provider value={{
      enterpriseId,
      setEnterpriseId,
      score,
      trend,
      record,
      loading,
      error,
      backendAlive,
      refreshData,
      simulateScore
    }}>
      {children}
    </CreditDataContext.Provider>
  );
}

export function useCreditData() {
  const context = useContext(CreditDataContext);
  if (!context) throw new Error('useCreditData must be used within a CreditDataProvider');
  return context;
}
