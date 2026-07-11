import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, TrendingUp } from 'lucide-react';
import { SubScoreRadar } from '../components/Charts';
import { GlassCard, SectionHeader, SourceBadge, ScoreTierBadge, InfoTooltip } from '../components/ui';
import { useCreditData } from '../context/CreditDataContext';
import { type ScoreResponse } from '../data/api';

interface SliderRowProps {
  label: string;
  tooltip: string;
  value: number;
  min: number; max: number; step: number;
  color: string;
  source: 'gst' | 'upi' | 'aa' | 'epfo';
  format?: (v: number) => string;
  onChange: (v: number) => void;
}
function SliderRow({ label, tooltip, value, min, max, step, color, source, format, onChange }: SliderRowProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <SourceBadge source={source} size="sm" />
          <span className="text-sm text-white font-medium">{label}</span>
          <InfoTooltip text={tooltip} />
        </div>
        <span className="text-sm font-bold" style={{ color }}>{format ? format(value) : value}</span>
      </div>
      <div className="relative">
        <input
          type="range" min={min} max={max} step={step} value={value}
          onChange={e => onChange(Number(e.target.value))}
          className="w-full h-1.5 appearance-none rounded-full outline-none cursor-pointer"
          style={{
            background: `linear-gradient(to right, ${color} 0%, ${color} ${((value - min) / (max - min)) * 100}%, rgba(255,255,255,0.1) ${((value - min) / (max - min)) * 100}%, rgba(255,255,255,0.1) 100%)`,
          }}
        />
      </div>
    </div>
  );
}

export default function Simulator() {
  const nav = useNavigate();
  const { score: baselineScore, record, loading, simulateScore } = useCreditData();

  const [weights, setWeights] = useState({
    gst: 28,
    upi: 25,
    aa: 30,
    epfo: 17,
  });

  const [simScore, setSimScore] = useState<ScoreResponse | null>(null);
  const [simulating, setSimulating] = useState(false);

  // Re-run simulation when weights change
  useEffect(() => {
    if (!baselineScore || !record) return;

    // Normalise weights to sum to 1.0
    const total = weights.gst + weights.upi + weights.aa + weights.epfo;
    if (total === 0) return;

    const normalised = {
      gst: weights.gst / total,
      upi: weights.upi / total,
      aa: weights.aa / total,
      epfo: weights.epfo / total,
    };

    setSimulating(true);
    const timer = setTimeout(() => {
      simulateScore(normalised)
        .then(res => {
          setSimScore(res);
          setSimulating(false);
        })
        .catch(() => setSimulating(false));
    }, 300);

    return () => clearTimeout(timer);
  }, [weights, baselineScore, record]);

  if (loading || !baselineScore || !record) {
    return (
      <div className="min-h-screen pt-20 flex items-center justify-center">
        <p className="text-sm font-bold text-slate-400 animate-pulse">Loading Policy Engine…</p>
      </div>
    );
  }

  const delta = simScore ? (simScore.overall_score ?? 0) - (baselineScore.overall_score ?? 0) : 0;

  const radarScores = simScore ? {
    gst: simScore.gst_score ?? 0,
    upi: simScore.upi_score ?? 0,
    aa: simScore.aa_score ?? 0,
    epfo: simScore.epfo_score ?? 0,
  } : { gst: 0, upi: 0, aa: 0, epfo: 0 };

  return (
    <div className="min-h-screen pt-20 pb-12">
      <div className="max-w-6xl mx-auto px-6">
        <SectionHeader
          title="What-If Underwriting Simulator"
          subtitle={`Simulate score adjustments for ${record.enterprise_id} by modifying the underwriting fusion weights. Instantly test your bank's credit risk policy in real-time.`}
          badge={<span className="badge-amber">Dynamic Weight Calibration</span>}
        />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Sliders Panel */}
          <div className="space-y-5">
            <GlassCard className="p-5">
              <div className="flex justify-between items-center mb-4">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Adjust Underwriting Weights</p>
                <span className="text-xs text-slate-500 font-medium">Total: {weights.gst + weights.upi + weights.aa + weights.epfo}%</span>
              </div>
              <div className="space-y-6">
                <SliderRow
                  label="GST Weight"
                  tooltip="Model weight assigned to GSTR filings compliance history. Currently 28%."
                  value={weights.gst} min={0} max={100} step={1}
                  color="#F59E0B" source="gst" format={v => `${v}%`}
                  onChange={v => setWeights(prev => ({ ...prev, gst: v }))}
                />
                <SliderRow
                  label="UPI Cash Flow Weight"
                  tooltip="Model weight assigned to real-time UPI transaction metrics. Currently 25%."
                  value={weights.upi} min={0} max={100} step={1}
                  color="#10B981" source="upi" format={v => `${v}%`}
                  onChange={v => setWeights(prev => ({ ...prev, upi: v }))}
                />
                <SliderRow
                  label="Bank AA Balance Weight"
                  tooltip="Model weight assigned to Account Aggregator bank statement signals. Currently 30%."
                  value={weights.aa} min={0} max={100} step={1}
                  color="#3B82F6" source="aa" format={v => `${v}%`}
                  onChange={v => setWeights(prev => ({ ...prev, aa: v }))}
                />
                <SliderRow
                  label="EPFO Payroll Weight"
                  tooltip="Model weight assigned to employer EPFO contributions consistency. Currently 17%."
                  value={weights.epfo} min={0} max={100} step={1}
                  color="#8B5CF6" source="epfo" format={v => `${v}%`}
                  onChange={v => setWeights(prev => ({ ...prev, epfo: v }))}
                />
              </div>
            </GlassCard>

            {/* Quick Policies */}
            <GlassCard className="p-5">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Pre-set Credit Policies</p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: 'Standard Balanced', w: { gst: 28, upi: 25, aa: 30, epfo: 17 } },
                  { label: 'UPI-Focused Retail', w: { gst: 10, upi: 60, aa: 20, epfo: 10 } },
                  { label: 'Conservative Banking', w: { gst: 20, upi: 10, aa: 60, epfo: 10 } },
                  { label: 'Compliance-Heavy', w: { gst: 45, upi: 10, aa: 15, epfo: 30 } },
                ].map((p, i) => (
                  <button key={i} onClick={() => setWeights(p.w)}
                    className="flex flex-col p-2.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/5 hover:border-white/10 transition-all duration-200 text-left">
                    <span className="text-xs font-bold text-slate-300 mb-1">{p.label}</span>
                    <span className="text-xxs text-slate-500">GST {p.w.gst}% · UPI {p.w.upi}% · AA {p.w.aa}%</span>
                  </button>
                ))}
              </div>
            </GlassCard>
          </div>

          {/* Live Score Panel */}
          <div className="space-y-5 lg:sticky lg:top-20 lg:self-start">
            <GlassCard className="p-6 text-center" glow="emerald">
              <p className="text-xs text-slate-400 mb-3 uppercase tracking-wide">Simulated Health Score</p>
              <div className="relative w-40 h-40 mx-auto mb-4">
                <svg viewBox="0 0 160 160" className="w-full h-full -rotate-90">
                  <circle cx="80" cy="80" r="66" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="10" />
                  {simScore && (
                    <motion.circle
                      cx="80" cy="80" r="66" fill="none"
                      stroke={(simScore.overall_score ?? 0) >= 75 ? '#10B981' : (simScore.overall_score ?? 0) >= 60 ? '#3B82F6' : '#F59E0B'}
                      strokeWidth="10" strokeLinecap="round"
                      strokeDasharray={`${2 * Math.PI * 66}`}
                      animate={{ strokeDashoffset: 2 * Math.PI * 66 * (1 - (simScore.overall_score ?? 0) / 100) }}
                      transition={{ duration: 0.3 }}
                      style={{ filter: `drop-shadow(0 0 8px ${(simScore.overall_score ?? 0) >= 75 ? '#10B981' : '#3B82F6'})` }}
                    />
                  )}
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className={`text-4xl font-black text-white ${simulating ? 'opacity-50' : ''}`}>
                    {simScore?.overall_score ?? '—'}
                  </span>
                  <span className="text-slate-400 text-xs">/ 100</span>
                </div>
              </div>

              {/* Delta badge */}
              <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-bold mb-3 ${
                delta > 0 ? 'bg-emerald-500/15 text-emerald-400' : delta < 0 ? 'bg-red-500/15 text-red-400' : 'bg-slate-500/15 text-slate-400'
              }`}>
                {delta > 0 ? <TrendingUp size={13} /> : delta < 0 ? '↓' : '→'}
                {delta > 0 ? `+${delta}` : delta} vs baseline ({baselineScore.overall_score})
              </div>

              {simScore && (
                <div className="flex items-center justify-center gap-2 flex-wrap">
                  <ScoreTierBadge tier={simScore.risk_tier} size="sm" />
                  <span className="badge-amber">PD {(simScore as any).pd ?? 4.2}%</span>
                  <span className="badge-slate">{simScore.decision}</span>
                </div>
              )}
            </GlassCard>

            {/* Radar */}
            <GlassCard className="p-5">
              <p className="text-xs text-slate-400 mb-2 text-center">Pillar footprint</p>
              <SubScoreRadar scores={radarScores} size={220} />
            </GlassCard>

            <button className="w-full btn-primary justify-center" onClick={() => nav('/borrower')}>
              View Full Borrower Report <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
