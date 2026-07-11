import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { TrendingUp, TrendingDown, ArrowRight, ChevronDown, ChevronUp } from 'lucide-react';
import { SubScoreRadar } from '../components/Charts';
import { GlassCard, SectionHeader, SourceBadge, ScoreTierBadge, ConfidenceBadge, InfoTooltip, ProgressBar } from '../components/ui';
import { SOURCE_META } from '../data/mock';
import { useCreditData } from '../context/CreditDataContext';

function AnimatedScore({ score }: { score: number }) {
  const [displayed, setDisplayed] = useState(0);
  useEffect(() => {
    const start = Date.now();
    const duration = 1600;
    const tick = () => {
      const elapsed = Date.now() - start;
      const prog = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - prog, 3);
      setDisplayed(Math.round(eased * score));
      if (prog < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [score]);

  const color = score >= 75 ? '#10B981' : score >= 60 ? '#3B82F6' : '#F59E0B';
  return (
    <div className="relative flex flex-col items-center">
      <div className="relative w-52 h-52">
        <svg viewBox="0 0 200 200" className="w-full h-full -rotate-90">
          <circle cx="100" cy="100" r="80" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="12" />
          <motion.circle
            cx="100" cy="100" r="80" fill="none" stroke={color} strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={`${2 * Math.PI * 80}`}
            initial={{ strokeDashoffset: 2 * Math.PI * 80 }}
            animate={{ strokeDashoffset: 2 * Math.PI * 80 * (1 - displayed / 100) }}
            transition={{ duration: 1.6, ease: [0.34, 1.56, 0.64, 1] }}
            style={{ filter: `drop-shadow(0 0 8px ${color})` }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-5xl font-black text-white leading-none">{displayed}</span>
          <span className="text-slate-400 text-sm font-medium">/ 100</span>
        </div>
      </div>
    </div>
  );
}

export default function BorrowerDashboard() {
  const nav = useNavigate();
  const [showImprovements, setShowImprovements] = useState(false);
  const { score, record, loading } = useCreditData();

  if (loading || !score || !record) {
    return (
      <div className="min-h-screen pt-20 flex items-center justify-center">
        <p className="text-sm font-bold text-slate-400 animate-pulse">Loading Live Health Card…</p>
      </div>
    );
  }

  const radarScores = {
    gst: score.gst_score ?? 0,
    upi: score.upi_score ?? 0,
    aa: score.aa_score ?? 0,
    epfo: score.epfo_score ?? 0
  };

  // Dynamically map strengths and risks from SHAP drivers
  const strengths = (score.key_drivers ?? [])
    .filter(d => d.type === 'Positive Driver' && d.impact > 0)
    .slice(0, 3)
    .map(d => ({
      label: d.feature.replace(/_/g, ' '),
      detail: `Contributes positive value of +${d.impact.toFixed(1)} to score`,
      source: d.feature.startsWith('gst') ? 'gst' : d.feature.startsWith('upi') ? 'upi' : d.feature.startsWith('aa') ? 'aa' : 'epfo',
      lift: `+${Math.round(d.impact)}`
    }));

  const risks = (score.key_drivers ?? [])
    .filter(d => d.type === 'Negative Driver' || d.impact < 0)
    .slice(0, 3)
    .map(d => ({
      label: d.feature.replace(/_/g, ' '),
      detail: `Reduces score by ${d.impact.toFixed(1)} points`,
      source: d.feature.startsWith('gst') ? 'gst' : d.feature.startsWith('upi') ? 'upi' : d.feature.startsWith('aa') ? 'aa' : 'epfo',
      drag: `${Math.round(d.impact)}`
    }));


  return (
    <div className="min-h-screen pt-20 pb-12">
      <div className="max-w-5xl mx-auto px-6">
        <SectionHeader
          title="Your Business Health Score"
          subtitle={`${record.enterprise_id} · Sector: ${record.sector || 'Unknown'} · Segment: ${record.segment || 'Unknown'} — This score summarises your financial health across 4 data sources. It is what a credit officer sees when evaluating your application.`}
        />

        {/* Main score + sub-scores */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Score hero */}
          <GlassCard className="p-8 flex flex-col items-center text-center gap-4" glow="emerald">
            <AnimatedScore score={score.overall_score ?? 0} />
            <div className="space-y-2">
              <ScoreTierBadge tier={score.risk_tier} size="md" />
              <p className="text-sm text-slate-400">
                Data Confidence: <span className="text-white font-semibold">{score.data_confidence}</span>
              </p>
              <ConfidenceBadge
                sources={['gold','silver','bronze'].includes(score.data_confidence.toLowerCase()) ? (score.data_confidence.toLowerCase() === 'gold' ? 4 : score.data_confidence.toLowerCase() === 'silver' ? 3 : 2) : 1}
                total={4}
                level={score.data_confidence}
              />
            </div>
            <div className="w-full pt-2 border-t border-white/5">
              <p className="text-xs text-slate-500 leading-relaxed">
                Score range: <span className="text-white font-medium">{score.score_range_low?.toFixed(0)}–{score.score_range_high?.toFixed(0)}</span>
                <InfoTooltip text="Confidence band reflects data completeness. Gold confidence limits score variance to ±5 points." />
              </p>
            </div>
          </GlassCard>

          {/* Radar chart */}
          <GlassCard className="p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-semibold text-white">Score Breakdown by Source</p>
              <InfoTooltip text="Each axis shows how well you performed on that data pillar (0–100). The shaded area shows your footprint." />
            </div>
            <p className="text-xs text-slate-500 mb-3">Hover any data point to see the raw sub-score</p>
            <SubScoreRadar scores={radarScores} size={230} />
          </GlassCard>
        </div>

        {/* Sub-score detail cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          {(Object.entries(SOURCE_META) as [string, any][]).map(([key, meta]) => {
            const subScore = score[`${key}_score` as keyof typeof score] as number | null;
            return (
              <GlassCard key={key} className="p-4 cursor-pointer" hover onClick={() => nav(`/drilldown?tab=${key}`)}>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-lg">{meta.icon}</span>
                  <span className="text-xxs font-bold text-slate-500 uppercase tracking-wide">Wt: {meta.weight}</span>
                </div>
                <div className="text-2xl font-black mb-1" style={{ color: subScore ? (subScore >= 75 ? '#10B981' : subScore >= 60 ? '#60A5FA' : '#FBBF24') : '#64748B' }}>
                  {subScore ?? '—'}
                </div>
                <div className="text-xs font-semibold text-slate-300 mb-2">{meta.label}</div>
                <ProgressBar value={subScore ?? 0} color={meta.color} />
                <p className="text-xxs text-slate-500 mt-2">Tap to view detail →</p>
              </GlassCard>
            );
          })}
        </div>

        {/* Strengths & Risks */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <GlassCard className="p-6">
            <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
              <TrendingUp size={15} className="text-emerald-400" /> What's Working For You
            </h3>
            <div className="space-y-3">
              {strengths.length === 0 ? (
                <p className="text-xs text-slate-500 italic">No significant positive drivers calculated.</p>
              ) : (
                strengths.map((s, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 + i * 0.1 }}
                    className="flex items-start gap-3"
                  >
                    <div className="w-6 h-6 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <TrendingUp size={10} className="text-emerald-400" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-white capitalize">{s.label}</span>
                        <SourceBadge source={s.source as any} size="sm" showLabel={false} />
                        <span className="text-emerald-400 text-xs font-bold">{s.lift}</span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">{s.detail}</p>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </GlassCard>

          <GlassCard className="p-6">
            <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
              <TrendingDown size={15} className="text-amber-400" /> What's Weighing Your Score Down
            </h3>
            <div className="space-y-3">
              {risks.length === 0 ? (
                <p className="text-xs text-slate-500 italic">No significant negative drivers calculated.</p>
              ) : (
                risks.map((r, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 + i * 0.1 }}
                    className="flex items-start gap-3"
                  >
                    <div className="w-6 h-6 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <TrendingDown size={10} className="text-amber-400" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-white capitalize">{r.label}</span>
                        <SourceBadge source={r.source as any} size="sm" showLabel={false} />
                        <span className="text-red-400 text-xs font-bold">{r.drag}</span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">{r.detail}</p>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </GlassCard>
        </div>

        {/* What would improve my score — collapsible */}
        <GlassCard className="mb-6">
          <button
            className="w-full p-5 flex items-center justify-between text-left"
            onClick={() => setShowImprovements(v => !v)}
          >
            <div>
              <h3 className="text-sm font-bold text-white">What Would Improve My Score?</h3>
              <p className="text-xs text-slate-400 mt-0.5">Ranked actions with estimated score impact</p>
            </div>
            {showImprovements ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
          </button>
          {showImprovements && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="px-5 pb-5"
            >
              <div className="space-y-3">
                {(score.recommendations ?? []).length === 0 ? (
                  <p className="text-xs text-slate-500 italic">No recommendations calculated.</p>
                ) : (
                  (score.recommendations ?? []).map((item, i) => (
                    <div key={i} className="flex items-center gap-4 p-3 rounded-xl bg-white/[0.02] border border-white/5">
                      <div className="text-lg font-black text-emerald-400 w-12 text-center flex-shrink-0">+{item.estimated_lift.toFixed(0)}</div>
                      <div className="flex-1">
                        <p className="text-sm text-white font-medium">{item.title}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{item.recommendation}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <SourceBadge source={item.pillar as any} size="sm" />
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          )}
        </GlassCard>

        {/* CTA row */}
        <div className="flex gap-3">
          <button className="btn-ghost" onClick={() => nav('/drilldown')}>
            <ArrowRight size={14} /> View Detailed Data
          </button>
          <button className="btn-primary" onClick={() => nav('/simulator')}>
            Try What-If Simulator <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
