import { useState, useEffect, useCallback } from 'react';
import {
  Activity, Search, Sliders, ShieldCheck,
  AlertTriangle, BarChart2, RefreshCw, Layers, Database,
  ArrowRight, CheckCircle2, User, Globe, Code
} from 'lucide-react';
import {
  RadialBarChart, RadialBar, PolarAngleAxis, ResponsiveContainer,
} from 'recharts';
import { API_BASE } from './api';
import type {
  ScoreResponse, TrendResponse, PortfolioSummary,
  StressSimulationResponse, CompletenessGapResponse,
  InclusionImpactResponse
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
    <div className="gauge-card">
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
              background={{ fill: 'var(--surface-hi)' }}
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

const KPISparkline = () => (
  <svg className="kpi-sparkline" width="100%" height="16" viewBox="0 0 100 16" style={{ marginTop: '6px', opacity: 0.6 }}>
    <path
      d="M 0 8 H 20 L 23 2 L 26 14 L 29 8 H 50 L 53 2 L 56 14 L 59 8 H 80 L 83 2 L 86 14 L 89 8 H 100"
      fill="none"
      stroke="var(--accent)"
      strokeWidth="1.2"
    />
  </svg>
);

function renderJson(obj: any) {
  if (!obj) return '// Loading ULI schema details...';
  const str = JSON.stringify(obj, null, 2);
  return str.split('\n').map((line, idx) => {
    const keyMatch = line.match(/^(\s*)"([^"]+)":/);
    if (keyMatch) {
      const indent = keyMatch[1];
      const key = keyMatch[2];
      const rest = line.substring(keyMatch[0].length);
      
      let restSpan = <span>{rest}</span>;
      if (rest.includes('"')) {
        restSpan = <span className="json-value-string">{rest}</span>;
      } else if (rest.match(/\d/)) {
        restSpan = <span className="json-value-number">{rest}</span>;
      }
      
      return (
        <div key={idx}>
          {indent}<span className="json-key">"{key}"</span>:{restSpan}
        </div>
      );
    }
    return <div key={idx}>{line}</div>;
  });
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

const getTranslatedMessage = (gap: any, lang: 'EN' | 'HI', score: any) => {
  if (lang === 'EN') return gap.message;
  
  const sourceNames: Record<string, string> = {
    'GST': 'जीएसटी (GST)',
    'UPI': 'यूपीआई (UPI)',
    'AA': 'अकाउंट एग्रीगेटर (AA)',
    'EPFO': 'कर्मचारी भविष्य निधि (EPFO)'
  };
  
  const source = sourceNames[gap.missing_source] || gap.missing_source;
  
  const tierNames: Record<string, string> = {
    'Gold': 'गोल्ड (Gold)',
    'Silver': 'सिल्वर (Silver)',
    'Bronze': 'ब्रॉन्ज (Bronze)',
    'Minimal': 'मिनिमल (Minimal)',
    'Unscoreable': 'अनुपयोगी (Unscoreable)'
  };
  
  const current_tier = tierNames[score.confidence_tier] || score.confidence_tier;
  const projected_tier = tierNames[gap.projected_tier] || gap.projected_tier;
  
  const current_ci_val = score.confidence_tier === 'Gold' ? 3 : score.confidence_tier === 'Silver' ? 6 : score.confidence_tier === 'Bronze' ? 10 : 15;
  
  return `${source} को जोड़ने से आप ${current_tier} से ${projected_tier} श्रेणी में जा सकते हैं और आपका स्कोर लगभग +${gap.estimated_point_gain.toFixed(1)} अंक बढ़ सकता है, जिससे आपकी सटीकता रेंज ±${current_ci_val} से घटकर ±${gap.projected_confidence_interval} हो सकती है।`;
};

const getTranslatedRecommendation = (rec: any, lang: 'EN' | 'HI') => {
  if (lang === 'EN') {
    return { title: rec.title, recommendation: rec.recommendation };
  }

  const titleMap: Record<string, string> = {
    "Ensure timely GST filing": "जीएसटी समय पर फाइल करें",
    "Maintain consistent GST returns": "जीएसटी रिटर्न में निरंतरता रखें",
    "Minimize payment bounces": "लेनदेन बाउंस कम करें",
    "Stabilize monthly inflows": "मासिक नकद प्रवाह स्थिर करें",
    "Reduce overdraft utilization": "ओवरड्राफ्ट उपयोगिता कम करें",
    "Rationalize debt commitments": "ऋण प्रतिबद्धताओं को तर्कसंगत बनाएं",
    "Improve cash surplus ratio": "नकद अधिशेष अनुपात में सुधार करें",
    "Clear EPFO dues strictly": "ईपीएफओ बकाया का कड़ाई से भुगतान करें",
    "Excel in alternate credit": "वैकल्पिक क्रेडिट में उत्कृष्ट प्रदर्शन"
  };

  let recommendation = rec.recommendation;

  if (rec.title === "Ensure timely GST filing") {
    const filingsMatch = rec.recommendation.match(/had (\d+)/);
    const filings = filingsMatch ? filingsMatch[1] : "0";
    recommendation = `समय पर जीएसटी फाइल करें। पिछले 12 महीनों में आपके ${filings} विलंबित फाइलिंग थे। +${rec.estimated_lift} अंक प्राप्त करने के लिए लगातार 3 महीनों तक GSTR-3B समय पर फाइल करें।`;
  } else if (rec.title === "Maintain consistent GST returns") {
    const consistencyMatch = rec.recommendation.match(/consistency is currently at ([\d.]+)%/);
    const consistency = consistencyMatch ? consistencyMatch[1] : "90";
    recommendation = `आपकी जीएसटी फाइलिंग निरंतरता वर्तमान में ${consistency}% है। +${rec.estimated_lift} अंक प्राप्त करने के लिए प्रत्येक रिपोर्टिंग अवधि में फाइल करने का लक्ष्य रखें।`;
  } else if (rec.title === "Minimize payment bounces") {
    const bounceMatch = rec.recommendation.match(/bounce rate is ([\d.]+)%/);
    const bounce = bounceMatch ? bounceMatch[1] : "0";
    recommendation = `आपका लेनदेन बाउंस दर ${bounce}% है। असफल ऑटो-डेबिट और ग्राहक बाउंस को रोकने के लिए पर्याप्त शेष राशि रखें ताकि +${rec.estimated_lift} अंक प्राप्त हो सकें।`;
  } else if (rec.title === "Stabilize monthly inflows") {
    recommendation = `नकद प्रवाह की अस्थिरता को कम करने के लिए ग्राहकों को थोक भुगतानों को साप्ताहिक या मासिक प्राप्तियों में विभाजित करने के लिए प्रोत्साहित करें ताकि +${rec.estimated_lift} अंक प्राप्त हो सकें।`;
  } else if (rec.title === "Reduce overdraft utilization") {
    const odMatch = rec.recommendation.match(/utilization is high \(([\d.]+)%\)/);
    const od = odMatch ? odMatch[1] : "50";
    recommendation = `आपकी ओडी उपयोगिता अधिक (${od}%) है। उधारदाताओं को यह दिखाने के लिए कि आपके पास आरामदायक तरलता स्थान है, इसे 50% से नीचे रखने का प्रयास करें ताकि +${rec.estimated_lift} अंक प्राप्त हो सकें।`;
  } else if (rec.title === "Rationalize debt commitments") {
    const emiMatch = rec.recommendation.match(/represent (\d+)%/);
    const emi = emiMatch ? emiMatch[1] : "30";
    recommendation = `मासिक ईएमआई बैंक प्रवाह का ${emi}% दर्शाती है। वर्तमान ऋण मूलधन आंशिक रूप से कम होने तक नया ऋण लेने से बचें ताकि +${rec.estimated_lift} अंक प्राप्त हो सकें।`;
  } else if (rec.title === "Improve cash surplus ratio") {
    const cfMatch = rec.recommendation.match(/coverage ratio \(([\d.]+)\)/);
    const cf = cfMatch ? cfMatch[1] : "1.0";
    recommendation = `नकद प्रवाह कवरेज अनुपात (${cf}) तंग है। तरल भंडार बढ़ाने के लिए आपूर्तिकर्ताओं के साथ संग्रह शर्तों को अनुकूलित करें ताकि +${rec.estimated_lift} अंक प्राप्त हो सकें।`;
  } else if (rec.title === "Clear EPFO dues strictly") {
    const epfoMatch = rec.recommendation.match(/consistency is ([\d.]+)%/);
    const epfo = epfoMatch ? epfoMatch[1] : "100";
    recommendation = `ईपीएफओ जमा निरंतरता ${epfo}% है। परिचालन स्थिरता साबित करने के लिए कर्मचारियों को समय पर सामाजिक सुरक्षा भुगतान करना महत्वपूर्ण है ताकि +${rec.estimated_lift} अंक प्राप्त हो सकें।`;
  } else if (rec.title === "Excel in alternate credit") {
    recommendation = `बहुत बढ़िया! सभी मेट्रिक्स स्वस्थ स्तर दिखा रहे हैं। कम ऋण दरें सुरक्षित करने के लिए जीएसटी फाइल करना, यूपीआई के माध्यम से प्राप्तियों को रूट करना और तरलता बनाए रखना जारी रखें।`;
  }

  return {
    title: titleMap[rec.title] || rec.title,
    recommendation: recommendation
  };
};

export default function App() {
  // Views: 'lender' | 'borrower'
  const [activeView, setActiveView] = useState<'lender' | 'borrower'>('lender');
  const [, setEnterpriseId] = useState('MSME100001');

  // Enterprise details
  const [score, setScore] = useState<ScoreResponse | null>(null);
  const [trend, setTrend] = useState<TrendResponse | null>(null);
  const [uliPayload, setUliPayload] = useState<Record<string, unknown> | null>(null);
  const [completenessGap, setCompletenessGap] = useState<CompletenessGapResponse | null>(null);
  const [inclusionImpact, setInclusionImpact] = useState<InclusionImpactResponse | null>(null);
  const [expandedGap, setExpandedGap] = useState<string | null>(null);

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
    setCompletenessGap(null);
    setExpandedGap(null);

    try {
      const [scoreRes, trendRes, uliRes, gapRes] = await Promise.all([
        fetch(`${API_BASE}/score/${encodeURIComponent(id)}`),
        fetch(`${API_BASE}/trend/${encodeURIComponent(id)}`),
        fetch(`${API_BASE}/uli/payload/${encodeURIComponent(id)}`),
        fetch(`${API_BASE}/borrower/completeness-gap/${encodeURIComponent(id)}`)
      ]);

      if (!scoreRes.ok) {
        const err = await scoreRes.json().catch(() => ({}));
        throw new Error((err as { detail?: string }).detail ?? `HTTP ${scoreRes.status}`);
      }

      const scoreData = await scoreRes.json();
      setScore(scoreData);

      if (trendRes.ok) setTrend(await trendRes.json());
      if (uliRes.ok) setUliPayload(await uliRes.json());
      if (gapRes.ok) setCompletenessGap(await gapRes.json());
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  // ─── Fetch Portfolio Aggregate Summary ────────────────────────
  const fetchPortfolioSummary = useCallback(async () => {
    try {
      const [res, inclRes] = await Promise.all([
        fetch(`${API_BASE}/portfolio/summary`),
        fetch(`${API_BASE}/portfolio/inclusion-impact`)
      ]);
      if (res.ok) {
        setPortfolio(await res.json());
      }
      if (inclRes.ok) {
        setInclusionImpact(await inclRes.json());
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
              <div className="grid-stats" style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}>
                <div className="glass-card">
                  <span className="stat-sub">Total Managed Exposure</span>
                  <div className="stat-value text-cyan">{portfolio.total_exposure.toLocaleString()}</div>
                  <span className="stat-sub">Active MSME Portfolios</span>
                  <KPISparkline />
                </div>
                <div className="glass-card">
                  <span className="stat-sub">Portfolio Avg Health Score</span>
                  <div className="stat-value text-blue">{portfolio.average_score.toFixed(1)}</div>
                  <span className="stat-sub">Out of 100</span>
                  <KPISparkline />
                </div>
                <div className="glass-card">
                  <span className="stat-sub">Defaults Flagged</span>
                  <div className="stat-value text-red">{portfolio.default_count}</div>
                  <span className="stat-sub">Default Rate: {portfolio.default_rate.toFixed(2)}%</span>
                  <KPISparkline />
                </div>
                <div className="glass-card">
                  <span className="stat-sub">Alternative Coverage</span>
                  <div className="stat-value text-green">{portfolio.coverage.gst}%</div>
                  <span className="stat-sub">GST Registration Rate</span>
                  <KPISparkline />
                </div>
                {inclusionImpact && (
                  <div className="glass-card" style={{ gridColumn: 'span 1' }}>
                    <span className="stat-sub">Alt-Data Onboarding</span>
                    <div className="stat-value text-purple" style={{ fontSize: '1.4rem', display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                      {inclusionImpact.alt_data_only.toLocaleString()}
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>({inclusionImpact.alt_data_only_pct}%)</span>
                    </div>
                    <span className="stat-sub" style={{ display: 'block', fontSize: '0.65rem', marginBottom: '6px' }}>
                      MSMEs Onboarded via Alt-Data (Credit-Invisible Otherwise)
                    </span>
                    <span className="stat-sub" style={{ fontSize: '0.62rem', color: 'var(--green)' }}>
                      Of these, <strong>{inclusionImpact.alt_data_only_healthy_tier_count.toLocaleString()}</strong> are in healthy tiers
                    </span>
                    <KPISparkline />
                    {inclusionImpact.alt_data_only_by_sector && (
                      <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '4px', borderTop: '1px solid var(--border)', paddingTop: '6px' }}>
                        {Object.entries(inclusionImpact.alt_data_only_by_sector).slice(0, 3).map(([sec, count]) => {
                          const pct = inclusionImpact.alt_data_only > 0 ? ((count as number) / inclusionImpact.alt_data_only * 100) : 0;
                          return (
                            <div key={sec} style={{ fontSize: '0.58rem' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)', marginBottom: '1px' }}>
                                <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '60px' }}>{sec}</span>
                                <span>{count} ({pct.toFixed(0)}%)</span>
                              </div>
                              <div className="driver-bar-bg" style={{ height: '3px' }}>
                                <div className="driver-bar-value pos" style={{ width: `${pct}%`, height: '3px', background: 'var(--accent)' }} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
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

                <div className="grid-gauges" style={{ marginBottom: '1.5rem', position: 'relative' }}>
                  {/* The Fusion Pulse-Line ECG Connector */}
                  <svg className="ecg-connector-svg" viewBox="0 0 100 20">
                    <path
                      d="M 10 10 H 90"
                      fill="none"
                      stroke="var(--border)"
                      strokeWidth="0.5"
                    />
                    <path
                      className="pulse-path"
                      d="M 10 10 H 22 L 24 4 L 26 16 L 28 10 H 42 L 44 4 L 46 16 L 48 10 H 62 L 64 4 L 66 16 L 68 10 H 82 L 84 4 L 86 16 L 88 10"
                      fill="none"
                      stroke="var(--accent)"
                      strokeWidth="1.2"
                    />
                  </svg>
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
                  {renderJson(uliPayload)}
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
                        <RadialBar
                          background={{ fill: 'var(--surface-hi)' }}
                          dataKey="value"
                          angleAxisId={0}
                          cornerRadius={10}
                        />
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

                {/* Improve Your Score checklist */}
                {completenessGap && (
                  <div style={{ marginTop: '1rem', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '0.85rem' }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Activity size={14} color="var(--accent)" />
                      {lang === 'EN' ? 'Improve Your Score' : 'अपना स्कोर सुधारें'}
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {completenessGap.gaps.map((gap) => {
                        const isExpanded = expandedGap === gap.missing_source;
                        return (
                          <div 
                            key={gap.missing_source} 
                            style={{ border: '1px solid var(--border)', borderRadius: '8px', padding: '8px', cursor: 'pointer', background: 'var(--bg)' }}
                            onClick={() => setExpandedGap(isExpanded ? null : gap.missing_source)}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span style={{ width: '12px', height: '12px', border: '1.5px solid var(--text-secondary)', borderRadius: '50%', display: 'inline-block', flexShrink: 0 }} />
                                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                                  {gap.missing_source === 'AA' ? 'Account Aggregator' : gap.missing_source}
                                </span>
                              </div>
                              <div className="coach-lift">
                                {gap.estimated_point_gain >= 0 ? '+' : ''}{gap.estimated_point_gain.toFixed(1)} pts
                              </div>
                            </div>
                            
                            <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', marginTop: '4px', paddingLeft: '18px' }}>
                              {getTranslatedMessage(gap, lang, score)}
                            </div>

                            {isExpanded && (
                              <div style={{ marginTop: '8px', padding: '8px', background: 'var(--surface-hi)', borderRadius: '6px', fontSize: '0.62rem', borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '6px', marginLeft: '18px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <span>{lang === 'EN' ? 'Confidence Migration' : 'सटीकता श्रेणी बदलाव'}:</span>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <span className={`confidence-chip ${tierBadgeClass(score.confidence_tier)}`} style={{ padding: '1px 4px', fontSize: '0.55rem' }}>
                                      {score.confidence_tier}
                                    </span>
                                    <span>→</span>
                                    <span className={`confidence-chip ${tierBadgeClass(gap.projected_tier)}`} style={{ padding: '1px 4px', fontSize: '0.55rem' }}>
                                      {gap.projected_tier}
                                    </span>
                                  </div>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                  <span>{lang === 'EN' ? 'Confidence Margin' : 'सटीकता रेंज'}:</span>
                                  <span>±{score.confidence_tier === 'Gold' ? 3 : score.confidence_tier === 'Silver' ? 6 : score.confidence_tier === 'Bronze' ? 10 : 15} → ±{gap.projected_confidence_interval} Points</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                  <span>{lang === 'EN' ? 'Projected Score' : 'अनुमानित स्कोर'}:</span>
                                  <span style={{ fontWeight: 700, color: 'var(--green)' }}>{score.overall_score?.toFixed(1)} → {gap.projected_score.toFixed(1)}</span>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}

                      {['GST', 'UPI', 'AA', 'EPFO']
                        .filter(src => !completenessGap.gaps.some(g => g.missing_source === src))
                        .map(src => (
                          <div key={src} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: '1px solid var(--border)', borderRadius: '8px', padding: '8px', background: 'rgba(15, 122, 92, 0.04)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <CheckCircle2 size={12} color="var(--green)" style={{ flexShrink: 0 }} />
                              <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                                {src === 'AA' ? 'Account Aggregator' : src}
                              </span>
                            </div>
                            <span style={{ fontSize: '0.6rem', color: 'var(--green)', fontWeight: 700 }}>
                              {lang === 'EN' ? 'Connected' : 'सम्बद्ध'}
                            </span>
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                {/* Recommendations Coach section */}
                <div style={{ marginTop: '1.5rem' }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <ShieldCheck size={14} color="var(--green)" />
                    {lang === 'EN' ? 'Actionable Credit Coach' : 'क्रेडिट सुधार सुझाव'}
                  </div>
                  <div className="coach-list">
                    {score.recommendations.map((rec, idx) => {
                      const translated = getTranslatedRecommendation(rec, lang);
                      return (
                        <div className="coach-card" key={idx}>
                          <CheckCircle2 size={16} color="var(--accent)" style={{ flexShrink: 0, marginTop: 2 }} />
                          <div className="coach-body">
                            <div className="coach-title">{translated.title}</div>
                            <div className="coach-desc">{translated.recommendation}</div>
                          </div>
                          {rec.estimated_lift > 0 && (
                            <div className="coach-lift">+{rec.estimated_lift}</div>
                          )}
                        </div>
                      );
                    })}
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
