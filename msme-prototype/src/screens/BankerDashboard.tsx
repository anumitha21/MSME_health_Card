import { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Download, ChevronDown, ChevronUp, TrendingUp, TrendingDown, Minus, ExternalLink } from 'lucide-react';
import { SubScoreRadar, GlassBarChart } from '../components/Charts';
import { GlassCard, SectionHeader, ScoreTierBadge, ConfidenceBadge, InfoTooltip, ProgressBar, StatCard } from '../components/ui';
import { SOURCE_META } from '../data/mock';
import { useCreditData } from '../context/CreditDataContext';

export default function BankerDashboard() {
  const nav = useNavigate();
  const [showRationale, setShowRationale] = useState(false);
  const { score, record, loading } = useCreditData();

  if (loading || !score || !record) {
    return (
      <div className="min-h-screen pt-20 flex items-center justify-center">
        <p className="text-sm font-bold text-slate-400 animate-pulse">Loading Live Underwriting File…</p>
      </div>
    );
  }

  const radarScores = {
    gst: score.gst_score ?? 0,
    upi: score.upi_score ?? 0,
    aa: score.aa_score ?? 0,
    epfo: score.epfo_score ?? 0
  };

  const SOURCE_ROWS = [
    {
      key: 'gst',
      label: 'GST Filing',
      score: score.gst_score ?? 0,
      weight: '28%',
      quality: (record.gst_filing_consistency_pct ?? 0) > 80 ? 'High' : 'Medium',
      trend: (record.gst_turnover_growth_rate ?? 0) > 0 ? 'up' : 'stable',
      dataPoints: '12 months',
      notes: `${record.gst_late_filing_count_12m ?? 0} late filings, ${record.gst_filing_consistency_pct?.toFixed(0)}% on-time`
    },
    {
      key: 'upi',
      label: 'UPI Cash Flow',
      score: score.upi_score ?? 0,
      weight: '25%',
      quality: 'High',
      trend: 'up',
      dataPoints: '6 months',
      notes: `Avg Inflow: ₹${((record.upi_avg_inflow_inr ?? 0)/1000).toFixed(0)}k, Volatility: ${(record.upi_inflow_volatility ?? 0).toFixed(2)}`
    },
    {
      key: 'aa',
      label: 'Bank (AA)',
      score: score.aa_score ?? 0,
      weight: '30%',
      quality: (record.aa_consent_given ?? 0) ? 'High' : 'Low',
      trend: (record.aa_overdraft_utilization_pct ?? 0) > 40 ? 'down' : 'stable',
      dataPoints: '6 months',
      notes: `OD Utilisation: ${record.aa_overdraft_utilization_pct?.toFixed(0)}% ⚠️, Payable days: ${record.aa_trade_payable_days ?? 30}d`
    },
    {
      key: 'epfo',
      label: 'EPFO Payroll',
      score: score.epfo_score ?? 0,
      weight: '17%',
      quality: record.epfo_registered ? 'High' : 'N/A',
      trend: 'stable',
      dataPoints: record.epfo_registered ? '12 months' : 'None',
      notes: record.epfo_registered ? `${record.epfo_employee_count} employees, consistency: ${record.epfo_contribution_consistency_pct?.toFixed(0)}%` : 'Not linked'
    },
  ];

  const PORTFOLIO_BARS = [
    { name: 'Your Score', value: score.overall_score ?? 0, color: '#10B981' },
    { name: 'Sector Avg', value: 61, color: '#3B82F6' },
    { name: 'Top 25%',    value: 85, color: '#C9A15A' },
    { name: 'Bottom 25%', value: 41, color: '#EF4444' },
  ];

  const KO_FLAGS = [
    { check: 'GST registration active', status: record.gst_registered ? 'pass' : 'fail' },
    { check: 'No wilful default on CIBIL', status: 'pass' },
    { check: 'Business vintage ≥ 2 years', status: (record.years_in_operation ?? 0) >= 2 ? 'pass' : 'fail' },
    { check: 'No insolvency proceedings', status: 'pass' },
    { check: 'EPFO compliance consistency ≥ 90%', status: (record.epfo_contribution_consistency_pct ?? 100) >= 90 ? 'pass' : 'warn', note: `${record.epfo_contribution_consistency_pct?.toFixed(0)}% consistency` },
  ];

  return (
    <div className="min-h-screen pt-20 pb-12">
      <div className="max-w-6xl mx-auto px-6">
        <div className="flex items-start justify-between flex-wrap gap-4 mb-6">
          <SectionHeader
            title="Credit Assessment — Banker View"
            subtitle={`${record.enterprise_id} · Sector: ${record.sector || 'Unknown'} · Segment: ${record.segment || 'Unknown'}`}
            badge={<ScoreTierBadge tier={score.risk_tier} />}
          />
          <button className="btn-ghost text-sm">
            <Download size={14} /> Export PDF
          </button>
        </div>

        {/* KPI Strip */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
          <StatCard label="Health Score" value={<span className="text-emerald-400">{score.overall_score ?? 0}</span>} sub={`/100 — ${score.decision}`}
            tooltip="Fused score across 4 alternate data pillars. Weighted by pillar reliability." />
          <StatCard label="Risk Tier" value={<ScoreTierBadge tier={score.risk_tier} size="sm" />} sub={`${score.risk_tier} · ${score.decision}`}
            tooltip="Tier maps to underwriting action thresholds. Below B = manual review required." />
          <StatCard label="PD (1Y)" value={<span className="text-amber-400">{(score as any).pd ?? 4.2}%</span>} sub="Probability of Default"
            tooltip="1-Year probability of default derived from risk tier mapping and portfolio calibration. Sector average: 7.8%." />
          <StatCard label="Data Confidence" value={score.data_confidence} sub={`${score.data_confidence} Confidence`}
            tooltip="Confidence band reflects data completeness." />
          <StatCard label="Vintage" value={`${record.years_in_operation?.toFixed(1) ?? '—'} yr`} sub="Operating Vintage"
            tooltip="Years the enterprise has been active." />
        </div>

        {/* Charts row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <GlassCard className="p-6">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-bold text-white">Pillar Score Radar</p>
              <InfoTooltip text="Each axis is 0–100. The nearer to edge, the better." />
            </div>
            <SubScoreRadar scores={radarScores} size={220} />
          </GlassCard>
          <GlassCard className="p-6">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-bold text-white">Portfolio Benchmarking</p>
              <InfoTooltip text="Compares this borrower's score against sector peers. Green bar = this applicant." />
            </div>
            <GlassBarChart data={PORTFOLIO_BARS} height={180} />
            <p className="text-xs text-slate-500 mt-2">Sector: {record.sector || 'General'} · Peer comparison</p>
          </GlassCard>
        </div>

        {/* Per-source breakdown table */}
        <GlassCard className="mb-6">
          <div className="p-5 border-b border-white/5 flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-white">Per-Source Score Breakdown</p>
              <p className="text-xs text-slate-400 mt-0.5">Click any source row to drill into the raw data</p>
            </div>
            <ConfidenceBadge
              sources={['gold','silver','bronze'].includes(score.data_confidence.toLowerCase()) ? (score.data_confidence.toLowerCase() === 'gold' ? 4 : score.data_confidence.toLowerCase() === 'silver' ? 3 : 2) : 1}
              total={4}
              level={score.data_confidence}
            />
          </div>
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Data Source</th>
                  <th>Sub-Score</th>
                  <th>Model Weight</th>
                  <th>Data Quality</th>
                  <th>Trend</th>
                  <th>Coverage</th>
                  <th>Signal Notes</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {SOURCE_ROWS.map(row => (
                  <tr key={row.key} className="cursor-pointer" onClick={() => nav(`/drilldown?tab=${row.key}`)}>
                    <td>
                      <div className="flex items-center gap-2">
                        <span className="text-base">{SOURCE_META[row.key as keyof typeof SOURCE_META].icon}</span>
                        <span className="text-sm font-medium text-white">{row.label}</span>
                      </div>
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm" style={{ color: row.score >= 75 ? '#10B981' : row.score >= 60 ? '#60A5FA' : '#FBBF24' }}>
                          {row.score}
                        </span>
                        <div className="w-16">
                          <ProgressBar value={row.score} color={row.score >= 75 ? '#10B981' : row.score >= 60 ? '#3B82F6' : '#F59E0B'} />
                        </div>
                      </div>
                    </td>
                    <td><span className="badge-slate">{row.weight}</span></td>
                    <td>
                      <span className={row.quality === 'High' ? 'badge-emerald' : 'badge-amber'}>{row.quality}</span>
                    </td>
                    <td>
                      {row.trend === 'up' && <TrendingUp size={14} className="text-emerald-400" />}
                      {row.trend === 'down' && <TrendingDown size={14} className="text-red-400" />}
                      {row.trend === 'stable' && <Minus size={14} className="text-slate-400" />}
                    </td>
                    <td className="text-xs text-slate-400">{row.dataPoints}</td>
                    <td className="text-xs text-slate-400 max-w-36">{row.notes}</td>
                    <td><ExternalLink size={12} className="text-slate-500" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </GlassCard>

        {/* KO Checks + Decision Rationale */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* KO Flags */}
          <GlassCard className="p-5">
            <p className="text-sm font-bold text-white mb-4">Knock-Out Compliance Checks</p>
            <div className="space-y-2">
              {KO_FLAGS.map((f, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs flex-shrink-0 ${
                    f.status === 'pass' ? 'bg-emerald-500/15 text-emerald-400' :
                    f.status === 'warn' ? 'bg-amber-500/15 text-amber-400' : 'bg-red-500/15 text-red-400'
                  }`}>
                    {f.status === 'pass' ? '✓' : '!'}
                  </div>
                  <span className="text-xs text-slate-300 flex-1">{f.check}</span>
                  {f.note && <span className="text-xxs text-amber-400">{f.note}</span>}
                </div>
              ))}
            </div>
          </GlassCard>

          {/* Decision Rationale */}
          <GlassCard className="p-5">
            <button
              className="w-full flex items-center justify-between text-left mb-2"
              onClick={() => setShowRationale(v => !v)}
            >
              <p className="text-sm font-bold text-white">Decision Rationale Panel</p>
              {showRationale ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
            </button>
            <p className="text-xs text-slate-500 mb-3">Model-generated reasoning — exportable for loan file</p>
            {!showRationale && (
              <div className="p-3 rounded-xl bg-blue-500/8 border border-blue-500/15">
                <p className="text-xs text-blue-300">Recommendation: <span className="font-bold">{score.decision}</span></p>
                <p className="text-xs text-slate-400 mt-1">Score: {score.overall_score}/100 · Tier {score.risk_tier} · {score.data_confidence} confidence</p>
              </div>
            )}
            {showRationale && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2">
                <div className="p-3 rounded-xl bg-blue-500/8 border border-blue-500/15 text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">
                  <span className="text-blue-400 font-semibold">Gemini Audit Justification:</span>
                  <p className="mt-1">{score.audit_justification || 'No justification generated.'}</p>
                </div>
              </motion.div>
            )}
          </GlassCard>
        </div>

        <div className="flex gap-3 flex-wrap">
          <button className="btn-ghost" onClick={() => nav('/drilldown')}>View Source Data Drill-Down</button>
          <button className="btn-primary" onClick={() => nav('/simulator')}>Run What-If Scenarios <ExternalLink size={13} /></button>
        </div>
      </div>
    </div>
  );
}
