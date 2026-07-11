import { NavLink, useLocation } from 'react-router-dom';
import {
  Home, Shield, User, BarChart3, Database, Sliders, Zap,
} from 'lucide-react';
import { useCreditData } from '../context/CreditDataContext';
import { SAMPLE_ENTERPRISE_IDS } from '../data/api';

const LINKS = [
  { to: '/',          label: 'Overview',       icon: Home },
  { to: '/consent',   label: 'Data Connect',   icon: Shield },
  { to: '/live',      label: 'Live Score',     icon: Zap },
  { to: '/borrower',  label: 'Borrower',       icon: User },
  { to: '/banker',    label: 'Banker',         icon: BarChart3 },
  { to: '/drilldown', label: 'Data Drill-Down',icon: Database },
  { to: '/simulator', label: 'What-If Sim',    icon: Sliders },
];

export default function NavBar() {
  const { pathname } = useLocation();
  const { enterpriseId, setEnterpriseId, backendAlive } = useCreditData();

  return (
    <header className="fixed top-0 left-0 right-0 z-50">
      <div className="glass border-b border-white/[0.06] backdrop-blur-xl rounded-none">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center justify-between h-14">
            {/* Logo */}
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-xs font-bold"
                style={{ boxShadow: '0 0 20px rgba(16,185,129,0.3)' }}>
                MH
              </div>
              <div>
                <span className="text-sm font-bold text-white">MSME Health Card</span>
                <span className="hidden sm:inline text-xs text-slate-500 ml-2">AI Credit</span>
              </div>
            </div>

            {/* Nav links */}
            <nav className="hidden lg:flex items-center gap-1">
              {LINKS.map((link) => {
                const Icon = link.icon;
                const isActive = pathname === link.to;
                const isLive = link.to === '/live';
                return (
                  <NavLink key={link.to} to={link.to}>
                    <div
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 cursor-pointer ${
                        isActive
                          ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                      }`}
                    >
                      <Icon size={13} />
                      {link.label}
                      {isLive && !isActive && (
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      )}
                    </div>
                  </NavLink>
                );
              })}
            </nav>

            {/* Enterprise Selector & Status */}
            <div className="flex items-center gap-3">
              {/* Active enterprise select */}
              <div className="flex items-center gap-1.5">
                <span className="text-xxs font-bold text-slate-500 uppercase tracking-wide hidden md:inline">Profile:</span>
                <select
                  value={enterpriseId}
                  onChange={e => setEnterpriseId(e.target.value)}
                  className="bg-white/[0.04] border border-white/10 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-300 focus:outline-none focus:border-emerald-500/40 cursor-pointer"
                >
                  {SAMPLE_ENTERPRISE_IDS.map(id => (
                    <option key={id} value={id} className="bg-navy-950 text-slate-300 font-semibold">{id}</option>
                  ))}
                </select>
              </div>

              {/* Status Dot */}
              <div
                className={`w-2.5 h-2.5 rounded-full border border-black/20 ${
                  backendAlive === null ? 'bg-slate-400' :
                  backendAlive ? 'bg-emerald-500 shadow-[0_0_8px_#10B981]' : 'bg-red-500'
                }`}
                title={backendAlive ? 'ML Backend: Online' : 'ML Backend: Offline'}
              />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
