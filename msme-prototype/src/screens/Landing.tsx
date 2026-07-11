import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Zap, FileText, Building2, Users, TrendingUp, ShieldCheck, BarChart3 } from 'lucide-react';
import { AnimatedCounter } from '../components/Charts';
import { GlassCard } from '../components/ui';
import { useCreditData } from '../context/CreditDataContext';

const STATS = [
  { value: 63, suffix: 'M', label: 'MSMEs are credit-invisible — no traditional credit history' },
  { value: 87, suffix: '%', label: 'of loan rejections cite "insufficient data" as primary reason' },
  { value: 4, suffix: 'x', label: 'faster credit decisions using alternate data fusion' },
];

const SOURCES = [
  { icon: FileText,  color: '#F59E0B', label: 'GST Filing',    sub: 'Revenue regularity & compliance',     weight: '28%' },
  { icon: Zap,       color: '#10B981', label: 'UPI Cash Flow', sub: 'Real-time operational cash proxy',     weight: '25%' },
  { icon: Building2, color: '#3B82F6', label: 'Bank (AA)',     sub: 'Balance trends & trade payables',      weight: '30%' },
  { icon: Users,     color: '#8B5CF6', label: 'EPFO Payroll',  sub: 'Workforce stability indicator',        weight: '17%' },
];

const FEATURES = [
  { icon: BarChart3,   label: '0–100 Fused Health Score', sub: 'Weighted across 4 alternate data pillars' },
  { icon: ShieldCheck, label: 'Risk Tier + PD%',          sub: 'Probability of default with confidence band' },
  { icon: TrendingUp,  label: 'What-If Simulator',        sub: 'Borrower can see how to improve their score' },
];

const container = { hidden: {}, show: { transition: { staggerChildren: 0.1 } } };
const item = { hidden: { opacity: 0, y: 24 }, show: { opacity: 1, y: 0, transition: { duration: 0.5 } } };

export default function Landing() {
  const nav = useNavigate();
  const { score, record } = useCreditData();
  return (
    <div className="min-h-screen pt-14 overflow-hidden">
      {/* Mesh background orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full opacity-10 blur-3xl animate-pulse-slow"
          style={{ background: 'radial-gradient(circle, #10B981, transparent)' }} />
        <div className="absolute bottom-1/3 right-1/4 w-80 h-80 rounded-full opacity-8 blur-3xl animate-pulse-slow animation-delay-500"
          style={{ background: 'radial-gradient(circle, #3B82F6, transparent)' }} />
      </div>

      <div className="relative max-w-6xl mx-auto px-6 py-16">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="text-center mb-20"
        >
          <div className="badge-emerald inline-flex mb-5">
            ✦ AI-Driven Credit Intelligence for Indian MSMEs
          </div>
          <h1 className="text-5xl md:text-6xl font-black text-white leading-tight mb-6">
            Credit for{' '}
            <span className="text-gradient-emerald">63 Million</span>
            <br />Invisible Businesses
          </h1>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed mb-10">
            Fusing GST, UPI, Account Aggregator and EPFO data into a single, explainable
            0–100 health score — so New-to-Bank MSMEs finally get a fair shot at credit.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <motion.button
              className="btn-primary text-white"
              onClick={() => nav('/consent')}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.97 }}
            >
              Simulate a Credit Assessment <ArrowRight size={16} />
            </motion.button>
            <button className="btn-ghost text-slate-300" onClick={() => nav('/banker')}>
              View Banker Dashboard
            </button>
          </div>
        </motion.div>

        {/* Stats */}
        <motion.div
          className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-16"
          variants={container} initial="hidden" animate="show"
        >
          {STATS.map((s, i) => (
            <motion.div key={i} variants={item}>
              <GlassCard className="p-6 text-center" hover>
                <div className="text-4xl font-black mb-2 text-gradient-emerald">
                  <AnimatedCounter target={s.value} suffix={s.suffix} duration={1800} />
                </div>
                <p className="text-sm text-slate-400 leading-relaxed">{s.label}</p>
              </GlassCard>
            </motion.div>
          ))}
        </motion.div>

        {/* Data Sources */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mb-16"
        >
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-white mb-2">Four Pillars of Alternate Credit Data</h2>
            <p className="text-slate-400 text-sm">Every data source is independently weighted and explained — not a black box</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {SOURCES.map((s, i) => {
              const Icon = s.icon;
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 + i * 0.1 }}
                >
                  <GlassCard className="p-5 text-center" hover>
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3 animate-float"
                      style={{ background: `${s.color}18`, border: `1px solid ${s.color}30`, animationDelay: `${i * 0.4}s` }}>
                      <Icon size={22} style={{ color: s.color }} />
                    </div>
                    <div className="text-sm font-bold text-white mb-1">{s.label}</div>
                    <div className="text-xs text-slate-400 mb-2">{s.sub}</div>
                    <div className="text-xxs font-semibold px-2 py-0.5 rounded-full inline-block"
                      style={{ color: s.color, background: `${s.color}15`, border: `1px solid ${s.color}25` }}>
                      Weight: {s.weight}
                    </div>
                  </GlassCard>
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        {/* Features */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.7 }}
          className="mb-16"
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {FEATURES.map((f, i) => {
              const Icon = f.icon;
              return (
                <GlassCard key={i} className="p-5 flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center flex-shrink-0">
                    <Icon size={18} className="text-emerald-400" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-white mb-1">{f.label}</div>
                    <div className="text-xs text-slate-400">{f.sub}</div>
                  </div>
                </GlassCard>
              );
            })}
          </div>
        </motion.div>

        {/* Score preview strip */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
        >
          <GlassCard className="p-6 gradient-border">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div>
                <p className="text-sm text-slate-400 mb-1">
                  Active Underwriting Profile — {record?.enterprise_id || 'Arjun Textile Works, Surat'}
                </p>
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="text-3xl font-black text-white">{score?.overall_score ?? 74}</span>
                  <span className="text-slate-500">/100</span>
                  <span className="badge-blue">Tier {score?.risk_tier ?? 'B+'} · {score?.decision ?? 'Moderate Risk'}</span>
                  <span className="badge-emerald">{score?.data_confidence ?? 'Gold'} Confidence</span>
                  <span className="badge-amber">PD {(score as any)?.pd ?? 4.2}%</span>
                </div>
              </div>
              <button className="btn-primary text-white whitespace-nowrap" onClick={() => nav('/consent')}>
                Try with your data <ArrowRight size={14} />
              </button>
            </div>
          </GlassCard>
        </motion.div>
      </div>
    </div>
  );
}
