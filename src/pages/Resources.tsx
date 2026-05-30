import React, { useState, useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { 
  Building2, 
  ChevronRight, 
  CreditCard, 
  FileText, 
  HelpCircle, 
  Info, 
  Landmark, 
  Lock, 
  PhoneCall, 
  ShieldCheck, 
  TrendingUp, 
  Wallet, 
  ScrollText, 
  Scale, 
  Fingerprint, 
  ArrowLeft,
  Search,
  ExternalLink
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

type TabType = 'products' | 'investments' | 'compliance' | 'security';

export default function Resources() {
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<TabType>('products');
  const [searchQuery, setSearchQuery] = useState('');

  // Handle URL params like ?tab=compliance#terms
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tabParam = params.get('tab') as TabType;
    if (tabParam && ['products', 'investments', 'compliance', 'security'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [location]);

  // Handle section scrolling on tab click
  useEffect(() => {
    if (location.hash) {
      const id = location.hash.replace('#', '');
      const element = document.getElementById(id);
      if (element) {
        setTimeout(() => {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 100);
      }
    }
  }, [activeTab, location.hash]);

  const tabs = [
    { id: 'products', name: 'Banking Products', icon: Landmark },
    { id: 'investments', name: 'Investments', icon: TrendingUp },
    { id: 'compliance', name: 'Compliance & Legal', icon: ScrollText },
    { id: 'security', name: 'Security & Info', icon: ShieldCheck },
  ];

  const sections = {
    products: [
      {
        id: 'commercial-banking',
        title: 'Commercial Banking',
        icon: Building2,
        subtitle: 'Enterprise-grade liquidity and treasury sweep tools',
        content: `CentraBank commercial tier platforms support scalable transaction limits, programmable multi-currency sweeps, and dedicated private banker support. We automate end-of-day balances transfer into insulated funds optimized to grow yield with minimal counterparty exposure. Suitable for high-growth tech companies and enterprise corporations requiring custom liquidity frameworks.`,
        features: ['Up to $5M daily automated outbound wire authorization limits', 'Dual-factor security validation rules for corporate payroll teams', 'Interbank liquidity sweeps targeting low-draw investment lines', 'Direct API programmatic webhooks connectivity']
      },
      {
        id: 'cash-vaults',
        title: 'High-Yield Cash Vaults',
        icon: Landmark,
        subtitle: 'Compounded 4.85% APY with seamless partner sweeps',
        content: `Our yields are powered by underlying investments in short-duration United States Sovereign Treasury Notes and AAA-rated sovereign paper. Deposited cash is seamlessly distributed among our trusted institutional partner banks (including Wells Fargo and HSBC) to maximize FDIC insurance safeguards up to $2.5M per corporate depositor.`,
        features: ['compounded daily with standard monthly distributions', 'No lockup periods. Withdraw funds instantly within 1 business day', 'Zero fee maintenance or transaction sweep commissions', 'Protected by multi-tier balance insurance protections']
      },
      {
        id: 'treasury-api',
        title: 'Treasury Management API',
        icon: Wallet,
        subtitle: 'Automated treasury ledger operations and Webhook routing',
        content: `The CentraBank developer portal yields total control over ledgers. Scale payments via REST interfaces, generate programmatic unique multi-recipient accounts on the fly, and receive near real-time network transaction callbacks. Fully compliant with PSD2 and enterprise transaction logging protocols.`,
        features: ['Real-time webhook notifications for deposits and card authorization approvals', 'JSON-REST conforming schemas with cryptographically signed API headers', 'Sandbox environments with fully simulated ledger state flows', 'Pre-baked SDK wrappers for key platforms']
      },
      {
        id: 'credit-infinite',
        title: 'Centra Credit Infinite Card',
        icon: CreditCard,
        subtitle: 'Exclusive active card controls and absolute zero limit fee structures',
        content: `Engineered for modern high-net-worth teams. The Centra Card features seamless transaction authorization constraints, instant physical or virtual card provisioning, and zero international FX conversion rates. Includes dynamic virtual key rotation to guard against card merchant database leaks.`,
        features: ['Unlimited 2.5% cash-back on all server-hosting and advertising expenses', 'Instant lock & threshold adjustments via desktop controls', 'No annual card fee when maintaining active balances above $10,000', 'Concierge luxury lounge and priority airport dispatch access']
      },
    ],
    investments: [
      {
        id: 'index-funds',
        title: 'Automated Index Funds',
        icon: TrendingUp,
        subtitle: 'Algorithm-driven index positioning focusing on steady accumulation',
        content: `CentraWealth Automated Core Portfolios leverage modern risk-adjusted allocation models to target absolute market return metrics. We actively adjust portfolio weight coordinates across high-grade sovereign ETFs, US Large-Cap growth stocks, and resilient infrastructure indices to control drawdowns.`,
        features: ['Dynamic automatic portfolio rebalancing at market close', 'Zero tax-drag implementation strategies', 'Choose from conservative, balanced, or high-growth tracks', 'No hidden management commissions for basic tiers']
      },
      {
        id: 'crypto-custody',
        title: 'Crypto Custody Vault',
        icon: Wallet,
        subtitle: 'Insured high-grade cold space custody for major digital assets',
        content: `Trade and store Bitcoin and Ethereum inside a deep regulatory-compliant space. Assets are safeguarded on dedicated physical hardware infrastructure completely detached from internet-facing environments. Security setups utilize threshold multi-party computation (MPC) and robust distributed keysets.`,
        features: ['$50M underlying insurance pool against underlying platform theft', 'Strict 24-hour cooling time constraints for wholesale asset withdrawals', 'No margin reuse (zero rehypothecation or lending of deposited crypto)', 'Direct fiat gateway settlements into High-Yield Cash Vaults']
      },
      {
        id: 'directed-equities',
        title: 'Self-Directed Equities',
        icon: CreditCard,
        subtitle: 'Absolute control over equity shares, warrants, and ETFs',
        content: `For active traders demanding extreme speed. Execute orders on major US exchanges instantly with zero transaction commissions. Our trading terminal includes standard limit orders, dynamic stop-loss triggers, and instant margin settlement options on qualified customer profiles.`,
        features: ['Direct market access execution speeds under 20 milliseconds', 'Fractional share investments starting as low as $1.00', 'Robust financial chart tools powered by professional metrics', 'Margin rates locked at steady competitive percentages']
      },
      {
        id: 'advisory-pricing',
        title: 'Advisory Account Pricing',
        icon: Info,
        subtitle: 'Symmetric, fully-transparent active portfolio management fee brackets',
        content: `Traditional banks obscure costs under complex transactional layouts. CentraWealth features standard fiduciary clarity. You get zero fees for basic self-directed profiles, and premium algorithmic portfolios are assessed a microscopic fraction of cumulative assets annually.`,
        features: ['Self-Directed Accounts: 100% Free of commission or storage fees', 'Automated Core portfolios: 0.25% fixed AUM fee annually', 'Institutional Custom Plans: High-net custom pricing quotes available', 'No early liquidation penalties or portal closing levies']
      },
    ],
    compliance: [
      {
        id: 'terms-service',
        title: 'Platform Terms of Service',
        icon: Scale,
        subtitle: 'User legal bindings, system access conditions, and platform rules',
        content: `Welcome to CentraBank. These Terms of Service ("Terms") govern your access to the CentraBank website, secure portal, and related APIs. By registering an account or executing simulated bank sweeps, you enter into a legally binding contract with CentraBank Corp. You agree to use the platform solely for lawful treasury exercises and represent that all user identification info provided during sign-up is accurate. Any unauthorized reverse engineering, high-frequency mechanical trading on simulated resources, or attempt to compromise core ledger architectures will trigger immediate legal revocation of system access.`,
        features: ['Last Revised: May 2026', 'Requires absolute compliance with domestic laws', 'Dispute resolution handled via standard AAA commercial arbitration', 'Simulated indices are mock indicators and hold zero real-world liquid conversion rights']
      },
      {
        id: 'cookie-policy',
        title: 'Cookie Policy',
        icon: FileText,
        subtitle: 'Dynamic device tracking, session cookies, and user consent parameters',
        content: `CentraBank utilizes standard browser cookies and local WebStorage mechanisms to deliver a secure, optimized, and uninterrupted user experience. We utilize three distinct categories of cookies: Essential (Strictly Required for tracking local profile sign-ups and multi-factor session validation), Functional Preferences (Used to recall selected investments tabs or dark settings), and Analytics (Microscopic telemetry tracking dashboard load speeds and server response rates). We strictly forbid cross-site trackers or sharing cooke hashes with secondary marketing bureaus.`,
        features: ['Essential cookies are permanent and mandatory for login tracking', 'Analytics data is fully aggregated and anonymized', 'User preferences can be fully managed via our bottom portal consent tracker', 'Session cookies expire automatically after 24 hours of inactivity']
      },
      {
        id: 'terms-catalog',
        title: 'Terms & Disclosure Catalog',
        icon: ScrollText,
        subtitle: 'Deposit Account Agreement, Sweep Operations, and Governing Jurisdiction',
        content: `This master advisory and banking disclosure regulates CentraBank deposit accounts and sweeping operations. By maintaining an active cash balance in our vaults, you consent to automatic interbank swept networks and fiduciary asset configurations governed strictly by federal banking authorities. Disputes are resolved via regulated financial arbitrations.`,
        features: ['Last Updated: April 2026', 'Governed under State of New York banking statutes', 'Standard FDIC sweep disclosures integrated', 'Clear dispute resolution procedures']
      },
      {
        id: 'privacy-policy',
        title: 'Privacy Policy',
        icon: ShieldCheck,
        subtitle: 'Absolute user privacy. Zero transactional data monetization protocols',
        content: `We recognize that your transaction history is strictly private. CentraBank does not, and will never, sell or rent consumer financial analytics to private marketers, advertising corporations, or external financial credit trackers. All transaction records and logs are encrypted at rest with military AES-256 standards.`,
        features: ['Zero third-party monetization or marketing data sales', '256-bit secure end-to-end telemetry encryption', 'GDPR and CCPA compliant request portals', 'Annual privacy compliance audit records publically available']
      },
      {
        id: 'sec-brochure',
        title: 'SEC Brochure (Adv Part 2A)',
        icon: FileText,
        subtitle: 'Fiduciary declaration, active trading disclosures, or portfolio risks',
        content: `CentraWealth Advisory LLC details standard brochure disclosures under the Investment Advisers Act of 1940. This filing details advisory methodologies, potential asset volatility indices, conflict mitigations, and execution principles. Investors are reminded that asset growth involves market drawdowns.`,
        features: ['Official SEC Registration #CRD-940523', 'Detailed disclosure of index fund algorithms and source data', 'Annual compliance certification check lists complete', 'Strict fiduciary standards applied to all active plans']
      },
      {
        id: 'esign-consent',
        title: 'E-Sign Consent Agreement',
        icon: Fingerprint,
        subtitle: 'Acceptance of electronic billing, monthly balance sheets, or tax tax documents',
        content: `By logging into our web portal, you accept paperless secure document distribution pathways. All monthly asset reports, tax statements (Form 1099-B, 1099-INT), transaction records, and compliance revisions are delivered electronically via your secure profile dashboard. Customers may opt for postal mail by submitting manual delivery queries.`,
        features: ['Instant environment setup with paperless defaults', 'Secure PDF statements available for download over 7 years back', 'Compliant with State and Federal electronic signature requirements']
      },
    ],
    security: [
      {
        id: 'security-center',
        title: 'Security Center',
        icon: ShieldCheck,
        subtitle: 'Symmetric encryptions, biometric constraints, and geo-validation locks',
        content: `At CentraBank, protecting corporate and personal wealth balances is our absolute center. All databases are distributed across geographically redundant private cloud architectures. Every session interaction is audited, and we enforce automatic transaction freezing on suspicious telemetry indicators.`,
        features: ['Strict biometric authentication validation options', '256-bit symmetric session transport encryptions', 'Instant transaction notification SMS or email alerts', 'Dedicated compliance monitoring staff available 24/7']
      },
      {
        id: 'nmls-lookup',
        title: 'NMLS lookup details',
        icon: Landmark,
        subtitle: 'Compliance documentation, corporate registry registry identifier',
        content: `CentraBank operates as a licensed commercial sweep clearing broker-dealer under state NMLS Registry #940523. This registration coordinates our oversight regarding domestic sweep lines, consumer credit provisions, and corporate liquidity accounts.`,
        features: ['Official Registry Identifier: NMLS #940523', 'Full compliance with all state lending and sweep guidelines', 'Annual regulatory reviews conducted by state departments']
      },
      {
        id: 'finra-brokercheck',
        title: 'FINRA BrokerCheck Status',
        icon: Lock,
        subtitle: 'Compliance verification with the Financial Industry Regulatory Authority',
        content: `CentraWealth Brokerage clearing allocations are operated in secure partnership with FINRA registered financial clearing institutions. You can check the background and registration details of our clearing desk at any point on the official FINRA BrokerCheck portal.`,
        features: ['Authorized asset trading parameters', 'Partnership with top-tier registered US clearing centers', 'Verified licensing check sheets on critical employees']
      }
    ]
  };

  const activeSections = sections[activeTab].filter(s => 
    s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.subtitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Search Header Banner */}
      <section className="bg-indigo-900 text-white relative py-12 md:py-16">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]" />
        
        <div className="max-w-6xl mx-auto px-6 relative">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="space-y-2">
              <Link to="/login" className="inline-flex items-center gap-2 text-xs font-bold text-indigo-200 hover:text-white transition-colors mb-2">
                <ArrowLeft className="w-4 h-4" />
                Back to Login / Dashboard
              </Link>
              <h1 className="text-3xl md:text-5xl font-black tracking-tight leading-none text-white">
                Resource & Compliance Vault
              </h1>
              <p className="text-sm md:text-base text-indigo-200 font-medium max-w-xl">
                Official banking products, advisory pricing disclosure documents, regulatory compliance papers, and dynamic security specs.
              </p>
            </div>

            {/* Quick Live Support Widget */}
            <div className="bg-white/10 p-5 rounded-2xl border border-white/10 backdrop-blur-md shrink-0 w-full md:w-auto">
              <p className="text-xs font-bold text-indigo-300 uppercase tracking-widest mb-1">Corporate Hotline</p>
              <p className="text-xl font-black">1-800-555-CNTR</p>
              <p className="text-[10px] text-indigo-200 font-medium">FDIC Cert #940523 • NMLS #940523</p>
            </div>
          </div>

          {/* Inline Live Search Box */}
          <div className="mt-8 max-w-lg bg-white rounded-2xl flex items-center shadow-lg border border-gray-100 p-2 text-gray-900">
            <Search className="w-5 h-5 text-gray-400 ml-3 shrink-0" />
            <input 
              type="text" 
              placeholder="Search compliance docs, dynamic cards features, APY specifications..."
              className="w-full px-3 py-2 font-medium bg-transparent border-none outline-none text-sm placeholder:text-gray-400 text-gray-900"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </section>

      {/* Main Tabbed Grid */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          
          {/* Navigation Sidebar */}
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-white p-3 rounded-2xl border border-gray-100 shadow-sm space-y-1">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-3 py-2">Categories</p>
              {tabs.map(tab => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => { setActiveTab(tab.id as TabType); setSearchQuery(''); }}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-xs font-black rounded-xl uppercase tracking-tight transition-all ${
                      activeTab === tab.id 
                        ? 'bg-indigo-600 text-white shadow-md' 
                        : 'text-gray-550 hover:bg-gray-50'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    {tab.name}
                  </button>
                );
              })}
            </div>

            {/* Quick Informational Cards */}
            <div className="bg-gradient-to-br from-indigo-950 to-indigo-900 text-white p-6 rounded-2xl shadow-md">
              <h4 className="font-bold text-sm mb-2 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                Fiduciary Commitment
              </h4>
              <p className="text-[11px] leading-relaxed text-indigo-200">
                CentraWealth agents act strictly as fiduciaries. We are legally bound to serve your absolute financial interest ahead of sales commissions.
              </p>
            </div>
          </div>

          {/* Dynamic Content Display Area */}
          <div className="lg:col-span-3 space-y-8">
            <div className="flex items-center justify-between border-b border-gray-200 pb-4">
              <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tight">
                {tabs.find(t => t.id === activeTab)?.name}
              </h2>
              <span className="text-xs text-gray-400 font-bold uppercase tracking-widest font-mono">
                {activeSections.length} Articles Available
              </span>
            </div>

            {activeSections.length === 0 ? (
              <div className="bg-white p-12 text-center rounded-3xl border border-gray-100 flex flex-col items-center justify-center">
                <HelpCircle className="w-12 h-12 text-gray-300 mb-3" />
                <h4 className="font-bold text-gray-900 mb-1">No matching resources found</h4>
                <p className="text-xs text-gray-500 max-w-xs">Try searching for other terms like APY, Custody, FDIC, NMLS, or Sweep rules.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {activeSections.map(sec => {
                  const Icon = sec.icon;
                  return (
                    <motion.div
                      key={sec.id}
                      id={sec.id}
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md hover:border-gray-200/60 transition-all scroll-mt-20"
                    >
                      <div className="flex gap-4 items-start mb-4">
                        <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                          <Icon className="w-6 h-6" />
                        </div>
                        <div>
                          <h3 className="font-black text-lg text-gray-900 leading-tight">
                            {sec.title}
                          </h3>
                          <p className="text-xs text-indigo-600 font-extrabold mt-0.5">
                            {sec.subtitle}
                          </p>
                        </div>
                      </div>

                      {/* Content text */}
                      <p className="text-xs text-gray-500 leading-relaxed font-medium mb-6">
                        {sec.content}
                      </p>

                      {/* Highlight Specs */}
                      {sec.features && (
                        <div className="p-4 bg-gray-50 rounded-2xl">
                          <p className="text-[10px] font-black uppercase text-gray-400 tracking-wider mb-2">Key Disclosures & Specs</p>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {sec.features.map((feat, index) => (
                              <div key={index} className="flex gap-2 items-start text-[11px] text-gray-650 font-semibold leading-tight">
                                <ChevronRight className="w-3.5 h-3.5 text-indigo-600 shrink-0 mt-0.5" />
                                <span>{feat}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>

        </div>
      </main>

      {/* Simple Information Center Footer */}
      <footer className="bg-white border-t border-gray-150 py-10 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-gray-400">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center">
              <CreditCard className="w-4 h-4" />
            </div>
            <span className="font-black text-gray-900">CentraBank Vault Services</span>
          </div>
          <p>© 2026 CentraBank & Wealth Advisory, LLC. FDIC member sweeper setup. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
