import React, { useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  Building2, MapPin, ShieldCheck, FileText,
  ChevronRight, ChevronLeft, Loader2, CheckCircle2, AlertCircle
} from 'lucide-react';

const BUSINESS_TYPES = [
  'Corporation', 'Limited Liability Company (LLC)', 'Partnership',
  'Sole Proprietorship', 'Non-Profit Organization', 'Government Entity', 'Other'
];

const INDUSTRIES = [
  'Technology & Software', 'Finance & Banking', 'Healthcare & Pharmaceuticals',
  'Retail & E-Commerce', 'Real Estate & Construction', 'Manufacturing & Industrial',
  'Professional Services', 'Import / Export & Trade', 'Energy & Utilities',
  'Media & Entertainment', 'Education', 'Other'
];

const ACCOUNT_PURPOSES = [
  'General Business Operations', 'Payroll Processing', 'International Trade & Payments',
  'Investment Management', 'Corporate Expense Management', 'Supply Chain Payments', 'Other'
];

const MONTHLY_VOLUMES = [
  'Under $10,000', '$10,000 – $50,000', '$50,000 – $250,000',
  '$250,000 – $1,000,000', 'Over $1,000,000'
];

const FUND_SOURCES = [
  'Business Revenue & Sales', 'Investment Returns', 'Business Loan or Credit Facility',
  'Asset Sale or Liquidation', 'Government Contract', 'Other'
];

const COUNTRIES = [
  'United States', 'United Kingdom', 'Canada', 'Australia', 'Germany', 'France',
  'Singapore', 'United Arab Emirates', 'Japan', 'Switzerland', 'Netherlands',
  'Sweden', 'Norway', 'Denmark', 'New Zealand', 'Other'
];

const steps = [
  { label: 'Business Profile', icon: Building2 },
  { label: 'Contact & Address', icon: MapPin },
  { label: 'Compliance', icon: ShieldCheck },
  { label: 'Agreements', icon: FileText },
];

export default function Onboarding() {
  const { profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 1 — Business Profile
  const [displayName, setDisplayName] = useState(profile?.displayName || '');
  const [companyName, setCompanyName] = useState(profile?.companyName || '');
  const [businessType, setBusinessType] = useState('');
  const [industry, setIndustry] = useState('');
  const [taxId, setTaxId] = useState(profile?.taxId || '');

  // Step 2 — Contact & Address
  const [phoneNumber, setPhoneNumber] = useState(profile?.phoneNumber || '');
  const [country, setCountry] = useState(profile?.country || '');
  const [address, setAddress] = useState(profile?.address || '');
  const [cityName, setCityName] = useState(profile?.cityName || '');
  const [postalCode, setPostalCode] = useState(profile?.postalCode || '');

  // Step 3 — Compliance
  const [purposeOfAccount, setPurposeOfAccount] = useState('');
  const [expectedMonthlyVolume, setExpectedMonthlyVolume] = useState('');
  const [sourceOfFunds, setSourceOfFunds] = useState('');
  const [isPEP, setIsPEP] = useState(false);
  const [isUSPerson, setIsUSPerson] = useState(false);

  // Step 4 — Agreements
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [agreedToAML, setAgreedToAML] = useState(false);

  const validateStep = () => {
    if (step === 0) {
      if (!displayName.trim()) return 'Full legal name is required.';
      if (!companyName.trim()) return 'Company name is required.';
      if (!businessType) return 'Please select a business type.';
      if (!industry) return 'Please select an industry.';
      if (!taxId.trim()) return 'Tax ID / EIN is required.';
    }
    if (step === 1) {
      if (!phoneNumber.trim()) return 'Phone number is required.';
      if (!country) return 'Please select a country.';
      if (!address.trim()) return 'Street address is required.';
      if (!cityName.trim()) return 'City is required.';
      if (!postalCode.trim()) return 'Postal code is required.';
    }
    if (step === 2) {
      if (!purposeOfAccount) return 'Please select the purpose of your account.';
      if (!expectedMonthlyVolume) return 'Please select expected monthly volume.';
      if (!sourceOfFunds) return 'Please select your primary source of funds.';
    }
    if (step === 3) {
      if (!agreedToTerms) return 'You must agree to the Terms of Service.';
      if (!agreedToAML) return 'You must agree to the AML / KYC Policy.';
    }
    return null;
  };

  const handleNext = () => {
    const err = validateStep();
    if (err) { setError(err); return; }
    setError(null);
    setStep(s => s + 1);
  };

  const handleBack = () => {
    setError(null);
    setStep(s => s - 1);
  };

  const handleSubmit = async () => {
    const err = validateStep();
    if (err) { setError(err); return; }
    if (!profile) return;

    setSubmitting(true);
    setError(null);
    try {
      await updateDoc(doc(db, 'users', profile.uid), {
        displayName,
        companyName,
        businessType,
        industry,
        taxId,
        phoneNumber,
        country,
        address,
        cityName,
        postalCode,
        purposeOfAccount,
        expectedMonthlyVolume,
        sourceOfFunds,
        isPEP,
        isUSPerson,
        agreedToTerms,
        agreedToAML,
        onboardingCompleted: true,
      });
      await refreshProfile();
      navigate('/');
    } catch (e: any) {
      setError(e.message || 'Failed to save. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const SelectField = ({ label, value, onChange, options, required = true }: {
    label: string; value: string; onChange: (v: string) => void;
    options: string[]; required?: boolean;
  }) => (
    <div className="space-y-2">
      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">{label}</label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        required={required}
        className="w-full h-12 px-4 bg-gray-50 border-2 border-transparent focus:border-indigo-600 focus:bg-white rounded-xl transition-all font-semibold text-sm text-gray-900 outline-none"
      >
        <option value="">Select…</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );

  const InputField = ({ label, value, onChange, placeholder, type = 'text' }: {
    label: string; value: string; onChange: (v: string) => void;
    placeholder?: string; type?: string;
  }) => (
    <div className="space-y-2">
      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full h-12 px-4 bg-gray-50 border-2 border-transparent focus:border-indigo-600 focus:bg-white rounded-xl transition-all font-semibold text-sm text-gray-900 placeholder:text-gray-300 outline-none"
      />
    </div>
  );

  const ToggleField = ({ label, description, value, onChange }: {
    label: string; description: string; value: boolean; onChange: (v: boolean) => void;
  }) => (
    <div className="flex items-start justify-between gap-4 p-4 bg-gray-50 rounded-2xl border border-gray-100">
      <div>
        <p className="text-sm font-bold text-gray-900">{label}</p>
        <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">{description}</p>
      </div>
      <button
        type="button"
        onClick={() => onChange(!value)}
        className={`relative flex-shrink-0 w-12 h-6 rounded-full transition-colors ${value ? 'bg-indigo-600' : 'bg-gray-200'}`}
      >
        <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${value ? 'translate-x-6' : ''}`} />
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-xl">
        {/* Header */}
        <div className="text-center mb-8">
          <p className="text-xs font-black text-indigo-600 uppercase tracking-widest mb-2">CentraBank Corporate</p>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Account Compliance Setup</h1>
          <p className="text-gray-400 text-sm mt-2">Complete your KYC profile to activate your account.</p>
        </div>

        {/* Step indicators */}
        <div className="flex items-center justify-between mb-8 px-2">
          {steps.map((s, i) => {
            const Icon = s.icon;
            const done = i < step;
            const active = i === step;
            return (
              <React.Fragment key={i}>
                <div className="flex flex-col items-center gap-1.5">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                    done ? 'bg-indigo-600 text-white' : active ? 'bg-indigo-600 text-white ring-4 ring-indigo-100' : 'bg-gray-100 text-gray-400'
                  }`}>
                    {done ? <CheckCircle2 className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                  </div>
                  <span className={`text-[9px] font-black uppercase tracking-wider hidden sm:block ${active ? 'text-indigo-600' : 'text-gray-400'}`}>
                    {s.label}
                  </span>
                </div>
                {i < steps.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-2 rounded-full transition-colors ${i < step ? 'bg-indigo-600' : 'bg-gray-200'}`} />
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* Card */}
        <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm p-8 sm:p-10">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="space-y-5"
            >
              {/* Step 1 — Business Profile */}
              {step === 0 && (
                <>
                  <div>
                    <h2 className="text-xl font-black text-gray-900">Business Profile</h2>
                    <p className="text-xs text-gray-400 mt-1">Legal entity information for KYC verification.</p>
                  </div>
                  <InputField label="Full Legal Name" value={displayName} onChange={setDisplayName} placeholder="As it appears on government ID" />
                  <InputField label="Company / Business Name" value={companyName} onChange={setCompanyName} placeholder="Registered legal entity name" />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <SelectField label="Business Type" value={businessType} onChange={setBusinessType} options={BUSINESS_TYPES} />
                    <SelectField label="Industry" value={industry} onChange={setIndustry} options={INDUSTRIES} />
                  </div>
                  <InputField label="Business Tax ID / EIN" value={taxId} onChange={setTaxId} placeholder="e.g. 12-3456789" />
                </>
              )}

              {/* Step 2 — Contact & Address */}
              {step === 1 && (
                <>
                  <div>
                    <h2 className="text-xl font-black text-gray-900">Contact & Address</h2>
                    <p className="text-xs text-gray-400 mt-1">Primary business contact and registered address.</p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <InputField label="Phone Number" value={phoneNumber} onChange={setPhoneNumber} placeholder="+1 (555) 000-0000" type="tel" />
                    <SelectField label="Country" value={country} onChange={setCountry} options={COUNTRIES} />
                  </div>
                  <InputField label="Street Address" value={address} onChange={setAddress} placeholder="123 Business Ave, Suite 400" />
                  <div className="grid grid-cols-2 gap-4">
                    <InputField label="City" value={cityName} onChange={setCityName} placeholder="New York" />
                    <InputField label="Postal Code" value={postalCode} onChange={setPostalCode} placeholder="10001" />
                  </div>
                </>
              )}

              {/* Step 3 — Compliance Declarations */}
              {step === 2 && (
                <>
                  <div>
                    <h2 className="text-xl font-black text-gray-900">Compliance Declarations</h2>
                    <p className="text-xs text-gray-400 mt-1">Required for AML and regulatory compliance.</p>
                  </div>
                  <SelectField label="Purpose of Account" value={purposeOfAccount} onChange={setPurposeOfAccount} options={ACCOUNT_PURPOSES} />
                  <SelectField label="Expected Monthly Transaction Volume" value={expectedMonthlyVolume} onChange={setExpectedMonthlyVolume} options={MONTHLY_VOLUMES} />
                  <SelectField label="Primary Source of Funds" value={sourceOfFunds} onChange={setSourceOfFunds} options={FUND_SOURCES} />
                  <div className="space-y-3 pt-2">
                    <ToggleField
                      label="Politically Exposed Person (PEP)"
                      description="I or any beneficial owner holds or has held a prominent public function, or is a close associate of such a person."
                      value={isPEP}
                      onChange={setIsPEP}
                    />
                    <ToggleField
                      label="US Person (FATCA)"
                      description="I am a US citizen, US resident alien, or US entity subject to US tax reporting obligations."
                      value={isUSPerson}
                      onChange={setIsUSPerson}
                    />
                  </div>
                </>
              )}

              {/* Step 4 — Legal Agreements */}
              {step === 3 && (
                <>
                  <div>
                    <h2 className="text-xl font-black text-gray-900">Legal Agreements</h2>
                    <p className="text-xs text-gray-400 mt-1">Review and accept to complete registration.</p>
                  </div>

                  <div className="space-y-4">
                    <div className="border border-gray-100 rounded-2xl overflow-hidden">
                      <div className="bg-gray-50 px-5 py-3 border-b border-gray-100">
                        <p className="text-xs font-black text-gray-700 uppercase tracking-wider">Terms of Service</p>
                      </div>
                      <div className="p-5 h-32 overflow-y-auto text-xs text-gray-400 leading-relaxed">
                        By opening a CentraBank Corporate account, you agree to comply with all applicable laws and regulations. You acknowledge that CentraBank reserves the right to suspend or terminate accounts that violate our policies. All transactions are subject to review for compliance with anti-money laundering regulations. Account holders are responsible for maintaining the security of their credentials. CentraBank may update these terms with notice provided via email or in-app notification.
                      </div>
                      <label className="flex items-center gap-3 px-5 py-4 border-t border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors">
                        <input
                          type="checkbox"
                          checked={agreedToTerms}
                          onChange={e => setAgreedToTerms(e.target.checked)}
                          className="w-4 h-4 accent-indigo-600 rounded"
                        />
                        <span className="text-xs font-bold text-gray-700">I have read and agree to the Terms of Service</span>
                      </label>
                    </div>

                    <div className="border border-gray-100 rounded-2xl overflow-hidden">
                      <div className="bg-gray-50 px-5 py-3 border-b border-gray-100">
                        <p className="text-xs font-black text-gray-700 uppercase tracking-wider">AML / KYC Policy</p>
                      </div>
                      <div className="p-5 h-32 overflow-y-auto text-xs text-gray-400 leading-relaxed">
                        CentraBank is committed to preventing money laundering, terrorist financing, and other financial crimes. All customers must provide accurate identity and business information. We are required by law to report suspicious transactions to relevant authorities. By accepting this policy, you confirm that the information provided is truthful and complete. You consent to ongoing monitoring of your account activity as required by applicable AML regulations.
                      </div>
                      <label className="flex items-center gap-3 px-5 py-4 border-t border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors">
                        <input
                          type="checkbox"
                          checked={agreedToAML}
                          onChange={e => setAgreedToAML(e.target.checked)}
                          className="w-4 h-4 accent-indigo-600 rounded"
                        />
                        <span className="text-xs font-bold text-gray-700">I have read and agree to the AML / KYC Policy</span>
                      </label>
                    </div>
                  </div>
                </>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Error */}
          {error && (
            <div className="mt-5 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-start gap-3 text-red-600 text-xs font-semibold">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              {error}
            </div>
          )}

          {/* Navigation */}
          <div className="flex gap-3 mt-8">
            {step > 0 && (
              <button
                type="button"
                onClick={handleBack}
                className="flex items-center gap-2 px-6 h-12 rounded-xl border-2 border-gray-200 text-xs font-black text-gray-600 uppercase tracking-wider hover:border-gray-300 transition-all"
              >
                <ChevronLeft className="w-4 h-4" /> Back
              </button>
            )}
            {step < steps.length - 1 ? (
              <button
                type="button"
                onClick={handleNext}
                className="flex-1 flex items-center justify-center gap-2 h-12 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-lg shadow-indigo-100"
              >
                Continue <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting}
                className="flex-1 flex items-center justify-center gap-2 h-12 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-lg shadow-indigo-100"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <><CheckCircle2 className="w-4 h-4" /> Complete Registration</>}
              </button>
            )}
          </div>
        </div>

        <p className="text-center text-xs text-gray-300 mt-6 font-medium">
          Step {step + 1} of {steps.length} &nbsp;·&nbsp; Your information is encrypted and securely stored.
        </p>
      </div>
    </div>
  );
}
