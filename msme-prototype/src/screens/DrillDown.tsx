import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { GlassCard, SectionHeader, ProgressBar, InfoTooltip } from '../components/ui';
import { GlassAreaChart } from '../components/Charts';
import { SOURCE_META } from '../data/mock';
import { useCreditData } from '../context/CreditDataContext';
import { type BusinessRecord } from '../data/api';

const TABS = ['gst', 'upi', 'aa', 'epfo'];

// Helper to generate a deterministic list of monthly values based on a base and id
function getDeterministicMonthlyTrend(base: number, id: string, length = 6, multiplier = 1) {
  const hash = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return Array.from({ length }).map((_, idx) => {
    const monthNames = ['Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    const variation = Math.sin(hash + idx) * 0.15 + (idx / length) * 0.1; // steady minor growth + variance
    const val = base * multiplier * (1 + variation);
    return {
      month: monthNames[idx % 12],
      turnover: roundToTwo(val),
      inflow: roundToTwo(val),
      outflow: roundToTwo(val * 0.82 + Math.cos(hash + idx) * (val * 0.05)),
      balance: roundToTwo(val * 0.45 + Math.sin(hash - idx) * (val * 0.1)),
    };
  });
}

function roundToTwo(num: number) {
  return Math.round(num * 100) / 100;
}

function GSTView({ record }: { record: BusinessRecord }) {
  const baseTurnover = (record.gst_avg_monthly_turnover_inr ?? 250000) / 100000; // in Lakhs
  const filingsCount = 12;
  const lateCount = record.gst_late_filing_count_12m ?? 2;
  const missedCount = (record.gst_filing_consistency_pct ?? 100) < 90 ? 1 : 0;
  const onTimeCount = filingsCount - lateCount - missedCount;

  // Generate calendar cells: first (onTimeCount) are check, next (lateCount) are alert, rest are missed
  const filings = Array.from({ length: filingsCount }).map((_, idx) => {
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    let status: 'check' | 'late' | 'missed' = 'check';
    if (idx >= onTimeCount + lateCount) {
      status = 'missed';
    } else if (idx >= onTimeCount) {
      status = 'late';
    }
    return {
      month: monthNames[idx],
      filed: status !== 'missed',
      onTime: status === 'check',
      turnover: baseTurnover * (1 + Math.sin(idx) * 0.1),
    };
  });

  const turnoverData = filings.map(f => ({ month: f.month, turnover: roundToTwo(f.turnover) }));

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Avg Monthly Turnover', value: `₹${baseTurnover.toFixed(1)} Lakhs`, color: '#F59E0B' },
          { label: 'GST Compliance Score', value: `${(record.gst_filing_consistency_pct ?? 100).toFixed(0)}%`, color: '#10B981' },
          { label: 'Missed Filings', value: missedCount, color: '#EF4444', sub: 'in 12 months' },
          { label: 'Late Filings', value: lateCount, color: '#F59E0B', sub: 'in 12 months' },
        ].map((s, i) => (
          <GlassCard key={i} className="p-4">
            <div className="text-xs text-slate-400 mb-1">{s.label}</div>
            <div className="text-xl font-bold" style={{ color: s.color }}>{s.value}</div>
            {s.sub && <div className="text-xs text-slate-500">{s.sub}</div>}
          </GlassCard>
        ))}
      </div>

      {/* Filing heatmap calendar */}
      <GlassCard className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <p className="text-sm font-bold text-white">GSTR-3B Monthly Filing Calendar</p>
          <InfoTooltip text="Green = filed on time. Amber = filed late. Red = missed. A consistent filing record signals business discipline to lenders." />
        </div>
        <div className="grid grid-cols-6 md:grid-cols-12 gap-2">
          {filings.map((f, i) => (
            <div key={i} className="text-center">
              <div className={`w-8 h-8 mx-auto rounded-lg flex items-center justify-center text-xs font-bold mb-1 ${
                !f.filed ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                !f.onTime ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
              }`}>
                {!f.filed ? '✗' : !f.onTime ? '~' : '✓'}
              </div>
              <div className="text-xxs text-slate-500">{f.month}</div>
            </div>
          ))}
        </div>
        <div className="flex gap-4 mt-3 text-xxs text-slate-500">
          <span><span className="text-emerald-400">✓</span> On-time</span>
          <span><span className="text-amber-400">~</span> Late</span>
          <span><span className="text-red-400">✗</span> Missed</span>
        </div>
      </GlassCard>

      {/* Turnover trend */}
      <GlassCard className="p-5">
        <div className="flex items-center gap-2 mb-3">
          <p className="text-sm font-bold text-white">Monthly Declared Turnover (₹ Lakhs)</p>
          <InfoTooltip text="Higher, consistent declared turnover strengthens the GST pillar." />
        </div>
        <GlassAreaChart
          data={turnoverData}
          keys={[{ key: 'turnover', color: '#F59E0B', label: 'Turnover (₹L)' }]}
          height={180}
        />
      </GlassCard>
    </div>
  );
}

function UPIView({ record }: { record: BusinessRecord }) {
  const baseInflow = (record.upi_avg_inflow_inr ?? 150000) / 100000; // in Lakhs
  const monthlyData = getDeterministicMonthlyTrend(baseInflow, record.enterprise_id || 'MSME', 6);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {[
          { label: 'Avg Monthly Inflow', value: `₹${(baseInflow * 100).toFixed(0)}k`, color: '#10B981' },
          { label: 'Bounce Rate', value: `${(record.upi_bounce_rate_pct ?? 2.5).toFixed(1)}%`, color: (record.upi_bounce_rate_pct ?? 0) > 5 ? '#EF4444' : '#10B981', sub: 'Failed transaction rate' },
          { label: 'UPI Frequency', value: `${(record.upi_monthly_txn_count ?? 45).toFixed(0)} tx/mo`, color: '#3B82F6', sub: 'Velocity frequency' },
        ].map((s, i) => (
          <GlassCard key={i} className="p-4">
            <div className="text-xs text-slate-400 mb-1">{s.label}</div>
            <div className="text-xl font-bold" style={{ color: s.color }}>{s.value}</div>
            {s.sub && <div className="text-xs text-slate-500">{s.sub}</div>}
          </GlassCard>
        ))}
      </div>
      <GlassCard className="p-5">
        <div className="flex items-center gap-2 mb-3">
          <p className="text-sm font-bold text-white">Monthly Cash Flow — Inflow vs Outflow (₹ Lakhs)</p>
          <InfoTooltip text="UPI receipts flow compared to outward digital vendor payments." />
        </div>
        <GlassAreaChart
          data={monthlyData}
          keys={[{ key: 'inflow', color: '#10B981', label: 'Inflow' }, { key: 'outflow', color: '#EF4444', label: 'Outflow' }]}
          height={200}
        />
      </GlassCard>
    </div>
  );
}

function AAView({ record }: { record: BusinessRecord }) {
  const baseBalance = (record.aa_avg_bank_balance_inr ?? 80000) / 100000; // in Lakhs
  const monthlyData = getDeterministicMonthlyTrend(baseBalance, record.enterprise_id || 'MSME', 6);
  const odUtil = record.aa_overdraft_utilization_pct ?? 0;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Avg Bank Balance', value: `₹${(baseBalance * 100).toFixed(0)}k`, color: '#3B82F6' },
          { label: 'OD Utilisation', value: `${odUtil.toFixed(0)}%`, color: odUtil > 35 ? '#F59E0B' : '#10B981', sub: '>35% is flagged' },
          { label: 'Trade Payable Days', value: `${record.aa_trade_payable_days ?? 30}d`, color: '#8B5CF6', sub: 'Creditor aging vintage' },
          { label: 'EMI/Inflow Ratio', value: `${((record.aa_emi_to_inflow_ratio ?? 0)*100).toFixed(0)}%`, color: '#EF4444', sub: 'Debt service burden' },
        ].map((s, i) => (
          <GlassCard key={i} className="p-4">
            <div className="text-xs text-slate-400 mb-1">{s.label}</div>
            <div className="text-xl font-bold" style={{ color: s.color }}>{s.value}</div>
            {s.sub && <div className="text-xs text-slate-500">{s.sub}</div>}
          </GlassCard>
        ))}
      </div>
      <GlassCard className="p-5">
        <div className="flex items-center gap-2 mb-3">
          <p className="text-sm font-bold text-white">Bank Balance Trend (₹ Lakhs)</p>
          <InfoTooltip text="Average bank balances aggregated via the Account Aggregator." />
        </div>
        <GlassAreaChart data={monthlyData} keys={[{ key: 'balance', color: '#3B82F6', label: 'Balance (₹L)' }]} height={180} />
      </GlassCard>
      <GlassCard className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <p className="text-sm font-bold text-white">Overdraft Utilization</p>
          <InfoTooltip text="High OD utilization signals liquidity stress to credit models." />
        </div>
        <ProgressBar value={odUtil} color={odUtil > 35 ? '#F59E0B' : '#10B981'} />
        <div className="flex justify-between text-xs text-slate-500 mt-1.5">
          <span>0%</span><span className="text-amber-400">35% threshold</span><span>100%</span>
        </div>
      </GlassCard>
    </div>
  );
}

function EPFOView({ record }: { record: BusinessRecord }) {
  if (!record.epfo_registered) {
    return (
      <GlassCard className="p-8 text-center border-dashed border-white/10">
        <div className="text-3xl mb-3">👥</div>
        <p className="text-sm font-bold text-white mb-1">EPFO Payroll Data Offline</p>
        <p className="text-xs text-slate-400 max-w-sm mx-auto mb-4">
          This enterprise has not registered or linked an EPFO account. Sub-score is reweighted to other active sources.
        </p>
      </GlassCard>
    );
  }

  const staffCount = record.epfo_employee_count ?? 0;
  const consistency = record.epfo_contribution_consistency_pct ?? 100;
  const filingsCount = 12;
  const missedCount = consistency < 90 ? 1 : 0;
  const paidCount = filingsCount - missedCount;

  // Generate calendar grid
  const contributions = Array.from({ length: filingsCount }).map((_, idx) => {
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const paid = idx < paidCount;
    return {
      month: monthNames[idx],
      paid,
      employees: paid ? staffCount : 0,
    };
  });

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {[
          { label: 'Active Registered Headcount', value: `${staffCount} employees`, color: '#8B5CF6' },
          { label: 'Payment Consistency', value: `${consistency.toFixed(0)}%`, color: '#10B981', sub: 'On-time ECR deposit rate' },
          { label: 'Avg Wage INR', value: `₹${(record.epfo_avg_wage_inr ?? 15000).toLocaleString('en-IN')}`, color: '#3B82F6', sub: 'Mean workforce compensation' },
        ].map((s, i) => (
          <GlassCard key={i} className="p-4">
            <div className="text-xs text-slate-400 mb-1">{s.label}</div>
            <div className="text-xl font-bold" style={{ color: s.color }}>{s.value}</div>
            {s.sub && <div className="text-xs text-slate-500">{s.sub}</div>}
          </GlassCard>
        ))}
      </div>
      <GlassCard className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <p className="text-sm font-bold text-white">EPFO Contribution Calendar</p>
          <InfoTooltip text="Grid cells show the headcount reported under Employee Provident Fund ECR returns." />
        </div>
        <div className="grid grid-cols-6 md:grid-cols-12 gap-2">
          {contributions.map((c, i) => (
            <div key={i} className="text-center">
              <div className={`w-8 h-8 mx-auto rounded-lg flex items-center justify-center text-xs font-bold mb-1 ${
                !c.paid ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                'bg-purple-500/20 text-purple-400 border border-purple-500/30'
              }`}>
                {!c.paid ? '✗' : c.employees}
              </div>
              <div className="text-xxs text-slate-500">{c.month}</div>
            </div>
          ))}
        </div>
        <p className="text-xs text-slate-500 mt-3">Numbers show registered workforce headcounts by month</p>
      </GlassCard>
    </div>
  );
}

const VIEWS = {
  gst: GSTView,
  upi: UPIView,
  aa: AAView,
  epfo: EPFOView,
};

export default function DrillDown() {
  const [params] = useSearchParams();
  const nav = useNavigate();
  const [active, setActive] = useState(params.get('tab') || 'gst');
  const { record, score, loading } = useCreditData();

  if (loading || !record || !score) {
    return (
      <div className="min-h-screen pt-20 flex items-center justify-center">
        <p className="text-sm font-bold text-slate-400 animate-pulse">Loading Detailed Credit Files…</p>
      </div>
    );
  }

  const ViewComponent = VIEWS[active as keyof typeof VIEWS];
  const meta = SOURCE_META[active as keyof typeof SOURCE_META];

  return (
    <div className="min-h-screen pt-20 pb-12">
      <div className="max-w-5xl mx-auto px-6">
        {/* Breadcrumb */}
        <button className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-white mb-5 transition-colors" onClick={() => nav(-1)}>
          <ArrowLeft size={14} /> Back
        </button>

        <SectionHeader
          title="Data Source Detail View"
          subtitle={`Drill into the raw parameters for ${record.enterprise_id}. Every dashboard here aligns directly with weights in the ML credit underwriting engine.`}
        />

        {/* Source tab switcher */}
        <div className="flex gap-2 flex-wrap mb-6">
          {TABS.map(tab => {
            const m = SOURCE_META[tab as keyof typeof SOURCE_META];
            const isActive = active === tab;
            const subScore = score[`${tab}_score` as keyof typeof score] as number | null;
            return (
              <button
                key={tab}
                onClick={() => setActive(tab)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 ${
                  isActive ? 'text-white border' : 'text-slate-400 hover:text-slate-200 border border-white/5 hover:border-white/10'
                }`}
                style={isActive ? { background: m.bg, borderColor: m.border, color: m.color } : {}}
              >
                {m.icon} {m.label}
                <span className="text-xs opacity-70">({subScore?.toFixed(0) ?? '—'})</span>
              </button>
            );
          })}
        </div>

        {/* Active source header */}
        <GlassCard className="p-4 mb-5 flex items-center gap-4">
          <div className="text-2xl">{meta.icon}</div>
          <div className="flex-1">
            <p className="text-sm font-bold text-white">{meta.label}</p>
            <p className="text-xs text-slate-400">{meta.description}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-500">Model weight</p>
            <p className="text-lg font-bold" style={{ color: meta.color }}>{meta.weight}</p>
          </div>
        </GlassCard>

        {/* Dynamic view */}
        <AnimatePresence mode="wait">
          <motion.div
            key={active}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.25 }}
          >
            <ViewComponent record={record} />
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
