// ─── Mock Data for MSME Financial Health Card Prototype ──────────────────────

export const MOCK_ENTERPRISE = {
  id: 'MSME-MH-2024-7821',
  name: 'Arjun Textile Works',
  owner: 'Arjun Mehta',
  gstin: '27AABCU9603R1ZM',
  sector: 'Textile Manufacturing',
  city: 'Surat, Gujarat',
  vintage: '6 years',
  employees: 24,
  loanAmount: '₹35,00,000',
};

export const MOCK_SCORE = {
  overall: 74,
  tier: 'B+',
  tierLabel: 'Moderate Risk',
  pd: 4.2,
  confidenceSources: 4,
  totalSources: 4,
  confidence: 'Gold',
  scoreRange: [69, 79],
  percentile: 72,
  // Sub-scores (0–100)
  gst: 81,
  upi: 76,
  aa: 68,
  epfo: 71,
};

export const MOCK_SCORE_PARTIAL = {
  overall: 67,
  tier: 'C',
  tierLabel: 'Watchlist',
  pd: 7.1,
  confidenceSources: 3,
  totalSources: 4,
  confidence: 'Silver',
  scoreRange: [60, 74],
  percentile: 48,
  gst: 81,
  upi: 76,
  aa: 68,
  epfo: null, // unavailable
};

export const SOURCE_META = {
  gst: {
    key: 'gst',
    label: 'GST Filing',
    color: '#F59E0B',
    bg: 'rgba(245,158,11,0.12)',
    border: 'rgba(245,158,11,0.25)',
    icon: '🧾',
    description: 'Goods & Services Tax return filing history — reveals revenue regularity and compliance discipline',
    weight: '28%',
  },
  upi: {
    key: 'upi',
    label: 'UPI Cash Flow',
    color: '#10B981',
    bg: 'rgba(16,185,129,0.12)',
    border: 'rgba(16,185,129,0.25)',
    icon: '⚡',
    description: 'Unified Payments Interface transaction velocity — real-time operational cash flow proxy',
    weight: '25%',
  },
  aa: {
    key: 'aa',
    label: 'Bank (AA)',
    color: '#3B82F6',
    bg: 'rgba(59,130,246,0.12)',
    border: 'rgba(59,130,246,0.25)',
    icon: '🏦',
    description: 'Account Aggregator bank statement — balance trends, overdraft utilisation, trade payables',
    weight: '30%',
  },
  epfo: {
    key: 'epfo',
    label: 'EPFO Payroll',
    color: '#8B5CF6',
    bg: 'rgba(139,92,246,0.12)',
    border: 'rgba(139,92,246,0.25)',
    icon: '👥',
    description: 'Employee Provident Fund deposit regularity — proxy for workforce stability and business continuity',
    weight: '17%',
  },
};

export const MOCK_GST_DATA = {
  score: 81,
  trend: 'Stable',
  filings: [
    { month: 'Jan', filed: true, onTime: true, turnover: 8.2 },
    { month: 'Feb', filed: true, onTime: true, turnover: 9.1 },
    { month: 'Mar', filed: true, onTime: false, turnover: 10.4 },
    { month: 'Apr', filed: true, onTime: true, turnover: 7.8 },
    { month: 'May', filed: true, onTime: true, turnover: 8.6 },
    { month: 'Jun', filed: true, onTime: true, turnover: 9.3 },
    { month: 'Jul', filed: false, onTime: false, turnover: 0 },
    { month: 'Aug', filed: true, onTime: true, turnover: 8.9 },
    { month: 'Sep', filed: true, onTime: true, turnover: 9.7 },
    { month: 'Oct', filed: true, onTime: true, turnover: 10.2 },
    { month: 'Nov', filed: true, onTime: false, turnover: 9.4 },
    { month: 'Dec', filed: true, onTime: true, turnover: 11.1 },
  ],
  annualTurnover: '₹1.12 Cr',
  taxToIncomeRatio: 0.68,
  gstComplianceScore: 91.7,
  missedFilings: 1,
  lateFilings: 2,
};

export const MOCK_UPI_DATA = {
  score: 76,
  trend: 'Improving',
  monthly: [
    { month: 'Jul', inflow: 6.2, outflow: 5.4 },
    { month: 'Aug', inflow: 7.1, outflow: 5.9 },
    { month: 'Sep', inflow: 7.8, outflow: 6.2 },
    { month: 'Oct', inflow: 8.3, outflow: 6.5 },
    { month: 'Nov', inflow: 8.0, outflow: 6.8 },
    { month: 'Dec', inflow: 9.2, outflow: 7.1 },
  ],
  avgMonthlyInflow: '₹7.77L',
  bounceRate: 3.2,
  merchantCategories: [
    { name: 'Textile Wholesale', pct: 45 },
    { name: 'Raw Materials', pct: 28 },
    { name: 'Logistics', pct: 15 },
    { name: 'Other', pct: 12 },
  ],
};

export const MOCK_AA_DATA = {
  score: 68,
  trend: 'Watch',
  balanceTrend: [
    { month: 'Jul', balance: 4.2 },
    { month: 'Aug', balance: 3.8 },
    { month: 'Sep', balance: 5.1 },
    { month: 'Oct', balance: 4.6 },
    { month: 'Nov', balance: 3.2 },
    { month: 'Dec', balance: 4.9 },
  ],
  avgBalance: '₹4.3L',
  overdraftUtil: 42,
  tradePayableDays: 38,
  bounces: 2,
};

export const MOCK_EPFO_DATA = {
  score: 71,
  trend: 'Stable',
  contributions: [
    { month: 'Jan', paid: true, onTime: true, employees: 22 },
    { month: 'Feb', paid: true, onTime: true, employees: 22 },
    { month: 'Mar', paid: true, onTime: true, employees: 23 },
    { month: 'Apr', paid: true, onTime: false, employees: 23 },
    { month: 'May', paid: true, onTime: true, employees: 24 },
    { month: 'Jun', paid: true, onTime: true, employees: 24 },
    { month: 'Jul', paid: false, onTime: false, employees: 0 },
    { month: 'Aug', paid: true, onTime: true, employees: 24 },
    { month: 'Sep', paid: true, onTime: true, employees: 24 },
    { month: 'Oct', paid: true, onTime: true, employees: 24 },
    { month: 'Nov', paid: true, onTime: true, employees: 24 },
    { month: 'Dec', paid: true, onTime: true, employees: 24 },
  ],
  headcountTrend: [22, 22, 23, 23, 24, 24, 24, 24, 24, 24, 24, 24],
  avgEmployees: 23,
  missedMonths: 1,
};

export const MOCK_STRENGTHS = [
  { label: 'Consistent GST Filing', detail: '11/12 months filed, 91.7% on-time rate', source: 'gst', lift: '+12' },
  { label: 'Growing UPI Revenue', detail: 'Cash inflows up 48% over last 6 months', source: 'upi', lift: '+9' },
  { label: 'Stable Workforce', detail: 'Headcount grew from 22 → 24 in 12 months', source: 'epfo', lift: '+7' },
];

export const MOCK_RISKS = [
  { label: 'Elevated Overdraft Use', detail: '42% utilisation — above the 35% comfort threshold', source: 'aa', drag: '-8' },
  { label: 'One Missed EPFO Month', detail: 'July contribution gap requires explanation', source: 'epfo', drag: '-4' },
  { label: 'Trade Payable Days Rising', detail: '38 days — trending upward from 29 days last quarter', source: 'aa', drag: '-5' },
];

export const MOCK_IMPROVEMENTS = [
  { action: 'Reduce overdraft utilisation below 35%', lift: '+6', effort: 'Medium', source: 'aa' },
  { action: 'File GSTR-3B on time for next 3 consecutive months', lift: '+4', effort: 'Low', source: 'gst' },
  { action: 'Link EPFO account (missing 1 month explanation)', lift: '+3', effort: 'Low', source: 'epfo' },
  { action: 'Route more receipts through registered UPI ID', lift: '+5', effort: 'Medium', source: 'upi' },
];

export const MOCK_PORTFOLIO = {
  sectorAvgScore: 61,
  sectorPercentile: 72,
  benchmarkSectors: [
    { sector: 'Textile', avgScore: 61, yourScore: 74 },
    { sector: 'Trading', avgScore: 58, yourScore: null },
    { sector: 'Manufacturing', avgScore: 63, yourScore: null },
    { sector: 'Services', avgScore: 66, yourScore: null },
  ],
};

export const CONSENT_SOURCES = [
  { key: 'gst', label: 'GST Portal', icon: '🧾', color: '#F59E0B', status: 'connected', detail: '12 months of filing data retrieved' },
  { key: 'upi', label: 'UPI / NPCI', icon: '⚡', color: '#10B981', status: 'connected', detail: '6 months of transaction history fetched' },
  { key: 'aa', label: 'Account Aggregator (AA)', icon: '🏦', color: '#3B82F6', status: 'connected', detail: 'Bank statements from 2 accounts linked' },
  { key: 'epfo', label: 'EPFO Payroll', icon: '👥', color: '#8B5CF6', status: 'pending', detail: 'Awaiting consent confirmation' },
];

export type ConsentStatus = 'idle' | 'connecting' | 'connected' | 'unavailable' | 'pending';
