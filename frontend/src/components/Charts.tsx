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
  style?: React.CSSProperties;
}
export function AnimatedCounter({ target, duration = 1000, decimals = 0, suffix = '', className = '', style }: AnimatedCounterProps) {
  const [current, setCurrent] = useState(0);
  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      setCurrent(target);
      return;
    }
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
    <span className={className} style={style}>
      {current.toFixed(decimals)}{suffix}
    </span>
  );
}

// ─── Score Gauge (Radial Arc) ─────────────────────────────────────────────────
interface ScoreGaugeProps { score: number; size?: number; label?: string; }
export function ScoreGauge({ score, size = 200, label }: ScoreGaugeProps) {
  const [displayed, setDisplayed] = useState(0);
  useEffect(() => {
    const timer = setTimeout(() => setDisplayed(score), 100);
    return () => clearTimeout(timer);
  }, [score]);

  const data = [{ value: displayed, fill: scoreToColor(score) }];

  return (
    <div className="relative flex items-center justify-center animate-none" style={{ width: size, height: size * 0.7 }}>
      <RadialBarChart
        width={size}
        height={size * 0.7}
        cx={size / 2}
        cy={size * 0.6}
        innerRadius={size * 0.35}
        outerRadius={size * 0.42}
        startAngle={200}
        endAngle={-20}
        data={[{ value: 100, fill: '#E2DBD0' }, ...data]}
        barSize={6}
      >
        <RadialBar background={{ fill: 'transparent' }} dataKey="value" cornerRadius={0} />
      </RadialBarChart>
      <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ paddingTop: size * 0.15 }}>
        <AnimatedCounter
          target={score}
          duration={900}
          className="font-bold font-serif-editorial text-[#0C182A] leading-none"
          style={{ fontSize: size * 0.22 }}
        />
        <span className="text-[#556B82] font-data-mono" style={{ fontSize: size * 0.06 }}>/ 100</span>
        {label && <span className="text-xxs font-data-mono text-[#556B82] mt-1">{label}</span>}
      </div>
    </div>
  );
}

function scoreToColor(score: number) {
  if (score >= 75) return '#234E45'; // Forest Green
  if (score >= 60) return '#7B5500'; // Amber/Gold
  return '#8A332E'; // Rust Red
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
      <RadarChart data={data} margin={{ top: 10, right: 35, bottom: 10, left: 35 }}>
        <PolarGrid stroke="#E2DBD0" />
        <PolarAngleAxis dataKey="subject" tick={{ fill: '#556B82', fontSize: 10, fontFamily: 'IBM Plex Mono, monospace' }} />
        <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} axisLine={false} />
        <Radar
          name="Score"
          dataKey="A"
          stroke="#234E45"
          fill="#234E45"
          fillOpacity={0.12}
          strokeWidth={1.5}
          dot={{ r: 3, fill: '#234E45', strokeWidth: 0 }}
        />
      </RadarChart>
    </ResponsiveContainer>
  );
}

// ─── Sparkline ────────────────────────────────────────────────────────────────
interface SparkLineProps { data: number[]; color?: string; height?: number; }
export function SparkLine({ data, color = '#234E45', height = 32 }: SparkLineProps) {
  const chartData = data.map((v, i) => ({ i, v }));
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={chartData} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
        <Line type="monotone" dataKey="v" stroke={color} strokeWidth={1.25} dot={false} />
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
          {keys.map(k => {
            const mappedColor = k.color === '#10B981' || k.color === '#3B82F6' ? '#234E45' : k.color === '#F59E0B' ? '#7B5500' : '#8A332E';
            return (
              <linearGradient key={k.key} id={`grad-${k.key}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={mappedColor} stopOpacity={0.15} />
                <stop offset="95%" stopColor={mappedColor} stopOpacity={0} />
              </linearGradient>
            );
          })}
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#FAF6F0" vertical={false} />
        <XAxis dataKey="month" tick={{ fill: '#556B82', fontSize: 9, fontFamily: 'IBM Plex Mono, monospace' }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fill: '#556B82', fontSize: 9, fontFamily: 'IBM Plex Mono, monospace' }} axisLine={false} tickLine={false} />
        <Tooltip
          contentStyle={{ background: '#FAF8F5', border: '1px solid #E2DBD0', borderRadius: 0 }}
          labelStyle={{ color: '#0C182A', fontSize: 10, fontFamily: 'IBM Plex Mono, monospace', fontWeight: 600 }}
          itemStyle={{ fontSize: 10, fontFamily: 'IBM Plex Mono, monospace' }}
        />
        {keys.map(k => {
          const mappedColor = k.color === '#10B981' || k.color === '#3B82F6' ? '#234E45' : k.color === '#F59E0B' ? '#7B5500' : '#8A332E';
          return (
            <Area key={k.key} type="monotone" dataKey={k.key} stroke={mappedColor} strokeWidth={1.5}
              fill={`url(#grad-${k.key})`} name={k.label} />
          );
        })}
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
      <BarChart data={data} margin={{ top: 5, right: 5, left: -25, bottom: 5 }} barCategoryGap="40%">
        <CartesianGrid strokeDasharray="3 3" stroke="#FAF6F0" horizontal vertical={false} />
        <XAxis dataKey="name" tick={{ fill: '#556B82', fontSize: 9, fontFamily: 'IBM Plex Mono, monospace' }} axisLine={false} tickLine={false} />
        <YAxis domain={[0, 100]} tick={{ fill: '#556B82', fontSize: 9, fontFamily: 'IBM Plex Mono, monospace' }} axisLine={false} tickLine={false} />
        <Tooltip
          contentStyle={{ background: '#FAF8F5', border: '1px solid #E2DBD0', borderRadius: 0 }}
          labelStyle={{ color: '#0C182A', fontSize: 10, fontFamily: 'IBM Plex Mono, monospace', fontWeight: 600 }}
        />
        <Bar dataKey="value" radius={0}>
          {data.map((d, i) => {
            const mappedColor = d.color === '#10B981' || d.color === '#3B82F6' ? '#234E45' : d.color === '#F59E0B' ? '#7B5500' : '#8A332E';
            return (
              <Cell key={i} fill={mappedColor} fillOpacity={0.85} />
            );
          })}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
