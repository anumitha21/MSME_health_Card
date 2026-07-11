import { type ReactNode, useState } from 'react';
import { Info } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// ─── GlassCard ────────────────────────────────────────────────────────────────
interface GlassCardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  glow?: 'emerald' | 'gold' | 'blue' | 'purple' | 'none';
  onClick?: () => void;
  style?: React.CSSProperties;
}
export function GlassCard({ children, className = '', hover = false, glow = 'none', onClick, style }: GlassCardProps) {

  return (
    <motion.div
      className={`glass ${hover ? 'glass-hover cursor-pointer' : ''} ${className}`}
      style={{ ...(glow !== 'none' ? { boxShadow: `0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.08)` } : {}), ...style }}
      onClick={onClick}
      whileHover={hover ? { y: -2 } : undefined}
      transition={{ duration: 0.2 }}
    >
      {children}
    </motion.div>
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
      <Info size={12} className="text-slate-500 hover:text-slate-300 cursor-help ml-1 flex-shrink-0" />
      <AnimatePresence>
        {show && (
          <motion.div
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.92 }}
            transition={{ duration: 0.15 }}
            className={`absolute z-50 w-52 p-3 glass text-xs text-slate-300 leading-relaxed pointer-events-none ${posMap[side]}`}
          >
            {text}
          </motion.div>
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
  gst:  { label: 'GST', icon: '🧾', color: '#F59E0B', bg: 'rgba(245,158,11,0.15)', border: 'rgba(245,158,11,0.3)' },
  upi:  { label: 'UPI', icon: '⚡', color: '#10B981', bg: 'rgba(16,185,129,0.15)',  border: 'rgba(16,185,129,0.3)' },
  aa:   { label: 'AA',  icon: '🏦', color: '#3B82F6', bg: 'rgba(59,130,246,0.15)', border: 'rgba(59,130,246,0.3)' },
  epfo: { label: 'EPFO', icon: '👥', color: '#8B5CF6', bg: 'rgba(139,92,246,0.15)', border: 'rgba(139,92,246,0.3)' },
};
export function SourceBadge({ source, size = 'md', showLabel = true }: SourceBadgeProps) {
  const cfg = SOURCE_CONFIG[source];
  const sizeMap = { sm: 'text-xs px-2 py-0.5', md: 'text-xs px-2.5 py-1', lg: 'text-sm px-3 py-1.5' };
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-semibold ${sizeMap[size]}`}
      style={{ color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.border}` }}
    >
      <span>{cfg.icon}</span>
      {showLabel && cfg.label}
    </span>
  );
}

// ─── ScoreTierBadge ───────────────────────────────────────────────────────────
interface ScoreTierBadgeProps { tier: string; size?: 'sm' | 'md' | 'lg'; }
export function ScoreTierBadge({ tier, size = 'md' }: ScoreTierBadgeProps) {
  const tierMap: Record<string, { color: string; bg: string; label: string }> = {
    'A+': { color: '#10B981', bg: 'rgba(16,185,129,0.15)', label: 'Prime' },
    'A':  { color: '#34D399', bg: 'rgba(52,211,153,0.12)', label: 'Strong' },
    'B+': { color: '#60A5FA', bg: 'rgba(96,165,250,0.12)', label: 'Moderate' },
    'B':  { color: '#93C5FD', bg: 'rgba(147,197,253,0.12)', label: 'Moderate' },
    'C':  { color: '#FBBF24', bg: 'rgba(251,191,36,0.12)', label: 'Watchlist' },
    'D':  { color: '#F97316', bg: 'rgba(249,115,22,0.12)', label: 'High Risk' },
    'E':  { color: '#EF4444', bg: 'rgba(239,68,68,0.12)',  label: 'Decline' },
  };
  const cfg = tierMap[tier] || tierMap['C'];
  const sizeMap = { sm: 'text-xs px-2 py-0.5', md: 'text-sm px-3 py-1', lg: 'text-base px-4 py-1.5' };
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-bold ${sizeMap[size]}`}
      style={{ color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.color}33` }}
    >
      Tier {tier} · {cfg.label}
    </span>
  );
}

// ─── ConfidenceBadge ─────────────────────────────────────────────────────────
interface ConfidenceBadgeProps { sources: number; total: number; level: string; }
export function ConfidenceBadge({ sources, total, level }: ConfidenceBadgeProps) {
  const colors = { Gold: '#C9A15A', Silver: '#94A3B8', Bronze: '#B45309' };
  const c = colors[level as keyof typeof colors] || colors.Silver;
  return (
    <div className="flex items-center gap-2 glass-sm px-3 py-1.5 rounded-full">
      <div className="flex gap-1">
        {Array.from({ length: total }).map((_, i) => (
          <div key={i} className="w-2 h-2 rounded-full" style={{ background: i < sources ? c : 'rgba(255,255,255,0.1)' }} />
        ))}
      </div>
      <span className="text-xs font-semibold" style={{ color: c }}>{level} Confidence</span>
      <span className="text-xs text-slate-500">({sources}/{total} sources)</span>
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
      <div className="flex items-center gap-3 mb-1">
        <h2 className="text-xl font-bold text-white">{title}</h2>
        {badge}
      </div>
      {subtitle && <p className="text-sm text-slate-400 leading-relaxed max-w-2xl">{subtitle}</p>}
    </div>
  );
}

// ─── ProgressBar ─────────────────────────────────────────────────────────────
interface ProgressBarProps { value: number; max?: number; color?: string; className?: string; }
export function ProgressBar({ value, max = 100, color = '#10B981', className = '' }: ProgressBarProps) {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <div className={`progress-track ${className}`}>
      <motion.div
        className="progress-fill"
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        style={{ background: color }}
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
    <div className="glass-sm p-4 rounded-xl">
      <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-2 font-medium uppercase tracking-wide">
        {icon}
        {label}
        {tooltip && <InfoTooltip text={tooltip} />}
      </div>
      <div className="text-2xl font-bold" style={{ color: color || 'white' }}>{value}</div>
      {sub && <div className="text-xs text-slate-500 mt-1">{sub}</div>}
    </div>
  );
}

// ─── EmptySourceState ────────────────────────────────────────────────────────
interface EmptySourceStateProps { source: string; reason?: string; }
export function EmptySourceState({ source, reason }: EmptySourceStateProps) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl border border-dashed border-white/10 bg-white/[0.02]">
      <div className="text-slate-600 text-xl">⚠️</div>
      <div>
        <p className="text-xs font-medium text-slate-400">{source} data unavailable</p>
        <p className="text-xs text-slate-500">{reason || 'Score reweighted across remaining sources'}</p>
      </div>
    </div>
  );
}
