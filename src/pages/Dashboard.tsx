import React, { useEffect, useState } from 'react';
import { collection, query, where, orderBy, limit, onSnapshot, doc, setDoc, serverTimestamp, or, runTransaction } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { BankAccount, Transaction, Card, Investment } from '../types';
import { ArrowUpRight, ArrowDownLeft, Clock, Plus, AlertCircle, CheckCircle2, TrendingUp, Wallet, BarChart3 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Link } from 'react-router-dom';
import { TopUpModal } from '../components/TopUpModal';
import CurrencyConverter from '../components/CurrencyConverter';
import VaultDepositBox from '../components/VaultDepositBox';

const Dashboard: React.FC = () => {
  const { profile } = useAuth();
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [cards, setCards] = useState<Card[]>([]);
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile || profile.status !== 'approved') {
      setLoading(false);
      return;
    }

    // Subscribe to accounts
    const qAccounts = query(collection(db, 'accounts'), where('userId', '==', profile.uid));
    const unsubAccounts = onSnapshot(qAccounts, (snapshot) => {
      setAccounts(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as BankAccount)));
      setLoading(false);
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'accounts'));

    // Subscribe to transactions (both incoming and outgoing)
    const qTrans = query(
      collection(db, 'transactions'), 
      or(
        where('fromUserId', '==', profile.uid),
        where('toUserId', '==', profile.uid)
      ),
      orderBy('timestamp', 'desc'),
      limit(20)
    );
    const unsubTrans = onSnapshot(qTrans, (snapshot) => {
      setTransactions(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Transaction)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'transactions'));

    // Subscribe to cards
    const qCards = query(collection(db, 'cards'), where('userId', '==', profile.uid), limit(3));
    const unsubCards = onSnapshot(qCards, (snapshot) => {
      setCards(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Card)));
    });

    // Subscribe to investments
    const qInv = query(collection(db, 'investments'), where('userId', '==', profile.uid), limit(3));
    const unsubInv = onSnapshot(qInv, (snapshot) => {
      setInvestments(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Investment)));
    });

    return () => {
      unsubAccounts();
      unsubTrans();
      unsubCards();
      unsubInv();
    };
  }, [profile]);

  const [isTopUpModalOpen, setIsTopUpModalOpen] = useState(false);
  const [selectedAccountForTopUp, setSelectedAccountForTopUp] = useState<BankAccount | null>(null);
  const [modalMode, setModalMode] = useState<'deposit' | 'withdraw'>('deposit');

  const handleTopUpConfirm = async (accountId: string, amount: number, method: string, description: string) => {
    if (!profile) return;
    setLoading(true);

    try {
      const txId = doc(collection(db, 'transactions')).id;
      await runTransaction(db, async (transaction) => {
        const accountRef = doc(db, 'accounts', accountId);
        const accountDoc = await transaction.get(accountRef);
        
        if (!accountDoc.exists()) throw new Error("Account not found.");
        
        const data = accountDoc.data();
        transaction.update(accountRef, {
          balance: data.balance + amount,
          lastTransactionId: txId
        });

        const transRef = doc(db, 'transactions', txId);
        transaction.set(transRef, {
          fromAccountId: 'external',
          fromUserId: 'external',
          toAccountId: accountId,
          toUserId: profile.uid,
          toAccountNumber: data.accountNumber,
          amount: amount,
          description: description || 'Account Top-up',
          status: 'completed',
          type: 'topup',
          paymentMethod: method,
          lastTransactionId: txId,
          timestamp: serverTimestamp(),
        });
      });
      setIsTopUpModalOpen(false);
      setSelectedAccountForTopUp(null);
    } catch (err: any) {
      console.error('Top-up error:', err);
      alert(err.message || "Failed to complete top-up.");
    } finally {
      setLoading(false);
    }
  };

  const createDefaultAccount = async () => {
    if (!profile) return;
    const accountId = `ACC-${Math.floor(Math.random() * 1000000)}`;
    const newAccount = {
      userId: profile.uid,
      accountName: 'Primary Business Account',
      accountNumber: `CB-${Math.floor(Math.random() * 1000000000)}`,
      balance: 0,
      currency: 'USD',
      createdAt: serverTimestamp(),
    };
    await setDoc(doc(db, 'accounts', accountId), newAccount);
  };

  if (loading) return (
    <div className="pt-24 flex justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
    </div>
  );

  if (profile?.status === 'pending') {
    return (
      <div className="pt-32 max-w-2xl mx-auto px-4 text-center">
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
          <Clock className="w-16 h-16 text-amber-500 mx-auto mb-6" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Account Under Review</h2>
          <p className="text-gray-600 mb-8">
            Thank you for registering with CentraBank. Our administrators are currently reviewing your application. 
            You'll have full access to your funds once approved.
          </p>
          <div className="bg-amber-50 border border-amber-100 rounded-2xl p-6 text-amber-800 text-sm flex items-start gap-3 text-left">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <p>Verification typically takes 1-2 business days. We will notify you via email once your account is ready.</p>
          </div>
        </motion.div>
      </div>
    );
  }

  if (profile?.status === 'rejected') {
    return (
      <div className="pt-32 max-w-2xl mx-auto px-4 text-center">
        <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-6" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Application Declined</h2>
        <p className="text-gray-600">
          We regret to inform you that your application for a corporate account has been declined at this time.
        </p>
      </div>
    );
  }

  return (
    <div className="pt-24 pb-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Header Stat Area */}
      <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Main Dashboard</h1>
          <p className="text-gray-500 mt-1">Manage your corporate accounts and transactions.</p>
        </div>
        
        {accounts.length > 0 && (
          <Link 
            to="/transfer"
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-2xl font-semibold shadow-lg shadow-indigo-100 transition-all active:scale-95"
          >
            <Plus className="w-5 h-5" />
            New Transfer
          </Link>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Accounts */}
        <div className="lg:col-span-1 space-y-6">
          <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider px-1">Your Accounts</h2>
          
          <AnimatePresence mode="popLayout">
            {accounts.length === 0 ? (
              <motion.button 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                onClick={createDefaultAccount}
                className="w-full aspect-[16/10] border-2 border-dashed border-gray-200 rounded-3xl flex flex-col items-center justify-center gap-3 text-gray-500 hover:border-indigo-300 hover:text-indigo-600 hover:bg-indigo-50 transition-all group"
              >
                <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center group-hover:bg-indigo-100 transition-colors">
                  <Plus className="w-6 h-6" />
                </div>
                <span className="font-semibold">Open your first account</span>
              </motion.button>
            ) : (
              accounts.map(acc => (
                <motion.div 
                  key={acc.id}
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  className="bg-indigo-600 rounded-[2.5rem] p-8 text-white shadow-2xl shadow-indigo-200 relative overflow-hidden group"
                >
                  <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-white/10 rounded-full blur-3xl group-hover:bg-white/20 transition-all"></div>
                  
                  <div className="relative z-10">
                    <div className="flex justify-between items-start mb-12">
                      <CreditCardIcon />
                      <span className="text-xs font-mono tracking-widest opacity-80">{acc.accountNumber}</span>
                    </div>
                    
                    <p className="text-sm font-medium opacity-80 mb-2">{acc.accountName}</p>
                    <div className="flex justify-between items-end">
                      <div className="flex items-baseline gap-2">
                        <span className="text-4xl font-bold tracking-tighter">
                          {acc.balance.toLocaleString('en-US', { style: 'currency', currency: acc.currency })}
                        </span>
                      </div>
                    </div>
                    
                    {isTopUpModalOpen && selectedAccountForTopUp?.id === acc.id ? null : (
                      <div className="grid grid-cols-2 gap-3 mt-6 pt-5 border-t border-white/10">
                        <button 
                          onClick={(e) => { 
                            e.stopPropagation(); 
                            setSelectedAccountForTopUp(acc);
                            setModalMode('deposit');
                            setIsTopUpModalOpen(true);
                          }}
                          className="flex items-center justify-center gap-1.5 bg-white/20 hover:bg-white/35 text-white py-3 rounded-2xl text-xs font-black uppercase tracking-wider transition-all active:scale-95 shadow-sm"
                        >
                          <TrendingUp className="w-4 h-4" />
                          Top Up
                        </button>
                        <button 
                          onClick={(e) => { 
                            e.stopPropagation(); 
                            setSelectedAccountForTopUp(acc);
                            setModalMode('withdraw');
                            setIsTopUpModalOpen(true);
                          }}
                          className="flex items-center justify-center gap-1.5 bg-slate-950/45 hover:bg-slate-950/60 text-white py-3 rounded-2xl text-xs font-black uppercase tracking-wider transition-all active:scale-95 border border-white/10 shadow-sm"
                        >
                          <ArrowUpRight className="w-4 h-4" />
                          Withdraw
                        </button>
                      </div>
                    )}
                  </div>
                </motion.div>
              ))
            )}
          </AnimatePresence>

          <TopUpModal 
            isOpen={isTopUpModalOpen}
            onClose={() => setIsTopUpModalOpen(false)}
            onConfirm={handleTopUpConfirm}
            account={selectedAccountForTopUp}
            initialMode={modalMode}
          />

          <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <CheckCircle2 className="w-5 h-5 text-green-500" />
              <h3 className="font-semibold text-gray-900">Security Status</h3>
            </div>
            <p className="text-sm text-gray-500 leading-relaxed">
              Your account is protected by multi-factor authentication and hardware-level encryption. 
              Always ensure you are on <span className="text-indigo-600 font-medium">centrabank.corp</span>
            </p>
          </div>

          {/* Cards Summary */}
          <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">My Cards</h3>
              <Link to="/cards" className="text-xs font-bold text-indigo-600 hover:underline">Manage</Link>
            </div>
            {cards.length === 0 ? (
              <p className="text-sm text-gray-400 italic">No cards active</p>
            ) : (
              <div className="space-y-3">
                {cards.map(card => (
                  <div key={card.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-2xl">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-gray-900 rounded-lg flex items-center justify-center text-white">
                        <Wallet className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-gray-900">•••• {card.cardNumber.slice(-4)}</p>
                        <p className="text-[10px] text-gray-500 capitalize">{card.status}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Investments Summary */}
          <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Investments</h3>
              <Link to="/investments" className="text-xs font-bold text-indigo-600 hover:underline">View Portfolio</Link>
            </div>
            {investments.length === 0 ? (
              <p className="text-sm text-gray-400 italic">No investments</p>
            ) : (
              <div className="space-y-3">
                {investments.map(inv => (
                  <div key={inv.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-2xl">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-600">
                        <BarChart3 className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-gray-900">{inv.symbol}</p>
                        <p className="text-[10px] text-gray-500">{inv.name}</p>
                      </div>
                    </div>
                    <p className="text-xs font-bold text-gray-900">${inv.currentValue.toLocaleString()}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Transactions */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex justify-between items-center px-1">
            <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Recent Transactions</h2>
            <button className="text-xs font-semibold text-indigo-600 hover:underline">View All</button>
          </div>

          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
            {transactions.length === 0 ? (
              <div className="p-12 text-center">
                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Clock className="w-8 h-8 text-gray-300" />
                </div>
                <p className="text-gray-500 font-medium">No transactions found yet.</p>
                <p className="text-xs text-gray-400 mt-1">Ready to make your first move? Use the transfer tool.</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {transactions.map(tx => {
                  const isOutgoing = tx.fromUserId === profile?.uid;
                  return (
                    <div key={tx.id} className="p-5 flex items-center justify-between hover:bg-gray-50 transition-colors group">
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                          isOutgoing ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'
                        }`}>
                          {isOutgoing ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownLeft className="w-5 h-5" />}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">
                              {tx.description || (isOutgoing ? 'Sent' : 'Received')}
                            </p>
                            {tx.status && (
                              <span className={`inline-flex items-center px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wider rounded border ${
                                tx.status === 'pending' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                                tx.status === 'completed' ? 'bg-green-50 text-green-700 border-green-100' :
                                tx.status === 'failed' ? 'bg-red-50 text-red-700 border-red-100' :
                                'bg-gray-100 text-gray-600 border-gray-200'
                              }`}>
                                {tx.status}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 font-medium">
                            {isOutgoing ? `To: ${tx.toAccountNumber}` : `Inbound Credit`}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`font-bold ${isOutgoing ? 'text-gray-900' : 'text-green-600'}`}>
                          {isOutgoing ? '-' : '+'}{tx.amount.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
                        </p>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                          {tx.timestamp?.toDate().toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-5 rounded-2xl bg-green-50 border border-green-100 flex items-center gap-4">
                <ArrowDownLeft className="h-6 w-6 text-green-600" />
                <div>
                    <p className="text-xs font-bold text-green-800 uppercase tracking-tighter">Inflow this month</p>
                    <p className="text-lg font-bold text-green-900">
                        ${transactions.filter(tx => tx.toUserId === profile?.uid).reduce((acc, tx) => acc + tx.amount, 0).toLocaleString()}
                    </p>
                </div>
            </div>
            <div className="p-5 rounded-2xl bg-red-50 border border-red-100 flex items-center gap-4">
                <ArrowUpRight className="h-6 w-6 text-red-600" />
                <div>
                    <p className="text-xs font-bold text-red-800 uppercase tracking-tighter">Outflow this month</p>
                    <p className="text-lg font-bold text-red-900">
                        ${transactions.filter(tx => tx.fromUserId === profile?.uid).reduce((acc, tx) => acc + tx.amount, 0).toLocaleString()}
                    </p>
                </div>
            </div>
          </div>

          {/* Interactive Multi-Currency Sweeper & Security Safes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            <CurrencyConverter />
            <VaultDepositBox />
          </div>

        </div>
      </div>

      {/* Corporate Bank Footer Disclaimer & Support Hotline */}
      <footer className="mt-20 pt-10 border-t border-gray-150">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8 text-xs text-gray-500 font-medium">
          <div className="space-y-2">
            <h4 className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Treasury Custody & Security</h4>
            <p className="leading-relaxed text-gray-400">
              CentraBank utilizes 256-bit bank routing security vaults to custody and clear enterprise transactions. Stated rates are guaranteed up to Lloyd's policy clearances.
            </p>
          </div>
          <div className="space-y-1">
            <h4 className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Corporate Support Hotline</h4>
            <p className="text-gray-900 font-black text-sm">1-800-CENTRA-TREASURY</p>
            <p className="text-[10px] text-gray-400">Hours: Mon-Fri 8:00 AM - 6:00 PM EST (24/7 Digital Vault Assistant)</p>
          </div>
          <div className="space-y-4">
            <div className="flex gap-2">
              <span className="px-1.5 py-0.5 border border-gray-200 text-gray-400 text-[8px] font-extrabold select-none rounded">MEMBER FDIC</span>
              <span className="px-1.5 py-0.5 border border-gray-200 text-gray-400 text-[8px] font-extrabold select-none rounded">MEMBER SIPC</span>
              <span className="px-1.5 py-0.5 border border-gray-200 text-gray-400 text-[8px] font-extrabold select-none rounded">EQUAL LENDER</span>
            </div>
            <p className="text-[9px] text-gray-400 leading-normal">
              National NMLS Identifier: 9542013 | © 2026 CentraBank & Corp. All security logs audited.
            </p>
          </div>
        </div>

        <div className="pt-6 border-t border-gray-50 flex flex-col sm:flex-row items-center justify-between text-[10px] text-gray-400">
          <p>This session is fully secure and monitored to prevent institutional bank fraud.</p>
          <div className="flex gap-4 font-semibold mt-2 sm:mt-0">
            <Link to="/resources?tab=compliance#terms-service" className="hover:text-indigo-600 hover:underline">Terms of Service</Link>
            <Link to="/resources?tab=compliance#privacy-policy" className="hover:text-indigo-600 hover:underline">Privacy Policy</Link>
            <Link to="/resources?tab=compliance#cookie-policy" className="hover:text-indigo-600 hover:underline">Cookie Policy</Link>
          </div>
        </div>
      </footer>

    </div>
  );
};

const CreditCardIcon = () => (
  <svg width="40" height="25" viewBox="0 0 40 25" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="40" height="25" rx="4" fill="white" fillOpacity="0.2"/>
    <circle cx="8" cy="8" r="3" fill="white"/>
    <rect x="25" y="5" width="10" height="2" rx="1" fill="white"/>
    <rect x="25" y="9" width="7" height="2" rx="1" fill="white"/>
  </svg>
);

export default Dashboard;
