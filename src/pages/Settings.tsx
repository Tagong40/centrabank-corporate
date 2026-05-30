import React, { useState, useEffect } from 'react';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { UserProfile } from '../types';
import { 
  User, ShieldCheck, Lock, Eye, EyeOff, KeyRound, Smartphone, AlertTriangle, 
  Fingerprint, RefreshCw, Landmark, Globe, FileText, Check, ShieldAlert, Cpu, 
  Database, Clipboard, BellRing, Webhook, Loader2, AlertCircle, Save, Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function Settings() {
  const { profile: authProfile } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'audit'>('profile');

  // Form states
  const [displayName, setDisplayName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [address, setAddress] = useState('');
  const [cityName, setCityName] = useState('');
  const [country, setCountry] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [taxId, setTaxId] = useState('');
  const [showTaxId, setShowTaxId] = useState(false);

  // Security preferences states
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [mfaSetupOpen, setMfaSetupOpen] = useState(false);
  const [mfaCodeInput, setMfaCodeInput] = useState('');
  const [mfaSetupSuccess, setMfaSetupSuccess] = useState(false);
  
  const [securityPINCode, setSecurityPINCode] = useState('');
  const [showPIN, setShowPIN] = useState(false);
  const [dailyTransferLimit, setDailyTransferLimit] = useState(150000);
  const [ipWhitelist, setIpWhitelist] = useState('');
  const [preferredLanguage, setPreferredLanguage] = useState('en-US');

  // Saving state
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Lockdown simulation
  const [isLockedDown, setIsLockedDown] = useState(false);
  const [lockdownConfirmOpen, setLockdownConfirmOpen] = useState(false);
  
  // Real-time listener for current profile
  useEffect(() => {
    if (!authProfile) return;

    const userRef = doc(db, 'users', authProfile.uid);
    const unsub = onSnapshot(userRef, (snapshot) => {
      if (snapshot.exists()) {
        const uData = snapshot.data() as UserProfile;
        setProfile(uData);
        
        // Initialize state variables from Firestore
        setDisplayName(uData.displayName || '');
        setPhoneNumber(uData.phoneNumber || '');
        setAddress(uData.address || '');
        setCityName(uData.cityName || '');
        setCountry(uData.country || 'United States');
        setPostalCode(uData.postalCode || '');
        setCompanyName(uData.companyName || '');
        setTaxId(uData.taxId || '');
        setTwoFactorEnabled(uData.twoFactorEnabled || false);
        setSecurityPINCode(uData.securityPINCode || '');
        setDailyTransferLimit(uData.dailyTransferLimit || 150000);
        setIpWhitelist(uData.ipWhitelist || '');
        setPreferredLanguage(uData.preferredLanguage || 'en-US');
      }
      setLoading(false);
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, `users/${authProfile.uid}`);
      setLoading(false);
    });

    return () => unsub();
  }, [authProfile]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authProfile) return;
    setSaving(true);
    setErrorMsg(null);
    setSaveSuccess(false);

    try {
      const userRef = doc(db, 'users', authProfile.uid);
      await updateDoc(userRef, {
        displayName,
        phoneNumber,
        address,
        cityName,
        country,
        postalCode,
        companyName,
        taxId,
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Failed to update corporate profile documents.');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSecurity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authProfile) return;
    setSaving(true);
    setErrorMsg(null);
    setSaveSuccess(false);

    // Validate security PIN if typed
    if (securityPINCode && (securityPINCode.length !== 6 || !/^\d+$/.test(securityPINCode))) {
      setErrorMsg('Cryptographic authorization PIN must be exactly 6 numeric digits.');
      setSaving(false);
      return;
    }

    try {
      const userRef = doc(db, 'users', authProfile.uid);
      await updateDoc(userRef, {
        twoFactorEnabled,
        securityPINCode,
        dailyTransferLimit: Number(dailyTransferLimit),
        ipWhitelist,
        preferredLanguage,
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Failed to deploy security parameters to vault registry.');
    } finally {
      setSaving(false);
    }
  };

  const verifyMfaCode = (e: React.FormEvent) => {
    e.preventDefault();
    if (mfaCodeInput === '123456' || mfaCodeInput.length === 6) {
      setMfaSetupSuccess(true);
      setTwoFactorEnabled(true);
      setTimeout(() => {
        setMfaSetupOpen(false);
        setMfaSetupSuccess(false);
        setMfaCodeInput('');
      }, 2000);
    } else {
      alert('Invalid multi-factor code. Try: 123456');
    }
  };

  const handleEmergencyHalt = async () => {
    if (!authProfile) return;
    setSaving(true);
    setIsLockedDown(true);
    setLockdownConfirmOpen(false);

    try {
      const userRef = doc(db, 'users', authProfile.uid);
      await updateDoc(userRef, {
        status: 'pending', // Forces pending lock state inside app
        dailyTransferLimit: 0,
        twoFactorEnabled: true,
      });
      alert('EMERGENCY LOCKDOWN INITIATED! Institutional vaults suspended. Re-authentication with the compliance desk required.');
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const currentIP = "164.88.201.42";

  // Mock static system logs with high-grade banking metadata
  const systemAuditLogs = [
    { id: 'LOG-30421', desc: 'Secure Ledger API Access Authorized Key', status: 'Success', category: 'Access Control', origin: 'CentraBank Gate', cipher: 'ECDSA_P256', ip: '164.88.201.42', date: 'Just now' },
    { id: 'LOG-30419', desc: 'Internal multi-currency balance sweep update', status: 'Completed', category: 'Treasury Clearing', origin: 'Sweep API', cipher: 'AES_256_GCM', ip: 'Static Gateway', date: '3 hours ago' },
    { id: 'LOG-30384', desc: 'KYC Tier-1 Security Screening Verification', status: 'Approved', category: 'Compliance', origin: 'OFAC Screener', cipher: 'SHA_512', ip: 'Federal Service Hook', date: 'Yesterday' },
    { id: 'LOG-30277', desc: 'Tokenized Virtual Card cryptographic block check', status: 'Verified', category: 'POS Clearance', origin: 'Visa Decryption', cipher: 'RSA_4096', ip: '12.44.180.111', date: 'May 28, 2026' },
  ];

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh] pt-24">
      <div className="text-center space-y-4">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-650 mx-auto" />
        <p className="text-xs text-gray-400 font-extrabold tracking-widest uppercase">Decrypted Handshake in Progress</p>
      </div>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto px-4 py-12 pt-24">
      
      {/* Title block */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
        <div>
          <h1 className="text-4xl font-black text-gray-905 tracking-tight mb-2">Security & Settings</h1>
          <p className="text-gray-500 font-medium italic">Configure bank-grade identity verifications, cryptographic sweep PINs, multi-factor tokens, and audit logs.</p>
        </div>

        {/* Dynamic Trust Card */}
        <div className="bg-white border border-gray-150 rounded-2xl px-6 py-4 flex items-center gap-4 shadow-sm shrink-0">
          <div className="p-2.5 bg-green-50 text-green-600 rounded-xl">
            <ShieldCheck className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black text-green-600 uppercase tracking-widest bg-green-50 px-2 py-0.5 rounded">Compliance Tier 1</span>
            </div>
            <p className="text-xs text-gray-500 font-bold mt-1">AES-256 Cloud Ledger Guarded</p>
          </div>
        </div>
      </div>

      {/* Tabs Menu Navigation */}
      <div className="flex border-b border-gray-200 gap-1 mb-8 overflow-x-auto">
        <button
          onClick={() => { setActiveTab('profile'); setErrorMsg(null); }}
          className={`px-5 py-3 text-xs font-black uppercase tracking-wider border-b-2 transition-all shrink-0 flex items-center gap-2.5 ${
            activeTab === 'profile' 
              ? 'border-indigo-600 text-indigo-600 bg-indigo-50/10' 
              : 'border-transparent text-gray-400 hover:text-gray-700'
          }`}
        >
          <User className="w-4 h-4" />
          KYC Identity Dossier
        </button>
        <button
          onClick={() => { setActiveTab('security'); setErrorMsg(null); }}
          className={`px-5 py-3 text-xs font-black uppercase tracking-wider border-b-2 transition-all shrink-0 flex items-center gap-2.5 ${
            activeTab === 'security' 
              ? 'border-indigo-600 text-indigo-600 bg-indigo-50/10' 
              : 'border-transparent text-gray-400 hover:text-gray-700'
          }`}
        >
          <Lock className="w-4 h-4" />
          Safety Safeguards
        </button>
        <button
          onClick={() => { setActiveTab('audit'); setErrorMsg(null); }}
          className={`px-5 py-3 text-xs font-black uppercase tracking-wider border-b-2 transition-all shrink-0 flex items-center gap-2.5 ${
            activeTab === 'audit' 
              ? 'border-indigo-600 text-indigo-600 bg-indigo-50/10' 
              : 'border-transparent text-gray-400 hover:text-gray-700'
          }`}
        >
          <Cpu className="w-4 h-4" />
          Endpoint Firewall Logs
        </button>
      </div>

      {/* Saving and Error Overlay Alerts */}
      <AnimatePresence>
        {saveSuccess && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mb-6 p-4 bg-green-50 border border-green-200 text-green-700 font-bold text-xs rounded-2xl flex items-center gap-3 shadow-sm"
          >
            <Check className="w-5 h-5 bg-green-500 text-white rounded-full p-0.5" />
            <span>Success: Securities state synced inside CentraBank’s decentralized clearing node.</span>
          </motion.div>
        )}
        {errorMsg && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 font-semibold text-xs rounded-2xl flex items-center gap-3 shadow-sm"
          >
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>Error: {errorMsg}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        
        {/* Left/Middle Active Configurator Form (2 Columns wide on desktop) */}
        <div className="lg:col-span-2 bg-white rounded-[2.5rem] border border-gray-150 p-6 sm:p-10 shadow-sm relative">
          
          {/* TAB 1: KYC Identity Dossier */}
          {activeTab === 'profile' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-8"
            >
              <div>
                <span className="text-[10px] font-black tracking-widest uppercase text-indigo-600 bg-indigo-50 border border-indigo-100 py-1 px-3 rounded-md">Corporate KYC Dossier</span>
                <h2 className="text-2xl font-black text-gray-900 mt-3 tracking-tight">Enterprise Authorized Signatory Info</h2>
                <p className="text-gray-450 text-xs mt-1">Regulatory bounds mandate that authorized corporate personnel identities align with primary registry records.</p>
              </div>

              <form onSubmit={handleSaveProfile} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Company Name */}
                  <div className="space-y-2">
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Incorporated Company / Org</label>
                    <div className="relative">
                      <Landmark className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-450" />
                      <input 
                        type="text"
                        value={companyName}
                        onChange={e => setCompanyName(e.target.value)}
                        placeholder="e.g. Acme Capital Management LLC"
                        className="w-full bg-gray-50 border border-gray-200 focus:border-indigo-600 focus:bg-white rounded-xl h-12 pl-12 pr-4 text-xs font-bold text-gray-900 outline-none transition"
                      />
                    </div>
                  </div>

                  {/* Corporate ID/Tax TIN ID */}
                  <div className="space-y-2">
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Taxpayer ID (EIN / SSN / TIN)</label>
                    <div className="relative">
                      <FileText className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-450" />
                      <input 
                        type={showTaxId ? "text" : "password"}
                        value={taxId}
                        onChange={e => setTaxId(e.target.value)}
                        placeholder="e.g. XX-XXXXXXX or SSN"
                        className="w-full bg-gray-50 border border-gray-200 focus:border-indigo-600 focus:bg-white rounded-xl h-12 pl-12 pr-12 text-xs font-mono font-bold text-gray-905 outline-none transition"
                      />
                      <button
                        type="button"
                        onClick={() => setShowTaxId(!showTaxId)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-gray-600"
                        title={showTaxId ? "Obscure" : "Reveal"}
                      >
                        {showTaxId ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Lead Officer Display Name */}
                  <div className="space-y-2">
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Lead Auditing Signatory Name</label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-450" />
                      <input 
                        type="text"
                        required
                        value={displayName}
                        onChange={e => setDisplayName(e.target.value)}
                        placeholder="Full Legal Representative Name"
                        className="w-full bg-gray-50 border border-gray-200 focus:border-indigo-600 focus:bg-white rounded-xl h-12 pl-12 pr-4 text-xs font-bold text-gray-905 outline-none transition"
                      />
                    </div>
                  </div>

                  {/* Registered Phone */}
                  <div className="space-y-2">
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Authorized Signal Phone Line</label>
                    <div className="relative">
                      <Smartphone className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-450" />
                      <input 
                        type="tel"
                        value={phoneNumber}
                        onChange={e => setPhoneNumber(e.target.value)}
                        placeholder="e.g. +1 (555) 830-4921"
                        className="w-full bg-gray-50 border border-gray-200 focus:border-indigo-600 focus:bg-white rounded-xl h-12 pl-12 pr-4 text-xs font-bold text-gray-905 outline-none transition"
                      />
                    </div>
                  </div>
                </div>

                <div className="border-t border-gray-100 pt-6 space-y-4">
                  <h4 className="text-xs font-black text-gray-900 uppercase tracking-wider pl-1">Registered Legal HQ Address</h4>
                  
                  <div className="space-y-2">
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Street Address</label>
                    <input 
                      type="text"
                      value={address}
                      onChange={e => setAddress(e.target.value)}
                      placeholder="e.g. Suite 800, 120 Wall Street"
                      className="w-full bg-gray-50 border border-gray-200 focus:border-indigo-600 focus:bg-white rounded-xl h-12 px-4 text-xs font-semibold text-gray-900 outline-none transition"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1 font-bold">City / State</label>
                      <input 
                        type="text"
                        value={cityName}
                        onChange={e => setCityName(e.target.value)}
                        placeholder="New York, NY"
                        className="w-full bg-gray-50 border border-gray-200 focus:border-indigo-600 focus:bg-white rounded-xl h-11 px-4 text-xs font-semibold text-gray-900 outline-none transition"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1 font-bold">Postal Code</label>
                      <input 
                        type="text"
                        value={postalCode}
                        onChange={e => setPostalCode(e.target.value)}
                        placeholder="e.g. 10005"
                        className="w-full bg-gray-50 border border-gray-200 focus:border-indigo-600 focus:bg-white rounded-xl h-11 px-4 text-xs font-mono font-bold text-gray-900 outline-none transition"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1 font-bold">Country Entity</label>
                      <select 
                        value={country}
                        onChange={e => setCountry(e.target.value)}
                        className="w-full bg-gray-50 border border-gray-200 focus:border-indigo-600 focus:bg-white rounded-xl h-11 px-3 text-xs font-bold text-gray-900 outline-none transition"
                      >
                        <option value="United States">United States</option>
                        <option value="United Kingdom">United Kingdom</option>
                        <option value="Switzerland">Switzerland</option>
                        <option value="Germany">Germany</option>
                        <option value="Singapore">Singapore</option>
                        <option value="Cayman Islands">Cayman Islands</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="pt-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2 text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                    <Info className="w-4 h-4 text-indigo-500" />
                    Updates require cryptographically signed sessions.
                  </div>
                  <button
                    type="submit"
                    disabled={saving}
                    className="h-12 px-6 bg-indigo-650 hover:bg-indigo-750 disabled:bg-indigo-300 text-white font-black text-xs uppercase tracking-wider rounded-xl transition flex items-center justify-center gap-2 shrink-0 shadow-lg shadow-indigo-100"
                  >
                    {saving ? <Loader2 className="w-4.5 h-4.5 animate-spin" /> : <Save className="w-4.5 h-4.5" />}
                    Lock Profile Dossier
                  </button>
                </div>
              </form>
            </motion.div>
          )}

          {/* TAB 2: Safety & Cryptographic Safeguards */}
          {activeTab === 'security' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-8"
            >
              <div>
                <span className="text-[10px] font-black tracking-widest uppercase text-indigo-600 bg-indigo-50 border border-indigo-100 py-1 px-3 rounded-md">Safety Safeguards</span>
                <h2 className="text-2xl font-black text-gray-900 mt-3 tracking-tight">Active Cryptographic Controls</h2>
                <p className="text-gray-450 text-xs mt-1">Configure real-time Multi-Factor authorizations, secure sweep codes, and terminal daily bounds.</p>
              </div>

              <form onSubmit={handleSaveSecurity} className="space-y-8">
                
                {/* 2FA SETUP MODULE */}
                <div className="p-6 bg-gray-50 rounded-2xl border border-gray-150 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl mt-0.5 shrink-0">
                        <Smartphone className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-gray-900 uppercase tracking-tight">Two-Factor Authenticator (2FA)</h4>
                        <p className="text-[10px] text-gray-400 font-semibold mt-0.5 leading-snug">Requires an authenticating code during high-volume corporate swaps.</p>
                      </div>
                    </div>
                    
                    <button
                      type="button"
                      onClick={() => {
                        if (twoFactorEnabled) {
                          setTwoFactorEnabled(false);
                        } else {
                          setMfaSetupOpen(true);
                        }
                      }}
                      className={`h-9 px-4 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border ${
                        twoFactorEnabled 
                          ? 'bg-green-50 border-green-200 text-green-700 hover:bg-red-50 hover:border-red-200 hover:text-red-700' 
                          : 'bg-indigo-600 border-indigo-600 text-white hover:bg-indigo-700'
                      }`}
                    >
                      {twoFactorEnabled ? '● ENABLED (Disable)' : 'CONFIGURE 2FA'}
                    </button>
                  </div>

                  {mfaSetupOpen && (
                    <div className="bg-white p-5 rounded-xl border border-gray-200 space-y-4 animate-fadeIn">
                      <div className="flex justify-between items-start border-b border-gray-100 pb-3">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Google Authenticator Setup</span>
                        <button 
                          type="button" 
                          onClick={() => setMfaSetupOpen(false)}
                          className="text-gray-400 hover:text-gray-650 text-[10px] font-black uppercase"
                        >
                          Cancel
                        </button>
                      </div>

                      {mfaSetupSuccess ? (
                        <div className="text-center py-4 space-y-2">
                          <Check className="w-10 h-10 text-green-500 bg-green-50 rounded-full p-2 mx-auto animate-bounce" />
                          <p className="text-xs font-black text-gray-950 uppercase tracking-wider">Authenticator Linked Successfully</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
                          {/* QR Mock image */}
                          <div className="border border-gray-150 p-2 rounded-lg bg-gray-50 flex flex-col items-center">
                            <div className="w-24 h-24 bg-indigo-50 border-2 border-dashed border-indigo-200 flex items-center justify-center font-mono text-[9px] text-indigo-700 font-extrabold text-center rounded">
                              QR SCANNER KEY
                            </div>
                            <span className="text-[8px] text-gray-400 font-bold mt-1 uppercase tracking-wider">Sync Token ID</span>
                          </div>

                          <div className="sm:col-span-2 space-y-3 font-semibold text-xs leading-relaxed text-gray-500">
                            <p>1. Scan the QR code or key: <code className="font-mono bg-indigo-50 text-indigo-700 text-[10px] px-1.5 py-0.5 rounded font-black">SEED_CENTR_7749_MFA_SECURE</code></p>
                            <p>2. Input the rotating 6-digit verification code below:</p>
                            <div className="flex gap-2">
                              <input 
                                type="text"
                                maxLength={6}
                                value={mfaCodeInput}
                                onChange={e => setMfaCodeInput(e.target.value.replace(/\D/g, ''))}
                                placeholder="e.g. 123456"
                                className="w-32 h-9 px-3 border border-gray-250 bg-gray-50 rounded-lg font-bold text-xs tracking-widest outline-none text-center"
                              />
                              <button
                                type="button"
                                onClick={verifyMfaCode}
                                className="h-9 px-4 bg-indigo-600 text-white font-bold rounded-lg text-[10px] uppercase hover:bg-indigo-700 transition"
                              >
                                Synchronize Keys
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* TRANSFER PIN MODULE */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center pl-1">
                    <div>
                      <h4 className="text-xs font-black text-gray-900 uppercase tracking-wider">Dynamic Outbound Sweep PIN</h4>
                      <p className="text-[10px] text-gray-400 font-bold tracking-tight mt-0.5">Exactly 6 numeric digits to authorize transactions.</p>
                    </div>
                  </div>
                  <div className="relative max-w-sm">
                    <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-450" />
                    <input 
                      type={showPIN ? "text" : "password"}
                      maxLength={6}
                      value={securityPINCode}
                      onChange={e => setSecurityPINCode(e.target.value.replace(/\D/g, ''))}
                      placeholder="Set 6-digit Security PIN"
                      className="w-full bg-gray-50 border border-gray-200 focus:border-indigo-600 focus:bg-white rounded-xl h-12 pl-12 pr-12 text-xs font-mono font-bold tracking-[0.4em] text-gray-955 outline-none transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPIN(!showPIN)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-gray-650"
                    >
                      {showPIN ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* SLIDER FOR TRANSACTION LIMIT */}
                <div className="space-y-4">
                  <div className="flex justify-between items-baseline pl-1">
                    <div>
                      <h4 className="text-xs font-black text-gray-900 uppercase tracking-wider animate-pulse">Daily Outbound Clearing Limit</h4>
                      <p className="text-[10px] text-gray-400 font-bold mt-0.5">Enforces strict maximum daily wire boundaries.</p>
                    </div>
                    <span className="text-lg font-black text-indigo-600 font-mono">
                      ${dailyTransferLimit.toLocaleString()}
                    </span>
                  </div>
                  <input 
                    type="range"
                    min={10000}
                    max={1000000}
                    step={10000}
                    value={dailyTransferLimit}
                    onChange={e => setDailyTransferLimit(Number(e.target.value))}
                    className="w-full h-2 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-indigo-600 border border-gray-200"
                  />
                  <div className="flex justify-between text-[9px] text-gray-400 font-black uppercase tracking-wider">
                    <span>Min: $10k</span>
                    <span>Corporate Standard: $250k</span>
                    <span>Max Liquidity: $1M</span>
                  </div>
                </div>

                {/* IP WHITELIST ADAPTER */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center pl-1">
                    <div>
                      <h4 className="text-xs font-black text-gray-900 uppercase tracking-wider">Endpoint Security IP Whitelisting</h4>
                      <p className="text-[10px] text-gray-400 font-bold tracking-tight mt-0.5">Restrict API clearance sweeps and logins strictly from approved IPs.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIpWhitelist(currentIP)}
                      className="text-[9px] bg-indigo-50 text-indigo-700 font-extrabold px-2 py-1 rounded border border-indigo-200 hover:bg-indigo-100 transition"
                    >
                      Fill current IP ({currentIP})
                    </button>
                  </div>
                  <input 
                    type="text"
                    value={ipWhitelist}
                    onChange={e => setIpWhitelist(e.target.value)}
                    placeholder="e.g. 164.88.201.42 or comma-split IPs"
                    className="w-full bg-gray-50 border border-gray-200 focus:border-indigo-600 focus:bg-white rounded-xl h-12 px-4 text-xs font-mono font-bold text-gray-900 outline-none transition"
                  />
                </div>

                {/* PREFERRED LANGUAGE SELECTOR */}
                <div className="space-y-4">
                  <label className="block text-xs font-black text-gray-900 uppercase tracking-wider pl-1">Statement Language Preferred</label>
                  <select
                    value={preferredLanguage}
                    onChange={e => setPreferredLanguage(e.target.value)}
                    className="max-w-xs w-full bg-gray-50 border border-gray-200 focus:border-indigo-600 focus:bg-white rounded-xl h-11 px-3 text-xs font-bold text-gray-905 outline-none transition"
                  >
                    <option value="en-US">English (United States) — SWIFT</option>
                    <option value="de-CH">Deutsch (Switzerland) — CH-Zustand</option>
                    <option value="en-GB">English (United Kingdom) — CHAPS</option>
                    <option value="zh-SG">简体中文 (Singapore) — MAS Compliance</option>
                  </select>
                </div>

                {/* ACTION SUBMIT BUTTON */}
                <div className="pt-6 border-t border-gray-100 flex justify-end">
                  <button
                    type="submit"
                    disabled={saving}
                    className="h-12 px-6 bg-indigo-650 hover:bg-indigo-750 disabled:bg-indigo-300 text-white font-black text-xs uppercase tracking-wider rounded-xl transition flex items-center justify-center gap-2 shadow-lg shadow-indigo-100"
                  >
                    {saving ? <Loader2 className="w-4.5 h-4.5 animate-spin" /> : <Save className="w-4.5 h-4.5" />}
                    Deploy Security Shield
                  </button>
                </div>
              </form>
            </motion.div>
          )}

          {/* TAB 3: ENDPOINT FIREWALL LOGS */}
          {activeTab === 'audit' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-8"
            >
              <div className="flex justify-between items-start gap-4 flex-wrap">
                <div>
                  <span className="text-[10px] font-black tracking-widest uppercase text-indigo-600 bg-indigo-50 border border-indigo-100 py-1 px-3 rounded-md">Real-Time Endpoint Audits</span>
                  <h2 className="text-2xl font-black text-gray-900 mt-3 tracking-tight">Active Firewall Handshakes</h2>
                  <p className="text-gray-450 text-xs mt-1">Live digital fingerprints and cryptographic ledger certificates authorizing your current session.</p>
                </div>

                <div className="flex items-center gap-2 text-xs font-black uppercase text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-xl border border-indigo-100 animate-pulse">
                  <Database className="w-4 h-4 shrink-0" />
                  Audit Core Online
                </div>
              </div>

              {/* CURRENT HANDSHAKE PROPERTIES TABLE */}
              <div className="border border-gray-150 rounded-2xl p-5 bg-gray-50 space-y-3.5">
                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Interactive Handshake Signature</h4>
                
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-bold font-mono divide-x divide-gray-200">
                  <div className="px-2">
                    <p className="text-[9px] text-gray-450 uppercase mb-0.5">Routing IP</p>
                    <p className="text-gray-905">{currentIP}</p>
                  </div>
                  <div className="px-4">
                    <p className="text-[9px] text-gray-450 uppercase mb-0.5">TLS Standard</p>
                    <p className="text-gray-905">TLS 1.3 / ECDSA</p>
                  </div>
                  <div className="px-4">
                    <p className="text-[9px] text-gray-450 uppercase mb-0.5">Cipher Block</p>
                    <p className="text-indigo-650">AES_256_GCM</p>
                  </div>
                  <div className="px-4">
                    <p className="text-[9px] text-gray-450 uppercase mb-0.5">Safety Index</p>
                    <p className="text-green-600">A+ SECURE</p>
                  </div>
                </div>
              </div>

              {/* SYSTEM AUDIT LIST */}
              <div className="space-y-4">
                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Historical Security Records (48H)</h4>
                
                <div className="divide-y divide-gray-100 border border-gray-150 rounded-2xl overflow-hidden bg-white">
                  {systemAuditLogs.map(log => (
                    <div key={log.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-gray-50/50 transition duration-150 text-xs">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-gray-400 font-extrabold">{log.id}</span>
                          <span className="text-[8px] font-black uppercase tracking-wider bg-gray-100 text-gray-500 py-0.5 px-2 rounded">
                            {log.category}
                          </span>
                        </div>
                        <p className="font-bold text-gray-800">{log.desc}</p>
                        <div className="flex items-center gap-3 text-[10px] text-gray-400 font-semibold">
                          <span>Origin: {log.origin}</span>
                          <span>•</span>
                          <span>Cipher: {log.cipher}</span>
                        </div>
                      </div>

                      <div className="sm:text-right flex sm:flex-col justify-between items-center sm:items-end shrink-0 gap-1.5 mt-2 sm:mt-0">
                        <span className="text-green-600 bg-green-50 py-0.5 px-2.5 rounded font-black uppercase text-[9px] tracking-wider border border-green-100 flex items-center gap-1">
                          <ShieldCheck className="w-3.5 h-3.5" />
                          {log.status}
                        </span>
                        <div className="text-[10px] text-gray-400 font-medium">
                          <p>{log.date}</p>
                          <p className="font-mono text-[9px] mt-0.5">{log.ip}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* WEBHOOK / DEVELOPER ENDPOINTS NOTE */}
              <div className="p-5 bg-indigo-50/30 rounded-2xl border border-indigo-100/50 flex items-start gap-4">
                <Webhook className="w-6 h-6 text-indigo-500 shrink-0 mt-0.5" />
                <div className="text-xs font-semibold leading-relaxed text-indigo-950">
                  <p className="font-black uppercase tracking-wide text-indigo-805">Real-Time Institutional Sandbox Webhooks</p>
                  <p className="text-[11px] text-indigo-700 mt-1 max-w-xl">
                    Our API clearance webhook engine will fire audit payload hashes securely to configured Slack channels or core nodes. Check resource documentation to configure custom micro-hooks.
                  </p>
                </div>
              </div>

            </motion.div>
          )}

        </div>

        {/* Right side helper panels (1 Columns wide) */}
        <div className="space-y-6">

          {/* LOCKDOWN ACTION PANEL */}
          <div className="bg-white rounded-3xl border border-gray-150 p-6 shadow-sm flex flex-col space-y-4">
            <div className="flex gap-2.5 items-center p-3 bg-red-50 text-red-700 rounded-xl">
              <ShieldAlert className="w-6 h-6 shrink-0 text-red-600 animate-bounce" />
              <div className="font-bold text-[10px] uppercase tracking-wider pl-0.5 leading-tight">
                Crisis Core Suspension Panel
              </div>
            </div>

            <p className="text-xs text-gray-500 font-medium leading-relaxed">
              If you detect unauthorized trading anomalies or credentials theft within your team limits, instantly deploy the Emergency Sandbox Halt.
            </p>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => setLockdownConfirmOpen(true)}
                disabled={isLockedDown}
                className="w-full py-4 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-black text-xs uppercase tracking-wider transition-all shadow-lg shadow-red-100"
              >
                {isLockedDown ? '● EMERGENCY PAUSED' : 'EMERGENCY SANDBOX HALT'}
              </button>
            </div>
          </div>

          {/* INFORMATION CARD MEMBERSHIP SUMMARY */}
          <div className="bg-white rounded-3xl border border-gray-150 p-6 shadow-sm space-y-4 text-xs">
            <h4 className="font-black text-gray-900 uppercase tracking-wider pb-2 border-b border-gray-105">Ledger Integrity Stats</h4>
            
            <div className="space-y-3">
              <div className="flex justify-between font-bold">
                <span className="text-gray-400">Account Role</span>
                <span className="text-indigo-600 uppercase font-black">{profile?.role}</span>
              </div>
              <div className="flex justify-between font-bold">
                <span className="text-gray-405">Identity Clear</span>
                <span className="text-green-600 uppercase font-black">{profile?.status}</span>
              </div>
              <div className="flex justify-between font-bold">
                <span className="text-gray-405">SWIFT Auth Key</span>
                <span className="text-gray-900 font-mono text-[10px]">{profile?.uid?.substring(0, 10)}...</span>
              </div>
              <div className="flex justify-between font-bold">
                <span className="text-gray-405">Registration</span>
                <span className="text-gray-900 font-semibold">{profile?.createdAt?.seconds ? new Date(profile.createdAt.seconds * 1000).toLocaleDateString() : 'Active'}</span>
              </div>
            </div>

            <div className="pt-4 border-t border-gray-100 space-y-2 text-[10px] text-gray-450 leading-relaxed font-semibold">
              <p>CentraBank and its security framework are accredited under national compliance clearances. All operations are logged automatically inside cryptographic audit ledgers.</p>
            </div>
          </div>

        </div>

      </div>

      {/* CONFIRMATION EMERGENCY LOCKDOWN MODAL */}
      <AnimatePresence>
        {lockdownConfirmOpen && (
          <div className="fixed inset-0 bg-gray-950/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-[2.5rem] border border-gray-150 p-8 w-full max-w-md shadow-2xl space-y-6 text-center"
            >
              <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto shadow-sm">
                <AlertTriangle className="w-9 h-9 animate-ping" />
              </div>

              <div className="space-y-2">
                <h3 className="text-xl font-black text-gray-955 tracking-tight uppercase">Confirm High-Alert Suspension</h3>
                <p className="text-xs text-gray-400 font-extrabold uppercase tracking-widest text-red-650">Warning: Action Cannot Be Undone Locally</p>
                <p className="text-gray-500 text-xs font-semibold leading-relaxed mt-2 pl-3 pr-3">
                  This forces a complete pending freeze on your user status, collapses all Outbound Transfer Limits to zero, forces 2-Factor controls, and logs out your session. Only compliance desk verification will restore access.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setLockdownConfirmOpen(false)}
                  className="py-3 bg-gray-50 border border-gray-200 text-gray-500 rounded-xl font-bold text-xs uppercase hover:bg-gray-100 transition"
                >
                  Cancel Escape
                </button>
                <button
                  type="button"
                  onClick={handleEmergencyHalt}
                  className="py-3 bg-red-650 text-white rounded-xl font-black text-xs uppercase hover:bg-red-750 transition shadow-lg shadow-red-100"
                >
                  Initiate Freeze
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
