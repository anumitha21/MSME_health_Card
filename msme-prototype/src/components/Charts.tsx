import { useEffect, useState } from 'react';
import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, RadialBarChart, RadialBar,
  LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, AreaChart, Area,
  BarChart, Bar, Cell,
} from 'recharts';

// ─── Animated Score Counter ───────────────────────────────────────────────────
interface AnimatedCounterProps {
  target: number;
  duration?: number;
  decimals?: number;
  suffix?: string;
  className?: string;
}
export function AnimatedCounter({ target, duration = 1500, decimals = 0, suffix = '', className = '' }: AnimatedCounterProps) {
  const [current, setCurrent] = useState(0);
  useEffect(() => {
    const start = Date.now();
    const tick = () => {
      const elapsed = Date.now() - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCurrent(eased * target);
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [target, duration]);
  return (
    <span className={className}>
      {current.toFixed(decimals)}{suffix}
    </span>
  );
}

// ─── Score Gauge (Radial Arc) ─────────────────────────────────────────────────
interface ScoreGaugeProps { score: number; size?: number; label?: string; }
export function ScoreGauge({ score, size = 200, label }: ScoreGaugeProps) {
  const [displayed, setDisplayed] = useState(0);
  useEffect(() => {
    const timer = setTimeout(() => setDisplayed(score), 200);
    return () => clearTimeout(timer);
  }, [score]);

  const data = [{ value: displayed, fill: scoreToColor(score) }];

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size * 0.7 }}>
      <RadialBarChart
        width={size}
        height={size * 0.7}
        cx={size / 2}
        cy={size * 0.6}
        innerRadius={size * 0.32}
        outerRadius={size * 0.45}
        startAngle={200}
        endAngle={-20}
        data={[{ value: 100, fill: 'rgba(255,255,255,0.05)' }, ...data]}
        barSize={size * 0.055}
      >
        <RadialBar background={{ fill: 'transparent' }} dataKey="value" cornerRadius={size * 0.02} />
      </RadialBarChart>
      <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ paddingTop: size * 0.15 }}>
        <AnimatedCounter
          target={score}
          duration={1200}
          className="font-bold text-white leading-none"
        />
        <span className="text-slate-400 font-medium" style={{ fontSize: size * 0.07 }}>/ 100</span>
        {label && <span className="text-xs text-slate-500 mt-1">{label}</span>}
      </div>
    </div>
  );
}

function scoreToColor(score: number) {
  if (score >= 80) return '#10B981';
  if (score >= 65) return '#3B82F6';
  if (score >= 50) return '#F59E0B';
  return '#EF4444';
}

// ─── Sub-Score Radar ──────────────────────────────────────────────────────────
interface RadarChartProps {
  scores: { gst: number; upi: number; aa: number; epfo: number };
  size?: number;
}
export function SubScoreRadar({ scores, size = 300 }: RadarChartProps) {
  const data = [
    { subject: 'GST Filing', A: scores.gst, fullMark: 100 },
    { subject: 'UPI Cash Flow', A: scores.upi, fullMark: 100 },
    { subject: 'Bank (AA)', A: scores.aa, fullMark: 100 },
    { subject: 'EPFO Payroll', A: scores.epfo ?? 0, fullMark: 100 },
  ];
  return (
    <ResponsiveContainer width="100%" height={size}>
      <RadarChart data={data} margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
        <PolarGrid stroke="rgba(255,255,255,0.06)" />
        <PolarAngleAxis dataKey="subject" tick={{ fill: 'rgba(148,163,184,0.8)', fontSize: 11 }} />
        <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} axisLine={false} />
        <Radar
          name="Score"
          dataKey="A"
          stroke="#10B981"
          fill="#10B981"
          fillOpacity={0.15}
          strokeWidth={2}
          dot={{ r: 4, fill: '#10B981', strokeWidth: 0 }}
        />
      </RadarChart>
    </ResponsiveContainer>
  );
}

// ─── Sparkline ────────────────────────────────────────────────────────────────
interface SparkLineProps { data: number[]; color?: string; height?: number; }
export function SparkLine({ data, color = '#10B981', height = 32 }: SparkLineProps) {
  const chartData = data.map((v, i) => ({ i, v }));
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={chartData} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
        <Line type="monotone" dataKey="v" stroke={color} strokeWidth={1.5} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}

// ─── Area Chart (UPI / AA Balance) ────────────────────────────────────────────
interface GlassAreaChartProps {
  data: { month: string; [key: string]: string | number }[];
  keys: { key: string; color: string; label: string }[];
  height?: number;
}
export function GlassAreaChart({ data, keys, height = 200 }: GlassAreaChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
        <defs>
          {keys.map(k => (
            <linearGradient key={k.key} id={`grad-${k.key}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={k.color} stopOpacity={0.25} />
              <stop offset="95%" stopColor={k.color} stopOpacity={0} />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
        <XAxis dataKey="month" tick={{ fill: 'rgba(148,163,184,0.6)', fontSize: 10 }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fill: 'rgba(148,163,184,0.6)', fontSize: 10 }} axisLine={false} tickLine={false} />
        <Tooltip
          contentStyle={{ background: 'rgba(12,22,45,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }}
          labelStyle={{ color: '#94A3B8', fontSize: 11 }}
          itemStyle={{ fontSize: 11 }}
        />
        {keys.map(k => (
          <Area key={k.key} type="monotone" dataKey={k.key} stroke={k.color} strokeWidth={2}
            fill={`url(#grad-${k.key})`} name={k.label} />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  );
}

// ─── Bar Chart ────────────────────────────────────────────────────────────────
interface GlassBarChartProps {
  data: { name: string; value: number; color?: string }[];
  height?: number;
}
export function GlassBarChart({ data, height = 160 }: GlassBarChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 5, right: 5, left: -25, bottom: 5 }} barCategoryGap="35%">
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" horizontal vertical={false} />
        <XAxis dataKey="name" tick={{ fill: 'rgba(148,163,184,0.6)', fontSize: 10 }} axisLine={false} tickLine={false} />
        <YAxis domain={[0, 100]} tick={{ fill: 'rgba(148,163,184,0.6)', fontSize: 10 }} axisLine={false} tickLine={false} />
        <Tooltip
          contentStyle={{ background: 'rgba(12,22,45,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }}
          labelStyle={{ color: '#94A3B8', fontSize: 11 }}
        />
        <Bar dataKey="value" radius={[4, 4, 0, 0]}>
          {data.map((d, i) => (
            <Cell key={i} fill={d.color || '#3B82F6'} fillOpacity={0.8} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
