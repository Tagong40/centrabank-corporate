import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, setDoc, doc, serverTimestamp, runTransaction } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { BankAccount } from '../types';
import { ArrowLeftRight, TrendingUp, Sparkles, Landmark, RefreshCw, CheckCircle2, ChevronRight, AlertCircle, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const EXCHANGE_RATES: { [key: string]: { [key: string]: number } } = {
  USD: { EUR: 0.92, GBP: 0.78, JPY: 156.2, CAD: 1.36, USD: 1 },
  EUR: { USD: 1.09, GBP: 0.85, JPY: 169.8, CAD: 1.48, EUR: 1 },
  GBP: { USD: 1.28, EUR: 1.18, JPY: 200.3, CAD: 1.74, GBP: 1 },
  JPY: { USD: 0.0064, EUR: 0.0059, GBP: 0.0050, CAD: 0.0087, JPY: 1 },
  CAD: { USD: 0.74, EUR: 0.68, GBP: 0.57, JPY: 114.9, CAD: 1 }
};

const CURRENCY_SYMBOLS: { [key: string]: string } = {
  USD: '$', EUR: '€', GBP: '£', JPY: '¥', CAD: 'C$'
};

export default function CurrencyConverter() {
  const { profile } = useAuth();
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Converter States
  const [sourceAccountId, setSourceAccountId] = useState('');
  const [targetCurrency, setTargetCurrency] = useState('EUR');
  const [sourceAmount, setSourceAmount] = useState('');
  
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!profile) return;
    
    // Subscribe to accounts
    const q = query(collection(db, 'accounts'), where('userId', '==', profile.uid));
    const fetchAccounts = async () => {
      try {
        const snap = await getDocs(q);
        const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as BankAccount));
        setAccounts(data);
        if (data.length > 0) setSourceAccountId(data[0].id);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchAccounts();
  }, [profile, successMsg]);

  const sourceAccount = accounts.find(a => a.id === sourceAccountId);
  const rate = sourceAccount ? (EXCHANGE_RATES[sourceAccount.currency]?.[targetCurrency] || 1) : 1;
  const targetAmount = sourceAmount ? (parseFloat(sourceAmount) * rate).toFixed(2) : '0.00';

  const handleConvert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !sourceAccount) return;
    
    setError(null);
    setSuccessMsg(null);
    
    const amountNum = parseFloat(sourceAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setError("Please input a valid amount.");
      return;
    }

    if (amountNum > sourceAccount.balance) {
      setError("Insufficient balance in the selected origin account.");
      return;
    }

    setSubmitting(true);

    try {
      // Look up if user already owns an account with target currency
      const accountsRef = collection(db, 'accounts');
      const qTarget = query(
        accountsRef, 
        where('userId', '==', profile.uid), 
        where('currency', '==', targetCurrency)
      );
      const targetSnap = await getDocs(qTarget);
      const existingTargetAccount = targetSnap.docs[0];
      
      const convertedValue = amountNum * rate;
      const txId = doc(collection(db, 'transactions')).id;

      await runTransaction(db, async (transaction) => {
        // Read Source Account
        const sourceRef = doc(db, 'accounts', sourceAccount.id);
        const srcDoc = await transaction.get(sourceRef);
        if (!srcDoc.exists()) throw new Error("Origin account not found.");
        const srcData = srcDoc.data() as any;
        const currentSrcBal = srcData.balance;
        
        if (currentSrcBal < amountNum) throw new Error("Balance insufficient during lock transaction.");

        // If target account exists, read target account
        let targetRef = null;
        let originalTargetBal = 0;
        let targetAccountName = "";
        let targetAccountNumber = "";

        if (existingTargetAccount) {
          targetRef = doc(db, 'accounts', existingTargetAccount.id);
          const tgtDoc = await transaction.get(targetRef);
          if (tgtDoc.exists()) {
            const tgtData = tgtDoc.data() as any;
            originalTargetBal = tgtData.balance;
            targetAccountName = tgtData.accountName;
            targetAccountNumber = tgtData.accountNumber;
          }
        } else {
          // Provision a new target account ID
          const newAccountId = `ACC-${Math.floor(Math.random() * 1000000)}`;
          targetAccountNumber = `CB-${Math.floor(Math.random() * 1000000000)}`;
          targetAccountName = `Commercial ${targetCurrency} Yield Ledger`;
          targetRef = doc(db, 'accounts', newAccountId);
          
          transaction.set(targetRef, {
            userId: profile.uid,
            accountName: targetAccountName,
            accountNumber: targetAccountNumber,
            balance: 0,
            currency: targetCurrency,
            createdAt: serverTimestamp()
          });
        }

        // Deduct source
        transaction.update(sourceRef, {
          balance: currentSrcBal - amountNum,
          lastTransactionId: txId
        });

        // Credit target
        transaction.update(targetRef, {
          balance: originalTargetBal + convertedValue,
          lastTransactionId: txId
        });

        // Write Transaction Logs
        const transRef = doc(db, 'transactions', txId);
        transaction.set(transRef, {
          fromAccountId: sourceAccount.id,
          fromUserId: profile.uid,
          toAccountId: targetRef.id,
          toUserId: profile.uid,
          toAccountNumber: targetAccountNumber,
          amount: amountNum,
          description: `FX Swapped ${sourceAccount.currency} to ${targetCurrency} @ Rate ${rate}`,
          status: 'completed',
          type: 'internal',
          lastTransactionId: txId,
          timestamp: serverTimestamp()
        });
      });

      setSuccessMsg(`Successfully converted ${CURRENCY_SYMBOLS[sourceAccount.currency]}${amountNum.toLocaleString()} to ${CURRENCY_SYMBOLS[targetCurrency]}${convertedValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}!`);
      setSourceAmount('');
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Currency conversion execution failed.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return null;

  return (
    <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-sm space-y-6">
      
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-50 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-750 flex items-center justify-center">
            <ArrowLeftRight className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-black text-gray-900 uppercase tracking-tight">Active Currency Exchange</h3>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Compounded interbank wholesale trade rates</p>
          </div>
        </div>
        <div className="flex items-center gap-1 bg-green-50 text-green-700 px-2.5 py-1 rounded-lg text-[9px] font-black uppercase">
          <TrendingUp className="w-3 h-3" />
          Best Rates Active
        </div>
      </div>

      {successMsg && (
        <div className="p-4 bg-green-50/70 border border-green-150 rounded-2xl flex items-start gap-3 text-green-900 text-xs">
          <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
          <p className="font-semibold">{successMsg}</p>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-start gap-3 text-red-700 text-xs text-left">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <p className="font-semibold">{error}</p>
        </div>
      )}

      <form onSubmit={handleConvert} className="space-y-4">
        {/* Source Account Selection */}
        <div>
          <label className="block text-[9px] font-black uppercase text-gray-400 tracking-wider mb-2">Debit Source Account</label>
          <select
            value={sourceAccountId}
            onChange={e => setSourceAccountId(e.target.value)}
            className="w-full bg-gray-50 border-2 border-transparent focus:border-indigo-500 focus:bg-white rounded-2xl px-4 py-3 font-semibold text-xs text-gray-950 outline-none"
          >
            {accounts.map(acc => (
              <option key={acc.id} value={acc.id}>
                {acc.accountName} ({acc.accountNumber}) — {acc.balance.toLocaleString('en-US', { style: 'currency', currency: acc.currency })}
              </option>
            ))}
          </select>
        </div>

        {/* Input & Target Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
          
          {/* Source Input */}
          <div className="space-y-1">
            <label className="block text-[9px] font-black uppercase text-gray-400 tracking-wider">Exchange Amount</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-xs select-none">
                {sourceAccount ? CURRENCY_SYMBOLS[sourceAccount.currency] : '$'}
              </span>
              <input
                type="number"
                required
                min="1"
                step="0.01"
                placeholder="0.00"
                value={sourceAmount}
                onChange={e => setSourceAmount(e.target.value)}
                className="w-full h-12 pl-8 pr-4 bg-gray-50 border-2 border-transparent focus:border-indigo-600 focus:bg-white rounded-2xl transition-all font-bold text-xs text-gray-900 outline-none"
              />
            </div>
          </div>

          {/* Target Currency Selection */}
          <div className="space-y-1">
            <label className="block text-[9px] font-black uppercase text-gray-400 tracking-wider">Target Currency</label>
            <select
              value={targetCurrency}
              onChange={e => setTargetCurrency(e.target.value)}
              className="w-full h-12 bg-gray-50 border-2 border-transparent focus:border-indigo-505 focus:bg-white rounded-2xl px-4 font-bold text-xs text-gray-955 outline-none"
            >
              {['USD', 'EUR', 'GBP', 'JPY', 'CAD']
                .filter(c => c !== sourceAccount?.currency)
                .map(curr => (
                  <option key={curr} value={curr}>{curr}</option>
                ))
              }
            </select>
          </div>

        </div>

        {/* Exchanged Rates preview container */}
        <div className="p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100/50 flex flex-col gap-2">
          <div className="flex justify-between text-[11px] font-bold text-gray-500">
            <span>Guaranteed Exchange Ratio</span>
            <span className="text-indigo-650 flex items-center gap-1">
              <RefreshCw className="w-3 h-3 animate-spin duration-1000" />
              1 {sourceAccount?.currency || 'USD'} = {rate} {targetCurrency}
            </span>
          </div>
          <div className="flex justify-between items-baseline pt-1">
            <span className="text-xs font-black text-gray-900 uppercase">Estimated Payout Yield</span>
            <span className="text-lg font-black text-emerald-600">
              {CURRENCY_SYMBOLS[targetCurrency]}{parseFloat(targetAmount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs uppercase tracking-tight rounded-xl shadow-lg shadow-indigo-100 hover:shadow-indigo-200 transition active:scale-95 flex items-center justify-center gap-2"
        >
          {submitting ? 'Locking FX Rate...' : 'Execute Currency Swap Order'}
          <ChevronRight className="w-4 h-4" />
        </button>

        <p className="text-[9px] text-gray-400 leading-normal text-center max-w-sm mx-auto">
          FX swap contracts settle instantly. If you do not possess an account in the target currency, a holding ledger ledger will automatically create on credit.
        </p>

      </form>

    </div>
  );
}
