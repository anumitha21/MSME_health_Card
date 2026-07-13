import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Download } from 'lucide-react';
import { useCreditData } from '../context/CreditDataContext';

// Newsreader serif typography component for score count-up
function AnimatedScore({ score }: { score: number }) {
  const [displayScore, setDisplayScore] = useState(0);

  useEffect(() => {
    // Respect user's system preferences for reduced motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      setDisplayScore(score);
      return;
    }

    let start = 0;
    const end = score;
    if (start === end) return;

    const duration = 1000; // milliseconds
    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // cubic easeOut
      setDisplayScore(Math.round(eased * end));

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [score]);

  return (
    <span className="font-serif-editorial text-7xl font-bold tracking-tight text-[#0C182A]">
      {displayScore}
    </span>
  );
}

const FEATURE_LABELS: Record<string, { label: string; variable: string }> = {
  'gst_filing_consistency_pct': { label: 'GST Filing Consistency Ratio', variable: 'gst_filing_consistency_pct' },
  'upi_avg_inflow_inr': { label: 'UPI Average Monthly Cash Inflows', variable: 'upi_avg_inflow_inr' },
  'aa_overdraft_utilization_pct': { label: 'Bank Overdraft Credit Utilisation', variable: 'aa_overdraft_utilization_pct' },
  'epfo_employee_growth_rate': { label: 'EPFO Active Workforce Growth Rate', variable: 'epfo_employee_growth_rate' }
};

export default function BankerDashboard() {
  const nav = useNavigate();
  const { score, record, loading } = useCreditData();

  // Apply the Private Ledger body class on mount and clean up on unmount
  useEffect(() => {
    document.body.classList.add('theme-ledger');
    return () => {
      document.body.classList.remove('theme-ledger');
    };
  }, []);

  if (loading || !score || !record) {
    return (
      <div className="min-h-screen pt-20 flex items-center justify-center bg-[#FAF8F5]">
        <p className="text-sm font-data-mono text-[#556B82] animate-pulse">
          SECURE CONNECTION ACTIVE · RETRIEVING UNDERWRITING RECORDS...
        </p>
      </div>
    );
  }

  // Actuarial document references
  const assessmentDate = "12-JULY-2026";
  const enterpriseIdStr = record?.enterprise_id ?? 'Unknown';
  const refNumber = `SAHAY-CR-${enterpriseIdStr.substring(Math.min(4, enterpriseIdStr.length))}-2026`;

  // Verdict Stamp configuration
  const overallScoreVal = score?.overall_score ?? 0;
  let verdictText = "REFER FOR MANUAL REVIEW";
  let verdictSubtext = "FUSION SCORE OUTSIDE STANDARDISED LIMITS";
  if (overallScoreVal >= 80) {
    verdictText = "EXPOSURE APPROVED";
    verdictSubtext = "AUTO-APPROVAL LIMIT UNDER ₹40.0L CALIBRATED";
  } else if (overallScoreVal < 50) {
    verdictText = "EXPOSURE DENIED";
    verdictSubtext = "MODEL THRESHOLD VIOLATION";
  }

  return (
    <div className="min-h-screen pt-20 pb-16 bg-[#FAF8F5] text-[#1B2D4A] px-6 select-text">
      <div className="max-w-7xl mx-auto">
        
        {/* 1. Entity Identification Header (Official Document Header Style) */}
        <div className="border border-[#E2DBD0] bg-white p-6 mb-8 text-[#0C182A]">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-[#E2DBD0] pb-4 mb-4 gap-4">
            <div>
              <span className="text-xxs font-data-mono font-bold tracking-widest text-[#8B704F] block">
                OFFICIAL RECORD · INSTITUTIONAL CREDIT DESK
              </span>
              <h1 className="font-serif-editorial text-3xl font-bold tracking-tight mt-1">
                {record.enterprise_id} / {record.sector || 'General Segment'}
              </h1>
            </div>
            <div className="flex items-center gap-4 self-end md:self-auto">
              <div className="text-left md:text-right font-data-mono text-xs text-[#556B82] space-y-0.5">
                <div>FILE REF: <span className="text-[#0C182A] font-bold">{refNumber}</span></div>
                <div>ASSESSMENT DATE: <span className="text-[#0C182A] font-bold">{assessmentDate}</span></div>
              </div>
              <button 
                onClick={() => window.print()}
                className="px-3 py-1.5 border border-[#E2DBD0] hover:bg-[#FAF6F0] text-[#0C182A] font-data-mono text-xs flex items-center gap-1.5 uppercase transition-colors cursor-pointer"
                title="Export page to actuarial PDF printout"
              >
                <Download size={13} /> Export Credit File
              </button>
            </div>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 font-data-mono text-xs">
            <div>
              <span className="text-xxs text-[#556B82] block uppercase tracking-wider">Borrower Segment</span>
              <span className="font-bold text-[#0C182A]">{record.segment || 'Micro Enterprise'}</span>
            </div>
            <div>
              <span className="text-xxs text-[#556B82] block uppercase tracking-wider">Operating Vintage</span>
              <span className="font-bold text-[#0C182A]">{record.years_in_operation?.toFixed(1) ?? '—'} Years</span>
            </div>
            <div>
              <span className="text-xxs text-[#556B82] block uppercase tracking-wider">Fusion Confidence</span>
              <span className={`font-bold inline-flex items-center gap-1 ${
                score.data_confidence.toLowerCase() === 'gold' ? 'text-[#234E45]' : 'text-[#7B5500]'
              }`}>
                ■ {score.data_confidence.toUpperCase()} CALIBRATED
              </span>
            </div>
            <div>
              <span className="text-xxs text-[#556B82] block uppercase tracking-wider">Baseline Model</span>
              <span className="font-bold text-[#0C182A]">Sahay-Fusion-v3.4.1 (AUC 0.89)</span>
            </div>
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

        {/* Main Split Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* LEFT COLUMN: Ledger tables, SHAP forensic breakdown, Directives (Grid span 8) */}
          <div className="lg:col-span-8 space-y-8">
            
            {/* 2. Pillar Breakdown Ledger Table */}
            <div className="border border-[#E2DBD0] bg-white p-6">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h2 className="text-xs font-data-mono font-bold tracking-widest text-[#556B82] uppercase">FUSION PILLAR LEDGER</h2>
                  <p className="text-[11px] text-[#556B82] mt-0.5">Weighted alternative data streams used to calculate credit score</p>
                </div>
                <div className="ledger-badge-neutral">
                  {score.data_confidence.toUpperCase()} ASSURED
                </div>
              </div>
              
              <div className="overflow-x-auto">
                <table className="ledger-table">
                  <thead>
                    <tr>
                      <th className="w-1/4">DATA PILLAR</th>
                      <th className="text-right">WEIGHT</th>
                      <th className="text-right">SCORE</th>
                      <th className="text-center">QUALITY TIER</th>
                      <th className="text-center">MOM TREND</th>
                      <th className="w-1/3">SIGNAL AUDIT NOTES</th>
                    </tr>
                  </thead>
                  <tbody className="font-data-mono text-xs">
                    {/* GST */}
                    <tr className="cursor-pointer" onClick={() => nav('/drilldown?tab=gst')}>
                      <td className="font-sans-ui font-semibold text-[#0C182A]">GST Filing Ledger</td>
                      <td className="text-right">28.0%</td>
                      <td className="text-right font-bold text-[#234E45]">{score.gst_score}</td>
                      <td className="text-center">
                        <span className="ledger-badge-pass">HIGH</span>
                      </td>
                      <td className="text-center text-[#234E45] font-bold">▲ STABLE</td>
                      <td className="font-sans-ui text-[#556B82] text-[11px]">
                        {record.gst_late_filing_count_12m ?? 0} late filings, {record.gst_filing_consistency_pct?.toFixed(0)}% consistency
                      </td>
                    </tr>
                    {/* UPI */}
                    <tr className="cursor-pointer" onClick={() => nav('/drilldown?tab=upi')}>
                      <td className="font-sans-ui font-semibold text-[#0C182A]">UPI Cash Flows</td>
                      <td className="text-right">25.0%</td>
                      <td className="text-right font-bold text-[#234E45]">{score.upi_score}</td>
                      <td className="text-center">
                        <span className="ledger-badge-pass">HIGH</span>
                      </td>
                      <td className="text-center text-[#234E45] font-bold">▲ EXPAND</td>
                      <td className="font-sans-ui text-[#556B82] text-[11px]">
                        Avg: ₹{((record.upi_avg_inflow_inr ?? 0)/1000).toFixed(0)}k, Volatility: {(record.upi_inflow_volatility ?? 0).toFixed(2)}
                      </td>
                    </tr>
                    {/* Bank AA */}
                    <tr className="cursor-pointer" onClick={() => nav('/drilldown?tab=aa')}>
                      <td className="font-sans-ui font-semibold text-[#0C182A]">Bank Consent (AA)</td>
                      <td className="text-right">30.0%</td>
                      <td className="text-right font-bold text-[#7B5500]">{score.aa_score}</td>
                      <td className="text-center">
                        <span className="ledger-badge-warn">MODERATE</span>
                      </td>
                      <td className="text-center text-[#7B5500] font-bold">▼ EXPOSURE</td>
                      <td className="font-sans-ui text-[#556B82] text-[11px]">
                        OD Utilisation: {record.aa_overdraft_utilization_pct?.toFixed(0)}% ⚠️, Payable: {record.aa_trade_payable_days ?? 30}d
                      </td>
                    </tr>
                    {/* EPFO */}
                    <tr className="cursor-pointer" onClick={() => nav('/drilldown?tab=epfo')}>
                      <td className="font-sans-ui font-semibold text-[#0C182A]">EPFO Payroll Data</td>
                      <td className="text-right">17.0%</td>
                      <td className="text-right font-bold text-[#8A332E]">{score.epfo_score}</td>
                      <td className="text-center">
                        {record.epfo_registered ? (
                          <span className="ledger-badge-pass">HIGH</span>
                        ) : (
                          <span className="ledger-badge-fail">NOT LINKED</span>
                        )}
                      </td>
                      <td className="text-center text-[#556B82] font-semibold">— STATIC</td>
                      <td className="font-sans-ui text-[#556B82] text-[11px]">
                        {record.epfo_registered ? `${record.epfo_employee_count} employees enrolled` : 'No verified EPFO connection'}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* 3. Forensic SHAP Model Evidence Panel */}
            <div className="border border-[#E2DBD0] bg-white p-6">
              <div>
                <h2 className="text-xs font-data-mono font-bold tracking-widest text-[#556B82] uppercase">FORENSIC SHAP ATTRIBUTION DRIVERS</h2>
                <p className="text-[11px] text-[#556B82] mt-0.5">Mathematical contribution of each signal to the final fused score calibration</p>
              </div>
              
              <div className="mt-4 overflow-x-auto">
                <table className="ledger-table">
                  <thead>
                    <tr>
                      <th className="w-1/3">MONITORED INDICATOR</th>
                      <th className="text-right">VARIABLE KEY</th>
                      <th className="text-right">VALUE</th>
                      <th className="text-right">ATTRIBUTION IMPACT</th>
                      <th className="text-center w-52">FORENSIC SIGNAL WEIGHT</th>
                    </tr>
                  </thead>
                  <tbody className="font-data-mono text-xs">
                    {score.key_drivers.map((drv, idx) => {
                      const cfg = FEATURE_LABELS[drv.feature] || { label: drv.feature, variable: drv.feature };
                      
                      // Extract value from record
                      let displayVal = '—';
                      if (drv.feature === 'gst_filing_consistency_pct') {
                        displayVal = `${record.gst_filing_consistency_pct?.toFixed(1)}%`;
                      } else if (drv.feature === 'upi_avg_inflow_inr') {
                        displayVal = `₹${((record.upi_avg_inflow_inr ?? 0)/100000).toFixed(2)}L`;
                      } else if (drv.feature === 'aa_overdraft_utilization_pct') {
                        displayVal = `${record.aa_overdraft_utilization_pct?.toFixed(1)}%`;
                      } else if (drv.feature === 'epfo_employee_growth_rate') {
                        displayVal = `${record.epfo_employee_growth_rate?.toFixed(1)}%`;
                      }
                      
                      const isPositive = drv.impact >= 0;
                      
                      return (
                        <tr key={idx}>
                          <td className="font-sans-ui font-semibold text-[#0C182A]">{cfg.label}</td>
                          <td className="text-right text-[#556B82] text-[10px]">{cfg.variable}</td>
                          <td className="text-right font-bold text-[#0C182A]">{displayVal}</td>
                          <td className={`text-right font-bold ${isPositive ? 'text-[#234E45]' : 'text-[#8A332E]'}`}>
                            {isPositive ? `+${drv.impact.toFixed(2)}` : `${drv.impact.toFixed(2)}`}
                          </td>
                          <td className="flex justify-center items-center py-3">
                            <div className="w-44 h-3 bg-[#FAF6F0] relative border border-[#E2DBD0] overflow-hidden">
                              {/* Zero center-line */}
                              <div className="absolute left-1/2 top-0 bottom-0 w-[1px] bg-[#E2DBD0]" />
                              {isPositive ? (
                                <div 
                                  className="absolute left-1/2 h-full bg-[#234E45]" 
                                  style={{ width: `${Math.min(50, drv.impact * 5.0)}%` }}
                                />
                              ) : (
                                <div 
                                  className="absolute right-1/2 h-full bg-[#8A332E]" 
                                  style={{ width: `${Math.min(50, Math.abs(drv.impact) * 5.0)}%` }}
                                />
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 4. Underwriting Directives & Compliance Gaps */}
            <div className="border border-[#E2DBD0] bg-white p-6">
              <h2 className="text-xs font-data-mono font-bold tracking-widest text-[#556B82] uppercase mb-4">
                UNDERWRITING DIRECTIVES & ACTION CALIBRATION
              </h2>
              
              <div className="space-y-4">
                {/* System recommendation mapping */}
                {score.recommendations.map((rec, idx) => (
                  <div key={idx} className="border-l-2 border-[#8B704F] pl-4 py-1 flex items-start justify-between gap-4">
                    <div>
                      <span className="text-[9px] font-data-mono font-bold text-[#8B704F] uppercase tracking-wide">
                        DIRECTIVE FOR PILLAR: {rec.pillar.toUpperCase()}
                      </span>
                      <h3 className="font-semibold text-xs text-[#0C182A] mt-0.5">{rec.title}</h3>
                      <p className="text-xs text-[#556B82] mt-0.5 leading-relaxed">{rec.recommendation}</p>
                    </div>
                    <div className="text-right font-data-mono text-xs flex-shrink-0">
                      <span className="text-[#556B82] block text-[9px] uppercase">Est. Score Lift</span>
                      <span className="font-bold text-[#234E45] font-serif-editorial text-sm">+{rec.estimated_lift} Pts</span>
                    </div>
                  </div>
                ))}

                {/* EPFO Data Gap Fallback */}
                {!record.epfo_registered && (
                  <div className="border-l-2 border-[#8A332E] pl-4 py-1 flex items-start justify-between gap-4">
                    <div>
                      <span className="text-[9px] font-data-mono font-bold text-[#8A332E] uppercase tracking-wide">
                        CRITICAL DATA GAP IDENTIFIED
                      </span>
                      <h3 className="font-semibold text-xs text-[#8A332E] mt-0.5">EPFO Payroll Data Stream Offline</h3>
                      <p className="text-xs text-[#556B82] mt-0.5 leading-relaxed">
                        EPFO compliance feed not connected. Request borrower link via EPFO portal to recalibrate payroll score weighting.
                      </p>
                    </div>
                    <div className="text-right font-data-mono text-xs flex-shrink-0">
                      <span className="text-[#8A332E] block text-[9px] uppercase">CAPACITY ERROR</span>
                      <span className="font-bold text-[#8A332E] text-[10px]">17% REWEIGHTED</span>
                    </div>
                  </div>
                )}

                {/* GST Verification Status check */}
                {!record.gst_registered && (
                  <div className="border-l-2 border-[#8A332E] pl-4 py-1 flex items-start justify-between gap-4">
                    <div>
                      <span className="text-[9px] font-data-mono font-bold text-[#8A332E] uppercase tracking-wide">
                        CRITICAL DATA GAP IDENTIFIED
                      </span>
                      <h3 className="font-semibold text-xs text-[#8A332E] mt-0.5">GST Identification Not Verified</h3>
                      <p className="text-xs text-[#556B82] mt-0.5 leading-relaxed">
                        Borrower GST registration is marked inactive or unverified. Verify active filings.
                      </p>
                    </div>
                    <div className="text-right font-data-mono text-xs flex-shrink-0">
                      <span className="text-[#8A332E] block text-[9px] uppercase">BLOCKING STATE</span>
                      <span className="font-bold text-[#8A332E] text-[10px]">VERIFY MANUAL</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 5. Credit Officer Audit Memorandum */}
            <div className="border border-[#E2DBD0] bg-white p-6">
              <h2 className="text-xs font-data-mono font-bold tracking-widest text-[#556B82] uppercase mb-3">
                CREDIT OFFICERS AUDIT MEMORANDUM
              </h2>
              <div className="bg-[#FAF6F0] p-4 border border-[#E2DBD0] text-xs text-[#1B2D4A] leading-relaxed font-sans-ui whitespace-pre-wrap">
                <span className="text-[#0C182A] font-bold text-[10px] font-data-mono block mb-2 tracking-wider">
                  AUTO-GENERATED FUSION RATIONALE
                </span>
                {score.audit_justification || "No justification notes generated. Verify alternate data sources manually."}
              </div>
            </div>

          </div>

          {/* RIGHT COLUMN: Fused Score, Stamp Verdict, Peer Benchmarks (Grid span 4) */}
          <div className="lg:col-span-4 space-y-8">
            
            {/* Fused Score Panel */}
            <div className="border border-[#E2DBD0] bg-white p-6">
              <span className="text-xxs font-data-mono font-bold tracking-widest text-[#556B82] block uppercase">
                FUSED CREDIT SCORE
              </span>
              
              <div className="flex items-baseline gap-2 mt-2">
                <AnimatedScore score={score.overall_score ?? 0} />
                <span className="font-data-mono text-lg text-[#556B82]">/ 100</span>
              </div>
              
              <div className="mt-6 pt-6 border-t border-[#E2DBD0] font-data-mono text-xs space-y-2.5">
                <div className="flex justify-between">
                  <span className="text-[#556B82]">Calibration Range:</span>
                  <span className="font-bold text-[#0C182A]">{score.score_range_low} – {score.score_range_high}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#556B82]">Risk Classification:</span>
                  <span className="font-bold text-[#0C182A]">Tier {score.risk_tier}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#556B82]">1-Year Default Prob (PD):</span>
                  <span className="font-bold text-[#8A332E]">4.20%</span>
                </div>
              </div>
            </div>

            {/* Decision Office Stamp (Signature Element) */}
            <div className="border border-[#E2DBD0] bg-white p-6 flex flex-col items-center justify-center min-h-56 text-center relative overflow-hidden">
              <span className="text-xxs font-data-mono font-bold tracking-widest text-[#556B82] block uppercase mb-6 self-start">
                DECISION OFFICE STAMP
              </span>
              
              {/* Double bordered rotated ink seal */}
              <div className="verdict-stamp my-4">
                {verdictText}
              </div>
              
              <span className="font-data-mono text-[10px] text-[#556B82] mt-6 block">
                {verdictSubtext}
              </span>
              <span className="font-data-mono text-[9px] text-[#8B704F] mt-1 block">
                CREDIT SYSTEM SIGN-OFF · SECURE HASH: #EXP-${enterpriseIdStr.substring(Math.min(4, enterpriseIdStr.length))}-90F
              </span>
            </div>

            {/* Peer Comparison Benchmarking */}
            <div className="border border-[#E2DBD0] bg-white p-6">
              <span className="text-xxs font-data-mono font-bold tracking-widest text-[#556B82] block uppercase mb-4">
                PEER BENCHMARKING
              </span>
              
              <div className="space-y-3 font-data-mono text-xs">
                <div className="flex justify-between items-center py-1.5 border-b border-[#FAF6F0]">
                  <span className="text-[#0C182A] font-bold">This Enterprise</span>
                  <span className="font-bold text-[#234E45] bg-[#E6ECE9] px-2 py-0.5">{score.overall_score ?? 0}</span>
                </div>
                <div className="flex justify-between items-center py-1.5 border-b border-[#FAF6F0]">
                  <span className="text-[#556B82]">Sector Average (Textile)</span>
                  <span className="text-[#0C182A]">61</span>
                </div>
                <div className="flex justify-between items-center py-1.5 border-b border-[#FAF6F0]">
                  <span className="text-[#556B82]">Top 25% Calibration</span>
                  <span className="text-[#0C182A]">85</span>
                </div>
                <div className="flex justify-between items-center py-1.5">
                  <span className="text-[#556B82]">Bottom 25% Calibration</span>
                  <span className="text-[#8A332E] font-bold">41</span>
                </div>
              </div>
              
              <div className="mt-4 pt-4 border-t border-[#E2DBD0] text-[11px] text-[#556B82] leading-relaxed">
                Borrower ranks in the <span className="font-bold text-[#0C182A]">72nd percentile</span> of credit profiles in the Textile Manufacturing segment.
              </div>
            </div>

          </div>

        </div>

        {/* Bottom Actions Row */}
        <div className="flex gap-4 flex-wrap border-t border-[#E2DBD0] pt-6 mt-8">
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
            Launch Calibrator Simulator [WHAT-IF]
          </button>
        </div>

      </div>
    </div>
  );
}
