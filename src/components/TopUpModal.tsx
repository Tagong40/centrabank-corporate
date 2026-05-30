import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, CreditCard, Landmark, Wallet, CheckCircle2, Loader2, AlertCircle, 
  ShieldCheck, ArrowUpRight, ArrowDownLeft, KeyRound, AlertTriangle, 
  Fingerprint, Sparkles, Check, HelpCircle, RefreshCw
} from 'lucide-react';
import { BankAccount, UserProfile } from '../types';
import { useAuth } from '../context/AuthContext';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { doc, runTransaction, collection, serverTimestamp } from 'firebase/firestore';

interface TopUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm?: (accountId: string, amount: number, method: string, description: string) => Promise<void>;
  account: BankAccount | null;
  initialMode?: 'deposit' | 'withdraw';
}

const POPULAR_FINANCES = [
  'JPMorgan Chase Bank',
  'Wells Fargo Bank',
  'Citibank, N.A.',
  'Bank of America',
  'Goldman Sachs & Co.',
  'Fidelity Clearing LLC'
];

export const TopUpModal: React.FC<TopUpModalProps> = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  account,
  initialMode = 'deposit'
}) => {
  const { profile } = useAuth();
  
  // Tab control: 'deposit' or 'withdraw'
  const [activeTab, setActiveTab] = useState<'deposit' | 'withdraw'>(initialMode);

  // General Amount input
  const [amount, setAmount] = useState('');
  
  // Deposit configurations
  const [depositMethod, setDepositMethod] = useState<'card' | 'ach'>('card');
  const [description, setDescription] = useState('');

  // Card sub-form
  const [cardNumber, setCardNumber] = useState('');
  const [cardHolder, setCardHolder] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');

  // ACH sub-form (used for both Deposit-ACH or Withdrawal destination)
  const [routingNumber, setRoutingNumber] = useState('');
  const [bankAccountNumber, setBankAccountNumber] = useState('');
  const [destinationBank, setDestinationBank] = useState('JPMorgan Chase Bank');
  const [recipientName, setRecipientName] = useState('');

  // Withdrawal configurations
  const [withdrawalSpeed, setWithdrawalSpeed] = useState<'ach' | 'wire'>('ach');
  const [securityPIN, setSecurityPIN] = useState('');

  // State indicators
  const [processing, setProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState(0);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [txDetails, setTxDetails] = useState<any>(null);

  // Auto-fill active tab based on prop
  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialMode);
      setAmount('');
      setError(null);
      setSuccess(false);
      setProcessing(false);
      setSecurityPIN('');
      setDescription('');
      setCardNumber('');
      setCardHolder(profile?.displayName || '');
      setCardExpiry('');
      setCardCvv('');
      setRoutingNumber('');
      setBankAccountNumber('');
      setRecipientName('');
    }
  }, [isOpen, initialMode, profile]);

  if (!isOpen || !account) return null;

  // Formatting helper for Card Number: xxxx xxxx xxxx xxxx
  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 16) value = value.slice(0, 16);
    const matches = value.match(/\d{1,4}/g);
    const formatted = matches ? matches.join(' ') : '';
    setCardNumber(formatted);
  };

  // Formatting helper for Card Expiry: MM/YY
  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 4) value = value.slice(0, 4);
    if (value.length >= 2) {
      value = value.slice(0, 2) + '/' + value.slice(2);
    }
    setCardExpiry(value);
  };

  // Fast-fill buttons
  const applyFastAmount = (val: number) => {
    setAmount(val.toString());
  };

  const getDailyLimit = () => {
    return profile?.dailyTransferLimit || 150000;
  };

  // Check card brand logo based on starting digit
  const getCardBrand = (num: string) => {
    const cleanNum = num.replace(/\s+/g, '');
    if (cleanNum.startsWith('4')) return 'Visa';
    if (/^5[1-5]/.test(cleanNum)) return 'Mastercard';
    if (/^3[47]/.test(cleanNum)) return 'AmericanExpress';
    return 'Debit Card';
  };

  // Complete simulation steps for bank-grade feedback
  const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  const executeSimulatedClearing = async (isWithdrawal: boolean) => {
    setProcessing(true);
    setError(null);
    
    const steps = isWithdrawal 
      ? [
          'Initializing secured outbound SWIFT clearing session...',
          'Scanning destination routing (RTN) with Federal Reserve nodes...',
          'Verifying corporate identity AML limits & OFAC compliance checklists...',
          'Deducting assets and writing immutable ledger hashes to Firestore...'
        ]
      : [
          'Opening 256-bit bank gateway cryptographic tunnel...',
          'Triggering 3D-Secure payment handshaking protocol...',
          'Verifying balance availability and sweep security bounds...',
          'Increasing funds and synchronizing ledger ledgers to Firestore...'
        ];

    for (let i = 0; i < steps.length; i++) {
      setProcessingStep(i);
      await sleep(1000);
    }
  };

  const handleActionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    setError(null);
    const numAmount = parseFloat(amount);
    
    // Validations
    if (isNaN(numAmount) || numAmount <= 0) {
      setError("Please input a valid positive transfer amount.");
      return;
    }

    if (activeTab === 'withdraw') {
      // Withdrawal bounds validation
      if (numAmount > account.balance) {
        setError(`Insufficient funds in standard reserves. Selected account only contains ${account.balance.toLocaleString('en-US', { style: 'currency', currency: account.currency })}.`);
        return;
      }

      // Check daily bounds
      const limit = getDailyLimit();
      if (numAmount > limit) {
        setError(`Security Violation: Transaction amount $${numAmount.toLocaleString()} exceeds your Authorized Outbound Daily Clearing Limit of $${limit.toLocaleString()}! Configure bounds under KYC Dossier.`);
        return;
      }

      // Bank coordinates validation
      if (!recipientName.trim()) {
        setError("Beneficiary / Corporate recipient title is required.");
        return;
      }
      if (!routingNumber || routingNumber.length !== 9) {
        setError("Please enter a valid 9-digit Fed Routing Transit Number.");
        return;
      }
      if (!bankAccountNumber) {
        setError("Destination account number reference is required.");
        return;
      }

      // Secure PIN validations
      if (profile.securityPINCode) {
        if (!securityPIN) {
          setError("Authorized cryptographic security transaction PIN code is required to sweep outbound reserves.");
          return;
        }
        if (securityPIN !== profile.securityPINCode) {
          setError("FAILED CRYPTOGRAPHIC AUTH: Invalid security transaction authorization PIN code.");
          return;
        }
      } else {
        // If they don't have a PIN, warn them but allow standard pin '123456' or require something
        if (securityPIN && securityPIN !== '123456') {
          setError("Incorrect Sandbox Override PIN. Set up a secure custom PIN code inside Safety settings tab or use default bypass: 123456");
          return;
        }
        if (!securityPIN) {
          setError("Attention: Standard verification code required. Please configure a custom secure PIN in Settings. Enter '123456' to authorize sandbox sweep.");
          return;
        }
      }
    } else {
      // Deposit validation
      if (depositMethod === 'card') {
        const cleanCard = cardNumber.replace(/\s+/g, '');
        if (cleanCard.length < 15) {
          setError("Card number format invalid (requires 15-16 digits).");
          return;
        }
        if (!cardExpiry || cardExpiry.length < 5) {
          setError("Card expiry (MM/YY) is required.");
          return;
        }
        if (!cardCvv || cardCvv.length < 3) {
          setError("Secure CVV is required.");
          return;
        }
      } else {
        // ACH
        if (!routingNumber || routingNumber.length !== 9) {
          setError("Routing Transit Number (9 digits) is required for ACH sweep.");
          return;
        }
        if (!bankAccountNumber) {
          setError("Direct funding account number is required.");
        }
      }
    }

    // Pass verification checkpoints, execute Firestore Transaction
    try {
      // Run the visual bank clearance animations
      await executeSimulatedClearing(activeTab === 'withdraw');

      // Setup unique transaction doc
      const txId = doc(collection(db, 'transactions')).id;
      
      await runTransaction(db, async (trans) => {
        const accountRef = doc(db, 'accounts', account.id);
        const accountSnap = await trans.get(accountRef);

        if (!accountSnap.exists()) {
          throw new Error("Target clearing bank account does not exist inside repository.");
        }

        const currentBalance = accountSnap.data().balance;
        
        let newBalance = currentBalance;
        if (activeTab === 'deposit') {
          // Top up (Deposit) requires manual admin approval, so do NOT update the balance on creation!
          newBalance = currentBalance;
        } else {
          // Withdrawal: Deduct the balance immediately to place the funds on a compliance hold
          newBalance = currentBalance - numAmount;
          
          // Update balance for the hold
          trans.update(accountRef, {
            balance: newBalance,
            lastTransactionId: txId
          });
        }

        // 2. Setup Transaction record
        const transRef = doc(db, 'transactions', txId);
        
        const txDesc = description || (activeTab === 'deposit'
          ? `Top-up via ${depositMethod === 'card' ? 'Cryptographic Card Route' : 'ACH Sweep Route'}`
          : `Outbound Withdrawal Sweep to ${destinationBank}`);

        const txPayload = {
          fromAccountId: activeTab === 'deposit' ? 'external' : account.id,
          fromUserId: activeTab === 'deposit' ? 'external' : profile.uid,
          toAccountId: activeTab === 'deposit' ? account.id : 'external',
          toUserId: activeTab === 'deposit' ? profile.uid : 'external',
          toAccountNumber: activeTab === 'deposit' ? account.accountNumber : bankAccountNumber,
          amount: numAmount,
          description: txDesc,
          status: 'pending',
          type: activeTab === 'deposit' ? 'topup' : 'withdraw',
          routingNumber: routingNumber || '021000021',
          recipientBank: activeTab === 'deposit' ? 'Federal Clearance Gate' : destinationBank,
          beneficiaryName: activeTab === 'deposit' ? profile.displayName : recipientName,
          timestamp: serverTimestamp(),
          paymentMethod: activeTab === 'deposit' ? depositMethod : 'ach_outbound',
          wireSpeed: activeTab === 'withdraw' ? withdrawalSpeed : 'instant',
          lastTransactionId: txId
        };

        trans.set(transRef, txPayload);
      });

      // Populate summary cert
      setTxDetails({
        id: txId,
        amount: numAmount,
        type: activeTab,
        method: activeTab === 'deposit' ? (depositMethod === 'card' ? 'Debit/Credit Card' : 'ACH Pull Sweep') : `Outbound Bank ${withdrawalSpeed.toUpperCase()}`,
        destination: activeTab === 'deposit' ? account.accountName : `${destinationBank} (Acct: ••••${bankAccountNumber.slice(-4)})`,
        date: new Date().toLocaleTimeString()
      });

      setSuccess(true);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Clearing engine encountered a connectivity error. Re-route requested.");
    } finally {
      setProcessing(false);
    }
  };

  const currentStepLabel = () => {
    const isWithdraw = activeTab === 'withdraw';
    const s = [
      isWithdraw ? 'Initializing wire pipeline' : 'Securing transaction endpoints',
      isWithdraw ? 'Syncing routing nodes' : 'Authorizing client signatures',
      isWithdraw ? 'Scanning AML watchlists' : 'Sweeping clearance reserves',
      isWithdraw ? 'Filing settlement keys' : 'Verifying ledger commits'
    ];
    return s[processingStep] || 'Evaluating assets...';
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        
        {/* Backdrop overlay */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-slate-950/70 backdrop-blur-md"
        />
        
        {/* Main Box */}
        <motion.div 
          initial={{ scale: 0.94, opacity: 0, y: 15 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.94, opacity: 0, y: 15 }}
          className="relative w-full max-w-2xl bg-white rounded-[2rem] shadow-2xl overflow-hidden max-h-[90vh] flex flex-col border border-slate-200"
        >
          
          {/* Header section with tab segments */}
          <div className="px-8 pt-6 pb-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
            <div>
              <div className="flex items-center gap-1.5 text-indigo-600">
                <ShieldCheck className="w-5 h-5 animate-pulse" />
                <span className="text-[10px] font-black uppercase tracking-widest bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">CentraBank Clearing Desk</span>
              </div>
              <p className="text-xs text-slate-450 mt-1">Authorized transaction clearance console.</p>
            </div>
            
            <button 
              onClick={onClose} 
              className="p-2 hover:bg-gray-100 rounded-xl transition duration-150 absolute right-6 top-6"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>

          {/* Interactive Modal View Area */}
          <div className="overflow-y-auto flex-1 p-6 sm:p-8 space-y-6">
            
            {/* SUCCESS OVERLAY SCREENS */}
            {success && txDetails ? (
              <motion.div 
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-8 space-y-6"
              >
                <div className="w-16 h-16 bg-green-50 border border-green-200 text-green-500 rounded-full flex items-center justify-center mx-auto shadow-sm">
                  <Check className="w-8 h-8 animate-bounce" />
                </div>
                
                <div className="space-y-1">
                  <h3 className="text-2xl font-black text-slate-900 tracking-tight">Ledger Settled Successfully</h3>
                  <p className="text-[10px] uppercase font-black tracking-widest text-green-600">Compliance Audit Approved</p>
                </div>

                {/* Micro Receipt Info */}
                <div className="max-w-md mx-auto bg-gray-50 border border-gray-150 p-5 rounded-2xl text-xs space-y-3.5 text-left font-semibold">
                  <div className="flex justify-between pb-2 border-b border-gray-100 font-mono text-[10px] text-gray-450">
                    <span>CLEARING ID:</span>
                    <span>{txDetails.id}</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-gray-400">Transaction Category</span>
                    <span className="text-slate-900 capitalize font-bold">{txDetails.type} Funding</span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-gray-400">Transfer Mechanism</span>
                    <span className="text-slate-900">{txDetails.method}</span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-gray-400">Target Account / Source</span>
                    <span className="text-slate-900">{txDetails.destination}</span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-gray-400">Clearing Timestamp</span>
                    <span className="text-slate-900 font-mono text-[10px]">{txDetails.date}</span>
                  </div>

                  <div className="flex justify-between items-baseline pt-2 border-t border-gray-100 font-bold text-sm">
                    <span className="text-gray-900">Settled Liquidity</span>
                    <span className="text-indigo-650 text-base font-black">
                      ${txDetails.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                <div className="pt-4 max-w-xs mx-auto">
                  <button
                    onClick={onClose}
                    className="w-full py-3.5 bg-slate-900 hover:bg-slate-950 text-white rounded-xl font-bold uppercase tracking-wider text-[10px] transition"
                  >
                    Close Clearance Console
                  </button>
                </div>
              </motion.div>
            ) : processing ? (
              
              /* PROCESSING BLOCK (FEDERAL SIMULATOR) */
              <div className="py-16 text-center space-y-6">
                <div className="relative w-20 h-20 mx-auto">
                  <div className="absolute inset-0 rounded-full border-4 border-indigo-50 border-t-indigo-600 animate-spin" />
                  <div className="absolute inset-2.5 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center animate-pulse">
                    <RefreshCw className="w-8 h-8" />
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="text-lg font-black text-slate-950 uppercase tracking-tight">{currentStepLabel()}</h4>
                  <p className="text-xs text-gray-450 tracking-wide font-medium animate-pulse">Syncing high-alert balance ledger in real-time...</p>
                </div>

                {/* Progress bar state */}
                <div className="max-w-xs mx-auto bg-gray-100 h-2.5 rounded-full overflow-hidden border border-gray-200">
                  <motion.div 
                    className="h-full bg-indigo-650 rounded-full"
                    initial={{ width: '5%' }}
                    animate={{ width: `${(processingStep + 1) * 25}%` }}
                    transition={{ duration: 0.9 }}
                  />
                </div>

                {/* Status dots */}
                <div className="flex justify-center gap-1.5 text-[9px] font-black uppercase text-gray-400 font-mono">
                  <span className={processingStep >= 0 ? 'text-indigo-600' : ''}>LINK</span>
                  <span>•</span>
                  <span className={processingStep >= 1 ? 'text-indigo-600' : ''}>SIGN</span>
                  <span>•</span>
                  <span className={processingStep >= 2 ? 'text-indigo-600' : ''}>AML/OFAC</span>
                  <span>•</span>
                  <span className={processingStep >= 3 ? 'text-indigo-600' : ''}>SETTLE</span>
                </div>
              </div>

            ) : (
              
              /* BASE INPUTS COMPONENT */
              <form onSubmit={handleActionSubmit} className="space-y-6">
                
                {/* 1. SECTOR TAB SEGMENT TOGGLER */}
                <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-2xl border border-slate-200">
                  <button
                    type="button"
                    onClick={() => { setActiveTab('deposit'); setError(null); }}
                    className={`py-3.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
                      activeTab === 'deposit' 
                        ? 'bg-indigo-600 text-white shadow-md' 
                        : 'text-slate-400 hover:text-slate-800'
                    }`}
                  >
                    <ArrowDownLeft className="w-4.5 h-4.5" />
                    Top Up (Deposit)
                  </button>
                  <button
                    type="button"
                    onClick={() => { setActiveTab('withdraw'); setError(null); }}
                    className={`py-3.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
                      activeTab === 'withdraw' 
                        ? 'bg-indigo-600 text-white shadow-md' 
                        : 'text-slate-400 hover:text-slate-800'
                    }`}
                  >
                    <ArrowUpRight className="w-4.5 h-4.5" />
                    Withdraw Funds
                  </button>
                </div>

                {/* 2. Target Account Badge */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-indigo-50/50 border border-indigo-100 p-5 rounded-2xl gap-3">
                  <div>
                    <p className="text-[10px] text-indigo-400 uppercase font-black tracking-widest">Active Clearing Account Name</p>
                    <h5 className="font-extrabold text-slate-900 mt-1">{account.accountName}</h5>
                  </div>
                  <div className="text-left sm:text-right">
                    <p className="text-[10px] text-indigo-400 uppercase font-black tracking-widest">Current Settle Reserve</p>
                    <h5 className="font-bold text-indigo-900 font-mono mt-1 text-sm bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                      {account.balance.toLocaleString('en-US', { style: 'currency', currency: account.currency })}
                    </h5>
                  </div>
                </div>

                {/* 3. Amount Section */}
                <div className="space-y-3">
                  <div className="flex justify-between items-baseline font-black text-[10px] text-gray-400 uppercase tracking-widest">
                    <span>SET TRANSACTION VOLUME</span>
                    {activeTab === 'withdraw' && (
                      <span className="text-red-500 font-bold">Max Limit: ${getDailyLimit().toLocaleString()} Daily</span>
                    )}
                  </div>
                  
                  <div className="relative">
                    <span className="absolute left-6 top-1/2 -translate-y-1/2 text-2xl font-black text-slate-400">$</span>
                    <input 
                      type="number"
                      required
                      min="1"
                      step="0.01"
                      placeholder="0.00"
                      value={amount}
                      onChange={e => setAmount(e.target.value)}
                      className="w-full pl-12 pr-6 py-5 bg-gray-50 border border-gray-200 focus:border-indigo-600 focus:bg-white rounded-2xl text-3xl font-black text-slate-950 font-mono outline-none transition"
                      autoFocus
                    />
                  </div>

                  {/* Pick Quick-Amount pills */}
                  <div className="flex flex-wrap gap-2 pt-1">
                    {[1000, 5000, 25000, 100000].map(val => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => applyFastAmount(val)}
                        className="px-3.5 py-1.5 bg-gray-50 hover:bg-indigo-50 border border-gray-200 hover:border-indigo-200 rounded-lg text-xs font-bold text-gray-500 hover:text-indigo-600 transition"
                      >
                        +${val.toLocaleString()}
                      </button>
                    ))}
                    {activeTab === 'withdraw' && (
                      <button
                        type="button"
                        onClick={() => setAmount(account.balance.toString())}
                        className="px-3.5 py-1.5 bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 text-xs font-black rounded-lg transition ml-auto"
                      >
                        Sweep Max (100%)
                      </button>
                    )}
                  </div>
                </div>

                {/* 4. DETAILS - DEPOSIT BLOCK */}
                {activeTab === 'deposit' && (
                  <div className="space-y-6">
                    {/* Method toggle */}
                    <div className="space-y-2">
                      <span className="block text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">FUNDING INTEGRITY MECHANISM</span>
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() => setDepositMethod('card')}
                          className={`p-4 rounded-xl border-2 text-left transition duration-200 ${
                            depositMethod === 'card' 
                              ? 'border-indigo-600 bg-indigo-50/10' 
                              : 'border-gray-100 hover:border-gray-200 bg-white'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 text-xs font-black uppercase text-slate-800">
                            <CreditCard className="w-5 h-5 text-indigo-500" />
                            Credit/Debit Card
                          </div>
                          <p className="text-[10px] text-gray-400 mt-1 font-semibold pl-8">Visa, MasterCard, or Corporate card.</p>
                        </button>

                        <button
                          type="button"
                          onClick={() => setDepositMethod('ach')}
                          className={`p-4 rounded-xl border-2 text-left transition duration-200 ${
                            depositMethod === 'ach' 
                              ? 'border-indigo-600 bg-indigo-50/10' 
                              : 'border-gray-100 hover:border-gray-200 bg-white'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 text-xs font-black uppercase text-slate-800">
                            <Landmark className="w-5 h-5 text-indigo-500" />
                            Federal ACH Pull
                          </div>
                          <p className="text-[10px] text-gray-400 mt-1 font-semibold pl-8">Pull sweeps secure from linked corporate accounts.</p>
                        </button>
                      </div>
                    </div>

                    {/* SUB-FORM: CARD DEPOSIT */}
                    {depositMethod === 'card' && (
                      <div className="space-y-5 bg-gradient-to-b from-gray-50 to-white p-6 rounded-2xl border border-gray-150 relative">
                        
                        {/* Interactive Bank Card Visual Mock */}
                        <div className="w-full aspect-[1.58/1] sm:max-w-xs mx-auto bg-gradient-to-tr from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-6 shadow-xl flex flex-col justify-between relative overflow-hidden shrink-0">
                          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />
                          <div className="flex justify-between items-start">
                            <div className="space-y-0.5">
                              <span className="text-[8px] font-black tracking-widest uppercase bg-indigo-500/20 px-2 py-0.5 rounded border border-white/5">Centra Security Card</span>
                              <p className="text-[10px] font-black tracking-tight text-indigo-200 uppercase mt-1">Clearing Node Shield</p>
                            </div>
                            <div className="text-right text-xs font-mono font-black italic opacity-85">
                              {cardNumber ? getCardBrand(cardNumber) : 'Corporate Credit'}
                            </div>
                          </div>

                          <div className="space-y-4">
                            {/* Card number mock */}
                            <p className="text-lg font-mono font-bold tracking-widest">
                              {cardNumber || '•••• •••• •••• ••••'}
                            </p>

                            <div className="flex justify-between items-end">
                              <div>
                                <p className="text-[7px] text-gray-400 uppercase tracking-widest">Authorized Signatory</p>
                                <p className="text-[10px] font-mono tracking-wider font-extrabold uppercase mt-0.5 max-w-[140px] truncate">
                                  {cardHolder || 'Legal Partner Name'}
                                </p>
                              </div>

                              <div className="flex gap-4">
                                <div>
                                  <p className="text-[7px] text-gray-400 uppercase tracking-widest">Expiry</p>
                                  <p className="text-[10px] font-mono font-extrabold mt-0.5">{cardExpiry || 'MM/YY'}</p>
                                </div>
                                <div>
                                  <p className="text-[7px] text-gray-400 uppercase tracking-widest">CVV</p>
                                  <p className="text-[10px] font-mono font-extrabold mt-0.5">{cardCvv || '•••'}</p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Interactive Card Fields */}
                        <div className="space-y-4 pt-4 border-t border-gray-100">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1 font-bold">16-Digit Card Number</label>
                              <div className="relative">
                                <CreditCard className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-400" />
                                <input 
                                  type="text"
                                  placeholder="4000 1234 5678 9010"
                                  value={cardNumber}
                                  onChange={handleCardNumberChange}
                                  className="w-full h-11 bg-white border border-gray-250 rounded-xl pl-11 pr-4 text-xs font-mono font-bold outline-none focus:border-indigo-600 text-gray-900"
                                />
                              </div>
                            </div>

                            <div className="space-y-1.5">
                              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1 font-bold">Authorized Signatory Name</label>
                              <input 
                                type="text"
                                placeholder="Legal partner name"
                                value={cardHolder}
                                onChange={e => setCardHolder(e.target.value)}
                                className="w-full h-11 bg-white border border-gray-250 rounded-xl px-4 text-xs font-semibold outline-none focus:border-indigo-600 text-gray-900"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1 font-bold">Expiration MM/YY</label>
                              <input 
                                type="text"
                                placeholder="09/28"
                                value={cardExpiry}
                                onChange={handleExpiryChange}
                                className="w-full h-11 bg-white border border-gray-250 rounded-xl px-4 text-xs font-mono font-extrabold outline-none focus:border-indigo-600 text-center text-gray-900"
                              />
                            </div>

                            <div className="space-y-1.5">
                              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1 font-bold">Security Code CVV</label>
                              <input 
                                type="password"
                                maxLength={4}
                                placeholder="CVV (e.g. 123)"
                                value={cardCvv}
                                onChange={e => setCardCvv(e.target.value.replace(/\D/g, ''))}
                                className="w-full h-11 bg-white border border-gray-250 rounded-xl px-4 text-xs font-mono font-extrabold outline-none focus:border-indigo-600 text-center text-gray-900"
                              />
                            </div>
                          </div>
                        </div>

                      </div>
                    )}

                    {/* SUB-FORM: ACH DEPOSIT */}
                    {depositMethod === 'ach' && (
                      <div className="space-y-4 bg-gray-50/70 p-5 rounded-2xl border border-gray-150">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1 font-bold">Inbound Bank Entity</label>
                            <select 
                              value={destinationBank}
                              onChange={e => setDestinationBank(e.target.value)}
                              className="w-full h-11 bg-white border border-gray-200 rounded-xl px-3 text-xs font-bold outline-none focus:border-indigo-600 text-gray-900"
                            >
                              {POPULAR_FINANCES.map(b => (
                                <option key={b} value={b}>{b}</option>
                              ))}
                            </select>
                          </div>

                          <div className="space-y-1.5">
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1 font-bold">Authorized Account Holder</label>
                            <input 
                              type="text"
                              required
                              placeholder="Account legal signatory title"
                              value={recipientName}
                              onChange={e => setRecipientName(e.target.value)}
                              className="w-full h-11 bg-white border border-gray-200 rounded-xl px-4 text-xs font-semibold outline-none focus:border-indigo-600 text-gray-900"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1 font-bold">9-Digit Routing Transit Number (RTN)</label>
                            <input 
                              type="text"
                              maxLength={9}
                              required
                              placeholder="e.g. 021000021"
                              value={routingNumber}
                              onChange={e => setRoutingNumber(e.target.value.replace(/\D/g, ''))}
                              className="w-full h-11 bg-white border border-gray-200 rounded-xl px-4 text-xs font-mono font-bold tracking-wider outline-none focus:border-indigo-600 text-gray-900"
                            />
                          </div>

                          <div className="space-y-1.5">
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1 font-bold">Source Funding Account Number</label>
                            <input 
                              type="text"
                              required
                              placeholder="Checking or sweep account num"
                              value={bankAccountNumber}
                              onChange={e => setBankAccountNumber(e.target.value.replace(/\D/g, ''))}
                              className="w-full h-11 bg-white border border-gray-200 rounded-xl px-4 text-xs font-mono font-bold outline-none focus:border-indigo-600 text-gray-900"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Sweep description */}
                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1 font-bold">Sweep reference description (Optional)</label>
                      <input 
                        type="text"
                        placeholder="e.g. Corporate sweep topup"
                        value={description}
                        onChange={e => setDescription(e.target.value)}
                        className="w-full h-11 bg-gray-50 border border-gray-200 rounded-xl px-4 text-xs font-semibold outline-none focus:border-indigo-600 focus:bg-white text-gray-900"
                      />
                    </div>
                  </div>
                )}

                {/* 5. DETAILS - WITHDRAWAL BLOCK */}
                {activeTab === 'withdraw' && (
                  <div className="space-y-6">
                    <span className="block text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">SPECIFY OUTBOUND CLEARENCE COORDINATES</span>
                    
                    {/* Destination Coordinates */}
                    <div className="bg-gray-50/80 p-5 rounded-2xl border border-gray-150 space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1 font-bold">Beneficiary Bank Name</label>
                          <select 
                            value={destinationBank}
                            onChange={e => setDestinationBank(e.target.value)}
                            className="w-full h-11 bg-white border border-gray-205 rounded-xl px-3 text-xs font-bold outline-none focus:border-indigo-600 text-gray-905"
                          >
                            {POPULAR_FINANCES.map(b => (
                              <option key={b} value={b}>{b}</option>
                            ))}
                            <option value="Other Financial Institution">Other Bank (Specify)</option>
                          </select>
                        </div>

                        <div className="space-y-1.5">
                          <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1 font-bold">Beneficiary Business Title</label>
                          <input 
                            type="text"
                            required
                            placeholder="Recipient company or legal partner"
                            value={recipientName}
                            onChange={e => setRecipientName(e.target.value)}
                            className="w-full h-11 bg-white border border-gray-205 rounded-xl px-4 text-xs font-semibold outline-none focus:border-indigo-600 text-gray-900"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1 font-bold">9-Digit Routing Transit Number (RTN)</label>
                          <input 
                            type="text"
                            maxLength={9}
                            required
                            placeholder="Routing number (e.g. 021000021)"
                            value={routingNumber}
                            onChange={e => setRoutingNumber(e.target.value.replace(/\D/g, ''))}
                            className="w-full h-11 bg-white border border-gray-205 rounded-xl px-4 text-xs font-mono font-bold tracking-widest outline-none focus:border-indigo-601 text-gray-900"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1 font-bold">Beneficiary Account Address</label>
                          <input 
                            type="text"
                            required
                            placeholder="Checking or investment account num"
                            value={bankAccountNumber}
                            onChange={e => setBankAccountNumber(e.target.value.replace(/\D/g, ''))}
                            className="w-full h-11 bg-white border border-gray-205 rounded-xl px-4 text-xs font-mono font-bold outline-none focus:border-indigo-601 text-gray-900"
                          />
                        </div>
                      </div>

                      {/* Outbound speed choice */}
                      <div className="pt-2 border-t border-gray-150">
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1 mb-2 font-bold">CLEARANCE DISPATCH POLICY</label>
                        <div className="grid grid-cols-2 gap-3">
                          <button
                            type="button"
                            onClick={() => setWithdrawalSpeed('ach')}
                            className={`p-3.5 rounded-xl border text-left transition duration-150 ${
                              withdrawalSpeed === 'ach' 
                                ? 'border-indigo-650 bg-white shadow-sm ring-2 ring-indigo-50 font-bold' 
                                : 'border-gray-200 bg-gray-50/50 hover:bg-white text-gray-500'
                            }`}
                          >
                            <span className="text-xs uppercase font-extrabold text-slate-800">Standard ACH Clearance</span>
                            <p className="text-[9px] text-gray-400 mt-0.5 leading-snug">Settle free within 1-2 business days.</p>
                          </button>

                          <button
                            type="button"
                            onClick={() => setWithdrawalSpeed('wire')}
                            className={`p-3.5 rounded-xl border text-left transition duration-150 ${
                              withdrawalSpeed === 'wire' 
                                ? 'border-indigo-650 bg-white shadow-sm ring-2 ring-indigo-50 font-bold' 
                                : 'border-gray-200 bg-gray-50/50 hover:bg-white text-gray-500'
                            }`}
                          >
                            <span className="text-xs text-indigo-700 font-extrabold uppercase">Express FedWire Swift</span>
                            <p className="text-[9px] text-indigo-500 mt-0.5 leading-snug font-semibold">Instant clearances. $15 charge applied.</p>
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Authorized Cryptographic transaction PIN validation */}
                    <div className="space-y-3 p-5 bg-slate-900 text-white rounded-2xl relative overflow-hidden">
                      <div className="absolute right-0 bottom-0 pointer-events-none opacity-5 pr-2 pb-2">
                        <KeyRound className="w-24 h-24" />
                      </div>
                      
                      <div className="flex gap-2.5 items-start">
                        <div className="p-1.5 bg-indigo-500/20 text-indigo-400 rounded-lg">
                          <Fingerprint className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400">Ledger Compliance Audit Verification</span>
                          <h4 className="text-sm font-black tracking-tight mt-0.5">Transactional PIN Authorization Code</h4>
                          <p className="text-[10px] text-gray-400 leading-snug mt-1 max-w-md">
                            To sweep outbound reserves, enter your 6-digit cryptographic PIN configured during KYC setup. 
                            {profile.securityPINCode ? ' Custom PIN Enabled.' : ' Enter standard sandbox override "123456" for immediate clearance approval.'}
                          </p>
                        </div>
                      </div>

                      {/* 6-Digit PIN input field with large mono look */}
                      <div className="pt-2 max-w-xs relative">
                        <KeyRound className="absolute left-4.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                        <input 
                          type="password"
                          maxLength={6}
                          required
                          value={securityPIN}
                          onChange={e => setSecurityPIN(e.target.value.replace(/\D/g, ''))}
                          placeholder="Secret Signatory PIN"
                          className="w-full bg-slate-950 border border-slate-700 focus:border-indigo-500 rounded-xl h-11 pl-11 pr-4 text-xs font-mono font-bold tracking-[0.4em] text-white outline-none transition"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* 6. Action submission Error notice blocks */}
                {error && (
                  <motion.div 
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 bg-red-50 border border-red-150 text-red-700 font-semibold text-xs rounded-2xl flex items-start gap-3 text-left"
                  >
                    <AlertTriangle className="w-4.5 h-4.5 shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </motion.div>
                )}

                {/* 7. Action trigger Buttons */}
                <div className="flex items-center justify-between gap-4 pt-4 border-t border-gray-100 flex-wrap sm:flex-nowrap">
                  <div className="flex items-center gap-1.5 text-[9px] text-gray-400 font-bold uppercase tracking-wider">
                    <ShieldCheck className="w-4 h-4 text-green-500" />
                    Clearing network active
                  </div>
                  
                  <button
                    type="submit"
                    className="w-full sm:w-auto px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-wider rounded-xl transition shadow-lg shadow-indigo-100 flex items-center justify-center gap-2 active:scale-95 whitespace-nowrap"
                  >
                    {activeTab === 'deposit' ? (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        Initiate Inflow sweep
                      </>
                    ) : (
                      <>
                        <ArrowUpRight className="w-4 h-4" />
                        Execute Outbound Clearance
                      </>
                    )}
                  </button>
                </div>

              </form>
            )}

          </div>

          {/* Institutional bottom footer security badges */}
          <div className="px-8 py-4.5 bg-gray-50 border-t border-gray-100 flex items-center justify-between text-[9px] text-gray-400 font-semibold uppercase tracking-wider">
            <span>Intermediary routing cleared</span>
            <div className="flex gap-3">
              <span>SECURED NACHA SSL</span>
              <span>•</span>
              <span>FEDWIRE SWIFT ACTIVE</span>
            </div>
          </div>

        </motion.div>
      </div>
    </AnimatePresence>
  );
};
