import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, Clock, AlertCircle, ArrowRight, RefreshCw, Info } from 'lucide-react';
import { GlassCard, SectionHeader, ProgressBar, InfoTooltip } from '../components/ui';
import { CONSENT_SOURCES } from '../data/mock';
import { useCreditData } from '../context/CreditDataContext';

type Status = 'idle' | 'connecting' | 'connected' | 'pending' | 'unavailable';

const STATUS_CONFIG: Record<Status, { icon: any; label: string; color: string; bg: string }> = {
  idle:        { icon: RefreshCw,    label: 'Connect',    color: '#64748B', bg: 'rgba(100,116,139,0.1)' },
  connecting:  { icon: RefreshCw,    label: 'Connecting…',color: '#3B82F6', bg: 'rgba(59,130,246,0.1)'  },
  connected:   { icon: CheckCircle2, label: 'Connected',  color: '#10B981', bg: 'rgba(16,185,129,0.1)'  },
  pending:     { icon: Clock,        label: 'Pending',    color: '#F59E0B', bg: 'rgba(245,158,11,0.1)'  },
  unavailable: { icon: AlertCircle,  label: 'Unavailable',color: '#EF4444', bg: 'rgba(239,68,68,0.1)'  },
};

export default function Consent() {
  const nav = useNavigate();
  const { record, loading } = useCreditData();

  // Local overriding status simulation
  const [localStatuses, setLocalStatuses] = useState<Record<string, Status>>({});

  const getStatus = (key: string): Status => {
    if (localStatuses[key as keyof typeof localStatuses]) return localStatuses[key as keyof typeof localStatuses];
    if (loading || !record) return 'idle';

    if (key === 'gst') return record.gst_registered ? 'connected' : 'idle';
    if (key === 'upi') return record.upi_available ? 'connected' : 'idle';
    if (key === 'aa') return record.aa_consent_given ? 'connected' : 'idle';
    if (key === 'epfo') return record.epfo_registered ? 'connected' : 'idle';

    return 'idle';
  };

  const statuses = {
    gst: getStatus('gst'),
    upi: getStatus('upi'),
    aa: getStatus('aa'),
    epfo: getStatus('epfo'),
  };

  const connected = Object.values(statuses).filter(s => s === 'connected').length;
  const allDone = connected >= 3;

  const connect = (key: string) => {
    if (statuses[key as keyof typeof statuses] !== 'idle') return;
    setLocalStatuses(p => ({ ...p, [key]: 'connecting' }));
    setTimeout(() => {
      setLocalStatuses(p => ({ ...p, [key]: 'connected' }));
    }, 1400);
  };

  const connectAll = async () => {
    for (const src of CONSENT_SOURCES) {
      if (statuses[src.key as keyof typeof statuses] === 'idle') {
        await new Promise(r => setTimeout(r, 600));
        connect(src.key);
      }
    }
  };

  const confidence = connected === 4 ? 'Gold' : connected >= 3 ? 'Silver' : connected >= 2 ? 'Bronze' : 'Insufficient';
  const confidenceColor = { Gold: '#C9A15A', Silver: '#94A3B8', Bronze: '#B45309', Insufficient: '#64748B' }[confidence];

  return (
    <div className="min-h-screen pt-20 pb-10">
      <div className="max-w-4xl mx-auto px-6">
        <SectionHeader
          title="Connect Your Data Sources"
          subtitle="We pull data from government-verified sources via Account Aggregator framework and GSTIN APIs. Your consent is required for each source. No raw data is stored — only computed signals."
          badge={<span className="badge-emerald">AA-Framework Compliant</span>}
        />

        {/* RBI / AA consent disclaimer */}
        <GlassCard className="p-4 mb-6 border-blue-500/20" style={{ borderColor: 'rgba(59,130,246,0.2)' }}>
          <div className="flex items-start gap-3">
            <Info size={16} className="text-blue-400 mt-0.5 flex-shrink-0" />
            <div className="text-xs text-slate-400 leading-relaxed">
              <span className="text-blue-400 font-semibold">How this works: </span>
              We use India's Account Aggregator (AA) framework — an RBI-licensed consent architecture.
              You authorise access for a defined period. Your bank never shares raw statements;
              only structured signals are passed to the credit model. You can revoke access at any time.
            </div>
          </div>
        </GlassCard>

        {/* Confidence Meter */}
        <GlassCard className="p-5 mb-6">
          <div className="flex items-center justify-between mb-3">
            <div>
              <span className="text-sm font-semibold text-white">Score Confidence Level</span>
              <InfoTooltip text="More sources connected = higher confidence band = narrower score range. A Gold confidence score has ±5 point uncertainty vs. ±15 for Silver." />
            </div>
            <span className="text-sm font-bold" style={{ color: confidenceColor }}>{confidence}</span>
          </div>
          <ProgressBar value={connected} max={4} color={confidenceColor} className="mb-2" />
          <div className="flex justify-between text-xs text-slate-500">
            <span>0 sources</span>
            <span className="text-center">Silver (3 sources)</span>
            <span>Gold (all 4)</span>
          </div>
          {connected < 4 && (
            <p className="text-xs text-slate-500 mt-2">
              {4 - connected} source{4 - connected > 1 ? 's' : ''} remaining.
              {connected < 3 ? ' Minimum 2 required to generate a score.' : ' Score will be generated with reweighted pillars.'}
            </p>
          )}
        </GlassCard>

        {/* Source Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          {CONSENT_SOURCES.map((src, idx) => {
            const status = statuses[src.key as keyof typeof statuses] as Status;
            const cfg = STATUS_CONFIG[status];
            const StatusIcon = cfg.icon;
            return (
              <motion.div
                key={src.key}
                initial={{ opacity: 0, x: idx % 2 === 0 ? -20 : 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.1 }}
              >
                <GlassCard className={`p-5 transition-all duration-500 ${status === 'connected' ? 'border-emerald-500/20' : ''}`}>
                  <div className="flex items-start gap-4">
                    {/* Source icon */}
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 text-xl"
                      style={{ background: src.status === 'connected' ? `${src.color}18` : 'rgba(255,255,255,0.04)', border: `1px solid ${src.color}25` }}>
                      {src.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-sm font-bold text-white">{src.label}</span>
                        <AnimatePresence mode="wait">
                          <motion.span
                            key={status}
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            className="flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full"
                            style={{ color: cfg.color, background: cfg.bg }}
                          >
                            <StatusIcon size={10} className={status === 'connecting' ? 'animate-spin' : ''} />
                            {cfg.label}
                          </motion.span>
                        </AnimatePresence>
                      </div>
                      <p className="text-xs text-slate-400 mb-2 leading-relaxed">
                        {status === 'connected' ? src.detail : src.key === 'epfo' ? 'Employer consent required — EPFO sends OTP to registered mobile' : 'Click to authorise via AA framework'}
                      </p>
                      {/* What this data tells us */}
                      <p className="text-xxs text-slate-500 italic">
                        {src.key === 'gst'  && 'Reveals revenue regularity & tax compliance discipline'}
                        {src.key === 'upi'  && 'Real-time cash flow proxy via NPCI transaction data'}
                        {src.key === 'aa'   && 'Bank balance trends, overdraft usage, trade payables'}
                        {src.key === 'epfo' && 'Workforce stability — proxy for business continuity'}
                      </p>
                    </div>
                  </div>

                  {status === 'idle' && (
                    <motion.button
                      className="w-full mt-4 py-2 rounded-lg text-xs font-semibold transition-all duration-200 hover:opacity-80"
                      style={{ color: src.color, background: `${src.color}12`, border: `1px solid ${src.color}25` }}
                      onClick={() => connect(src.key)}
                      whileTap={{ scale: 0.97 }}
                    >
                      Authorise {src.label}
                    </motion.button>
                  )}
                  {status === 'unavailable' && (
                    <div className="mt-3 p-2 rounded-lg bg-amber-500/8 border border-amber-500/15 text-xs text-amber-400">
                      ⚠️ Score will be reweighted across remaining {connected} sources
                    </div>
                  )}
                </GlassCard>
              </motion.div>
            );
          })}
        </div>

        {/* Quick connect + CTA */}
        <div className="flex flex-col sm:flex-row gap-3">
          {!allDone && (
            <button className="btn-ghost flex-1 justify-center" onClick={connectAll}>
              <RefreshCw size={14} /> Connect All Sources
            </button>
          )}
          <motion.button
            className={`btn-primary flex-1 justify-center ${connected < 2 ? 'opacity-40 cursor-not-allowed' : ''}`}
            onClick={() => connected >= 2 && nav('/borrower')}
            whileHover={connected >= 2 ? { scale: 1.02 } : {}}
            whileTap={connected >= 2 ? { scale: 0.97 } : {}}
          >
            {connected < 2 ? 'Connect at least 2 sources' : 'Generate My Health Score'}
            <ArrowRight size={15} />
          </motion.button>
        </div>
      </div>
    </div>
  );
}
