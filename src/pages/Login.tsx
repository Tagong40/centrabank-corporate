import React, { useState } from 'react';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth } from '../firebase';
import { Navigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  CreditCard, 
  ArrowRight, 
  ShieldCheck, 
  Landmark, 
  PhoneCall, 
  HelpCircle, 
  Building2, 
  TrendingUp, 
  Wallet, 
  ArrowUpRight, 
  ChevronRight,
  Sparkles,
  Info,
  Layers,
  Lock
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const Login: React.FC = () => {
  const { user, loading } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'protection' | 'cards' | 'yield'>('protection');

  const handleGoogleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (err: any) {
      setError(err.message);
    }
  };

  if (loading) return null;
  if (user) return <Navigate to="/" />;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-between">
      {/* Top Professional Header Bar */}
      <header className="bg-white border-b border-gray-100 px-6 py-4">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <span className="font-extrabold text-gray-900 text-lg tracking-tight">CentraBank</span>
              <span className="bg-indigo-50 text-indigo-700 text-[10px] font-bold px-2 py-0.5 rounded-md ml-2 border border-indigo-100">Wealth & Cards</span>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs text-gray-500 font-medium">
            <div className="hidden sm:flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
              </span>
              <span>All Systems Operational</span>
            </div>
            <span className="hidden sm:block text-gray-200">|</span>
            <div className="hidden sm:flex items-center gap-1">
              <ShieldCheck className="w-4 h-4 text-indigo-600" />
              <span>256-bit SSL</span>
            </div>
            <a
              href="#signin"
              className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-all text-xs"
            >
              Sign In <ChevronRight className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl w-full mx-auto px-4 py-12 flex-grow flex items-center">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center w-full">
          
          {/* Left Column: Interactive Product Showcase / Benefit Explainer */}
          <div className="lg:col-span-7 space-y-8">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-50 border border-indigo-100 text-indigo-700 rounded-full text-xs font-bold">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Premier Digital Banking Suite</span>
              </div>
              <h2 className="text-4xl sm:text-5xl font-black text-gray-900 tracking-tight leading-none">
                Smart Treasury & <br />
                <span className="text-indigo-600">Investment Control</span>
              </h2>
              <p className="text-gray-500 font-medium max-w-xl text-base sm:text-lg">
                CentraBank handles everything from daily high-yield interest accounts to custom portfolio allocations, virtual card controls, and streamlined secure transfers.
              </p>
            </div>

            {/* Interactive Showcase Widget */}
            <div className="bg-white rounded-[2rem] border border-gray-100 shadow-xl shadow-gray-100/50 p-6 sm:p-8 space-y-6">
              {/* Tab Toggles */}
              <div className="flex gap-1.5 p-1 bg-gray-50 rounded-2xl border border-gray-100">
                <button
                  onClick={() => setActiveTab('protection')}
                  className={`flex-1 py-3 text-xs font-bold rounded-xl transition-all ${
                    activeTab === 'protection'
                      ? 'bg-white text-indigo-600 shadow-sm border border-gray-100'
                      : 'text-gray-400 hover:text-gray-600'
                  }`}
                >
                  Asset Protection
                </button>
                <button
                  onClick={() => setActiveTab('cards')}
                  className={`flex-1 py-3 text-xs font-bold rounded-xl transition-all ${
                    activeTab === 'cards'
                      ? 'bg-white text-indigo-600 shadow-sm border border-gray-100'
                      : 'text-gray-400 hover:text-gray-600'
                  }`}
                >
                  Active Card Control
                </button>
                <button
                  onClick={() => setActiveTab('yield')}
                  className={`flex-1 py-3 text-xs font-bold rounded-xl transition-all ${
                    activeTab === 'yield'
                      ? 'bg-white text-indigo-600 shadow-sm border border-gray-100'
                      : 'text-gray-400 hover:text-gray-600'
                  }`}
                >
                  Wealth & Yields
                </button>
              </div>

              {/* Tab Contents */}
              <AnimatePresence mode="wait">
                {activeTab === 'protection' && (
                  <motion.div
                    key="protection"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="space-y-4"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="p-5 rounded-2xl bg-indigo-50/50 border border-indigo-50 flex gap-4">
                        <div className="shrink-0 w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-700">
                          <Landmark className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="font-extrabold text-gray-900 text-sm">FDIC Insured Protection</p>
                          <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                            Cash deposits are securely swept and protected up to standard maximum limits of $250,000.
                          </p>
                        </div>
                      </div>
                      <div className="p-5 rounded-2xl bg-indigo-50/50 border border-indigo-50 flex gap-4">
                        <div className="shrink-0 w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-700">
                          <ShieldCheck className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="font-extrabold text-gray-900 text-sm font-sans">SIPC Securities coverage</p>
                          <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                            Your stocks and index fund positions are backed by SIPC protection up to $500,000.
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 flex items-center gap-3">
                      <Info className="w-4 h-4 text-indigo-600 shrink-0" />
                      <p className="text-[11px] text-gray-500 font-medium">
                        CentraBank delivers secondary sweep coverage using trusted partner banking institutions. Review terms inside the portal.
                      </p>
                    </div>
                  </motion.div>
                )}

                {activeTab === 'cards' && (
                  <motion.div
                    key="cards"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="space-y-4"
                  >
                    <div className="flex flex-col sm:flex-row gap-5 items-center p-5 bg-gradient-to-br from-gray-900 to-indigo-950 rounded-2xl text-white">
                      <div className="w-full sm:w-1/2 space-y-2">
                        <p className="text-[10px] uppercase font-black tracking-widest text-indigo-300">Advanced Shield</p>
                        <h4 className="text-lg font-black tracking-tight">Lock & Prevent Fraud</h4>
                        <p className="text-xs text-indigo-150 leading-relaxed font-light">
                          Freeze physical and virtual cards instantly. Limit transaction amounts in real-time or enable geolocation validation.
                        </p>
                      </div>
                      <div className="w-full sm:w-1/2 p-4 bg-white/5 backdrop-blur-md rounded-xl border border-white/10 space-y-3">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-mono text-white/70">•••• 4532</span>
                          <span className="bg-red-500/20 text-red-200 text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-tight">Locked</span>
                        </div>
                        <div className="h-2 bg-white/10 rounded-full w-2/3" />
                        <div className="flex items-center gap-2 text-[10px] text-white/50">
                          <Lock className="w-3.5 h-3.5 text-red-400" />
                          <span>Tap unlock inside dashboard to enable spending</span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {activeTab === 'yield' && (
                  <motion.div
                    key="yield"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="grid grid-cols-1 sm:grid-cols-3 gap-4"
                  >
                    <div className="p-4 bg-gray-50 rounded-2xl text-center border border-gray-150 shadow-inner flex flex-col justify-between">
                      <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider">High Yield Cash</span>
                      <p className="text-3xl font-black text-indigo-600 my-2">4.85%</p>
                      <span className="text-[10px] text-gray-500 font-semibold italic">Annual APY compounded</span>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-2xl text-center border border-gray-150 shadow-inner flex flex-col justify-between">
                      <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Index Portfolios</span>
                      <p className="text-3xl font-black text-emerald-600 my-2">+12.4%</p>
                      <span className="text-[10px] text-gray-500 font-semibold italic">Average historical return</span>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-2xl text-center border border-gray-150 shadow-inner flex flex-col justify-between">
                      <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Crypto Exposure</span>
                      <p className="text-3xl font-black text-orange-600 my-2">Secure</p>
                      <span className="text-[10px] text-gray-500 font-semibold italic">Cold-storage insured</span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Right Column: Portal Login Card */}
          <div id="signin" className="lg:col-span-5 md:max-w-md md:mx-auto lg:w-full">
            <div className="bg-white p-8 sm:p-10 rounded-[2.5rem] shadow-xl shadow-gray-200/40 border border-gray-100 flex flex-col justify-between">
              
              <div>
                <h3 className="text-2xl font-black text-gray-950 tracking-tight text-center mb-1">Access Portal</h3>
                <p className="text-center text-xs font-bold text-gray-400 uppercase tracking-widest mb-8">
                  Authenticate below to start
                </p>

                <button
                  onClick={handleGoogleLogin}
                  className="w-full h-14 bg-white border-2 border-gray-100 hover:border-indigo-200 hover:shadow-lg hover:shadow-indigo-50/50 text-gray-800 font-bold rounded-2xl flex items-center justify-center gap-3 transition-all group active:scale-95"
                >
                  <img 
                    src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" 
                    alt="Google" 
                    className="w-5 h-5"
                    referrerPolicy="no-referrer"
                  />
                  Continue with Google
                  <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all" />
                </button>

                {error && (
                  <div className="mt-4 p-3 bg-red-50 border border-red-100 rounded-xl text-xs text-red-600 font-semibold text-center">
                    {error}
                  </div>
                )}
              </div>

              {/* Interactive Security Trust Badges */}
              <div className="mt-10 pt-8 border-t border-gray-50">
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <p className="text-lg font-black text-gray-900 font-mono">256-bit</p>
                    <p className="text-[9px] uppercase tracking-wider text-gray-400 font-bold">SSL Link</p>
                  </div>
                  <div className="w-px h-8 bg-gray-100 mx-auto"></div>
                  <div>
                    <p className="text-lg font-black text-gray-900">NMLS</p>
                    <p className="text-[9px] uppercase tracking-wider text-gray-400 font-bold">#940523</p>
                  </div>
                  <div className="w-px h-8 bg-gray-100 mx-auto hidden"></div>
                  <div>
                    <p className="text-lg font-black text-gray-900">SLA</p>
                    <p className="text-[9px] uppercase tracking-wider text-gray-400 font-bold">Enterprise</p>
                  </div>
                </div>
              </div>

              {/* Quick Advisory Box */}
              <div className="mt-6 p-4 bg-amber-50/40 rounded-2xl border border-amber-100/50 flex gap-3 text-amber-900">
                <Info className="w-4 h-4 text-amber-600 shrink-0" />
                <div>
                  <p className="text-[10px] font-black uppercase tracking-tight text-amber-800">Security Advisory</p>
                  <p className="text-[10px] mt-0.5 font-medium leading-relaxed text-amber-700">
                    CentraBank customer service will never ask you for credentials, verification OTPs, or to make emergency transfers over SMS/email.
                  </p>
                </div>
              </div>

            </div>
          </div>

        </div>
      </main>

      {/* Corporate Bank Footer */}
      <footer className="bg-white border-t border-gray-150 px-6 py-12 md:py-16">
        <div className="max-w-7xl mx-auto space-y-10">
          
          {/* Top of Footer: Contact & Help Points */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pb-10 border-b border-gray-100">
            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-600">
                <PhoneCall className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-gray-900 uppercase tracking-wider">Priority Support Desk</p>
                <p className="text-sm font-bold text-indigo-600 mt-0.5">1-800-555-CNTR</p>
                <p className="text-[10px] text-gray-400 mt-1">Available 24/7/365 to accounts</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-600">
                <HelpCircle className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-gray-900 uppercase tracking-wider">FAQs & Resource Center</p>
                <p className="text-sm font-bold text-indigo-600 mt-0.5">support@centrabank.corp</p>
                <p className="text-[10px] text-gray-400 mt-1">Instant chat & knowledge base</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-600">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-gray-900 uppercase tracking-wider">Main Financial Office</p>
                <p className="text-sm font-bold text-gray-700 mt-0.5">800 Financial Plaza, Floor 12</p>
                <p className="text-[10px] text-gray-400 mt-1">New York, NY 10005</p>
              </div>
            </div>
          </div>

          {/* Middle of Footer: Multi-column links */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="space-y-3">
              <h4 className="text-xs font-black uppercase text-gray-400 tracking-wider">Banking Products</h4>
              <ul className="text-xs text-gray-500 space-y-2 font-medium">
                <li><Link to="/resources?tab=products#commercial-banking" className="hover:text-indigo-600 hover:underline transition-colors block">Commercial Banking</Link></li>
                <li><Link to="/resources?tab=products#cash-vaults" className="hover:text-indigo-600 hover:underline transition-colors block">High-Yield Cash Vaults</Link></li>
                <li><Link to="/resources?tab=products#treasury-api" className="hover:text-indigo-600 hover:underline transition-colors block">Treasury Management API</Link></li>
                <li><Link to="/resources?tab=products#credit-infinite" className="hover:text-indigo-600 hover:underline transition-colors block">Centra Credit Infinite Card</Link></li>
              </ul>
            </div>
            <div className="space-y-3">
              <h4 className="text-xs font-black uppercase text-gray-400 tracking-wider">Investments</h4>
              <ul className="text-xs text-gray-500 space-y-2 font-medium">
                <li><Link to="/resources?tab=investments#index-funds" className="hover:text-indigo-600 hover:underline transition-colors block">Automated Index Funds</Link></li>
                <li><Link to="/resources?tab=investments#crypto-custody" className="hover:text-indigo-600 hover:underline transition-colors block">Crypto Custody Vault</Link></li>
                <li><Link to="/resources?tab=investments#directed-equities" className="hover:text-indigo-600 hover:underline transition-colors block">Self-Directed Equities</Link></li>
                <li><Link to="/resources?tab=investments#advisory-pricing" className="hover:text-indigo-600 hover:underline transition-colors block">Advisory Account Pricing</Link></li>
              </ul>
            </div>
            <div className="space-y-3">
              <h4 className="text-xs font-black uppercase text-gray-400 tracking-wider">Compliance & Legal</h4>
              <ul className="text-xs text-gray-500 space-y-2 font-medium">
                <li><Link to="/resources?tab=compliance#terms-service" className="hover:text-indigo-600 hover:underline transition-colors block font-semibold">Terms of Service</Link></li>
                <li><Link to="/resources?tab=compliance#privacy-policy" className="hover:text-indigo-600 hover:underline transition-colors block font-semibold">Privacy Policy</Link></li>
                <li><Link to="/resources?tab=compliance#cookie-policy" className="hover:text-indigo-600 hover:underline transition-colors block font-semibold">Cookie Policy & Consent</Link></li>
                <li><Link to="/resources?tab=compliance#esign-consent" className="hover:text-indigo-600 hover:underline transition-colors block">E-Sign Consent Agreement</Link></li>
              </ul>
            </div>
            <div className="space-y-4 text-xs text-gray-500 font-medium">
              <div className="flex gap-3">
                <span className="px-2 py-0.5 border border-gray-300 text-gray-700 rounded text-[9px] font-extrabold select-none">MEMBER FDIC</span>
                <span className="px-2 py-0.5 border border-gray-300 text-gray-700 rounded text-[9px] font-extrabold select-none">MEMBER SIPC</span>
              </div>
              <div className="flex gap-2 items-center">
                <span className="text-[10px] px-1 py-0.5 border border-gray-300 text-gray-700 rounded font-bold uppercase select-none">Equal Housing Lender</span>
                <span className="text-[8px] text-gray-400 leading-tight">We support fair housing lending regulations</span>
              </div>
            </div>
          </div>

          {/* Bottom of Footer: Disclaimers / Legal Disclosures */}
          <div className="space-y-4 pt-8 border-t border-gray-100 text-[10px] text-gray-400 leading-relaxed font-normal">
            <p>
              CentraBank, Inc., and CentraWealth Advisory, LLC (&quot;CentraWealth&quot;) are subsidiaries of CentraCorp. Institutional banking products and cash storage accounts are delivered by CentraBank, an FDIC insured deposit institution (FDIC Certificate #940523). Brokerage accounts, financial index allocations, and self-directed portfolios are offered by CentraWealth, an SEC-registered investment advisor and member of SIPC (Securities Investor Protection Corporation). Securities and investment positions are subject to market volatility and potential cash loss, up to initial capital. Past performance indexes represent visual backtests and do not guarantee future high yields.
            </p>
            <p>
              Yield rates illustrated above are subject to dynamic changes based on federal reserve rates. Virtual debit/credit card controls allow real-time card locks for preventive security; physical cards require a registered business account background check and verified signature authorization.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 text-gray-400">
              <p>&copy; 2026 CentraBank & Wealth Advisory, LLC. All corporate branding rights reserved.</p>
              <p className="flex gap-4">
                <Link to="/resources?tab=security#security-center" className="hover:underline hover:text-indigo-650 transition-colors">Security Center</Link>
                <span>•</span>
                <Link to="/resources?tab=security#nmls-lookup" className="hover:underline hover:text-indigo-650 transition-colors">NMLS lookup</Link>
                <span>•</span>
                <Link to="/resources?tab=security#finra-brokercheck" className="hover:underline hover:text-indigo-650 transition-colors">FINRA BrokerCheck</Link>
              </p>
            </div>
          </div>

        </div>
      </footer>
    </div>
  );
};

export default Login;
