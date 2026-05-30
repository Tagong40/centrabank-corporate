import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { auth } from '../firebase';
import { useAuth } from '../context/AuthContext';
import {
  LogOut, LayoutDashboard, Send, ShieldCheck, CreditCard,
  BarChart3, Wallet, HelpCircle, Settings as SettingsIcon,
  Menu, X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const Navbar: React.FC = () => {
  const { profile, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);

  // Close drawer on route change
  useEffect(() => setOpen(false), [location.pathname]);

  const handleLogout = async () => {
    await auth.signOut();
    navigate('/login');
  };

  const navLinks = [
    { to: '/',            label: 'Dashboard',   icon: LayoutDashboard, show: !!profile },
    { to: '/transfer',    label: 'Transfer',     icon: Send,            show: !!(profile && !isAdmin && profile.status === 'approved') },
    { to: '/cards',       label: 'Cards',        icon: Wallet,          show: !!(profile && !isAdmin && profile.status === 'approved') },
    { to: '/investments', label: 'Investments',  icon: BarChart3,       show: !!(profile && !isAdmin && profile.status === 'approved') },
    { to: '/resources',   label: 'Resources',    icon: HelpCircle,      show: !!(profile && !isAdmin && profile.status === 'approved') },
    { to: '/admin',       label: 'Admin Portal', icon: ShieldCheck,     show: isAdmin },
    { to: '/settings',    label: 'Settings',     icon: SettingsIcon,    show: !!profile },
  ].filter(l => l.show);

  const isActive = (to: string) =>
    to === '/' ? location.pathname === '/' : location.pathname.startsWith(to);

  return (
    <>
      {/* ── Top bar ── */}
      <nav className="bg-white border-b border-gray-200 fixed top-0 w-full z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">

            {/* Logo */}
            <Link
              to={profile ? '/' : '/login'}
              className="flex items-center gap-2 text-lg font-black text-gray-900 tracking-tight flex-shrink-0"
            >
              <CreditCard className="w-5 h-5 text-indigo-600" />
              CentraBank
            </Link>

            {/* Desktop nav links */}
            {profile && (
              <div className="hidden md:flex items-center gap-1">
                {navLinks.map(({ to, label, icon: Icon }) => (
                  <Link
                    key={to}
                    to={to}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold transition-all ${
                      isActive(to)
                        ? 'bg-indigo-50 text-indigo-700'
                        : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {label}
                  </Link>
                ))}
              </div>
            )}

            {/* Right side */}
            <div className="flex items-center gap-2">
              {profile ? (
                <>
                  {/* Desktop: user pill + logout */}
                  <Link
                    to="/settings"
                    className="hidden sm:flex flex-col text-right leading-tight hover:opacity-80 transition-opacity mr-1"
                  >
                    <span className="text-sm font-bold text-gray-900">{profile.displayName}</span>
                    <span className="text-[11px] text-gray-400 capitalize">{profile.role} · {profile.status}</span>
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="hidden md:flex items-center p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                    title="Sign out"
                  >
                    <LogOut className="w-5 h-5" />
                  </button>

                  {/* Mobile: hamburger */}
                  <button
                    onClick={() => setOpen(v => !v)}
                    className="md:hidden flex items-center justify-center w-9 h-9 rounded-xl text-gray-500 hover:bg-gray-100 transition-all"
                    aria-label="Menu"
                  >
                    {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                  </button>
                </>
              ) : (
                /* Logged-out: show Sign In link */
                <Link
                  to="/login"
                  className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl transition-all"
                >
                  Sign In
                </Link>
              )}
            </div>

          </div>
        </div>
      </nav>

      {/* ── Mobile drawer ── */}
      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop */}
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              className="fixed inset-0 top-16 bg-black/20 backdrop-blur-sm z-40 md:hidden"
            />

            {/* Drawer */}
            <motion.div
              key="drawer"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
              className="fixed top-16 inset-x-0 z-50 md:hidden bg-white border-b border-gray-100 shadow-xl"
            >
              {/* Nav links */}
              <div className="px-4 pt-4 pb-2 space-y-1">
                {navLinks.map(({ to, label, icon: Icon }) => (
                  <Link
                    key={to}
                    to={to}
                    className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold transition-all ${
                      isActive(to)
                        ? 'bg-indigo-50 text-indigo-700'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  >
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    {label}
                  </Link>
                ))}
              </div>

              {/* User row + logout */}
              <div className="px-4 py-4 border-t border-gray-100 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-gray-900 truncate">{profile?.displayName}</p>
                  <p className="text-xs text-gray-400 capitalize">{profile?.role} · {profile?.status}</p>
                </div>
                <button
                  onClick={handleLogout}
                  className="flex-shrink-0 flex items-center gap-2 px-4 py-2.5 bg-red-50 text-red-600 hover:bg-red-100 text-xs font-black uppercase tracking-wider rounded-xl transition-all"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export default Navbar;
