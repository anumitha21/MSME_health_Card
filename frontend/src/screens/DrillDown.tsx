import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useCreditData } from '../context/CreditDataContext';
import { type BusinessRecord } from '../data/api';
import { SOURCE_META } from '../data/mock';
import { GlassAreaChart } from '../components/Charts';

const TABS = ['gst', 'upi', 'aa', 'epfo'];

// Mapped color configs for tabs in ledger theme
const LEDGER_TAB_STYLE: Record<string, { color: string; bg: string; border: string }> = {
  gst:  { color: '#234E45', bg: '#E6ECE9', border: '#C4D3CD' },
  upi:  { color: '#234E45', bg: '#E6ECE9', border: '#C4D3CD' },
  aa:   { color: '#7B5500', bg: '#FAF3E0', border: '#ECDDB0' },
  epfo: { color: '#8A332E', bg: '#F5ECEB', border: '#ECCDCB' },
};

function getDeterministicMonthlyTrend(base: number, id: string, length = 6, multiplier = 1) {
  const hash = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return Array.from({ length }).map((_, idx) => {
    const monthNames = ['Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    const variation = Math.sin(hash + idx) * 0.15 + (idx / length) * 0.1;
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
  const baseTurnover = (record.gst_avg_monthly_turnover_inr ?? 250000) / 100000;
  const filingsCount = 12;
  const lateCount = record.gst_late_filing_count_12m ?? 2;
  const missedCount = (record.gst_filing_consistency_pct ?? 100) < 90 ? 1 : 0;
  const onTimeCount = filingsCount - lateCount - missedCount;

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
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Avg Monthly Turnover', value: `₹${baseTurnover.toFixed(1)} Lakhs`, color: '#234E45' },
          { label: 'GST Compliance Score', value: `${(record.gst_filing_consistency_pct ?? 100).toFixed(0)}%`, color: '#234E45' },
          { label: 'Missed Filings (12M)', value: missedCount, color: missedCount > 0 ? '#8A332E' : '#234E45' },
          { label: 'Late Filings (12M)', value: lateCount, color: lateCount > 0 ? '#7B5500' : '#234E45' },
        ].map((s, i) => (
          <div key={i} className="border border-[#E2DBD0] bg-white p-4">
            <div className="text-xxs font-data-mono uppercase text-[#556B82] mb-1">{s.label}</div>
            <div className="text-xl font-bold font-data-mono" style={{ color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Filing calendar */}
      <div className="border border-[#E2DBD0] bg-white p-6">
        <div className="flex items-center gap-2 mb-4">
          <p className="text-xs font-data-mono font-bold text-[#0C182A] uppercase">GSTR-3B Monthly Filing Calendar</p>
        </div>
        <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-12 gap-2">
          {filings.map((f, i) => (
            <div key={i} className="text-center">
              <div className={`w-8 h-8 mx-auto flex items-center justify-center text-xs font-bold font-data-mono mb-1 ${
                !f.filed ? 'bg-[#F5ECEB] text-[#8A332E] border border-[#ECCDCB]' :
                !f.onTime ? 'bg-[#FAF3E0] text-[#7B5500] border border-[#ECDDB0]' :
                'bg-[#E6ECE9] text-[#234E45] border border-[#C4D3CD]'
              }`} style={{ borderRadius: '0px' }}>
                {!f.filed ? '✗' : !f.onTime ? '~' : '✓'}
              </div>
              <div className="text-[10px] font-data-mono text-[#556B82]">{f.month.toUpperCase()}</div>
            </div>
          ))}
        </div>
        <div className="flex gap-4 mt-4 text-[10px] font-data-mono text-[#556B82] border-t border-[#FAF6F0] pt-3">
          <span><span className="text-[#234E45] font-bold">✓</span> On-Time</span>
          <span><span className="text-[#7B5500] font-bold">~</span> Late</span>
          <span><span className="text-[#8A332E] font-bold">✗</span> Missed</span>
        </div>
      </div>

      {/* Declared turnover chart */}
      <div className="border border-[#E2DBD0] bg-white p-6">
        <div className="flex items-center gap-2 mb-3">
          <p className="text-xs font-data-mono font-bold text-[#0C182A] uppercase">Declared GST Turnover Trend (₹ Lakhs)</p>
        </div>
        <GlassAreaChart
          data={turnoverData}
          keys={[{ key: 'turnover', color: '#234E45', label: 'GST Declared Turnover' }]}
          height={180}
        />
      </div>
    </div>
  );
}

function UPIView({ record }: { record: BusinessRecord }) {
  const baseInflow = (record.upi_avg_inflow_inr ?? 150000) / 100000;
  const monthlyData = getDeterministicMonthlyTrend(baseInflow, record.enterprise_id || 'MSME', 6);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {[
          { label: 'Avg Monthly Inflow', value: `₹${(baseInflow * 100).toFixed(0)}k`, color: '#234E45' },
          { label: 'Bounce Rate (NPCI Index)', value: `${(record.upi_bounce_rate_pct ?? 2.5).toFixed(1)}%`, color: (record.upi_bounce_rate_pct ?? 0) > 5 ? '#8A332E' : '#234E45' },
          { label: 'UPI TX Frequency', value: `${(record.upi_monthly_txn_count ?? 45).toFixed(0)} tx/mo`, color: '#234E45' },
        ].map((s, i) => (
          <div key={i} className="border border-[#E2DBD0] bg-white p-4">
            <div className="text-xxs font-data-mono uppercase text-[#556B82] mb-1">{s.label}</div>
            <div className="text-xl font-bold font-data-mono" style={{ color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>
      
      <div className="border border-[#E2DBD0] bg-white p-6">
        <div className="flex items-center gap-2 mb-3">
          <p className="text-xs font-data-mono font-bold text-[#0C182A] uppercase">UPI Operational Cash Flows (₹ Lakhs)</p>
        </div>
        <GlassAreaChart
          data={monthlyData}
          keys={[{ key: 'inflow', color: '#234E45', label: 'UPI Inward' }, { key: 'outflow', color: '#8A332E', label: 'UPI Outward' }]}
          height={200}
        />
      </div>
    </div>
  );
}

function AAView({ record }: { record: BusinessRecord }) {
  const baseBalance = (record.aa_avg_bank_balance_inr ?? 80000) / 100000;
  const monthlyData = getDeterministicMonthlyTrend(baseBalance, record.enterprise_id || 'MSME', 6);
  const odUtil = record.aa_overdraft_utilization_pct ?? 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Avg Bank Balance', value: `₹${(baseBalance * 100).toFixed(0)}k`, color: '#7B5500' },
          { label: 'Overdraft Utilisation', value: `${odUtil.toFixed(0)}%`, color: odUtil > 35 ? '#8A332E' : '#234E45' },
          { label: 'Trade Payable Days', value: `${record.aa_trade_payable_days ?? 30}d`, color: '#7B5500' },
          { label: 'EMI / Inflow Ratio', value: `${((record.aa_emi_to_inflow_ratio ?? 0)*100).toFixed(0)}%`, color: '#8A332E' },
        ].map((s, i) => (
          <div key={i} className="border border-[#E2DBD0] bg-white p-4">
            <div className="text-xxs font-data-mono uppercase text-[#556B82] mb-1">{s.label}</div>
            <div className="text-xl font-bold font-data-mono" style={{ color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>
      
      <div className="border border-[#E2DBD0] bg-white p-6">
        <div className="flex items-center gap-2 mb-3">
          <p className="text-xs font-data-mono font-bold text-[#0C182A] uppercase">Consolidated Bank Balances (₹ Lakhs)</p>
        </div>
        <GlassAreaChart data={monthlyData} keys={[{ key: 'balance', color: '#7B5500', label: 'Average Balance' }]} height={180} />
      </div>

      <div className="border border-[#E2DBD0] bg-white p-6">
        <div className="flex items-center gap-2 mb-3">
          <p className="text-xs font-data-mono font-bold text-[#0C182A] uppercase">Current Overdraft Limits Utilisation</p>
        </div>
        
        {/* flat ruled progress bar */}
        <div className="progress-track">
          <div className="progress-fill" style={{ width: `${odUtil}%`, background: odUtil > 35 ? '#8A332E' : '#234E45' }} />
        </div>
        
        <div className="flex justify-between text-[10px] font-data-mono text-[#556B82] mt-2">
          <span>0% UTILISATION</span>
          <span className="text-[#8A332E] font-bold">35% WARNING LIMIT</span>
          <span>100% UTILISATION</span>
        </div>
      </div>
    </div>
  );
}

function EPFOView({ record }: { record: BusinessRecord }) {
  if (!record.epfo_registered) {
    return (
      <div className="border border-[#E2DBD0] bg-white p-8 text-center border-dashed">
        <div className="text-3xl mb-3">👥</div>
        <p className="text-sm font-bold text-[#8A332E] mb-1 uppercase font-data-mono">EPFO Data Connection Offline</p>
        <p className="text-xs text-[#556B82] max-w-md mx-auto mt-2 leading-relaxed">
          The borrower has not connected an EPFO account. This data pillar has been marked offline, and weighting coefficients have been reallocated across remaining sources.
        </p>
      </div>
    );
  }

  const staffCount = record.epfo_employee_count ?? 0;
  const consistency = record.epfo_contribution_consistency_pct ?? 100;
  const filingsCount = 12;
  const missedCount = consistency < 90 ? 1 : 0;
  const paidCount = filingsCount - missedCount;

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
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {[
          { label: 'ECR Active Workforce Headcount', value: `${staffCount} employees`, color: '#234E45' },
          { label: 'Deposit Consistency', value: `${consistency.toFixed(0)}%`, color: '#234E45' },
          { label: 'Mean Salary Paid (INR)', value: `₹${(record.epfo_avg_wage_inr ?? 15000).toLocaleString('en-IN')}`, color: '#234E45' },
        ].map((s, i) => (
          <div key={i} className="border border-[#E2DBD0] bg-white p-4">
            <div className="text-xxs font-data-mono uppercase text-[#556B82] mb-1">{s.label}</div>
            <div className="text-xl font-bold font-data-mono" style={{ color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      <div className="border border-[#E2DBD0] bg-white p-6">
        <div className="flex items-center gap-2 mb-4">
          <p className="text-xs font-data-mono font-bold text-[#0C182A] uppercase">EPFO Contribution Ledger Calendar</p>
        </div>
        <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-12 gap-2">
          {contributions.map((c, i) => (
            <div key={i} className="text-center">
              <div className={`w-8 h-8 mx-auto flex items-center justify-center text-xs font-bold font-data-mono mb-1 ${
                !c.paid ? 'bg-[#F5ECEB] text-[#8A332E] border border-[#ECCDCB]' :
                'bg-[#F0EAE1] text-[#1B2D4A] border border-[#D9CEBE]'
              }`} style={{ borderRadius: '0px' }}>
                {!c.paid ? '✗' : c.employees}
              </div>
              <div className="text-[10px] font-data-mono text-[#556B82]">{c.month.toUpperCase()}</div>
            </div>
          ))}
        </div>
        <p className="text-[10px] font-data-mono text-[#556B82] mt-4 border-t border-[#FAF6F0] pt-3">
          * Figures inside boxes denote active headcount declarations submitted in monthly ECR reports.
        </p>
      </div>
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
      <div className="min-h-screen pt-20 flex items-center justify-center bg-[#FAF8F5]">
        <p className="text-sm font-data-mono text-[#556B82] animate-pulse">
          SECURE CONNECTION ACTIVE · DRILLING RAW UNDERWRITING METRICS...
        </p>
      </div>
    );
  }

  const ViewComponent = VIEWS[active as keyof typeof VIEWS];
  const meta = SOURCE_META[active as keyof typeof SOURCE_META];
  const activeStyle = LEDGER_TAB_STYLE[active] || LEDGER_TAB_STYLE.gst;

  return (
    <div className="min-h-screen pt-20 pb-16 bg-[#FAF8F5] text-[#1B2D4A] px-6 select-text">
      <div className="max-w-5xl mx-auto">
        
        {/* Breadcrumb */}
        <button 
          className="flex items-center gap-1.5 text-xs font-data-mono text-[#556B82] hover:text-[#0C182A] mb-5 uppercase cursor-pointer"
          onClick={() => nav(-1)}
        >
          <ArrowLeft size={13} /> Return to Profile
        </button>

        {/* Header */}
        <div className="border border-[#E2DBD0] bg-white p-6 mb-8 text-[#0C182A]">
          <span className="text-xxs font-data-mono font-bold tracking-widest text-[#8B704F] block uppercase">
            DETAILED UNDERWRITING RECORDS
          </span>
          <h1 className="font-serif-editorial text-3xl font-bold tracking-tight mt-1">
            Alternate Ledger Auditing
          </h1>
          <p className="text-xs text-[#556B82] mt-1 font-data-mono">
            Enterprise ID: {record.enterprise_id}
          </p>
        </div>

        {/* Tab switcher */}
        <div className="flex gap-2 flex-wrap mb-6">
          {TABS.map(tab => {
            const m = SOURCE_META[tab as keyof typeof SOURCE_META];
            const isActive = active === tab;
            const subScore = score[`${tab}_score` as keyof typeof score] as number | null;
            const tStyle = LEDGER_TAB_STYLE[tab] || LEDGER_TAB_STYLE.gst;
            
            return (
              <button
                key={tab}
                onClick={() => setActive(tab)}
                className="flex items-center gap-2 px-4 py-2 font-data-mono text-xs font-bold uppercase tracking-wider border cursor-pointer transition-all"
                style={isActive ? {
                  backgroundColor: tStyle.bg,
                  borderColor: tStyle.border,
                  color: tStyle.color,
                  borderRadius: '0px'
                } : {
                  backgroundColor: '#FFFFFF',
                  borderColor: '#E2DBD0',
                  color: '#556B82',
                  borderRadius: '0px'
                }}
              >
                {m.icon} {m.label}
                <span className="text-[10px] opacity-70">({subScore?.toFixed(0) ?? '—'})</span>
              </button>
            );
          })}
        </div>

        {/* Active Source Banner */}
        <div className="border border-[#E2DBD0] bg-white p-6 mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="text-2xl w-10 h-10 border flex items-center justify-center bg-[#FAF6F0] border-[#E2DBD0]">
              {meta.icon}
            </div>
            <div>
              <p className="text-sm font-bold text-[#0C182A] font-sans-ui">{meta.label}</p>
              <p className="text-xs text-[#556B82] leading-normal">{meta.description}</p>
            </div>
          </div>
          
          <div className="text-left sm:text-right border-t sm:border-t-0 border-[#FAF6F0] pt-2 sm:pt-0 w-full sm:w-auto font-data-mono text-xs">
            <span className="text-[#556B82] block text-[10px] uppercase">Model weight coefficient</span>
            <span className="font-bold text-lg" style={{ color: activeStyle.color }}>{meta.weight}</span>
          </div>
        </div>

        {/* Sub-view Content */}
        <div className="animate-none">
          <ViewComponent record={record} />
        </div>

      </div>
    </div>
  );
}
