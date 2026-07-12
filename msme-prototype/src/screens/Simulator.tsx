import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, TrendingUp } from 'lucide-react';
import { SubScoreRadar } from '../components/Charts';
import { useCreditData } from '../context/CreditDataContext';
import { type ScoreResponse } from '../data/api';

// Desaturated color config for the alternative data streams
const PILLAR_COLORS: Record<string, string> = {
  gst: '#234E45',
  upi: '#234E45',
  aa: '#7B5500',
  epfo: '#8A332E',
};

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
function SliderRow({ label, value, min, max, step, color, format, onChange }: SliderRowProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-[#0C182A] font-sans-ui">{label}</span>
        <span className="text-xs font-bold font-data-mono" style={{ color }}>{format ? format(value) : value}</span>
      </div>
      <div className="relative flex items-center">
        <input
          type="range" min={min} max={max} step={step} value={value}
          onChange={e => onChange(Number(e.target.value))}
          className="w-full h-1.5 appearance-none outline-none cursor-pointer"
          style={{
            background: `linear-gradient(to right, ${color} 0%, ${color} ${((value - min) / (max - min)) * 100}%, #F0EAE1 ${((value - min) / (max - min)) * 100}%, #F0EAE1 100%)`,
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

  useEffect(() => {
    if (!baselineScore || !record) return;

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
    }, 200);

    return () => clearTimeout(timer);
  }, [weights, baselineScore, record]);

  if (loading || !baselineScore || !record) {
    return (
      <div className="min-h-screen pt-20 flex items-center justify-center bg-[#FAF8F5]">
        <p className="text-sm font-data-mono text-[#556B82] animate-pulse">
          SECURE CONNECTION ACTIVE · LOADING SIMULATION SCHEMAS...
        </p>
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

  const simColor = simScore ? ((simScore.overall_score ?? 0) >= 75 ? '#234E45' : (simScore.overall_score ?? 0) >= 60 ? '#7B5500' : '#8A332E') : '#556B82';

  return (
    <div className="min-h-screen pt-20 pb-16 bg-[#FAF8F5] text-[#1B2D4A] px-6 select-text">
      <div className="max-w-6xl mx-auto">
        
        {/* Document Header */}
        <div className="border border-[#E2DBD0] bg-white p-6 mb-8 text-[#0C182A]">
          <span className="text-xxs font-data-mono font-bold tracking-widest text-[#8B704F] block uppercase">
            POLICY TESTING DESK
          </span>
          <h1 className="font-serif-editorial text-3xl font-bold tracking-tight mt-1">
            What-If Underwriting Simulator
          </h1>
          <p className="text-xs text-[#556B82] mt-1 font-data-mono">
            Simulating for Enterprise ID: {record.enterprise_id}
          </p>
          <div className="mt-4 pt-4 border-t border-[#E2DBD0] text-xs text-[#556B82] leading-relaxed max-w-3xl">
            Modify the model coefficients allocated to alternate digital streams to gauge final score calibration drift.
            This tool enables policy makers to benchmark credit limits under custom stress rules.
          </div>
        </div>

        {/* Simulator Workspace Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* LEFT COLUMN: Controls & Presets (Grid span 7) */}
          <div className="lg:col-span-7 space-y-8">
            
            {/* Slider parameters */}
            <div className="border border-[#E2DBD0] bg-white p-6">
              <div className="flex justify-between items-center border-b border-[#FAF6F0] pb-3 mb-6">
                <span className="text-xs font-data-mono font-bold text-[#0C182A] uppercase">
                  WEIGHT CALIBRATOR COEFFICIENTS
                </span>
                <span className="font-data-mono text-xs font-bold text-[#556B82]">
                  SUM TOTAL: {weights.gst + weights.upi + weights.aa + weights.epfo}%
                </span>
              </div>
              
              <div className="space-y-6">
                <SliderRow
                  label="GST Filing Compliance Weight"
                  tooltip="Assigned to GSTR filing calendar consistency index."
                  value={weights.gst} min={0} max={100} step={1}
                  color={PILLAR_COLORS.gst} source="gst" format={v => `${v}%`}
                  onChange={v => setWeights(prev => ({ ...prev, gst: v }))}
                />
                <SliderRow
                  label="UPI Transaction Volume Weight"
                  tooltip="Assigned to daily operational receipt velocity."
                  value={weights.upi} min={0} max={100} step={1}
                  color={PILLAR_COLORS.upi} source="upi" format={v => `${v}%`}
                  onChange={v => setWeights(prev => ({ ...prev, upi: v }))}
                />
                <SliderRow
                  label="Bank Statement Balance Weight"
                  tooltip="Assigned to Account Aggregator liquid balance signals."
                  value={weights.aa} min={0} max={100} step={1}
                  color={PILLAR_COLORS.aa} source="aa" format={v => `${v}%`}
                  onChange={v => setWeights(prev => ({ ...prev, aa: v }))}
                />
                <SliderRow
                  label="EPFO Payroll workforce Weight"
                  tooltip="Assigned to reported active headcount levels."
                  value={weights.epfo} min={0} max={100} step={1}
                  color={PILLAR_COLORS.epfo} source="epfo" format={v => `${v}%`}
                  onChange={v => setWeights(prev => ({ ...prev, epfo: v }))}
                />
              </div>
            </div>

            {/* Calibration presets */}
            <div className="border border-[#E2DBD0] bg-white p-6">
              <span className="text-xs font-data-mono font-bold text-[#0C182A] block uppercase mb-4">
                PRE-SET INSTITUTIONAL POLICY TEMPLATES
              </span>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { label: 'Standard Balanced Base', w: { gst: 28, upi: 25, aa: 30, epfo: 17 } },
                  { label: 'Merchant Cash Flow Heavy', w: { gst: 10, upi: 60, aa: 20, epfo: 10 } },
                  { label: 'Conservative Treasury Bench', w: { gst: 20, upi: 10, aa: 60, epfo: 10 } },
                  { label: 'Compliance & Employment Heavy', w: { gst: 45, upi: 10, aa: 15, epfo: 30 } },
                ].map((p, i) => (
                  <button 
                    key={i} 
                    onClick={() => setWeights(p.w)}
                    className="flex flex-col p-4 border border-[#E2DBD0] bg-white hover:bg-[#FAF6F0] transition-colors text-left rounded-none cursor-pointer"
                  >
                    <span className="text-xs font-bold text-[#0C182A] font-sans-ui mb-1">{p.label}</span>
                    <span className="text-[10px] font-data-mono text-[#556B82]">
                      GST {p.w.gst}% · UPI {p.w.upi}% · AA {p.w.aa}% · EPFO {p.w.epfo}%
                    </span>
                  </button>
                ))}
              </div>
            </div>

          </div>

          {/* RIGHT COLUMN: Output gauge & Radar Footprint (Grid span 5) */}
          <div className="lg:col-span-5 space-y-8">
            
            {/* Live Simulated Result */}
            <div className="border border-[#E2DBD0] bg-white p-6 text-center">
              <span className="text-xxs font-data-mono font-bold tracking-widest text-[#556B82] block uppercase mb-6 self-start">
                SIMULATED SCORE READOUT
              </span>
              
              <div className="relative w-40 h-40 mx-auto mb-4">
                <svg viewBox="0 0 160 160" className="w-full h-full -rotate-90">
                  <circle cx="80" cy="80" r="68" fill="none" stroke="#E2DBD0" strokeWidth="6" />
                  {simScore && (
                    <circle
                      cx="80"
                      cy="80"
                      r="68"
                      fill="none"
                      stroke={simColor}
                      strokeWidth="6"
                      strokeDasharray={`${2 * Math.PI * 68}`}
                      strokeDashoffset={2 * Math.PI * 68 * (1 - (simScore.overall_score ?? 0) / 100)}
                      className="transition-all duration-300"
                    />
                  )}
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className={`text-5xl font-bold font-serif-editorial text-[#0C182A] ${simulating ? 'opacity-40' : ''}`}>
                    {simScore?.overall_score ?? '—'}
                  </span>
                  <span className="text-[#556B82] text-xs font-data-mono mt-1">/ 100</span>
                </div>
              </div>

              {/* Delta Attribution indicator */}
              <div className={`inline-flex items-center gap-1.5 px-3 py-1 font-data-mono text-xs font-bold border mb-4 ${
                delta > 0 ? 'text-[#234E45] bg-[#E6ECE9] border-[#C4D3CD]' :
                delta < 0 ? 'text-[#8A332E] bg-[#F5ECEB] border-[#ECCDCB]' :
                'text-[#556B82] bg-[#F0EAE1] border-[#D9CEBE]'
              }`}>
                {delta > 0 ? <TrendingUp size={12} /> : delta < 0 ? '↓' : '→'}
                {delta > 0 ? `+${delta}` : delta} DRIFT VS BASELINE ({baselineScore.overall_score})
              </div>

              {simScore && (
                <div className="flex items-center justify-center gap-2 flex-wrap border-t border-[#FAF6F0] pt-4 font-data-mono text-[10px]">
                  <span className="font-bold text-[#0C182A]">TIER {simScore.risk_tier}</span>
                  <span className="text-[#556B82]">·</span>
                  <span className="font-bold text-[#8A332E]">PD {(simScore as any).pd ?? 4.2}%</span>
                  <span className="text-[#556B82]">·</span>
                  <span className="font-bold text-[#0C182A]">{simScore.decision.toUpperCase()}</span>
                </div>
              )}
            </div>

            {/* Radar footprint */}
            <div className="border border-[#E2DBD0] bg-white p-6">
              <span className="text-xxs font-data-mono font-bold tracking-widest text-[#556B82] block uppercase text-center mb-2">
                SIMULATED RADAR FOOTPRINT
              </span>
              <SubScoreRadar scores={radarScores} size={220} />
            </div>

            <div className="flex gap-4">
              <button 
                className="flex-1 btn-ghost justify-center cursor-pointer" 
                onClick={() => nav('/borrower')}
              >
                Borrower Portal
              </button>
              <button 
                className="flex-1 btn-primary justify-center cursor-pointer" 
                onClick={() => nav('/banker')}
              >
                Banker Console <ArrowRight size={14} className="ml-1" />
              </button>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}
