import { type ReactNode, useState } from 'react';
import { Info } from 'lucide-react';
import { AnimatePresence } from 'framer-motion';

// ─── GlassCard (Styled as flat Ledger container) ──────────────────────────────
interface GlassCardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  glow?: 'emerald' | 'gold' | 'blue' | 'purple' | 'none';
  onClick?: () => void;
  style?: React.CSSProperties;
}
export function GlassCard({ children, className = '', hover = false, onClick, style }: GlassCardProps) {
  return (
    <div
      className={`glass ${hover ? 'glass-hover cursor-pointer' : ''} ${className}`}
      style={{ borderRadius: '0px', ...style }}
      onClick={onClick}
    >
      {children}
    </div>
  );
}

// ─── InfoTooltip ──────────────────────────────────────────────────────────────
interface InfoTooltipProps {
  text: string;
  side?: 'top' | 'bottom' | 'left' | 'right';
}
export function InfoTooltip({ text, side = 'top' }: InfoTooltipProps) {
  const [show, setShow] = useState(false);
  const posMap = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  };
  return (
    <span
      className="relative inline-flex items-center"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      <Info size={12} className="text-[#556B82] hover:text-[#0C182A] cursor-help ml-1 flex-shrink-0" />
      <AnimatePresence>
        {show && (
          <div
            className={`absolute z-50 w-52 p-3 glass text-xxs text-[#253954] leading-relaxed pointer-events-none ${posMap[side]}`}
            style={{ borderRadius: '0px' }}
          >
            {text}
          </div>
        )}
      </AnimatePresence>
    </span>
  );
}

// ─── SourceBadge ─────────────────────────────────────────────────────────────
interface SourceBadgeProps {
  source: 'gst' | 'upi' | 'aa' | 'epfo';
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}
const SOURCE_CONFIG = {
  gst:  { label: 'GST Filing', icon: '🧾', color: '#234E45', bg: '#E6ECE9', border: '#C4D3CD' },
  upi:  { label: 'UPI Cash',   icon: '⚡', color: '#234E45', bg: '#E6ECE9', border: '#C4D3CD' },
  aa:   { label: 'Bank (AA)',  icon: '🏦', color: '#7B5500', bg: '#FAF3E0', border: '#ECDDB0' },
  epfo: { label: 'EPFO Pay',   icon: '👥', color: '#8A332E', bg: '#F5ECEB', border: '#ECCDCB' },
};
export function SourceBadge({ source, size = 'md', showLabel = true }: SourceBadgeProps) {
  const normSource = String(source || 'gst').toLowerCase();
  const cfg = SOURCE_CONFIG[normSource as keyof typeof SOURCE_CONFIG] || SOURCE_CONFIG.gst;
  const sizeMap = { sm: 'text-[9px] px-1.5 py-0.2', md: 'text-[10px] px-2 py-0.5', lg: 'text-xs px-2.5 py-1' };
  return (
    <span
      className={`inline-flex items-center gap-1 font-bold font-data-mono ${sizeMap[size]}`}
      style={{ color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.border}`, borderRadius: '0px' }}
    >
      <span>{cfg.icon}</span>
      {showLabel && cfg.label.toUpperCase()}
    </span>
  );
}

// ─── ScoreTierBadge ───────────────────────────────────────────────────────────
interface ScoreTierBadgeProps { tier: string; size?: 'sm' | 'md' | 'lg'; }
export function ScoreTierBadge({ tier, size = 'md' }: ScoreTierBadgeProps) {
  const tierMap: Record<string, { color: string; bg: string; label: string }> = {
    'A+': { color: '#234E45', bg: '#E6ECE9', label: 'Prime' },
    'A':  { color: '#234E45', bg: '#E6ECE9', label: 'Strong' },
    'B+': { color: '#7B5500', bg: '#FAF3E0', label: 'Moderate' },
    'B':  { color: '#7B5500', bg: '#FAF3E0', label: 'Moderate' },
    'C':  { color: '#7B5500', bg: '#FAF3E0', label: 'Watchlist' },
    'D':  { color: '#8A332E', bg: '#F5ECEB', label: 'High Risk' },
    'E':  { color: '#8A332E', bg: '#F5ECEB', label: 'Decline' },
  };
  const cfg = tierMap[tier] || tierMap['C'];
  const sizeMap = { sm: 'text-[9px] px-2 py-0.5', md: 'text-xs px-2.5 py-0.5', lg: 'text-xs px-3.5 py-1' };
  return (
    <span
      className={`inline-flex items-center gap-1.5 font-bold font-data-mono ${sizeMap[size]}`}
      style={{ color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.color}45`, borderRadius: '0px' }}
    >
      Tier {tier} · {cfg.label.toUpperCase()}
    </span>
  );
}

// ─── ConfidenceBadge ─────────────────────────────────────────────────────────
interface ConfidenceBadgeProps { sources: number; total: number; level: string; }
export function ConfidenceBadge({ sources, total, level }: ConfidenceBadgeProps) {
  const colors = { Gold: '#8B704F', Silver: '#556B82', Bronze: '#7B5500' };
  const c = colors[level as keyof typeof colors] || colors.Silver;
  return (
    <div className="flex items-center gap-2 px-3 py-1 border border-[#E2DBD0] bg-[#FAF6F0]" style={{ borderRadius: '0px' }}>
      <div className="flex gap-1">
        {Array.from({ length: total }).map((_, i) => (
          <div key={i} className="w-2 h-2" style={{ background: i < sources ? c : '#FAF8F5', border: '1px solid #E2DBD0', borderRadius: '0px' }} />
        ))}
      </div>
      <span className="text-[10px] font-bold font-data-mono" style={{ color: c }}>{level.toUpperCase()} CONFIDENCE</span>
      <span className="text-[10px] font-data-mono text-[#556B82]">({sources}/{total} streams)</span>
    </div>
  );
}

// ─── SectionHeader ───────────────────────────────────────────────────────────
interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  badge?: ReactNode;
}
export function SectionHeader({ title, subtitle, badge }: SectionHeaderProps) {
  return (
    <div className="mb-6">
      <div className="flex items-center gap-3 mb-1.5 flex-wrap">
        <h2 className="text-2xl font-bold text-white font-serif-editorial">{title}</h2>
        {badge}
      </div>
      {subtitle && <p className="text-xs text-[#556B82] leading-relaxed max-w-3xl font-data-mono">{subtitle}</p>}
    </div>
  );
}

// ─── ProgressBar ─────────────────────────────────────────────────────────────
interface ProgressBarProps { value: number; max?: number; color?: string; className?: string; }
export function ProgressBar({ value, max = 100, color = '#234E45', className = '' }: ProgressBarProps) {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <div className={`progress-track ${className}`} style={{ borderRadius: '0px' }}>
      <div
        className="progress-fill animate-none"
        style={{ width: `${pct}%`, background: color, borderRadius: '0px' }}
      />
    </div>
  );
}

// ─── StatCard ────────────────────────────────────────────────────────────────
interface StatCardProps {
  label: string;
  value: ReactNode;
  sub?: string;
  color?: string;
  tooltip?: string;
  icon?: ReactNode;
}
export function StatCard({ label, value, sub, color, tooltip, icon }: StatCardProps) {
  return (
    <div className="border border-[#E2DBD0] bg-white p-4" style={{ borderRadius: '0px' }}>
      <div className="flex items-center gap-1.5 text-xxs text-[#556B82] mb-2 font-bold font-data-mono uppercase tracking-wider">
        {icon}
        {label}
        {tooltip && <InfoTooltip text={tooltip} />}
      </div>
      <div className="text-2xl font-bold font-serif-editorial" style={{ color: color || '#0C182A' }}>{value}</div>
      {sub && <div className="text-xxs font-data-mono text-[#556B82] mt-1.5">{sub}</div>}
    </div>
  );
}

// ─── EmptySourceState ────────────────────────────────────────────────────────
interface EmptySourceStateProps { source: string; reason?: string; }
export function EmptySourceState({ source, reason }: EmptySourceStateProps) {
  return (
    <div className="flex items-center gap-3 p-3 border border-dashed border-[#E2DBD0] bg-[#FAF6F0]" style={{ borderRadius: '0px' }}>
      <div className="text-[#8A332E] text-lg">⚠️</div>
      <div>
        <p className="text-xs font-bold font-data-mono text-[#8A332E]">{source.toUpperCase()} DATA SOURCE OFFLINE</p>
        <p className="text-[11px] text-[#556B82] mt-0.5">{reason || 'Pillar coefficients reallocated dynamically'}</p>
      </div>
    </div>
  );
}
