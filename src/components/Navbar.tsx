import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { auth } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { LogOut, LayoutDashboard, Send, ShieldCheck, CreditCard, BarChart3, Wallet, HelpCircle, Settings as SettingsIcon } from 'lucide-react';

const Navbar: React.FC = () => {
  const { profile, isAdmin } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await auth.signOut();
    navigate('/login');
  };

  if (!profile) return null;

  return (
    <nav className="bg-white border-b border-gray-200 fixed top-0 w-full z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <div className="flex items-center gap-8">
            <Link to="/" className="flex items-center gap-2 text-xl font-semibold text-gray-900 tracking-tight">
              <CreditCard className="w-6 h-6 text-indigo-600" />
              <span>CentraBank</span>
            </Link>
            
            <div className="hidden md:flex items-center gap-4">
              <Link to="/" className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">
                <LayoutDashboard className="w-4 h-4" />
                Dashboard
              </Link>
              {!isAdmin && profile.status === 'approved' && (
                <>
                  <Link to="/transfer" className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">
                    <Send className="w-4 h-4" />
                    Transfer
                  </Link>
                  <Link to="/cards" className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">
                    <Wallet className="w-4 h-4" />
                    Cards
                  </Link>
                  <Link to="/investments" className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">
                    <BarChart3 className="w-4 h-4" />
                    Investments
                  </Link>
                  <Link to="/resources" className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">
                    <HelpCircle className="w-4 h-4" />
                    Resources
                  </Link>
                </>
              )}
              {isAdmin && (
                <Link to="/admin" className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-indigo-600 hover:text-indigo-800 transition-colors">
                  <ShieldCheck className="w-4 h-4" />
                  Admin Portal
                </Link>
              )}
              <Link to="/settings" className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">
                <SettingsIcon className="w-4 h-4" />
                Settings
              </Link>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Link to="/settings" className="text-right hidden sm:block hover:opacity-85 transition-opacity">
              <p className="text-sm font-medium text-gray-900">{profile.displayName}</p>
              <p className="text-xs text-gray-500 capitalize">{profile.role} • {profile.status}</p>
            </Link>
            <Link
              to="/settings"
              className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-all"
              title="Settings"
            >
              <SettingsIcon className="w-5 h-5" />
            </Link>
            <button
              onClick={handleLogout}
              className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-full transition-all"
              title="Logout"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
