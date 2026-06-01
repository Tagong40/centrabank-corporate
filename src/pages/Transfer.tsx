import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, doc, serverTimestamp, runTransaction } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { BankAccount } from '../types';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Send, CheckCircle2, Loader2, AlertCircle, Info, Landmark, ShieldCheck, Zap, Download } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const MAJOR_BANKS = [
  'JPMorgan Chase Bank',
  'Wells Fargo Bank',
  'Citibank, N.A.',
  'Bank of America',
  'HSBC Bank plc',
  'Barclays Bank',
  'Deutsche Bank AG',
  'Goldman Sachs Group',
  'Other Financial Institution'
];

const Transfer: React.FC = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState('');
  
  // Destination Toggle & Details
  const [transferType, setTransferType] = useState<'internal' | 'external'>('internal');
  const [toAccount, setToAccount] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');

  // External Bank Details
  const [recipientBankName, setRecipientBankName] = useState('JPMorgan Chase Bank');
  const [customBankName, setCustomBankName] = useState('');
  const [routingNumber, setRoutingNumber] = useState('');
  const [beneficiaryName, setBeneficiaryName] = useState('');
  const [transferSpeed, setTransferSpeed] = useState<'ach' | 'wire'>('ach');
  
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastTxId, setLastTxId] = useState('');

  useEffect(() => {
    if (!profile) return;
    const fetchAccounts = async () => {
      const q = query(collection(db, 'accounts'), where('userId', '==', profile.uid));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as BankAccount));
      setAccounts(data);
      if (data.length > 0) setSelectedAccountId(data[0].id);
    };
    fetchAccounts();
  }, [profile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    
    setError(null);
    setLoading(true);

    const fromAccount = accounts.find(a => a.id === selectedAccountId);
    const transferAmount = parseFloat(amount);
    const wireFee = transferSpeed === 'wire' && transferType === 'external' ? 15 : 0;
    const totalDeduction = transferAmount + wireFee;

    if (!fromAccount) { setError('Please select a source account.'); setLoading(false); return; }
    if (isNaN(transferAmount) || transferAmount <= 0) { setError('Invalid amount.'); setLoading(false); return; }
    if (totalDeduction > fromAccount.balance) { 
      setError(`Insufficient funds. Your transfer requires $${transferAmount.toLocaleString()} plus a $${wireFee} speed fee (Total: $${totalDeduction.toLocaleString()}). Your current balance is $${fromAccount.balance.toLocaleString()}.`); 
      setLoading(false); 
      return; 
    }

    if (transferType === 'external') {
      if (!beneficiaryName.trim()) { setError('Please enter a recipient/beneficiary business name.'); setLoading(false); return; }
      if (!routingNumber.trim() || routingNumber.length < 9) { setError('Please enter a valid 9-digit Routing Transit Number (RTN).'); setLoading(false); return; }
    }

    try {
      let isInternalResolved = false;
      let toAccountId: string | null = null;
      let toUserId: string | null = null;

      if (transferType === 'internal') {
        // 1. Find internal recipient's account ID from their account number
        const accountsRef = collection(db, 'accounts');
        const q = query(accountsRef, where('accountNumber', '==', toAccount));
        const recipientSnapshot = await getDocs(q);
        
        const recipientDoc = recipientSnapshot.docs[0];
        isInternalResolved = !!recipientDoc;
        if (!isInternalResolved) {
          setError(`Invalid internal account. The account number "${toAccount}" was not found inside CentraBank. If sending to an external bank, please toggle 'External Bank Transfer'.`);
          setLoading(false);
          return;
        }
        toAccountId = recipientDoc.id;
        toUserId = recipientDoc.data().userId;
      }

      // Generate a transaction ID for the record matching the security lock
      const txId = doc(collection(db, 'transactions')).id;

      await runTransaction(db, async (transaction) => {
        const fromAccountRef = doc(db, 'accounts', fromAccount.id);
        const toAccountRef = isInternalResolved && toAccountId ? doc(db, 'accounts', toAccountId) : null;

        // Perform all reads first
        const fromAccountDoc = await transaction.get(fromAccountRef);
        const toAccountDoc = toAccountRef ? await transaction.get(toAccountRef) : null;
        
        if (!fromAccountDoc.exists()) throw new Error("Source account not found in database.");
        const currentBalance = fromAccountDoc.data().balance;
        if (currentBalance < totalDeduction) throw new Error("Insufficient funds during execution.");

        // Perform all writes after reads
        transaction.update(fromAccountRef, { 
          balance: currentBalance - totalDeduction 
        });

        if (toAccountDoc && toAccountDoc.exists() && toAccountRef) {
          transaction.update(toAccountRef, { 
            balance: toAccountDoc.data().balance + transferAmount,
            lastTransactionId: txId
          });
        }

        // Create Transaction Log
        const transRef = doc(db, 'transactions', txId);
        
        const targetBankText = transferType === 'internal' 
          ? 'CentraBank Sweep' 
          : (recipientBankName === 'Other Financial Institution' ? customBankName : recipientBankName);

        const txDescription = description || (transferType === 'internal' 
          ? `Sweep to Centra Account ${toAccount}` 
          : `${transferSpeed === 'wire' ? 'Wire' : 'ACH'} Transfer to ${targetBankText}`);

        transaction.set(transRef, {
          fromAccountId: fromAccount.id,
          fromUserId: profile.uid,
          toAccountId: toAccountId || 'external',
          toUserId: toUserId || 'external',
          toAccountNumber: toAccount,
          amount: transferAmount,
          description: txDescription,
          status: transferType === 'external' ? 'pending' : 'completed',
          type: transferType,
          speed: transferType === 'external' ? transferSpeed : 'instant',
          routingNumber: transferType === 'external' ? routingNumber : '021000021',
          recipientBank: targetBankText,
          beneficiaryName: transferType === 'external' ? beneficiaryName : 'Centra Holder',
          wireFee: wireFee,
          lastTransactionId: txId,
          timestamp: serverTimestamp(),
        });
      });

      setLastTxId(txId);
      setSuccess(true);
      setTimeout(() => navigate('/'), 6000);
    } catch (err: any) {
      console.error('Transfer Error:', err);
      setError(err.message || "Transfer system timed out. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const selectedAccount = accounts.find(a => a.id === selectedAccountId);

  const downloadReceipt = () => {
    const fromAccount = accounts.find(a => a.id === selectedAccountId);
    const transferAmount = parseFloat(amount);
    const wireFee = transferSpeed === 'wire' && transferType === 'external' ? 15 : 0;
    const total = transferAmount + wireFee;
    const bank = recipientBankName === 'Other Financial Institution' ? customBankName : recipientBankName;
    const now = new Date().toLocaleString('en-US', { dateStyle: 'full', timeStyle: 'medium' });

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>CentraBank Transfer Receipt</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Arial, sans-serif; background: #f9fafb; padding: 40px; color: #111; }
    .card { background: #fff; max-width: 520px; margin: 0 auto; border-radius: 24px; overflow: hidden; border: 1px solid #e5e7eb; box-shadow: 0 4px 24px rgba(0,0,0,0.07); }
    .header { background: #4f46e5; padding: 32px; text-align: center; }
    .header h1 { color: #fff; font-size: 22px; font-weight: 900; letter-spacing: -0.5px; }
    .header p { color: #c7d2fe; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; margin-top: 4px; }
    .stamp { background: #f0fdf4; border: 2px solid #86efac; color: #166534; font-size: 13px; font-weight: 900; text-transform: uppercase; letter-spacing: 2px; text-align: center; padding: 12px; }
    .body { padding: 28px 32px; }
    .row { display: flex; justify-content: space-between; align-items: flex-start; padding: 12px 0; border-bottom: 1px solid #f3f4f6; }
    .row:last-child { border-bottom: none; }
    .label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #9ca3af; }
    .value { font-size: 13px; font-weight: 800; color: #111827; text-align: right; max-width: 60%; }
    .total .value { color: #4f46e5; font-size: 18px; }
    .footer { background: #f9fafb; padding: 20px 32px; border-top: 1px solid #f3f4f6; text-align: center; }
    .footer p { font-size: 10px; color: #9ca3af; line-height: 1.6; }
    .tx-id { font-family: monospace; font-size: 11px; color: #6b7280; background: #f3f4f6; padding: 2px 6px; border-radius: 4px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <h1>CentraBank Corporate</h1>
      <p>Transfer Receipt</p>
    </div>
    <div class="stamp">✓ Transfer Submitted Successfully</div>
    <div class="body">
      <div class="row"><span class="label">Receipt ID</span><span class="value tx-id">${lastTxId.slice(0, 16).toUpperCase()}</span></div>
      <div class="row"><span class="label">Date &amp; Time</span><span class="value">${now}</span></div>
      <div class="row"><span class="label">From Account</span><span class="value">${fromAccount?.accountName ?? ''}<br/><span style="font-size:11px;color:#6b7280">${fromAccount?.accountNumber ?? ''}</span></span></div>
      <div class="row"><span class="label">Transfer Type</span><span class="value">${transferType === 'internal' ? 'Internal Sweep' : 'External Bank Transfer'}</span></div>
      ${transferType === 'external' ? `<div class="row"><span class="label">Recipient Bank</span><span class="value">${bank}</span></div>` : ''}
      ${transferType === 'external' ? `<div class="row"><span class="label">Beneficiary</span><span class="value">${beneficiaryName}</span></div>` : ''}
      <div class="row"><span class="label">Target Account</span><span class="value">${toAccount}</span></div>
      <div class="row"><span class="label">Route Speed</span><span class="value">${transferType === 'internal' ? 'Instant Sweep' : transferSpeed.toUpperCase()}</span></div>
      <div class="row"><span class="label">Transfer Amount</span><span class="value">$${transferAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span></div>
      ${wireFee > 0 ? `<div class="row"><span class="label">Wire Fee</span><span class="value">$${wireFee.toFixed(2)}</span></div>` : ''}
      <div class="row total"><span class="label">Total Charged</span><span class="value">$${total.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span></div>
    </div>
    <div class="footer">
      <p>This is an official CentraBank Corporate transaction receipt.<br/>
      Keep this document for your records. Transaction ID: ${lastTxId}<br/>
      CentraBank Corporate — 800 Financial Plaza, New York, NY 10005</p>
    </div>
  </div>
</body>
</html>`;

    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `CentraBank-Receipt-${lastTxId.slice(0, 8).toUpperCase()}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="pt-24 pb-20 max-w-2xl mx-auto px-4">
      <button 
        onClick={() => navigate('/')}
        className="flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-indigo-650 mb-8 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Dashboard
      </button>

      <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm p-8 sm:p-12">
        <AnimatePresence mode="wait">
          {success ? (
            <motion.div 
              key="success"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-center py-6 space-y-6"
            >
              <div className="w-20 h-20 bg-green-50 text-green-500 rounded-full flex items-center justify-center mx-auto shadow-sm">
                <CheckCircle2 className="w-10 h-10 animate-bounce" />
              </div>
              <div>
                <h2 className="text-3xl font-black text-gray-900 tracking-tight">Transfer Successful</h2>
                <p className="text-xs text-gray-400 font-extrabold uppercase tracking-widest mt-1">Clearing settlement log generated</p>
                <p className="text-gray-500 text-sm mt-3 max-w-sm mx-auto leading-relaxed">
                  Funds have been cleared and routed successfully. Stated ledgers updated in real-time. Redirecting you shortly...
                </p>
              </div>
              
              <div className="bg-gray-50 rounded-2xl p-6 text-left max-w-md mx-auto border border-gray-150 divide-y divide-gray-100">
                <div className="flex justify-between text-xs py-2">
                  <span className="text-gray-400 font-bold uppercase tracking-wider">Method Speed</span>
                  <span className="text-gray-900 font-black uppercase">
                    {transferType === 'internal' ? 'Internal Sweep (Instant)' : `${transferSpeed.toUpperCase()} Route`}
                  </span>
                </div>
                {transferType === 'external' && (
                  <div className="flex justify-between text-xs py-2">
                    <span className="text-gray-450 font-bold uppercase tracking-wider">Recipient Bank</span>
                    <span className="text-gray-900 font-black">{recipientBankName === 'Other Financial Institution' ? customBankName : recipientBankName}</span>
                  </div>
                )}
                <div className="flex justify-between text-xs py-2">
                  <span className="text-gray-405 font-bold uppercase tracking-wider">Target Account</span>
                  <span className="text-gray-900 font-mono font-bold">{toAccount}</span>
                </div>
                <div className="flex justify-between text-xs py-3">
                  <span className="text-gray-405 font-bold uppercase tracking-wider">Total Charge</span>
                  <span className="text-indigo-600 font-black text-sm">
                    ${(parseFloat(amount) + (transferSpeed === 'wire' && transferType === 'external' ? 15 : 0)).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              <button
                onClick={downloadReceipt}
                className="flex items-center justify-center gap-2 mx-auto px-6 py-3 bg-white border-2 border-indigo-100 hover:border-indigo-400 hover:bg-indigo-50 text-indigo-600 text-xs font-black uppercase tracking-wider rounded-2xl transition-all"
              >
                <Download className="w-4 h-4" />
                Download Receipt
              </button>
            </motion.div>
          ) : (
            <motion.div 
              key="form"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <h1 className="text-3xl font-black text-gray-905 tracking-tight mb-2">Send & Route Money</h1>
              <p className="text-gray-500 font-medium italic">Instantly secure transfers to peer internal accounts or any external bank globally.</p>

              {/* Transfer Type Segment Toggle */}
              <div className="grid grid-cols-2 gap-2 bg-gray-50 p-1.5 rounded-2xl border border-gray-150 my-8">
                <button
                  type="button"
                  onClick={() => { setTransferType('internal'); setError(null); }}
                  className={`py-3 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all ${
                    transferType === 'internal' 
                      ? 'bg-indigo-600 text-white shadow' 
                      : 'text-gray-400 hover:text-gray-800'
                  }`}
                >
                  CentraBank Core Sweep
                </button>
                <button
                  type="button"
                  onClick={() => { setTransferType('external'); setError(null); }}
                  className={`py-3 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all ${
                    transferType === 'external' 
                      ? 'bg-indigo-600 text-white shadow' 
                      : 'text-gray-400 hover:text-gray-800'
                  }`}
                >
                  All External Banks
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-8">
                {/* From Account Selection */}
                <div className="space-y-4">
                  <label className="block text-sm font-bold text-gray-400 uppercase tracking-widest pl-1">From Account</label>
                  <div className="grid grid-cols-1 gap-3">
                    {accounts.map(acc => (
                      <button
                        key={acc.id}
                        type="button"
                        onClick={() => setSelectedAccountId(acc.id)}
                        className={`p-5 rounded-2xl border-2 text-left transition-all relative ${
                          selectedAccountId === acc.id 
                            ? 'border-indigo-600 bg-indigo-50/30' 
                            : 'border-gray-100 hover:border-gray-200'
                        }`}
                      >
                        <div className="flex justify-between items-center">
                            <div>
                                <p className="font-bold text-gray-900">{acc.accountName}</p>
                                <p className="text-xs text-gray-550 font-medium">{acc.accountNumber}</p>
                            </div>
                            <p className="text-lg font-black text-gray-900">
                              {acc.balance.toLocaleString('en-US', { style: 'currency', currency: acc.currency })}
                            </p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-6">
                    <label className="block text-sm font-bold text-gray-400 uppercase tracking-widest pl-1">
                      {transferType === 'internal' ? ' CentraBank Recipient' : 'Destination Bank Coordinates'}
                    </label>

                    {transferType === 'internal' ? (
                      <div className="space-y-4">
                        <input
                            type="text"
                            required
                            placeholder="CentraBank Account Number (e.g. CB-9405)"
                            value={toAccount}
                            onChange={(e) => setToAccount(e.target.value)}
                            className="w-full h-14 px-6 bg-gray-50 border-2 border-transparent focus:border-indigo-600 focus:bg-white rounded-2xl transition-all font-bold text-gray-900 placeholder:text-gray-400 text-sm"
                        />
                      </div>
                    ) : (
                      // External Bank Mode Form Inputs
                      <div className="space-y-5 bg-gray-50/60 p-6 rounded-3xl border border-gray-150">
                        {/* Target Bank Picker */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase mb-2">Target Bank Entity</label>
                            <select
                              value={recipientBankName}
                              onChange={e => setRecipientBankName(e.target.value)}
                              className="w-full h-11 px-4 bg-white border-2 border-transparent rounded-xl font-bold text-xs outline-none focus:border-indigo-600 text-gray-950"
                            >
                              {MAJOR_BANKS.map(bk => (
                                <option key={bk} value={bk}>{bk}</option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase mb-2">Primary Recipient Full Name</label>
                            <input
                              type="text"
                              required
                              placeholder="e.g. Acme Corp Inc."
                              value={beneficiaryName}
                              onChange={e => setBeneficiaryName(e.target.value)}
                              className="w-full h-11 px-4 bg-white border border-gray-250 rounded-xl font-bold text-xs text-gray-900 outline-none focus:border-indigo-600"
                            />
                          </div>
                        </div>

                        {/* Custom Bank Input */}
                        {recipientBankName === 'Other Financial Institution' && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                          >
                            <label className="block text-[10px] font-black text-gray-400 uppercase mb-2">Specify Financial Institution Name</label>
                            <input
                              type="text"
                              required
                              placeholder="e.g. Credit Suisse AG"
                              value={customBankName}
                              onChange={e => setCustomBankName(e.target.value)}
                              className="w-full h-11 px-4 bg-white border border-gray-250 rounded-xl font-bold text-xs text-gray-900 outline-none focus:border-indigo-600"
                            />
                          </motion.div>
                        )}

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase mb-2">Routing Transit Number (9-digit RTN)</label>
                            <input
                              type="text"
                              required
                              maxLength={9}
                              placeholder="Routing Number (e.g. 021000021)"
                              value={routingNumber}
                              onChange={e => setRoutingNumber(e.target.value.replace(/\D/g, ''))}
                              className="w-full h-11 px-4 bg-white border border-gray-250 rounded-xl font-bold text-xs tracking-wider text-gray-900 outline-none focus:border-indigo-601"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase mb-2">Account or IBAN Number</label>
                            <input
                              type="text"
                              required
                              placeholder="Direct Account/IBAN Reference"
                              value={toAccount}
                              onChange={e => setToAccount(e.target.value)}
                              className="w-full h-11 px-4 bg-white border border-gray-250 rounded-xl font-bold text-xs text-gray-900 outline-none focus:border-indigo-601"
                            />
                          </div>
                        </div>

                        {/* Speed Choice */}
                        <div className="pt-2 border-t border-gray-150">
                          <label className="block text-[10px] font-black text-gray-400 uppercase mb-3">Rout Speed Policy</label>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <button
                              type="button"
                              onClick={() => setTransferSpeed('ach')}
                              className={`p-4 rounded-xl border text-left transition-all ${
                                transferSpeed === 'ach' 
                                  ? 'border-indigo-600 bg-white shadow-sm font-black' 
                                  : 'border-gray-200 bg-gray-50/50 hover:bg-white text-gray-500'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <Landmark className="w-4 h-4 text-gray-400" />
                                <span className="text-xs uppercase font-extrabold text-gray-900">Standard ACH</span>
                              </div>
                              <p className="text-[10px] text-gray-400 mt-1 leading-snug">Settles free within 24-48 business hours.</p>
                            </button>

                            <button
                              type="button"
                              onClick={() => setTransferSpeed('wire')}
                              className={`p-4 rounded-xl border text-left transition-all ${
                                transferSpeed === 'wire' 
                                  ? 'border-indigo-600 bg-white shadow-sm font-black ring-2 ring-indigo-50' 
                                  : 'border-gray-200 bg-gray-50/50 hover:bg-white text-gray-500'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <Zap className="w-4 h-4 text-indigo-500" />
                                <span className="text-xs uppercase font-extrabold text-gray-900">Express Wire Sweep</span>
                              </div>
                              <p className="text-[10px] text-indigo-700 mt-1 leading-snug font-semibold">$15.00 flat fee. Cleared and routed instantly.</p>
                            </button>
                          </div>
                        </div>

                      </div>
                    )}

                    {/* Amount & Description Row */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="block text-sm font-bold text-gray-400 uppercase tracking-widest pl-1">Route Amount</label>
                            <div className="relative">
                                <span className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400 font-black">$</span>
                                <input
                                    type="number"
                                    required
                                    min="1"
                                    step="0.01"
                                    placeholder="0.00"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    className="w-full h-14 pl-10 pr-6 bg-gray-50 border-2 border-transparent focus:border-indigo-600 focus:bg-white rounded-2xl transition-all font-bold text-gray-900 placeholder:text-gray-400"
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="block text-sm font-bold text-gray-400 uppercase tracking-widest pl-1">Reference Memo</label>
                            <input
                                type="text"
                                placeholder="Business payment memo"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                className="w-full h-14 px-6 bg-gray-50 border-2 border-transparent focus:border-indigo-600 focus:bg-white rounded-2xl transition-all font-semibold text-gray-900 placeholder:text-gray-400"
                            />
                        </div>
                    </div>
                </div>

                {error && (
                  <div className="p-4 bg-red-50 border border-red-150 rounded-2xl flex items-start gap-3 text-red-700 text-sm font-semibold text-left">
                    <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </div>
                )}

                <div className="pt-4">
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full h-16 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white font-black rounded-2xl flex items-center justify-center gap-3 transition-all shadow-xl shadow-indigo-100 active:scale-[0.98] uppercase tracking-wider text-xs"
                    >
                      {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : (
                        <>
                          <Send className="w-4 h-4" />
                          Execute Route Transfer
                        </>
                      )}
                    </button>
                    
                    <div className="mt-6 flex items-start gap-3 p-4 bg-gray-50 rounded-2xl border border-gray-150 text-[10px] text-gray-400 uppercase tracking-wider font-bold">
                        <ShieldCheck className="w-4 h-4 text-indigo-500 shrink-0" />
                        <p className="leading-normal">All transactions undergo automated domestic anti-money laundering filters and are cleared via standard NACHA rules.</p>
                    </div>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Transfer;
