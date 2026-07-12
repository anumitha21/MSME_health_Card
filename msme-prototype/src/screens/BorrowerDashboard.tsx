import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, Link } from 'react-router-dom';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { SubScoreRadar } from '../components/Charts';
import { SOURCE_META } from '../data/mock';
import { useCreditData } from '../context/CreditDataContext';

function AnimatedScore({ score }: { score: number }) {
  const [displayed, setDisplayed] = useState(0);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      setDisplayed(score);
      return;
    }
    const start = Date.now();
    const duration = 1200;
    const tick = () => {
      const elapsed = Date.now() - start;
      const prog = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - prog, 3); // cubic easeOut
      setDisplayed(Math.round(eased * score));
      if (prog < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [score]);

  return (
    <div className="relative flex flex-col items-center">
      <div className="relative w-48 h-48">
        <svg viewBox="0 0 200 200" className="w-full h-full -rotate-90">
          <circle cx="100" cy="100" r="82" fill="none" stroke="#E9E6DF" strokeWidth="6" />
          <motion.circle
            cx="100" cy="100" r="82" fill="none" stroke="#C9A24B" strokeWidth="8"
            strokeDasharray={`${2 * Math.PI * 82}`}
            initial={{ strokeDashoffset: 2 * Math.PI * 82 }}
            animate={{ strokeDashoffset: 2 * Math.PI * 82 * (1 - displayed / 100) }}
            transition={{ duration: 1.2, ease: 'easeOut' }}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-6xl font-bold font-serif-editorial text-[#0B1220] leading-none">
            {displayed}
          </span>
          <span className="text-[#64748B] text-xs font-data-mono mt-1">/ 100</span>
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
      <div className="min-h-screen pt-20 flex items-center justify-center bg-[#FAF8F3]">
        <p className="text-sm font-data-mono text-[#64748B] animate-pulse">
          SECURE CONNECTION ACTIVE · RETRIEVING BORROWER HEALTH DATA...
        </p>
      </div>
    );
  }

  const radarScores = {
    gst: score.gst_score ?? 0,
    upi: score.upi_score ?? 0,
    aa: score.aa_score ?? 0,
    epfo: score.epfo_score ?? 0
  };

  // Map positive drivers from SHAP contributions
  const strengths = (score.key_drivers ?? [])
    .filter(d => d && d.type === 'Positive Driver' && (d.impact ?? 0) > 0)
    .slice(0, 3)
    .map(d => {
      const featName = d.feature ? String(d.feature) : 'metric';
      const imp = d.impact ?? 0;
      return {
        label: featName.replace(/_/g, ' '),
        detail: `Contributes positive value of +${imp.toFixed(1)} to score`,
        source: featName.startsWith('gst') ? 'gst' : featName.startsWith('upi') ? 'upi' : featName.startsWith('aa') ? 'aa' : 'epfo',
        lift: `+${Math.round(imp)}`
      };
    });

  // Map negative drivers from SHAP contributions
  const risks = (score.key_drivers ?? [])
    .filter(d => d && (d.type === 'Negative Driver' || (d.impact ?? 0) < 0))
    .slice(0, 3)
    .map(d => {
      const featName = d.feature ? String(d.feature) : 'metric';
      const imp = d.impact ?? 0;
      return {
        label: featName.replace(/_/g, ' '),
        detail: `Reduces score calculation by ${Math.abs(imp).toFixed(1)} points`,
        source: featName.startsWith('gst') ? 'gst' : featName.startsWith('upi') ? 'upi' : featName.startsWith('aa') ? 'aa' : 'epfo',
        drag: `${Math.round(imp)}`
      };
    });

  return (
    <div className="min-h-screen pt-20 pb-16 bg-[#FAF8F3] text-[#1E293B] px-6 select-text animate-fade-in">
      <div className="max-w-5xl mx-auto">
        
        {/* Document Header */}
        <div className="border border-[#E2DBD0] bg-white p-6 mb-8 text-[#0C182A]">
          <span className="text-xxs font-data-mono font-bold tracking-widest text-[#8B704F] block">
            OFFICIAL RECORD · BORROWER PORTAL
          </span>
          <h1 className="font-serif-editorial text-3xl font-bold tracking-tight mt-1">
            MSME Business Health Profile
          </h1>
          <p className="text-xs text-[#556B82] mt-1 font-data-mono leading-relaxed">
            FILE REF: SAHAY-CR-${(record?.enterprise_id ?? 'Unknown').substring(Math.min(4, (record?.enterprise_id ?? 'Unknown').length))} · Segment: {record.segment || 'Unknown'} · Sector: {record.sector || 'Unknown'}
          </p>
          <div className="mt-4 pt-4 border-t border-[#E2DBD0] text-xs text-[#556B82] leading-relaxed max-w-3xl">
            This dashboard presents the alt-data credit score calculated across 4 digital transaction pillars.
            This representation mirrors the data matrix evaluated by institutional underwriters.
          </div>
        </div>

        {/* Sub-Navigation Action Bar */}
        <div className="flex flex-wrap gap-3 mb-8 border-b border-[#E9E6DF] pb-4 font-data-mono text-xs animate-fade-in">
          <Link 
            to="/consent" 
            className="px-3 py-1.5 border bg-white border-[#E9E6DF] text-[#64748B] hover:text-[#0E6E4E] hover:bg-[#ECFDF5] transition-all cursor-pointer"
            style={{ borderRadius: '8px' }}
          >
            🔌 Manage Data Connect
          </Link>
          <Link 
            to="/drilldown" 
            className="px-3 py-1.5 border bg-white border-[#E9E6DF] text-[#64748B] hover:text-[#0E6E4E] hover:bg-[#ECFDF5] transition-all cursor-pointer"
            style={{ borderRadius: '8px' }}
          >
            📊 Alt-Data Drill-Down
          </Link>
          <Link 
            to="/simulator" 
            className="px-3 py-1.5 border bg-white border-[#E9E6DF] text-[#64748B] hover:text-[#0E6E4E] hover:bg-[#ECFDF5] transition-all cursor-pointer"
            style={{ borderRadius: '8px' }}
          >
            ⚙️ What-If Weight Simulator
          </Link>
          <Link 
            to="/live" 
            className="px-3 py-1.5 border bg-white border-[#E9E6DF] text-[#64748B] hover:text-[#0E6E4E] hover:bg-[#ECFDF5] transition-all cursor-pointer"
            style={{ borderRadius: '8px' }}
          >
            ⚡ Live ML API Connection
          </Link>
        </div>

        {/* Top Split: Score Hero + Radar Footprint */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          
          {/* Fused Score Hub */}
          <div className="border border-[#E2DBD0] bg-white p-8 flex flex-col items-center justify-between text-center gap-6">
            <div>
              <span className="text-xxs font-data-mono font-bold tracking-widest text-[#556B82] block uppercase mb-4">
                FUSED FUSION SCORE
              </span>
              <AnimatedScore score={score.overall_score ?? 0} />
            </div>

            <div className="space-y-3 w-full">
              <span className={`inline-flex items-center gap-1 rounded-none px-3 py-1 font-bold text-xs font-data-mono border ${
                (score?.overall_score ?? 0) >= 75 ? 'text-[#234E45] bg-[#E6ECE9] border-[#C4D3CD]' : 'text-[#7B5500] bg-[#FAF3E0] border-[#ECDDB0]'
              }`}>
                Tier {score.risk_tier} · {(score?.overall_score ?? 0) >= 75 ? 'STRONG' : 'MODERATE RISK'}
              </span>
              
              <div className="flex flex-col items-center gap-1.5 font-data-mono text-xs">
                <span className="text-[#556B82]">Confidence calibration:</span>
                <span className="font-bold text-[#0C182A]">{score.data_confidence.toUpperCase()} ASSURED</span>
              </div>
            </div>

            <div className="w-full pt-4 border-t border-[#E2DBD0] font-data-mono text-[11px] text-[#556B82]">
              Score Range baseline: <span className="font-bold text-[#0C182A]">{score.score_range_low} – {score.score_range_high}</span>
            </div>
          </div>

          {/* Radar Chart Footprint */}
          <div className="border border-[#E2DBD0] bg-white p-6 flex flex-col justify-between">
            <div>
              <h3 className="text-xs font-data-mono font-bold tracking-widest text-[#556B82] uppercase mb-1">
                RADAR CO-EFFICIENT FOOTPRINT
              </h3>
              <p className="text-[11px] text-[#556B82]">Visualizing borrower metrics across each independent scoring parameter</p>
            </div>
            <div className="py-2">
              <SubScoreRadar scores={radarScores} size={220} />
            </div>
            <p className="text-[10px] text-center font-data-mono text-[#556B82]">
              * Perimeter represents standard baseline calibration.
            </p>
          </div>

        </div>

        {/* 4 Pillars Ledger Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {(Object.entries(SOURCE_META) as [string, any][]).map(([key, meta]) => {
            const subScore = score[`${key}_score` as keyof typeof score] as number | null;
            const scoreColor = subScore ? (subScore >= 75 ? '#234E45' : subScore >= 60 ? '#7B5500' : '#8A332E') : '#556B82';
            
            return (
              <div 
                key={key} 
                className="border border-[#E2DBD0] bg-white p-4 cursor-pointer hover:bg-[#FAF6F0] transition-colors"
                onClick={() => nav(`/drilldown?tab=${key}`)}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-base">{meta.icon}</span>
                  <span className="text-xxs font-data-mono font-bold text-[#556B82] uppercase tracking-wide">Wt: {meta.weight}</span>
                </div>
                
                <div className="text-3xl font-bold font-serif-editorial mb-1" style={{ color: scoreColor }}>
                  {subScore ?? '—'}
                </div>
                
                <div className="text-xs font-bold text-[#0C182A] mb-3">{meta.label}</div>
                
                {/* Rule-style flat progress tracker */}
                <div className="progress-track">
                  <div className="progress-fill" style={{ width: `${subScore ?? 0}%`, background: scoreColor }} />
                </div>
                
                <p className="text-[10px] font-data-mono text-[#556B82] mt-3">Drill-Down Record →</p>
              </div>
            );
          })}
        </div>

        {/* Forensic Drivers: Strengths vs Risks */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          
          {/* Strengths */}
          <div className="border border-[#E2DBD0] bg-white p-6">
            <h3 className="text-xs font-data-mono font-bold tracking-widest text-[#234E45] uppercase mb-4 flex items-center gap-2">
              ■ CREDIT COMPLIANCE STRENGTHS
            </h3>
            <div className="space-y-4">
              {strengths.length === 0 ? (
                <p className="text-xs text-[#556B82] italic">No significant positive drivers calculated.</p>
              ) : (
                strengths.map((s, i) => (
                  <div key={i} className="border-l-2 border-[#234E45] pl-4 py-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-[#0C182A] capitalize font-sans-ui">{s.label}</span>
                      <span className="font-data-mono text-[10px] text-[#234E45] bg-[#E6ECE9] border border-[#C4D3CD] px-1.5 py-0.2">
                        {s.lift} IMPACT
                      </span>
                    </div>
                    <p className="text-xs text-[#556B82] mt-1 leading-relaxed">{s.detail}</p>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Risks */}
          <div className="border border-[#E2DBD0] bg-white p-6">
            <h3 className="text-xs font-data-mono font-bold tracking-widest text-[#8A332E] uppercase mb-4 flex items-center gap-2">
              ■ OUTSTANDING RISK ANNOTATIONS
            </h3>
            <div className="space-y-4">
              {risks.length === 0 ? (
                <p className="text-xs text-[#556B82] italic">No risk adjustments calculated.</p>
              ) : (
                risks.map((r, i) => (
                  <div key={i} className="border-l-2 border-[#8A332E] pl-4 py-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-[#0C182A] capitalize font-sans-ui">{r.label}</span>
                      <span className="font-data-mono text-[10px] text-[#8A332E] bg-[#F5ECEB] border border-[#ECCDCB] px-1.5 py-0.2">
                        {r.drag} IMPACT
                      </span>
                    </div>
                    <p className="text-xs text-[#556B82] mt-1 leading-relaxed">{r.detail}</p>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

        {/* Actionable Calibrations */}
        <div className="border border-[#E2DBD0] bg-white mb-8">
          <button
            className="w-full p-6 flex items-center justify-between text-left focus:outline-none focus:bg-[#FAF6F0]"
            onClick={() => setShowImprovements(v => !v)}
          >
            <div>
              <h3 className="text-xs font-data-mono font-bold tracking-widest text-[#0C182A] uppercase">
                RECOMMENDED ACTION PLAN FOR SCORE OPTIMIZATION
              </h3>
              <p className="text-[11px] text-[#556B82] mt-0.5">Underwriter-calibrated recommendations with estimated impact score lifts</p>
            </div>
            {showImprovements ? <ChevronUp size={16} className="text-[#556B82]" /> : <ChevronDown size={16} className="text-[#556B82]" />}
          </button>
          
          {showImprovements && (
            <div className="px-6 pb-6 pt-2 border-t border-[#FAF6F0]">
              <div className="space-y-4">
                {(score.recommendations ?? []).length === 0 ? (
                  <p className="text-xs text-[#556B82] italic">No active optimization steps calibrated.</p>
                ) : (
                  (score.recommendations ?? []).map((item, i) => (
                    <div key={i} className="flex items-start gap-4 p-4 border border-[#E2DBD0] bg-[#FAF6F0]">
                      <div className="text-2xl font-bold font-serif-editorial text-[#234E45] w-12 text-center flex-shrink-0 pt-0.5">
                        +{item.estimated_lift}
                      </div>
                      <div className="flex-1">
                        <p className="text-xs font-bold text-[#0C182A]">{item.title}</p>
                        <p className="text-xs text-[#556B82] mt-1 leading-relaxed">{item.recommendation}</p>
                        <div className="mt-2.5">
                          <span className="font-data-mono text-[9px] text-[#8B704F] border border-[#E2DBD0] px-1.5 py-0.5 uppercase">
                            TARGET PILLAR: {item.pillar.toUpperCase()}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* CTA Buttons */}
        <div className="flex gap-4 flex-wrap border-t border-[#E2DBD0] pt-6">
          <button
            onClick={() => nav('/drilldown')}
            className="px-4 py-2 border border-[#0C182A] text-[#0C182A] bg-transparent hover:bg-[#FAF6F0] font-data-mono text-xs font-semibold uppercase tracking-wider transition-all duration-200 cursor-pointer"
          >
            Open Alternative Data Drill-Down →
          </button>
          
          <button
            onClick={() => nav('/simulator')}
            className="px-4 py-2 bg-[#0C182A] text-[#FAF8F5] hover:bg-[#1B2D4A] font-data-mono text-xs font-semibold uppercase tracking-wider transition-all duration-200 cursor-pointer"
          >
            Try What-If Simulator
          </button>
        </div>

      </div>
    </div>
  );
}
