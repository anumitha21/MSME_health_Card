import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  RefreshCw, CheckCircle2, AlertTriangle, XCircle, ArrowRight, 
  Database
} from 'lucide-react';
import {
  fetchScoreById, fetchTrend, checkHealth, SAMPLE_ENTERPRISE_IDS,
  type ScoreResponse, type TrendResponse
} from '../data/api';
import { SubScoreRadar } from '../components/Charts';
import { GlassAreaChart } from '../components/Charts';

// ─── Score Ring ──────────────────────────────────────────────────────────────
function ScoreRing({ score, size = 180 }: { score: number; size?: number }) {
  const [displayed, setDisplayed] = useState(0);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      setDisplayed(score);
      return;
    }
    const start = Date.now();
    const dur = 1000;
    const tick = () => {
      const p = Math.min((Date.now() - start) / dur, 1);
      const e = 1 - Math.pow(1 - p, 3);
      setDisplayed(Math.round(e * score));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [score]);

  const color = score >= 75 ? '#234E45' : score >= 60 ? '#7B5500' : '#8A332E';
  const r = size * 0.42;
  const circ = 2 * Math.PI * r;

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-full -rotate-90">
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#E2DBD0" strokeWidth="6" />
        <circle
          cx={size/2}
          cy={size/2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="6"
          strokeDasharray={circ}
          strokeDashoffset={circ * (1 - displayed / 100)}
          className="transition-all duration-300"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-serif-editorial font-bold text-[#0C182A]" style={{ fontSize: size * 0.24 }}>{displayed}</span>
        <span className="text-[#556B82] font-data-mono mt-1" style={{ fontSize: size * 0.08 }}>/ 100</span>
      </div>
    </div>
  );
}

// ─── EWS Status Banner ────────────────────────────────────────────────────────
function EWSBanner({ trend }: { trend: TrendResponse }) {
  const cfg = {
    Green:  { bg: '#E6ECE9', border: '#C4D3CD', color: '#234E45', icon: CheckCircle2, text: 'ON TRACK' },
    Yellow: { bg: '#FAF3E0', border: '#ECDDB0', color: '#7B5500', icon: AlertTriangle, text: 'WATCH' },
    Red:    { bg: '#F5ECEB', border: '#ECCDCB', color: '#8A332E', icon: XCircle, text: 'CRITICAL ALERT' },
  }[trend.ews_status] || { bg: '#E6ECE9', border: '#C4D3CD', color: '#234E45', icon: CheckCircle2, text: 'ON TRACK' };
  
  const Icon = cfg.icon;
  
  return (
    <div className="p-4 border flex items-start gap-3 rounded-none"
      style={{ backgroundColor: cfg.bg, borderColor: cfg.border }}>
      <Icon size={18} style={{ color: cfg.color }} className="flex-shrink-0 mt-0.5" />
      <div>
        <div className="flex items-center gap-2 mb-1 font-data-mono text-xs">
          <span className="font-bold" style={{ color: cfg.color }}>EWS SYSTEM: {cfg.text}</span>
        </div>
        <p className="text-xs text-[#253954] mt-1">{trend.ews_message}</p>
        {trend.drift_detected && (
          <p className="text-xs text-[#8A332E] mt-2 font-bold font-data-mono">
            ⚠️ DRIFT DETECTED: {trend.recommendation.toUpperCase()}
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Score Trend Chart ────────────────────────────────────────────────────────
function TrendChart({ trend }: { trend: TrendResponse }) {
  const data = (trend?.periods ?? []).map(p => ({
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
        { key: 'score', color: '#234E45', label: 'Fused score' },
        { key: 'gst',   color: '#7B5500', label: 'GST sub-score' },
        { key: 'upi',   color: '#8A332E', label: 'UPI sub-score' },
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
      setError(e.message || 'Failed to load enterprise data from backend');
    } finally {
      setLoading(false);
    }
  }

  const radarScores = score ? {
    gst: score.gst_score ?? 0, upi: score.upi_score ?? 0,
    aa: score.aa_score ?? 0, epfo: score.epfo_score ?? 0,
  } : { gst: 0, upi: 0, aa: 0, epfo: 0 };

  return (
    <div className="min-h-screen pt-20 pb-16 bg-[#FAF8F5] text-[#1B2D4A] px-6 select-text">
      <div className="max-w-6xl mx-auto">
        
        {/* Document Header */}
        <div className="border border-[#E2DBD0] bg-white p-6 mb-8 text-[#0C182A]">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-[#E2DBD0] pb-4 mb-4 gap-4">
            <div>
              <span className="text-xxs font-data-mono font-bold tracking-widest text-[#8B704F] block uppercase">
                FASTAPI REAL-TIME INTEGRATION
              </span>
              <h1 className="font-serif-editorial text-3xl font-bold tracking-tight mt-1">
                Live Credit Calibration Desk
              </h1>
            </div>
            
            <div className="flex items-center gap-1.5 self-end sm:self-auto font-data-mono text-xs">
              <span className="text-[#556B82] uppercase">API status:</span>
              {backendAlive === null ? (
                <span className="font-bold text-[#556B82] bg-[#F0EAE1] border border-[#D9CEBE] px-2 py-0.5">CHECKING...</span>
              ) : backendAlive ? (
                <span className="font-bold text-[#234E45] bg-[#E6ECE9] border border-[#C4D3CD] px-2 py-0.5 inline-flex items-center gap-1">
                  ■ ML ENGINE ONLINE
                </span>
              ) : (
                <span className="font-bold text-[#8A332E] bg-[#F5ECEB] border border-[#ECCDCB] px-2 py-0.5 inline-flex items-center gap-1">
                  ▲ ML ENGINE OFFLINE
                </span>
              )}
            </div>
          </div>
          
          <div className="text-xs text-[#556B82] leading-relaxed max-w-3xl">
            This module establishes connection to the model server at <code className="bg-[#FAF6F0] border border-[#E2DBD0] px-1 text-[#8A332E] font-data-mono">localhost:8000</code>.
            Evaluations call the baseline XGBoost classifier calibration in real-time.
          </div>
        </div>

        {/* Offline notice */}
        {backendAlive === false && (
          <div className="border border-[#ECDDB0] bg-[#FAF3E0] p-5 mb-6 text-xs text-[#7B5500] leading-relaxed">
            <div className="flex items-start gap-3">
              <AlertTriangle size={16} className="text-[#7B5500] mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-bold uppercase font-data-mono">FastAPI backend server offline</p>
                <p className="mt-1">
                  To execute live predictions, launch the server in your developer console:
                </p>
                <code className="block bg-white border border-[#ECDDB0] p-2 mt-2 font-data-mono text-[#8A332E] whitespace-pre-wrap select-all">
                  uvicorn api.main:app --host 127.0.0.1 --port 8000
                </code>
                <p className="mt-2 text-[#556B82] italic">
                  * Other client portals will continue to bypass API calls using standard offline calibration templates.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Database selector */}
        <div className="border border-[#E2DBD0] bg-white p-5 mb-8">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-2 font-data-mono text-xs">
              <Database size={14} className="text-[#556B82]" />
              <span className="text-[#0C182A] font-bold uppercase">SELECT TEST EXPOSURE PROFILE:</span>
            </div>
            
            <div className="flex flex-wrap gap-2 flex-1 md:justify-center">
              {SAMPLE_ENTERPRISE_IDS.slice(0, 8).map(id => (
                <button
                  key={id}
                  className="px-2.5 py-1.5 font-data-mono text-xs font-bold transition-colors cursor-pointer border"
                  style={selected === id ? {
                    backgroundColor: '#E6ECE9',
                    borderColor: '#C4D3CD',
                    color: '#234E45',
                    borderRadius: '0px'
                  } : {
                    backgroundColor: '#FFFFFF',
                    borderColor: '#E2DBD0',
                    color: '#556B82',
                    borderRadius: '0px'
                  }}
                  onClick={() => { setSelected(id); loadEnterprise(id); }}
                >
                  {id}
                </button>
              ))}
            </div>
            
            <button
              onClick={() => loadEnterprise(selected)}
              disabled={loading}
              className="btn-ghost text-xs flex items-center gap-1"
            >
              <RefreshCw size={12} className={loading ? 'animate-spin' : ''} /> Refresh Desk
            </button>
          </div>
        </div>

        {/* Error panel */}
        {error && (
          <div className="border border-[#ECCDCB] bg-[#F5ECEB] p-4 mb-6 text-xs font-data-mono text-[#8A332E]">
            ▲ CONNECTION FAULT: {error}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 font-data-mono text-xs text-[#556B82] animate-pulse">
            {[1,2,3].map(i => (
              <div key={i} className="border border-[#E2DBD0] bg-white p-6 h-40 flex items-center justify-center">
                CALIBRATING SIGNAL STREAM...
              </div>
            ))}
          </div>
        )}

        {/* Live prediction panels */}
        {score && !loading && (
          <div className="space-y-8 animate-none">
            
            {/* Verification header banner */}
            <div className="flex items-start justify-between border-b border-[#E2DBD0] pb-4 flex-wrap gap-4">
              <div>
                <span className="text-xxs font-data-mono font-bold text-[#8B704F] uppercase tracking-wide">
                  CURRENT CALIBRATED RECORD
                </span>
                <h3 className="font-serif-editorial text-2xl font-bold text-[#0C182A] tracking-tight">{score.enterprise_id}</h3>
                <p className="text-xs text-[#556B82] font-data-mono mt-0.5">{score.decision.toUpperCase()}</p>
              </div>
              
              <div className="flex items-center gap-3 flex-wrap font-data-mono text-xs">
                <span className="font-bold text-[#0C182A] border border-[#E2DBD0] px-2 py-0.5 bg-white">
                  Tier {score.risk_tier}
                </span>
                <span className={`font-bold px-2 py-0.5 border ${
                  score.data_confidence.toLowerCase() === 'gold' ? 'text-[#234E45] bg-[#E6ECE9] border-[#C4D3CD]' : 'text-[#7B5500] bg-[#FAF3E0] border-[#ECDDB0]'
                }`}>
                  ■ {score.data_confidence.toUpperCase()} CONFIDENCE
                </span>
              </div>
            </div>

            {/* Middle split: score circle + subradar + cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              
              {/* Score Gauge */}
              <div className="border border-[#E2DBD0] bg-white p-6 flex flex-col items-center justify-center text-center">
                <span className="text-xxs font-data-mono font-bold tracking-widest text-[#556B82] block uppercase mb-4 self-start">
                  FUSED SCORE COEFFICIENT
                </span>
                
                <ScoreRing score={score.overall_score ?? 0} size={150} />
                
                <div className="mt-4 font-data-mono text-xs text-[#556B82]">
                  Baseline Uncertainty bounds: <span className="font-bold text-[#0C182A]">{score.score_range_low} – {score.score_range_high}</span>
                </div>
              </div>

              {/* Radar co-efficients */}
              <div className="border border-[#E2DBD0] bg-white p-6">
                <span className="text-xxs font-data-mono font-bold tracking-widest text-[#556B82] block uppercase text-center mb-2">
                  RADAR SUB-PILLAR READINGS
                </span>
                <SubScoreRadar scores={radarScores} size={200} />
              </div>

              {/* Sub-Pillar mini cards */}
              <div className="border border-[#E2DBD0] bg-white p-6">
                <span className="text-xxs font-data-mono font-bold tracking-widest text-[#556B82] block uppercase mb-4">
                  INDIVIDUAL PARAMETERS
                </span>
                
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { label: 'GST Sub-Score', val: score.gst_score,  color: '#234E45', source: 'gst'  as const },
                    { label: 'UPI Sub-Score', val: score.upi_score,  color: '#234E45', source: 'upi'  as const },
                    { label: 'AA Sub-Score',  val: score.aa_score,   color: '#7B5500', source: 'aa'   as const },
                    { label: 'EPFO Sub-Score',val: score.epfo_score, color: '#8A332E', source: 'epfo' as const },
                  ].map(s => (
                    <div key={s.source} className="border border-[#E2DBD0] bg-[#FAF6F0] p-3">
                      <span className="font-data-mono text-[9px] font-bold text-[#556B82] uppercase">{s.source.toUpperCase()} Index</span>
                      <div className="text-2xl font-bold font-serif-editorial mt-1 mb-2" style={{ color: s.color }}>
                        {s.val?.toFixed(0) ?? '—'}
                      </div>
                      
                      {/* Flat ruled tracker */}
                      <div className="progress-track">
                        <div className="progress-fill" style={{ width: `${s.val ?? 0}%`, background: s.color }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>

            {/* EWS + Trajectory */}
            {trend && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                
                {/* Early warning signals */}
                <div className="border border-[#E2DBD0] bg-white p-6 flex flex-col justify-between">
                  <div>
                    <span className="text-xxs font-data-mono font-bold tracking-widest text-[#556B82] block uppercase mb-4">
                      RBI-MANDATED EARLY WARNING STATUS
                    </span>
                    <EWSBanner trend={trend} />
                  </div>
                  
                  <div className="mt-4 pt-4 border-t border-[#FAF6F0] space-y-2 font-data-mono text-xs">
                    {(trend.periods ?? []).map((p, i) => (
                      <div key={i} className="flex items-center justify-between">
                        <span className="text-[#556B82]">{p.label} PERIOD CALIBRATION</span>
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-[#0C182A]">{p.overall_score?.toFixed(0) ?? '—'}</span>
                          <span className="text-[10px] font-bold text-[#0C182A] border border-[#E2DBD0] px-1.5 bg-[#FAF6F0]">
                            Tier {p.risk_tier}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Score trajectory */}
                <div className="border border-[#E2DBD0] bg-white p-6">
                  <span className="text-xxs font-data-mono font-bold tracking-widest text-[#556B82] block uppercase mb-4">
                    SCORE TRAJECTORY DRIFT ANALYSIS
                  </span>
                  <TrendChart trend={trend} />
                </div>

              </div>
            )}

            {/* SHAP Drivers and Action Recommendations */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              
              {/* SHAP list */}
              <div className="border border-[#E2DBD0] bg-white p-6">
                <span className="text-xxs font-data-mono font-bold tracking-widest text-[#556B82] block uppercase mb-4">
                  SHAP ATTRIBUTION LOGS
                </span>
                
                <div className="space-y-3 font-data-mono text-xs">
                  {(score.key_drivers ?? []).slice(0, 6).map((d, i) => {
                    const isPositive = d.type === 'Positive Driver';
                    return (
                      <div key={i} className="flex items-center justify-between py-1.5 border-b border-[#FAF6F0]">
                        <span className="text-[#0C182A] font-semibold truncate max-w-sm capitalize">
                          {d.feature ? d.feature.replace(/_/g, ' ') : 'metric'}
                        </span>
                        
                        <span className={`font-bold ${isPositive ? 'text-[#234E45]' : 'text-[#8A332E]'}`}>
                          {isPositive ? `+${d.impact.toFixed(2)}` : `${d.impact.toFixed(2)}`}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Action plan */}
              <div className="border border-[#E2DBD0] bg-white p-6">
                <span className="text-xxs font-data-mono font-bold tracking-widest text-[#556B82] block uppercase mb-4">
                  ACTION DIRECTIVE OPTIMIZATIONS
                </span>
                
                <div className="space-y-3">
                  {(score.recommendations ?? []).slice(0, 2).map((r, i) => (
                    <div key={i} className="p-3 border border-[#E2DBD0] bg-[#FAF6F0]">
                      <div className="flex items-baseline justify-between mb-1">
                        <span className="text-xs font-bold text-[#0C182A]">{r.title}</span>
                        <span className="font-serif-editorial text-sm font-bold text-[#234E45]">+{r.estimated_lift} Pts</span>
                      </div>
                      <p className="text-xs text-[#556B82] leading-normal">{r.recommendation}</p>
                    </div>
                  ))}
                </div>
              </div>

            </div>

            {/* GenAI Audit Trail */}
            {score.audit_justification && (
              <div className="border border-[#E2DBD0] bg-white p-6">
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-xxs font-data-mono font-bold tracking-widest text-[#8B704F] block uppercase">
                    GENAI AUDIT EXPLAINABILITY MEMORANDUM
                  </span>
                  
                  <span className="text-[9px] font-bold font-data-mono border border-[#C4D3CD] bg-[#E6ECE9] text-[#234E45] px-1.5 py-0.2">
                    VERIFIED CALIBRATION
                  </span>
                </div>
                
                <div className="p-4 border border-[#E2DBD0] bg-[#FAF6F0] text-xs text-[#253954] leading-relaxed whitespace-pre-wrap font-sans-ui">
                  {score.audit_justification}
                </div>
              </div>
            )}

            {/* Controls */}
            <div className="flex gap-4 flex-wrap border-t border-[#E2DBD0] pt-6">
              <button className="btn-ghost" onClick={() => nav('/borrower')}>Open Borrower Portal</button>
              <button className="btn-ghost" onClick={() => nav('/banker')}>Open Banker Console</button>
              <button className="btn-primary" onClick={() => nav('/simulator')}>Run What-If Scenarios <ArrowRight size={14} className="ml-1" /></button>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
