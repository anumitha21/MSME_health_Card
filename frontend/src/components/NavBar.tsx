import { NavLink, Link, useLocation } from 'react-router-dom';
import {
  Home, BarChart3, User,
} from 'lucide-react';
import { useCreditData } from '../context/CreditDataContext';
import { SAMPLE_ENTERPRISE_IDS } from '../data/api';

const LINKS = [
  { to: '/',          label: 'Overview',        icon: Home },
  { to: '/borrower',  label: 'Borrower Portal', icon: User },
  { to: '/banker',    label: 'Banker Console',  icon: BarChart3 },
];

export default function NavBar() {
  const { pathname } = useLocation();
  const { enterpriseId, setEnterpriseId, backendAlive } = useCreditData();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 select-none">
      <div className="bg-[#FAF8F3]/90 border-b border-[#E9E6DF] backdrop-blur-md rounded-none">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center justify-between h-14">
            
            {/* Logo Stamp */}
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#ECFDF5] border border-[#A7F3D0] flex items-center justify-center flex-shrink-0">
                <svg className="w-4.5 h-4.5 text-[#0E6E4E]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2L2 7l10 5 10-5-10-5z" />
                  <path d="M2 17l10 5 10-5" />
                  <path d="M2 12l10 5 10-5" />
                </svg>
              </div>
              <div>
                <span className="text-sm font-bold text-[#0B1220] tracking-tight">MSME Health Card</span>
                <span className="hidden sm:inline text-xs text-[#0E6E4E] font-bold ml-2 font-data-mono">AI CREDIT</span>
              </div>
            </div>

            {/* Nav links */}
            <nav className="hidden lg:flex items-center gap-1">
              {LINKS.map((link) => {
                const Icon = link.icon;
                const isActive = pathname === link.to;
                return (
                  <NavLink key={link.to} to={link.to}>
                    <div
                      className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold uppercase font-data-mono tracking-wider border transition-all cursor-pointer rounded-lg ${
                        isActive
                          ? 'text-[#0E6E4E] bg-[#ECFDF5] border-[#A7F3D0]'
                          : 'text-[#64748B] border-transparent hover:text-[#0E6E4E] hover:bg-[#ECFDF5]'
                      }`}
                    >
                      <Icon size={12} />
                      {link.label}
                    </div>
                  </NavLink>
                );
              })}
            </nav>

            {/* Enterprise Selector & Status */}
            <div className="flex items-center gap-3">
              {/* Active enterprise select */}
              <div className="flex items-center gap-1.5">
                <span className="text-xxs font-bold text-[#64748B] uppercase tracking-wide hidden md:inline">Profile:</span>
                <select
                  value={enterpriseId}
                  onChange={e => setEnterpriseId(e.target.value)}
                  className="bg-white border-[#E9E6DF] text-[#0B1220] focus:border-[#0E6E4E] rounded-lg px-2.5 py-1 text-xs font-bold cursor-pointer transition-colors"
                >
                  {SAMPLE_ENTERPRISE_IDS.map(id => (
                    <option key={id} value={id} className="bg-white text-[#0B1220] font-semibold">{id}</option>
                  ))}
                </select>
              </div>

              {/* Status Dot (Linked to Live Predictive Panel) */}
              <Link 
                to="/live" 
                className="flex items-center gap-1.5 hover:opacity-80 transition-opacity" 
                title="API Connection Dashboard"
              >
                <span className="text-xxs font-bold text-[#64748B] uppercase hidden sm:inline">API:</span>
                <div
                  className={`w-2.5 h-2.5 rounded-full border border-black/20 transition-all ${
                    backendAlive === null ? 'bg-slate-400' :
                    backendAlive ? 'bg-[#0E6E4E]' : 'bg-[#C2410C]'
                  }`}
                />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
