import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Zap, FileText, Building2, Users, TrendingUp, ShieldCheck, BarChart3 } from 'lucide-react';
import { AnimatedCounter } from '../components/Charts';
import { useCreditData } from '../context/CreditDataContext';

const STATS = [
  { value: 63, suffix: 'M', label: 'MSMEs are credit-invisible — lacking traditional banking histories' },
  { value: 87, suffix: '%', label: 'of credit denials cite "lack of transaction history" as primary reason' },
  { value: 4, suffix: 'x', label: 'faster loan processing speeds achieved via digital data fusion' },
];

const SOURCES = [
  { 
    icon: FileText,  
    color: '#0E6E4E', 
    label: 'GST Filing Ledger',    
    sub: 'Revenue consistency & tax compliance',   
    weight: '28%',
    renderViz: () => (
      <svg viewBox="0 0 100 30" className="w-24 h-6 mt-3 opacity-90 select-none">
        <rect x="0" y="10" width="6" height="20" fill="#0E6E4E" rx="1.5" />
        <rect x="12" y="14" width="6" height="16" fill="#0E6E4E" rx="1.5" />
        <rect x="24" y="5" width="6" height="25" fill="#0E6E4E" rx="1.5" />
        <rect x="36" y="8" width="6" height="22" fill="#0E6E4E" rx="1.5" />
        <rect x="48" y="18" width="6" height="12" fill="#0E6E4E" rx="1.5" />
        <rect x="60" y="2" width="6" height="28" fill="#0E6E4E" rx="1.5" />
        <rect x="72" y="6" width="6" height="24" fill="#0E6E4E" rx="1.5" />
        <rect x="84" y="12" width="6" height="18" fill="#0E6E4E" rx="1.5" />
      </svg>
    )
  },
  { 
    icon: Zap,       
    color: '#0E6E4E', 
    label: 'UPI Cash Flows',     
    sub: 'Real-time sales velocity proxy',         
    weight: '25%',
    renderViz: () => (
      <svg viewBox="0 0 100 30" className="w-24 h-6 mt-3 opacity-90 select-none">
        <path d="M0,22 Q15,2 30,16 T60,5 T90,20 T100,2" fill="none" stroke="#0E6E4E" strokeWidth="2.5" strokeLinecap="round" />
        <circle cx="100" cy="2" r="3" fill="#C9A24B" />
      </svg>
    )
  },
  { 
    icon: Building2, 
    color: '#C9A24B', 
    label: 'Consent Banking (AA)', 
    sub: 'Daily balance indexes & payable days',    
    weight: '30%',
    renderViz: () => (
      <svg viewBox="0 0 100 30" className="w-24 h-6 mt-3 opacity-90 select-none">
        <line x1="5" y1="15" x2="35" y2="5" stroke="#E9E6DF" strokeWidth="1" />
        <line x1="35" y1="5" x2="65" y2="25" stroke="#E9E6DF" strokeWidth="1" />
        <line x1="65" y1="25" x2="95" y2="10" stroke="#E9E6DF" strokeWidth="1" />
        <line x1="5" y1="15" x2="65" y2="25" stroke="#E9E6DF" strokeWidth="1" />
        <circle cx="5" cy="15" r="3.5" fill="#0E6E4E" />
        <circle cx="35" cy="5" r="3.5" fill="#0E6E4E" />
        <circle cx="65" cy="25" r="3.5" fill="#0E6E4E" />
        <circle cx="95" cy="10" r="3.5" fill="#C9A24B" />
      </svg>
    )
  },
  { 
    icon: Users,     
    color: '#C2410C', 
    label: 'EPFO Payrolls',      
    sub: 'Workforce stability indicators',         
    weight: '17%',
    renderViz: () => (
      <svg viewBox="0 0 100 30" className="w-24 h-6 mt-3 opacity-90 select-none">
        <path d="M30,24 A18,18 0 0,1 70,24" fill="none" stroke="#E9E6DF" strokeWidth="3" strokeLinecap="round" />
        <path d="M30,24 A18,18 0 0,1 62,12" fill="none" stroke="#C2410C" strokeWidth="3.5" strokeLinecap="round" />
        <circle cx="62" cy="12" r="2" fill="#FFFFFF" />
      </svg>
    )
  },
];

const FEATURES = [
  { icon: BarChart3,   label: 'Fused Credit Evaluation',   sub: 'Unified score weighted across alternate transaction data' },
  { icon: ShieldCheck, label: 'Actuarial Risk Tiers',      sub: 'Probability of default calculated with confidence levels' },
  { icon: TrendingUp,  label: 'What-If Simulation Engine', sub: 'Actionable directives to improve credit score profile' },
];

const PRESETS = [
  { name: "TEXTILE EXPORTER", score: 82, verdict: "APPROVED", color: "#ECFDF5", textCol: "#0E6E4E", borderCol: "#A7F3D0", drivers: [
    { name: "GST Filing Consistency", val: "+14.2", pos: true },
    { name: "EPFO Payroll Growth", val: "+8.5", pos: true },
    { name: "UPI Cash Velocity", val: "+4.1", pos: true },
    { name: "Overdraft Utilization", val: "-3.2", pos: false }
  ] },
  { name: "RETAIL MERCHANT", score: 64, verdict: "REFER FOR REVIEW", color: "#FEF3C7", textCol: "#C9A24B", borderCol: "#FDE68A", drivers: [
    { name: "UPI Daily Inflows", val: "+18.3", pos: true },
    { name: "GST filing consistency", val: "+3.2", pos: true },
    { name: "High OD Utilization", val: "-11.4", pos: false },
    { name: "Low EPFO headcounts", val: "-4.0", pos: false }
  ] },
  { name: "LOGISTICS SUPPLIER", score: 89, verdict: "APPROVED", color: "#ECFDF5", textCol: "#0E6E4E", borderCol: "#A7F3D0", drivers: [
    { name: "Cash flow stability", val: "+21.4", pos: true },
    { name: "Active employee growth", val: "+9.2", pos: true },
    { name: "GST filing compliance", val: "+6.1", pos: true },
    { name: "Overdraft balance", val: "-2.1", pos: false }
  ] },
  { name: "METAL FABRICATOR", score: 45, verdict: "EXPOSURE DENIED", color: "#FFF7ED", textCol: "#C2410C", borderCol: "#FFEDD5", drivers: [
    { name: "Daily UPI Volume", val: "+5.1", pos: true },
    { name: "GST filing gaps", val: "-15.3", pos: false },
    { name: "EPFO Payroll gaps", val: "-9.2", pos: false },
    { name: "High Leverage OD", val: "-8.4", pos: false }
  ] }
];

export default function Landing() {
  const nav = useNavigate();
  const { score } = useCreditData();
  const [profileIdx, setProfileIdx] = useState(0);
  const [curScore, setCurScore] = useState(PRESETS[0].score);

  // Cycle the live credit underwriting deck simulation
  useEffect(() => {
    const timer = setInterval(() => {
      setProfileIdx(prev => (prev + 1) % PRESETS.length);
    }, 4500);
    return () => clearInterval(timer);
  }, []);

  // Animate the score numbers locally during transitions
  useEffect(() => {
    const target = PRESETS[profileIdx].score;
    let start = curScore;
    const dur = 800;
    const startTime = Date.now();
    const tick = () => {
      const progress = Math.min((Date.now() - startTime) / dur, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCurScore(Math.round(start + (target - start) * eased));
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [profileIdx]);

  const p = PRESETS[profileIdx];

  return (
    <div className="min-h-screen pt-20 pb-16 bg-[#FAF8F3] text-[#1E293B] select-text animate-fade-in">
      <div className="max-w-7xl mx-auto px-6">
        
        {/* HERO GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center mb-16 pt-8">
          
          {/* Left Column (Editorial Headline) */}
          <div className="lg:col-span-7 space-y-6">
            <span className="inline-flex items-center gap-1.5 border border-[#A7F3D0] bg-[#ECFDF5] text-[#0E6E4E] px-3.5 py-1 text-xs font-bold font-data-mono uppercase tracking-wider rounded-full">
              ✦ AI-Driven Credit Underwriting Console
            </span>
            
            <h1 className="text-5xl sm:text-6xl font-bold font-serif-editorial text-[#0B1220] leading-none tracking-tight">
              Credit Fusing for the Underserved
            </h1>
            
            <p className="text-base text-[#64748B] leading-relaxed max-w-xl font-sans-ui">
              MSME Sahay integrates alternative transactional streams—GST filings, UPI velocities, Account Aggregators, and EPFO payrolls—into a bankable credit index to unlock institutional funding.
            </p>
            
            <div className="flex flex-wrap gap-4 pt-4">
              <button
                className="btn-primary"
                onClick={() => nav('/consent')}
              >
                Initiate Credit Assessment <ArrowRight size={14} className="ml-1" />
              </button>
              <button 
                className="btn-ghost" 
                onClick={() => nav('/banker')}
              >
                View Banker Console
              </button>
            </div>
          </div>

          {/* Right Column (Series-B Dark Underwriter Terminal Preview) */}
          <div className="lg:col-span-5">
            <div className="bg-[#0B1220] border border-[#1E293B] p-6 shadow-xl rounded-2xl relative overflow-hidden select-none">
              
              {/* Header metadata */}
              <div className="flex justify-between items-center border-b border-[#1E293B] pb-3.5 mb-4 font-data-mono text-[9px] text-slate-400">
                <span>CORE CALIBRATOR DESK [V3.4]</span>
                <span className="text-[#34D399] font-bold animate-pulse flex items-center gap-1">■ LIVE EVALUATION</span>
              </div>

              {/* Profile identity */}
              <div className="mb-4">
                <span className="text-[10px] font-data-mono text-slate-400 block tracking-wide uppercase">
                  SIMULATED PROFILE
                </span>
                <h3 className="text-lg font-bold font-serif-editorial text-white tracking-tight transition-all duration-300">
                  {p.name}
                </h3>
              </div>

              {/* Live calibration data layout */}
              <div className="grid grid-cols-12 gap-4 items-center mb-6">
                {/* Score */}
                <div className="col-span-5 border-r border-[#1E293B] pr-4 text-center">
                  <span className="text-[9px] font-data-mono text-slate-400 block uppercase mb-1">FUSION SCORE</span>
                  <div className="text-5xl font-bold font-serif-editorial text-white tracking-tight">
                    {curScore}
                  </div>
                  <span className="text-[10px] font-data-mono text-slate-500">/ 100</span>
                </div>

                {/* Stamp */}
                <div className="col-span-7 pl-2 flex flex-col items-center justify-center">
                  <div 
                    className="border font-bold font-data-mono px-3 py-1 uppercase text-[10px] tracking-widest transition-all duration-300 rounded-md"
                    style={{ 
                      borderColor: p.borderCol, 
                      color: p.textCol, 
                      backgroundColor: p.color,
                      transform: 'rotate(-2deg)'
                    }}
                  >
                    {p.verdict}
                  </div>
                  <span className="text-[9px] font-data-mono text-slate-400 mt-3 block">
                    PD Derived: {p.score >= 80 ? "1.8%" : p.score >= 60 ? "4.2%" : "12.5%"}
                  </span>
                </div>
              </div>

              {/* Mini SHAP driver weight bars */}
              <div>
                <span className="text-[10px] font-data-mono text-slate-400 block uppercase tracking-wider mb-2">
                  TOP ATTRIBUTION SHAP DRIVERS
                </span>
                
                <div className="space-y-2.5 font-data-mono text-[10px]">
                  {p.drivers.map((drv, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <span className="text-slate-300">{drv.name}</span>
                      <span className={`font-bold ${drv.pos ? 'text-[#34D399]' : 'text-[#F97316]'}`}>
                        {drv.val}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>

        </div>

        {/* STATS SECTION (Swiss actuarial styled vertical splits) */}
        <div className="border border-[#E9E6DF] bg-white grid grid-cols-1 md:grid-cols-3 gap-0 mb-16 rounded-2xl overflow-hidden shadow-sm">
          {STATS.map((s, i) => (
            <div 
              key={i} 
              className={`p-8 text-center ${
                i < 2 ? 'border-b md:border-b-0 md:border-r border-[#E9E6DF]' : ''
              }`}
            >
              <div className="text-4xl font-serif-editorial font-bold mb-2 text-[#0E6E4E]">
                <AnimatedCounter target={s.value} suffix={s.suffix} duration={1000} />
              </div>
              <p className="text-xs text-[#64748B] leading-relaxed font-sans-ui mt-2 max-w-xs mx-auto">{s.label}</p>
            </div>
          ))}
        </div>

        {/* PILLARS OF ALTERNATIVE CREDIT DATA */}
        <div className="mb-16">
          <div className="text-center mb-8">
            <span className="text-xxs font-data-mono font-bold tracking-widest text-[#C9A24B] block uppercase">
              CREDIT PILLARS
            </span>
            <h2 className="text-2xl font-serif-editorial font-bold text-[#0B1220] mt-1">
              Alternative Transaction Channels
            </h2>
            <p className="text-[#64748B] text-xs font-data-mono mt-1">
              Transaction matrices are mapped, weighted, and calibrated to evaluate real-time capability.
            </p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
            {SOURCES.map((s, i) => {
              return (
                <div 
                  key={i} 
                  className="border border-[#E9E6DF] bg-white p-5 text-center flex flex-col justify-between items-center glass-hover cursor-pointer"
                >
                  <div className="w-11 h-11 flex items-center justify-center mb-3 rounded-xl border border-[#E9E6DF] bg-[#FAF8F3]">
                    <s.icon size={18} style={{ color: '#0E6E4E' }} />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-[#0B1220] mb-1 font-sans-ui">{s.label}</div>
                    <div className="text-xs text-[#64748B] mb-2 leading-normal">{s.sub}</div>
                  </div>
                  
                  {/* Inline visualizer widget showing real data proof */}
                  <div className="w-full flex justify-center py-2.5 my-1.5 bg-[#FAF8F3] border border-[#E9E6DF] rounded-lg">
                    {s.renderViz()}
                  </div>

                  <span className="font-data-mono text-[9px] font-bold border px-2.5 py-0.5 rounded-full bg-[#FAF8F3] border-[#E9E6DF] text-[#0E6E4E] mt-3">
                    PILLAR WEIGHT: {s.weight}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* FEATURES OVERVIEW */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
          {FEATURES.map((f, i) => {
            const Icon = f.icon;
            return (
              <div 
                key={i} 
                className="border border-[#E9E6DF] bg-white p-6 flex items-start gap-4 glass-hover cursor-pointer"
              >
                <div className="w-10 h-10 border rounded-xl flex items-center justify-center flex-shrink-0 bg-[#FAF8F3] border-[#E9E6DF]">
                  <Icon size={16} className="text-[#0E6E4E]" />
                </div>
                <div>
                  <div className="text-sm font-bold text-[#0B1220] mb-1 font-sans-ui">{f.label}</div>
                  <div className="text-xs text-[#64748B] leading-normal">{f.sub}</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* PREVIEW STRIP */}
        {score && (
          <div className="border border-[#E9E6DF] bg-white p-6 rounded-2xl shadow-sm">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div>
                <span className="text-[10px] font-data-mono font-bold text-[#C9A24B] uppercase tracking-wider block mb-1">
                  UNDERWRITING PROFILE CALIBRATION READOUT
                </span>
                <div className="flex items-baseline gap-2 flex-wrap">
                  <span className="font-serif-editorial text-2xl font-bold text-[#0B1220]">{score.overall_score}</span>
                  <span className="text-[#64748B] font-data-mono text-xs">/ 100</span>
                  <span className="font-data-mono text-[10px] text-[#0E6E4E] bg-[#ECFDF5] border border-[#A7F3D0] px-2 py-0.5 rounded-full ml-2">
                    Tier {score.risk_tier} · {score.decision.toUpperCase()}
                  </span>
                  <span className="font-data-mono text-[10px] text-[#C9A24B] bg-[#FEF3C7] border border-[#FDE68A] px-2 py-0.5 rounded-full">
                    PD {(score as any).pd ?? 4.2}%
                  </span>
                </div>
              </div>
              
              <button className="btn-primary" onClick={() => nav('/consent')}>
                Evaluate Business Data <ArrowRight size={14} className="ml-1" />
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
