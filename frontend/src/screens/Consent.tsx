import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, Clock, AlertCircle, ArrowRight, RefreshCw, Info } from 'lucide-react';
import { CONSENT_SOURCES } from '../data/mock';
import { useCreditData } from '../context/CreditDataContext';

type Status = 'idle' | 'connecting' | 'connected' | 'pending' | 'unavailable';

const STATUS_CONFIG: Record<Status, { icon: any; label: string; color: string; bg: string; border: string }> = {
  idle:        { icon: RefreshCw,    label: 'Connect',    color: '#556B82', bg: '#FAF6F0', border: '#E2DBD0' },
  connecting:  { icon: RefreshCw,    label: 'Connecting…',color: '#7B5500', bg: '#FAF3E0', border: '#ECDDB0' },
  connected:   { icon: CheckCircle2, label: 'Connected',  color: '#234E45', bg: '#E6ECE9', border: '#C4D3CD' },
  pending:     { icon: Clock,        label: 'Pending',    color: '#7B5500', bg: '#FAF3E0', border: '#ECDDB0' },
  unavailable: { icon: AlertCircle,  label: 'Unavailable',color: '#8A332E', bg: '#F5ECEB', border: '#ECCDCB' },
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
    }, 1200);
  };

  const connectAll = async () => {
    for (const src of CONSENT_SOURCES) {
      if (statuses[src.key as keyof typeof statuses] === 'idle') {
        await new Promise(r => setTimeout(r, 400));
        connect(src.key);
      }
    }
  };

  // Desaturated Private Ledger colors
  const confidence = connected === 4 ? 'Gold' : connected >= 3 ? 'Silver' : connected >= 2 ? 'Bronze' : 'Insufficient';
  const confidenceColor = { Gold: '#234E45', Silver: '#556B82', Bronze: '#7B5500', Insufficient: '#8A332E' }[confidence];
  const confidenceBg = { Gold: '#E6ECE9', Silver: '#F0EAE1', Bronze: '#FAF3E0', Insufficient: '#F5ECEB' }[confidence];
  const confidenceBorder = { Gold: '#C4D3CD', Silver: '#D9CEBE', Bronze: '#ECDDB0', Insufficient: '#ECCDCB' }[confidence];

  return (
    <div className="min-h-screen pt-20 pb-16 bg-[#FAF8F5] text-[#1B2D4A] px-6 select-text">
      <div className="max-w-4xl mx-auto">
        
        {/* Document Header */}
        <div className="border border-[#E2DBD0] bg-white p-6 mb-8 text-[#0C182A]">
          <span className="text-xxs font-data-mono font-bold tracking-widest text-[#8B704F] block uppercase">
            REGULATORY COMPLIANCE FRAMEWORK
          </span>
          <h1 className="font-serif-editorial text-3xl font-bold tracking-tight mt-1">
            Data Consent & Authorisation Desk
          </h1>
          <p className="text-xs text-[#556B82] mt-1 font-data-mono leading-relaxed">
            RBI-Licensed Account Aggregator (AA) Integration Architecture
          </p>
          <div className="mt-4 pt-4 border-t border-[#E2DBD0] text-xs text-[#556B82] leading-relaxed max-w-3xl">
            We retrieve financial metrics from government-verified data servers via Account Aggregator gateways.
            Your explicit consent is required to connect each ledger pipeline. Raw banking data is processed dynamically — no files are cached on our servers.
          </div>
        </div>

        {/* Consent info note */}
        <div className="border border-[#E2DBD0] bg-white p-4 mb-6">
          <div className="flex items-start gap-3">
            <Info size={16} className="text-[#8B704F] mt-0.5 flex-shrink-0" />
            <div className="text-xs text-[#556B82] leading-relaxed">
              <span className="text-[#8B704F] font-bold">Security Notice: </span>
              Consent authorisation remains active for a maximum calibration period of 180 days. You hold full authority to revoke or modify these pipelines directly from your banking portal.
            </div>
          </div>
        </div>

        {/* Confidence Calibration Hub */}
        <div className="border border-[#E2DBD0] bg-white p-6 mb-8">
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <div>
              <span className="text-xs font-data-mono font-bold text-[#0C182A] uppercase">
                CALIBRATION CONFIDENCE BAND
              </span>
              <p className="text-[10px] text-[#556B82] mt-0.5">
                More connected data streams reduce score uncertainty variances.
              </p>
            </div>
            
            <span className="text-xs font-data-mono font-bold px-2 py-0.5 border" style={{ color: confidenceColor, backgroundColor: confidenceBg, borderColor: confidenceBorder }}>
              {confidence.toUpperCase()} CONFIDENCE
            </span>
          </div>

          {/* Ruled Flat Progress */}
          <div className="progress-track mb-3">
            <div className="progress-fill" style={{ width: `${(connected / 4) * 100}%`, background: confidenceColor }} />
          </div>

          <div className="flex justify-between text-[10px] font-data-mono text-[#556B82] border-t border-[#FAF6F0] pt-2">
            <span>0 STREAMS CONNECTED</span>
            <span>SILVER RANGE (3 STREAMS)</span>
            <span>GOLD RANGE (ALL 4)</span>
          </div>
          
          {connected < 4 && (
            <p className="text-xs text-[#556B82] mt-4 font-sans-ui">
              {4 - connected} data stream{4 - connected > 1 ? 's' : ''} remaining.
              {connected < 2 ? ' A minimum of 2 connected streams is required to compute a fused score.' : ' A fused score can be generated using a reweighted alternate matrix.'}
            </p>
          )}
        </div>

        {/* Consent Source Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
          {CONSENT_SOURCES.map((src) => {
            const status = statuses[src.key as keyof typeof statuses] as Status;
            const cfg = STATUS_CONFIG[status];
            const StatusIcon = cfg.icon;
            return (
              <div 
                key={src.key} 
                className={`border bg-white p-5 flex flex-col justify-between transition-all duration-300 ${
                  status === 'connected' ? 'border-[#C4D3CD]' : 'border-[#E2DBD0]'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="w-10 h-10 border flex items-center justify-center text-lg bg-[#FAF6F0] border-[#E2DBD0]">
                      {src.icon}
                    </div>
                    
                    <span 
                      className="flex items-center gap-1 text-[10px] font-bold font-data-mono px-2 py-0.5 border"
                      style={{ color: cfg.color, backgroundColor: cfg.bg, borderColor: cfg.border }}
                    >
                      <StatusIcon size={10} className={status === 'connecting' ? 'animate-spin' : ''} />
                      {cfg.label.toUpperCase()}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-[#0C182A] font-sans-ui mb-1">{src.label}</h3>
                  <p className="text-xs text-[#556B82] leading-relaxed mb-4">
                    {status === 'connected' ? src.detail : src.key === 'epfo' ? 'Requires employer credentials. An OTP verification is sent by EPFO systems.' : `Authorise secure read-only interface via AA credit desk.`}
                  </p>
                </div>

                <div>
                  {/* Monospace annotation */}
                  <p className="text-[10px] text-[#556B82] italic border-t border-[#FAF6F0] pt-2 mb-4 font-data-mono">
                    {src.key === 'gst'  && 'Assess revenue regularity & compliance filing trends'}
                    {src.key === 'upi'  && 'NPCI real-time daily cash inflows volatility index'}
                    {src.key === 'aa'   && 'Bank balance averages, EMI liabilities, OD limits'}
                    {src.key === 'epfo' && 'Enrolled workforce size & compliance calendar gaps'}
                  </p>

                  {status === 'idle' && (
                    <button
                      className="w-full py-1.5 border font-data-mono text-xs font-bold uppercase tracking-wider transition-colors hover:bg-[#FAF6F0] cursor-pointer"
                      style={{ color: src.color, borderColor: src.color }}
                      onClick={() => connect(src.key)}
                    >
                      Authorise {src.label}
                    </button>
                  )}
                  
                  {status === 'unavailable' && (
                    <div className="p-2 border border-[#ECCDCB] bg-[#F5ECEB] text-[10px] font-data-mono text-[#8A332E]">
                      REWEIGHTED CALIBRATION TRIGGERED
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Action Controls */}
        <div className="flex flex-col sm:flex-row gap-4 border-t border-[#E2DBD0] pt-6">
          {!allDone && (
            <button 
              className="btn-ghost flex-1 justify-center" 
              onClick={connectAll}
            >
              <RefreshCw size={14} className="mr-1" /> Connect All Data Pipelines
            </button>
          )}
          
          <button
            className={`btn-primary flex-1 justify-center ${connected < 2 ? 'opacity-40 cursor-not-allowed' : ''}`}
            onClick={() => connected >= 2 && nav('/borrower')}
            disabled={connected < 2}
          >
            {connected < 2 ? 'Connect 2 streams to unlock' : 'Compile Business Health Score'}
            <ArrowRight size={14} className="ml-1" />
          </button>
        </div>

      </div>
    </div>
  );
}
