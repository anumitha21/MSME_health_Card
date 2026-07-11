import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  RefreshCw, CheckCircle2, AlertTriangle, XCircle, ArrowRight, 
  Zap, Info, Database
} from 'lucide-react';
import {
  fetchScoreById, fetchTrend, checkHealth, SAMPLE_ENTERPRISE_IDS,
  type ScoreResponse, type TrendResponse
} from '../data/api';
import { SubScoreRadar, GlassAreaChart } from '../components/Charts';
import {
  GlassCard, SectionHeader, ScoreTierBadge, ConfidenceBadge, ProgressBar,
  InfoTooltip, SourceBadge
} from '../components/ui';

// ─── Animated Score Ring ──────────────────────────────────────────────────────
function ScoreRing({ score, size = 180 }: { score: number; size?: number }) {
  const [displayed, setDisplayed] = useState(0);
  useEffect(() => {
    const start = Date.now();
    const dur = 1400;
    const tick = () => {
      const p = Math.min((Date.now() - start) / dur, 1);
      const e = 1 - Math.pow(1 - p, 3);
      setDisplayed(Math.round(e * score));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [score]);
  const color = score >= 75 ? '#10B981' : score >= 60 ? '#3B82F6' : score >= 45 ? '#F59E0B' : '#EF4444';
  const r = size * 0.4;
  const circ = 2 * Math.PI * r;
  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-full -rotate-90">
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={size * 0.055} />
        <motion.circle
          cx={size/2} cy={size/2} r={r} fill="none" stroke={color}
          strokeWidth={size * 0.055} strokeLinecap="round"
          strokeDasharray={circ}
          initial={{ strokeDashoffset: circ }}
          animate={{ strokeDashoffset: circ * (1 - displayed / 100) }}
          transition={{ duration: 1.4, ease: [0.34, 1.56, 0.64, 1] }}
          style={{ filter: `drop-shadow(0 0 ${size * 0.04}px ${color})` }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-black text-white" style={{ fontSize: size * 0.22 }}>{displayed}</span>
        <span className="text-slate-400" style={{ fontSize: size * 0.08 }}>/ 100</span>
      </div>
    </div>
  );
}

// ─── EWS Status Banner ────────────────────────────────────────────────────────
function EWSBanner({ trend }: { trend: TrendResponse }) {
  const cfg = {
    Green:  { bg: 'rgba(16,185,129,0.1)', border: 'rgba(16,185,129,0.25)', color: '#10B981', icon: CheckCircle2, text: 'On Track' },
    Yellow: { bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.25)',  color: '#F59E0B', icon: AlertTriangle, text: 'Watch' },
    Red:    { bg: 'rgba(239,68,68,0.1)',   border: 'rgba(239,68,68,0.25)',   color: '#EF4444', icon: XCircle, text: 'Alert' },
  }[trend.ews_status] || { bg: 'rgba(16,185,129,0.1)', border: 'rgba(16,185,129,0.25)', color: '#10B981', icon: CheckCircle2, text: 'On Track' };
  const Icon = cfg.icon;
  return (
    <div className="p-4 rounded-xl border flex items-start gap-3"
      style={{ background: cfg.bg, borderColor: cfg.border }}>
      <Icon size={18} style={{ color: cfg.color }} className="flex-shrink-0 mt-0.5" />
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-bold" style={{ color: cfg.color }}>EWS: {cfg.text}</span>
          <span className="text-xs text-slate-400 badge-slate">{trend.ews_status}</span>
        </div>
        <p className="text-xs text-slate-300">{trend.ews_message}</p>
        {trend.drift_detected && (
          <p className="text-xs text-amber-400 mt-1 font-medium">⚠️ Score drift detected — {trend.recommendation}</p>
        )}
      </div>
    </div>
  );
}

// ─── Score Trend Chart ────────────────────────────────────────────────────────
function TrendChart({ trend }: { trend: TrendResponse }) {
  const data = trend.periods.map(p => ({
    month: p.label,
    score: p.overall_score,
    gst: p.gst_score ?? 0,
    upi: p.upi_score ?? 0,
    aa: p.aa_score ?? 0,
  }));
  return (
    <GlassAreaChart
      data={data}
      keys={[
        { key: 'score', color: '#10B981', label: 'Overall' },
        { key: 'gst',   color: '#F59E0B', label: 'GST' },
        { key: 'upi',   color: '#34D399', label: 'UPI' },
      ]}
      height={180}
    />
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function LiveScore() {
  const nav = useNavigate();
  const [backendAlive, setBackendAlive] = useState<boolean | null>(null);
  const [selected, setSelected] = useState('MSME100001');
  const [loading, setLoading] = useState(false);
  const [score, setScore] = useState<ScoreResponse | null>(null);
  const [trend, setTrend] = useState<TrendResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Check backend on mount
  useEffect(() => {
    checkHealth().then(alive => {
      setBackendAlive(alive);
      if (alive) loadEnterprise('MSME100001');
    });
  }, []);

  async function loadEnterprise(id: string) {
    setLoading(true);
    setError(null);
    try {
      const [scoreData, trendData] = await Promise.all([
        fetchScoreById(id),
        fetchTrend(id),
      ]);
      setScore(scoreData);
      setTrend(trendData);
    } catch (e: any) {
      setError(e.message || 'Failed to load enterprise data');
    } finally {
      setLoading(false);
    }
  }

  const radarScores = score ? {
    gst: score.gst_score ?? 0, upi: score.upi_score ?? 0,
    aa: score.aa_score ?? 0, epfo: score.epfo_score ?? 0,
  } : { gst: 0, upi: 0, aa: 0, epfo: 0 };


  return (
    <div className="min-h-screen pt-20 pb-12">
      <div className="max-w-6xl mx-auto px-6">
        <SectionHeader
          title="Live Credit Assessment"
          subtitle="Connected to the FastAPI ML backend at localhost:8000 — pulling real XGBoost scores, SHAP drivers, and EWS trend data from the MSME dataset."
          badge={
            backendAlive === null ? <span className="badge-slate">Checking…</span> :
            backendAlive ? <span className="badge-emerald flex items-center gap-1.5"><Zap size={10} /> Backend Live</span> :
            <span className="badge-red flex items-center gap-1.5"><XCircle size={10} /> Backend Offline</span>
          }
        />

        {/* Backend Offline notice */}
        {backendAlive === false && (
          <GlassCard className="p-5 mb-6 border-amber-500/20" style={{ borderColor: 'rgba(245,158,11,0.2)' }}>
            <div className="flex items-start gap-3">
              <AlertTriangle size={16} className="text-amber-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-amber-400 mb-1">Backend not reachable at localhost:8000</p>
                <p className="text-xs text-slate-400">
                  Start the backend with: <code className="bg-white/5 px-1.5 py-0.5 rounded text-emerald-400">uvicorn api.main:app --host 127.0.0.1 --port 8000</code>
                  {' '}from the MSME_health_Card directory. The prototype will continue to work with mock data in other screens.
                </p>
              </div>
            </div>
          </GlassCard>
        )}

        {/* Enterprise selector */}
        <GlassCard className="p-5 mb-6">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <Database size={14} className="text-slate-400" />
              <span className="text-sm text-slate-300 font-medium">Select Enterprise from Dataset:</span>
            </div>
            <div className="flex gap-2 flex-wrap flex-1">
              {SAMPLE_ENTERPRISE_IDS.slice(0, 8).map(id => (
                <button
                  key={id}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
                    selected === id
                      ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25'
                      : 'bg-white/[0.03] text-slate-400 border border-white/5 hover:border-white/10 hover:text-slate-200'
                  }`}
                  onClick={() => { setSelected(id); loadEnterprise(id); }}
                >
                  {id}
                </button>
              ))}
            </div>
            <button
              className="btn-ghost text-xs"
              onClick={() => loadEnterprise(selected)}
              disabled={loading}
            >
              <RefreshCw size={12} className={loading ? 'animate-spin' : ''} /> Refresh
            </button>
          </div>
        </GlassCard>

        {/* Error state */}
        {error && (
          <GlassCard className="p-4 mb-6 border-red-500/20" style={{ borderColor: 'rgba(239,68,68,0.2)' }}>
            <p className="text-red-400 text-sm flex items-center gap-2"><XCircle size={14} /> {error}</p>
          </GlassCard>
        )}

        {/* Loading skeleton */}
        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 animate-pulse">
            {[1,2,3].map(i => <div key={i} className="glass h-32 rounded-2xl" />)}
          </div>
        )}

        {/* Live Score Results */}
        <AnimatePresence mode="wait">
          {score && !loading && (
            <motion.div key={selected} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
              {/* Header strip */}
              <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                <div>
                  <h3 className="text-lg font-bold text-white">{score.enterprise_id}</h3>
                  <p className="text-xs text-slate-400">{score.decision} · PD derived from tier mapping</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <ScoreTierBadge tier={score.risk_tier} />
                  <ConfidenceBadge
                    sources={['gold','silver','bronze'].includes(score.data_confidence.toLowerCase()) ? (score.data_confidence.toLowerCase() === 'gold' ? 4 : score.data_confidence.toLowerCase() === 'silver' ? 3 : 2) : 1}
                    total={4}
                    level={score.data_confidence}
                  />
                </div>
              </div>

              {/* Score hero + Radar + EWS */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-5">
                <GlassCard className="p-6 flex flex-col items-center text-center gap-4" glow="emerald">
                  <ScoreRing score={score.overall_score ?? 0} size={160} />
                  <div className="space-y-1.5">
                    <p className="text-xs text-slate-400">
                      Range: <span className="text-white font-medium">{score.score_range_low?.toFixed(0)}–{score.score_range_high?.toFixed(0)}</span>
                    </p>
                    <div className="flex gap-1.5 flex-wrap justify-center">
                      {(score.triggered_rules ?? []).slice(0, 2).map((r, i) => (
                        <span key={i} className="badge-amber text-xxs">{r.replace('_', ' ')}</span>
                      ))}
                    </div>
                  </div>
                </GlassCard>

                <GlassCard className="p-5">
                  <p className="text-xs text-slate-400 mb-2 text-center">Pillar Breakdown</p>
                  <SubScoreRadar scores={radarScores} size={200} />
                </GlassCard>

                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: 'GST Score',  val: score.gst_score,  color: '#F59E0B', source: 'gst'  as const },
                      { label: 'UPI Score',  val: score.upi_score,  color: '#10B981', source: 'upi'  as const },
                      { label: 'AA Score',   val: score.aa_score,   color: '#3B82F6', source: 'aa'   as const },
                      { label: 'EPFO Score', val: score.epfo_score, color: '#8B5CF6', source: 'epfo' as const },
                    ].map(s => (
                      <GlassCard key={s.source} className="p-3">
                        <SourceBadge source={s.source} size="sm" />
                        <div className="text-xl font-black mt-2 mb-1" style={{ color: s.val ? s.color : '#64748B' }}>
                          {s.val?.toFixed(0) ?? '—'}
                        </div>
                        <ProgressBar value={s.val ?? 0} color={s.color} />
                      </GlassCard>
                    ))}
                  </div>
                </div>
              </div>

              {/* EWS + Trend Chart */}
              {trend && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
                  <GlassCard className="p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <p className="text-sm font-bold text-white">Early Warning Signals (EWS)</p>
                      <InfoTooltip text="RBI-mandated EWS monitoring — re-scored monthly. Flags drift before NPA materialises." />
                    </div>
                    <EWSBanner trend={trend} />
                    <div className="mt-3 space-y-1">
                      {trend.periods.map((p, i) => (
                        <div key={i} className="flex items-center justify-between text-xs">
                          <span className="text-slate-400">{p.label}</span>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white">{p.overall_score.toFixed(0)}</span>
                            <span className="badge-slate">{p.risk_tier}</span>
                            {p.drift_flags.length > 0 && <AlertTriangle size={10} className="text-amber-400" />}
                          </div>
                        </div>
                      ))}
                    </div>
                  </GlassCard>

                  <GlassCard className="p-5">
                    <p className="text-sm font-bold text-white mb-3">Score Trajectory</p>
                    <TrendChart trend={trend} />
                  </GlassCard>
                </div>
              )}

              {/* SHAP Drivers */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
                <GlassCard className="p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <p className="text-sm font-bold text-white">SHAP Key Drivers</p>
                    <InfoTooltip text="SHAP (SHapley Additive exPlanations) quantifies exactly how much each feature contributed to the score — positive or negative. RBI requires this for fair-lending audits." />
                  </div>
                  <div className="space-y-2">
                    {(score.key_drivers ?? []).slice(0, 6).map((d, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${d.type === 'Positive Driver' ? 'bg-emerald-400' : 'bg-red-400'}`} />
                        <span className="text-xs text-slate-300 flex-1 truncate">{d.feature.replace(/_/g, ' ')}</span>
                        <span className={`text-xs font-bold ${d.type === 'Positive Driver' ? 'text-emerald-400' : 'text-red-400'}`}>
                          {d.impact > 0 ? '+' : ''}{d.impact.toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                </GlassCard>

                <GlassCard className="p-5">
                  <p className="text-sm font-bold text-white mb-3">AI Coaching Recommendations</p>
                  <div className="space-y-3">
                    {(score.recommendations ?? []).slice(0, 3).map((r, i) => (
                      <div key={i} className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-bold text-white">{r.title}</span>
                          <span className="text-emerald-400 text-xs font-bold">+{r.estimated_lift.toFixed(0)}pt</span>
                        </div>
                        <p className="text-xs text-slate-400 leading-relaxed">{r.recommendation}</p>
                      </div>
                    ))}
                  </div>
                </GlassCard>
              </div>

              {/* GenAI Audit Trail */}
              {score.audit_justification && (
                <GlassCard className="p-5 mb-5">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-6 h-6 rounded-lg bg-blue-500/15 flex items-center justify-center">
                      <Info size={12} className="text-blue-400" />
                    </div>
                    <p className="text-sm font-bold text-white">GenAI Audit Justification</p>
                    <span className="badge-blue">Gemini 2.5 Flash</span>
                    <InfoTooltip text="Generated by Gemini 2.5 Flash — satisfies RBI fair-lending explainability requirement. Exportable to loan file." />
                  </div>
                  <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/15">
                    <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">{score.audit_justification}</p>
                  </div>
                </GlassCard>
              )}

              <div className="flex gap-3 flex-wrap">
                <button className="btn-ghost" onClick={() => nav('/borrower')}>View Borrower Dashboard</button>
                <button className="btn-primary" onClick={() => nav('/simulator')}>Run What-If Scenarios <ArrowRight size={13} /></button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
