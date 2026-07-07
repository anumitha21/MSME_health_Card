import { useState, useEffect, useCallback } from 'react';
import {
  Activity, Search, Sliders, ShieldCheck,
  AlertTriangle, BarChart2, RefreshCw, Layers, Database,
  ArrowRight, CheckCircle2, User, Globe, Code
} from 'lucide-react';
import {
  RadialBarChart, RadialBar, PolarAngleAxis, ResponsiveContainer,
} from 'recharts';
import { API_BASE, DEMO_RECORD } from './api';
import type {
  ScoreResponse, TrendResponse, PortfolioSummary,
  StressSimulationResponse
} from './api';

// ─── Color mappings ──────────────────────────────────────────
function scoreColor(s: number | null): string {
  if (s === null || s === undefined) return 'var(--text-muted)';
  if (s >= 75) return 'var(--green)';
  if (s >= 55) return 'var(--blue)';
  if (s >= 35) return 'var(--amber)';
  return 'var(--red)';
}

function tierBadgeClass(tier: string): string {
  if (tier === 'Gold') return 'conf-gold';
  if (tier === 'Silver') return 'conf-silver';
  if (tier === 'Bronze') return 'conf-bronze';
  return 'conf-minimal';
}

// ─── Radial Gauge Component ───────────────────────────────────
interface GaugeProps {
  label: string;
  score: number | null;
  tag?: string;
  pillar?: string;
}

function Gauge({ label, score, tag, pillar }: GaugeProps) {
  const val = score ?? 0;
  const color = scoreColor(score);
  const data = [{ value: val, fill: color }];

  return (
    <div className="glass-card gauge-card">
      {pillar && <span className="gauge-pillar">{pillar}</span>}
      <div style={{ width: 110, height: 80 }}>
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart
            innerRadius={28}
            outerRadius={50}
            startAngle={180}
            endAngle={0}
            data={data}
          >
            <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
            <RadialBar
              background={{ fill: 'rgba(255,255,255,0.03)' }}
              dataKey="value"
              angleAxisId={0}
              cornerRadius={4}
            />
          </RadialBarChart>
        </ResponsiveContainer>
      </div>
      <span className="gauge-score" style={{ color }}>
        {score !== null && score !== undefined ? score.toFixed(1) : '—'}
      </span>
      <span className="gauge-metric-label">{label}</span>
      {tag && <span style={{ fontSize: '0.62rem', color: 'var(--text-secondary)', marginTop: 4 }}>{tag}</span>}
    </div>
  );
}

// ─── Mock Enterprise List for quick CLI-search ───────────────
const SEARCHABLE_MSMES = [
  { id: 'MSME100000', segment: 'Small', sector: 'Services' },
  { id: 'MSME100001', segment: 'Small', sector: 'Manufacturing' },
  { id: 'MSME100002', segment: 'Micro', sector: 'Trading/Retail' },
  { id: 'MSME100003', segment: 'Medium', sector: 'Construction' },
  { id: 'MSME100004', segment: 'Micro', sector: 'Agriculture & Allied' },
  { id: 'MSME100005', segment: 'Small', sector: 'IT/ITES' },
  { id: 'MSME100006', segment: 'Micro', sector: 'Textile' },
  { id: 'MSME100007', segment: 'Medium', sector: 'Food Processing' }
];

export default function App() {
  // Views: 'lender' | 'borrower'
  const [activeView, setActiveView] = useState<'lender' | 'borrower'>('lender');
  const [, setEnterpriseId] = useState('MSME100001');

  // Enterprise details
  const [score, setScore] = useState<ScoreResponse | null>(null);
  const [trend, setTrend] = useState<TrendResponse | null>(null);
  const [uliPayload, setUliPayload] = useState<Record<string, unknown> | null>(null);

  // Search overlay toggle
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Portfolio & Stress Simulation variables
  const [portfolio, setPortfolio] = useState<PortfolioSummary | null>(null);
  const [stressSector, setStressSector] = useState('all');
  const [stressType, setStressType] = useState('turnover_shock');
  const [stressSeverity, setStressSeverity] = useState(0.15);
  const [stressResult, setStressResult] = useState<StressSimulationResponse | null>(null);

  // States
  const [, setLoading] = useState(false);
  const [stressLoading, setStressLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Localization mock (English / Hindi)
  const [lang, setLang] = useState<'EN' | 'HI'>('EN');

  // ─── Fetch Single MSME Data ─────────────────────────────────
  const fetchEnterpriseData = useCallback(async (id: string) => {
    if (!id.trim()) return;
    setLoading(true);
    setError(null);
    setScore(null);
    setTrend(null);
    setUliPayload(null);

    // Derive inputs from DEMO_RECORD but overwrite with selected ID
    const payload = { ...DEMO_RECORD, enterprise_id: id };

    try {
      const [scoreRes, trendRes, uliRes] = await Promise.all([
        fetch(`${API_BASE}/score`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }),
        fetch(`${API_BASE}/trend/${encodeURIComponent(id)}`),
        fetch(`${API_BASE}/uli/payload/${encodeURIComponent(id)}`)
      ]);

      if (!scoreRes.ok) {
        const err = await scoreRes.json().catch(() => ({}));
        throw new Error((err as { detail?: string }).detail ?? `HTTP ${scoreRes.status}`);
      }

      const scoreData = await scoreRes.json();
      setScore(scoreData);

      if (trendRes.ok) setTrend(await trendRes.json());
      if (uliRes.ok) setUliPayload(await uliRes.json());
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  // ─── Fetch Portfolio Aggregate Summary ────────────────────────
  const fetchPortfolioSummary = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/portfolio/summary`);
      if (res.ok) {
        setPortfolio(await res.json());
      }
    } catch (e) {
      console.error("Failed to fetch portfolio aggregates:", e);
    }
  }, []);

  // ─── Run Stress Simulation ──────────────────────────────────
  const runStressTest = async () => {
    setStressLoading(true);
    try {
      const res = await fetch(`${API_BASE}/portfolio/simulate-stress`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sector: stressSector,
          stress_type: stressType,
          severity_pct: stressSeverity
        }),
      });
      if (res.ok) {
        setStressResult(await res.json());
      }
    } catch (e) {
      console.error("Failed to run stress test:", e);
    } finally {
      setStressLoading(false);
    }
  };

  // Initial loads
  useEffect(() => {
    fetchEnterpriseData('MSME100001');
    fetchPortfolioSummary();
  }, [fetchEnterpriseData, fetchPortfolioSummary]);

  // Global search shortcut listener (Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setShowSearchModal(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const selectEnterprise = (id: string) => {
    setEnterpriseId(id);
    fetchEnterpriseData(id);
    setShowSearchModal(false);
  };

  const filteredResults = SEARCHABLE_MSMES.filter(
    m => m.id.toLowerCase().includes(searchQuery.toLowerCase()) || m.sector.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="app">
      {/* ── Header ── */}
      <header className="header">
        <div className="header-brand">
          <Activity size={24} />
          <div>
            <div className="header-title">IDBI MSME Sahay</div>
            <div className="header-sub">ULI Alternate Credit Gateway</div>
          </div>
        </div>

        {/* Console view toggle */}
        <div className="view-switcher">
          <button
            className={`view-btn ${activeView === 'lender' ? 'active' : ''}`}
            onClick={() => setActiveView('lender')}
          >
            <Database size={14} /> Lender Console
          </button>
          <button
            className={`view-btn ${activeView === 'borrower' ? 'active' : ''}`}
            onClick={() => setActiveView('borrower')}
          >
            <User size={14} /> Borrower App
          </button>
        </div>
      </header>

      {/* ── Search Bar / Command trigger ── */}
      <div style={{ padding: '1.5rem 0', display: 'flex', justifyContent: 'center' }}>
        <div className="search-container">
          <div className="cmd-bar" onClick={() => setShowSearchModal(true)}>
            <Search size={16} color="var(--text-muted)" />
            <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem', flex: 1, marginLeft: '0.75rem' }}>
              Search MSME portfolio or trigger command...
            </span>
            <span className="cmd-kbd">Ctrl K</span>
          </div>
        </div>
      </div>

      <div className="main-content">
        {error && (
          <div className="error-box">
            ⚠ Connection Error: {error}. Check if FastAPI is running on port 8000.
          </div>
        )}

        {/* ─── LENDER CONSOLE VIEW ───────────────────────────────── */}
        {activeView === 'lender' && (
          <>
            {/* Top row: Portfolio Summary Cards */}
            {portfolio && (
              <div className="grid-stats">
                <div className="glass-card">
                  <span className="stat-sub">Total Managed Exposure</span>
                  <div className="stat-value text-cyan">{portfolio.total_exposure.toLocaleString()}</div>
                  <span className="stat-sub">Active MSME Portfolios</span>
                </div>
                <div className="glass-card">
                  <span className="stat-sub">Portfolio Avg Health Score</span>
                  <div className="stat-value text-blue">{portfolio.average_score.toFixed(1)}</div>
                  <span className="stat-sub">Out of 100</span>
                </div>
                <div className="glass-card">
                  <span className="stat-sub">Defaults Flagged</span>
                  <div className="stat-value text-red">{portfolio.default_count}</div>
                  <span className="stat-sub">Default Rate: {portfolio.default_rate.toFixed(2)}%</span>
                </div>
                <div className="glass-card">
                  <span className="stat-sub">Alternative Coverage</span>
                  <div className="stat-value text-green">{portfolio.coverage.gst}%</div>
                  <span className="stat-sub">GST Registration Rate</span>
                </div>
              </div>
            )}

            {/* Middle row: Live Scored Gauges for Lookup */}
            {score && (
              <div className="glass-card">
                <div className="card-header">
                  <div className="card-title">
                    <Layers size={14} /> Enterprise Credit Profile: {score.enterprise_id}
                  </div>
                  <span className={`confidence-chip ${tierBadgeClass(score.confidence_tier)}`}>
                    {score.confidence_tier} confidence
                  </span>
                </div>

                <div className="grid-gauges" style={{ marginBottom: '1.5rem' }}>
                  <Gauge label="GST Compliance" score={score.gst_score} pillar="GST Pillar" />
                  <Gauge label="UPI Cash Flow" score={score.upi_score} pillar="UPI Pillar" />
                  <Gauge label="Bank Balance" score={score.aa_score} pillar="AA Pillar" />
                  <Gauge label="EPFO Stability" score={score.epfo_score} pillar="EPFO Pillar" />
                  <Gauge
                    label="Fused Health Score"
                    score={score.overall_score}
                    tag={`Range: ${score.score_range_low} - ${score.score_range_high}`}
                    pillar="Fused Credit"
                  />
                </div>

                <div className="grid-portfolio">
                  {/* Underwriting verdict panel */}
                  <div className="decision-card">
                    <span className="gauge-label">Underwriting Verdict</span>
                    <div className={`decision-banner ${score.decision === 'Auto-Approve' ? 'approve' : score.decision === 'Flag for Manual Review' ? 'flag' : 'reject'}`}>
                      {score.decision}
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                      <div className="kv-row">
                        <span className="kv-key">Confidence Range Band</span>
                        <span className="kv-val">{score.score_range_low} to {score.score_range_high}</span>
                      </div>
                      <div className="kv-row">
                        <span className="kv-key">Risk Tier Classification</span>
                        <span className="kv-val">{score.risk_tier}</span>
                      </div>
                    </div>

                    {score.triggered_rules.length > 0 && (
                      <div style={{ marginTop: '0.5rem' }}>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                          Triggered Knock-out Rules:
                        </span>
                        <div className="triggered-rules-list">
                          {score.triggered_rules.map(r => (
                            <div className="ko-badge" key={r}>⚠ {r}</div>
                          ))}
                        </div>
                      </div>
                    )}

                    {score.self_supervised_embedding && score.self_supervised_embedding.length > 0 && (
                      <div style={{ marginTop: '1rem', borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>
                          Self-Supervised Embedding (6D Latent Bottleneck)
                        </span>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          {score.self_supervised_embedding.map((val, idx) => (
                            <div key={idx} style={{ flex: 1, textAlign: 'center', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', borderRadius: '6px', padding: '4px 0' }}>
                              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--cyan)' }}>{val.toFixed(2)}</div>
                              <div style={{ fontSize: '0.55rem', color: 'var(--text-muted)' }}>Z_{idx}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* SHAP score drivers */}
                  <div>
                    <span className="gauge-label" style={{ display: 'block', marginBottom: '0.75rem' }}>
                      SHAP Credit Contribution Drivers
                    </span>
                    <div className="shap-container">
                      {score.key_drivers.map((drv, idx) => {
                        const isPos = drv.type === 'Positive Driver';
                        const label = drv.feature.replace(/_/g, ' ').toUpperCase();
                        return (
                          <div key={idx}>
                            <div style={{ display: 'flex', justifyContent: 'between', fontSize: '0.72rem', marginBottom: '4px' }}>
                              <span className="driver-label">{label}</span>
                              <span style={{ color: isPos ? 'var(--green)' : 'var(--red)', fontWeight: 700 }}>
                                {isPos ? '+' : ''}{drv.impact.toFixed(1)}
                              </span>
                            </div>
                            <div className="driver-bar-bg">
                              <div
                                className={`driver-bar-value ${isPos ? 'pos' : 'neg'}`}
                                style={{ width: `${Math.min(Math.abs(drv.impact) * 8, 100)}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Bottom Row: Heatmaps & Simulator */}
            <div className="grid-portfolio">
              {/* Macro stress test simulator */}
              <div className="glass-card stress-panel">
                <div className="card-title">
                  <Sliders size={14} /> IDBI Macro Stress Testing Simulator
                </div>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                  Simulate economic shocks across specific MSME portfolios to evaluate capital risk migration.
                </p>

                <div className="stress-flex">
                  <select className="stress-select" value={stressSector} onChange={e => setStressSector(e.target.value)}>
                    <option value="all">All Sectors</option>
                    <option value="Trading/Retail">Trading / Retail</option>
                    <option value="Manufacturing">Manufacturing</option>
                    <option value="Services">Services</option>
                    <option value="Textile">Textile</option>
                  </select>

                  <select className="stress-select" value={stressType} onChange={e => setStressType(e.target.value)}>
                    <option value="turnover_shock">Revenue Decline (GST/UPI)</option>
                    <option value="liquidity_stress">Liquidity Drain (Trade Payable Delay)</option>
                    <option value="leverage_surge">Leverage Surge (EMI Burden & OD Util)</option>
                  </select>
                </div>

                <div className="slider-container">
                  <div className="slider-label-row">
                    <span>Severity</span>
                    <span>{(stressSeverity * 100).toFixed(0)}%</span>
                  </div>
                  <input
                    type="range"
                    min={0.05}
                    max={0.5}
                    step={0.05}
                    value={stressSeverity}
                    className="stress-slider"
                    onChange={e => setStressSeverity(parseFloat(e.target.value))}
                  />
                </div>

                <button className="btn btn-primary" onClick={runStressTest} disabled={stressLoading}>
                  {stressLoading ? <RefreshCw size={14} style={{ animation: 'spin 1s linear' }} /> : 'Simulate Stress'}
                </button>

                {stressResult && (
                  <div className="stress-comparison">
                    <div className="comparison-metric">
                      <div className="comparison-metric-title">Portfolio Avg Score</div>
                      <div className="comparison-values">
                        <span className="comp-val-old">{stressResult.original_avg}</span>
                        <span className="comp-val-new bad">{stressResult.stressed_avg}</span>
                      </div>
                    </div>
                    <div className="comparison-metric">
                      <div className="comparison-metric-title">Portfolio Reject Rate</div>
                      <div className="comparison-values">
                        <span className="comp-val-old">{stressResult.original_reject_rate}%</span>
                        <span className="comp-val-new bad">{stressResult.stressed_reject_rate}%</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* ULI Consent payload schema */}
              <div className="glass-card" style={{ display: 'flex', flexDirection: 'column' }}>
                <div className="card-title">
                  <Code size={14} /> ULI Consent JSON Data Block (Gateway Response)
                </div>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
                  Mock payload exposed on the Unified Lending Interface (ULI) registry for secure consent-driven scoring.
                </p>
                <pre className="code-block">
                  {uliPayload ? JSON.stringify(uliPayload, null, 2) : '// Loading ULI schema details...'}
                </pre>
              </div>
            </div>

            {/* Heatmap portfolio list */}
            {portfolio && (
              <div className="glass-card">
                <div className="card-title">
                  <BarChart2 size={14} /> Sector Concentration Risk & Heatmap
                </div>
                <div style={{ overflowX: 'auto', marginTop: '1rem' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                    <thead>
                      <tr style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--border)', textAlign: 'left' }}>
                        <th style={{ padding: '0.75rem' }}>Sector Name</th>
                        <th style={{ padding: '0.75rem', textAlign: 'right' }}>Active Exposure</th>
                        <th style={{ padding: '0.75rem', textAlign: 'right' }}>Share %</th>
                        <th style={{ padding: '0.75rem', textAlign: 'right' }}>Avg Score</th>
                        <th style={{ padding: '0.75rem', textAlign: 'right' }}>Default Rate</th>
                      </tr>
                    </thead>
                    <tbody>
                      {portfolio.sectors.map((s, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid var(--border)' }}>
                          <td style={{ padding: '0.75rem', fontWeight: 600 }}>{s.sector}</td>
                          <td style={{ padding: '0.75rem', textAlign: 'right' }}>{s.count.toLocaleString()}</td>
                          <td style={{ padding: '0.75rem', textAlign: 'right' }}>{s.pct}%</td>
                          <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 700 }}>{s.avg_score}</td>
                          <td style={{ padding: '0.75rem', textAlign: 'right', color: s.default_rate > 15 ? 'var(--red)' : 'var(--text-primary)' }}>
                            {s.default_rate}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}

        {/* ─── BORROWER MOBILE VIEW (COACHING APP) ────────────────── */}
        {activeView === 'borrower' && score && (
          <div className="mobile-wrapper">
            <div className="mobile-device">
              <div className="mobile-notch" />
              <div className="mobile-screen">
                <div className="mobile-header">
                  <span className="mobile-title">
                    {lang === 'EN' ? 'IDBI Sahay Portal' : 'आईडीबीआई सहाय'}
                  </span>
                  <button
                    className="view-btn"
                    style={{ fontSize: '0.65rem', padding: '3px 8px', borderRadius: 8 }}
                    onClick={() => setLang(l => l === 'EN' ? 'HI' : 'EN')}
                  >
                    <Globe size={10} /> {lang}
                  </button>
                </div>

                {/* Score Ring wrapper */}
                <div className="borrower-score-circle">
                  <div className="circle-wrapper">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadialBarChart
                        innerRadius={55}
                        outerRadius={65}
                        startAngle={220}
                        endAngle={-40}
                        data={[{ value: score.overall_score ?? 0, fill: scoreColor(score.overall_score) }]}
                      >
                        <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
                        <RadialBar dataKey="value" angleAxisId={0} cornerRadius={10} />
                      </RadialBarChart>
                    </ResponsiveContainer>
                    <div className="circle-text">
                      <div className="circle-num" style={{ color: scoreColor(score.overall_score) }}>
                        {score.overall_score?.toFixed(0)}
                      </div>
                      <div className="circle-range">
                        {lang === 'EN' ? 'OF 100' : '100 में से'}
                      </div>
                    </div>
                  </div>
                  <div style={{ marginTop: '0.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                    <span className={`confidence-chip ${tierBadgeClass(score.confidence_tier)}`}>
                      {score.confidence_tier} Tier
                    </span>
                    <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>
                      {lang === 'EN' ? `Confidence Margin: ±${score.confidence_tier === 'Gold' ? '3' : '10'} Points` : 'सटीकता रेंज'}
                    </span>
                  </div>
                </div>

                {/* Early Warning system trend banner */}
                {trend && trend.trend_flag === 'Deteriorating' && (
                  <div className="ews-banner">
                    <AlertTriangle size={16} color="var(--red)" style={{ flexShrink: 0 }} />
                    <div className="ews-banner-text">
                      {lang === 'EN'
                        ? 'Continuous EWS Alert: Your cash flow metrics are trending downward. Take corrective actions listed below to retain your Strong risk rating.'
                        : 'ईडब्ल्यूएस अलर्ट: आपकी वित्तीय स्थिति में गिरावट देखी गई है। सुधार के लिए नीचे दिए गए कार्यों को करें।'}
                    </div>
                  </div>
                )}

                {/* Recommendations Coach section */}
                <div style={{ marginTop: '0.5rem' }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <ShieldCheck size={14} color="var(--green)" />
                    {lang === 'EN' ? 'Actionable Credit Coach' : 'क्रेडिट सुधार सुझाव'}
                  </div>
                  <div className="coach-list">
                    {score.recommendations.map((rec, idx) => (
                      <div className="coach-card" key={idx}>
                        <CheckCircle2 size={16} color="var(--blue)" style={{ flexShrink: 0, marginTop: 2 }} />
                        <div className="coach-body">
                          <div className="coach-title">{rec.title}</div>
                          <div className="coach-desc">{rec.recommendation}</div>
                        </div>
                        {rec.estimated_lift > 0 && (
                          <div className="coach-lift">+{rec.estimated_lift}</div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Small summary */}
                <div className="glass-card" style={{ padding: '0.85rem' }}>
                  <div className="kv-row" style={{ fontSize: '0.72rem' }}>
                    <span className="kv-key">{lang === 'EN' ? 'Registered segment' : 'पंजीकृत श्रेणी'}</span>
                    <span className="kv-val">{score.risk_tier}</span>
                  </div>
                  <div className="kv-row" style={{ fontSize: '0.72rem' }}>
                    <span className="kv-key">{lang === 'EN' ? 'Consented pillars' : 'सम्बद्ध डेटा'}</span>
                    <span className="kv-val">{score.data_confidence}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ─── CMD SEARCH OVERLAY ─────────────────────────────────── */}
      {showSearchModal && (
        <div className="search-overlay" onClick={() => setShowSearchModal(false)}>
          <div className="search-modal" onClick={e => e.stopPropagation()}>
            <div className="search-modal-header">
              <Search size={18} color="var(--text-muted)" />
              <input
                className="search-modal-input"
                placeholder="Type MSME ID or Sector to jump..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                autoFocus
              />
            </div>
            <div className="search-results">
              {filteredResults.map(item => (
                <div
                  className="search-result-item"
                  key={item.id}
                  onClick={() => selectEnterprise(item.id)}
                >
                  <div>
                    <span className="search-result-id">{item.id}</span>
                    <div className="search-result-meta">{item.sector} | Segment: {item.segment}</div>
                  </div>
                  <ArrowRight size={14} color="var(--text-muted)" />
                </div>
              ))}
              {filteredResults.length === 0 && (
                <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '1.5rem', fontSize: '0.85rem' }}>
                  No matching MSMEs found. Try 'MSME100001' or 'Services'.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
