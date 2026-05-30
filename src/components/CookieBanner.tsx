import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, Info, X, ChevronDown, ChevronUp, Lock, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function CookieBanner() {
  const [isVisible, setIsVisible] = useState(false);
  const [isCustomizing, setIsCustomizing] = useState(false);
  
  // Custom states for options
  const [preferences, setPreferences] = useState({
    essential: true, // Always true
    analytics: true,
    marketing: false
  });

  useEffect(() => {
    // Check if user has already made a selection
    const storedConsent = localStorage.getItem('centrabank_cookie_consent');
    if (!storedConsent) {
      // Delay slightly for natural entrance feel
      const timer = setTimeout(() => setIsVisible(true), 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAcceptAll = () => {
    const consent = { essential: true, analytics: true, marketing: true };
    localStorage.setItem('centrabank_cookie_consent', JSON.stringify(consent));
    setIsVisible(false);
  };

  const handleRejectAll = () => {
    const consent = { essential: true, analytics: false, marketing: false };
    localStorage.setItem('centrabank_cookie_consent', JSON.stringify(consent));
    setIsVisible(false);
  };

  const handleSaveCustom = () => {
    localStorage.setItem('centrabank_cookie_consent', JSON.stringify(preferences));
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="fixed bottom-0 inset-x-0 z-50 p-4 sm:p-6 bg-white border-t border-gray-150 shadow-2xl shadow-gray-950/20"
      >
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            
            {/* Banner Left Info */}
            <div className="space-y-2 max-w-3xl">
              <div className="flex items-center gap-2 text-indigo-700">
                <ShieldCheck className="w-5 h-5 shrink-0" />
                <span className="text-xs font-black uppercase tracking-wider">Cookie Compliance & Privacy Vault</span>
              </div>
              <h4 className="text-sm font-extrabold text-gray-900 leading-tight">
                We use security cookies & diagnostics trackers for treasury protection
              </h4>
              <p className="text-xs text-gray-500 leading-relaxed font-medium">
                CentraBank uses essential cookies to manage your secure multi-factor session state, protect user accounts from credential-stuffing, and perform live server diagnostics on investment feeds. You can customize your parameters or read our official and unified{' '}
                <Link to="/resources?tab=compliance#cookie-policy" className="text-indigo-650 font-semibold hover:underline">
                  Cookie Policy
                </Link>{' '}
                and{' '}
                <Link to="/resources?tab=compliance#privacy-policy" className="text-indigo-650 font-semibold hover:underline">
                  Privacy Document
                </Link>
                .
              </p>
            </div>

            {/* Banner Action Buttons */}
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 shrink-0">
              <button
                onClick={() => setIsCustomizing(!isCustomizing)}
                className="px-4 py-2.5 text-xs font-black text-gray-600 hover:text-gray-900 transition-colors uppercase tracking-tight flex items-center gap-1 bg-gray-50 hover:bg-gray-100 rounded-xl border border-gray-200"
              >
                Customize
                {isCustomizing ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
              <button
                onClick={handleRejectAll}
                className="px-4 py-2.5 text-xs font-black text-gray-700 hover:bg-gray-55/40 hover:text-gray-900 transition-all border border-gray-200 rounded-xl uppercase tracking-tight"
              >
                Essential Only
              </button>
              <button
                onClick={handleAcceptAll}
                className="px-5 py-2.5 text-xs font-black text-white bg-indigo-600 hover:bg-indigo-700 transition-all rounded-xl shadow-md uppercase tracking-tight active:scale-95"
              >
                Accept All
              </button>
            </div>

          </div>

          {/* Sub-Panel: Custom Toggles */}
          {isCustomizing && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              className="mt-6 pt-6 border-t border-gray-100 grid grid-cols-1 md:grid-cols-3 gap-4"
            >
              {/* Option 1: Strictly Necessary */}
              <div className="p-4 bg-gray-50 rounded-2xl border border-gray-150 flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
                  <Lock className="w-4 h-4" />
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-gray-900 uppercase tracking-tight">Strictly Necessary</span>
                    <span className="text-[10px] bg-indigo-50 text-indigo-700 border border-indigo-100 font-bold px-2 py-0.5 rounded-md uppercase">Mandatory</span>
                  </div>
                  <p className="text-[11px] text-gray-500 leading-normal">
                    Secures logging parameters, prevents cross-site request token spoofing, and handles local database auth handshakes.
                  </p>
                </div>
              </div>

              {/* Option 2: Performance & Analytics */}
              <div 
                onClick={() => setPreferences(p => ({ ...p, analytics: !p.analytics }))}
                className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 ${
                  preferences.analytics 
                    ? 'bg-indigo-50/20 border-indigo-200 shadow-sm' 
                    : 'bg-white border-gray-200 opacity-70 hover:opacity-100'
                }`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                  preferences.analytics ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-400'
                }`}>
                  <Check className="w-4 h-4" />
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-gray-900 uppercase tracking-tight">Diagnostics & APY speeds</span>
                    <input 
                      type="checkbox" 
                      checked={preferences.analytics}
                      onChange={() => {}}
                      className="accent-indigo-650 h-3.5 w-3.5 cursor-pointer"
                    />
                  </div>
                  <p className="text-[11px] text-gray-500 leading-normal">
                    Aggregated tracking logs to help optimize asset charts, verify dynamic interest rates updates, and capture transfer speeds.
                  </p>
                </div>
              </div>

              {/* Option 3: Personalized Offers (Marketing) */}
              <div 
                onClick={() => setPreferences(p => ({ ...p, marketing: !p.marketing }))}
                className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 ${
                  preferences.marketing 
                    ? 'bg-indigo-50/20 border-indigo-200 shadow-sm' 
                    : 'bg-white border-gray-200 opacity-70 hover:opacity-100'
                }`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                  preferences.marketing ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-400'
                }`}>
                  <Check className="w-4 h-4" />
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-gray-900 uppercase tracking-tight">Special Offers & Ads</span>
                    <input 
                      type="checkbox" 
                      checked={preferences.marketing}
                      onChange={() => {}}
                      className="accent-indigo-650 h-3.5 w-3.5 cursor-pointer"
                    />
                  </div>
                  <p className="text-[11px] text-gray-500 leading-normal">
                    Tailored recommendations regarding new card versions, specific yield boost campaigns, and regional service invites.
                  </p>
                </div>
              </div>

              {/* Action for Custom Setup */}
              <div className="md:col-span-3 flex justify-end">
                <button
                  onClick={handleSaveCustom}
                  className="px-6 py-2 bg-gray-905 hover:bg-gray-900 text-gray-900 hover:text-white border border-gray-800 rounded-xl text-xs font-bold uppercase tracking-tight transition-all active:scale-95"
                >
                  Confirm Selection
                </button>
              </div>
            </motion.div>
          )}

        </div>
      </motion.div>
    </AnimatePresence>
  );
}
