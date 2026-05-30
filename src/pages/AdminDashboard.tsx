import React, { useEffect, useState } from 'react';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, getDocs, where, runTransaction, serverTimestamp, writeBatch } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { UserProfile, Transaction, BankAccount } from '../types';
import { Users, FileText, CheckCircle, XCircle, Clock, Shield, ExternalLink, Search, TrendingUp, ArrowUpRight, ArrowDownLeft, Coins, Trash2, RotateCcw, AlertTriangle, UserCog } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

type ConfirmConfig = { title: string; message: string; onConfirm: () => void };

const ConfirmModal = ({ title, message, onConfirm, onCancel }: {
  title: string; message: string; onConfirm: () => void; onCancel: () => void;
}) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
    <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onCancel} />
    <motion.div
      initial={{ scale: 0.95, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className="relative bg-white rounded-3xl shadow-2xl p-8 w-full max-w-sm z-10"
    >
      <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center mb-5">
        <AlertTriangle className="w-6 h-6 text-red-500" />
      </div>
      <h3 className="text-lg font-black text-gray-900 mb-2">{title}</h3>
      <p className="text-sm text-gray-500 leading-relaxed mb-7">{message}</p>
      <div className="flex gap-3">
        <button
          onClick={onCancel}
          className="flex-1 h-11 rounded-xl border-2 border-gray-200 text-xs font-black text-gray-600 uppercase tracking-wider hover:border-gray-300 transition-all"
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          className="flex-1 h-11 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-black uppercase tracking-wider transition-all shadow-lg shadow-red-100"
        >
          Confirm
        </button>
      </div>
    </motion.div>
  </div>
);

const AdminDashboard: React.FC = () => {
  const { profile: currentAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState<'users' | 'transactions'>('users');
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [confirm, setConfirm] = useState<ConfirmConfig | null>(null);

  useEffect(() => {
    // Admin list users
    const qUsers = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
    const unsubUsers = onSnapshot(qUsers, (snapshot) => {
      setUsers(snapshot.docs.map(d => ({ ...d.data(), uid: d.id } as UserProfile)));
      setLoading(false);
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'users'));

    // Admin list transactions
    const qTrans = query(collection(db, 'transactions'), orderBy('timestamp', 'desc'));
    const unsubTrans = onSnapshot(qTrans, (snapshot) => {
      setTransactions(snapshot.docs.map(d => ({ ...d.data(), id: d.id } as Transaction)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'transactions'));

    return () => {
      unsubUsers();
      unsubTrans();
    };
  }, []);

  const handleStatusChange = async (uid: string, status: UserProfile['status']) => {
    try {
      await updateDoc(doc(db, 'users', uid), { status });
    } catch (err) {
      console.error("Failed to update status", err);
    }
  };

  const handleDeleteUser = (user: UserProfile) => {
    setConfirm({
      title: 'Delete User',
      message: `Permanently delete ${user.displayName} (${user.email})? This will remove their profile and all associated accounts, cards, and investments.`,
      onConfirm: async () => {
        try {
          const batch = writeBatch(db);
          const collections = ['accounts', 'cards', 'investments', 'deposit_boxes'];
          for (const col of collections) {
            const snap = await getDocs(query(collection(db, col), where('userId', '==', user.uid)));
            snap.docs.forEach(d => batch.delete(d.ref));
          }
          batch.delete(doc(db, 'users', user.uid));
          await batch.commit();
        } catch (err: any) {
          console.error("Failed to delete user", err);
        }
      },
    });
  };

  const handleToggleRole = (user: UserProfile) => {
    const makingAdmin = user.role !== 'admin';
    setConfirm({
      title: makingAdmin ? 'Promote to Admin' : 'Remove Admin Role',
      message: makingAdmin
        ? `Grant ${user.displayName} full admin access? They will be able to manage all users and transactions.`
        : `Remove admin privileges from ${user.displayName}? They will become a regular customer.`,
      onConfirm: async () => {
        try {
          await updateDoc(doc(db, 'users', user.uid), {
            role: makingAdmin ? 'admin' : 'customer',
            status: makingAdmin ? 'approved' : 'approved',
          });
        } catch (err: any) {
          console.error('Failed to toggle role', err);
        }
      },
    });
  };

  const handleResetCompliance = (user: UserProfile) => {
    setConfirm({
      title: 'Reset Compliance',
      message: `Force ${user.displayName} to redo the full KYC compliance onboarding? They will be blocked from the app until they complete it again.`,
      onConfirm: async () => {
        try {
          await updateDoc(doc(db, 'users', user.uid), { onboardingCompleted: false });
        } catch (err: any) {
          console.error("Failed to reset compliance", err);
        }
      },
    });
  };

  const handleTransactionStatusChange = async (tx: Transaction, newStatus: Transaction['status']) => {
    if (tx.status === newStatus) return;

    try {
      await runTransaction(db, async (firebaseTx) => {
        const txRef = doc(db, 'transactions', tx.id);
        const freshTxSnap = await firebaseTx.get(txRef);
        if (!freshTxSnap.exists()) {
          throw new Error("Transaction record not found.");
        }
        const freshTx = freshTxSnap.data() as Transaction;
        const currentStatus = freshTx.status || 'pending';

        if (currentStatus === newStatus) return; // already in this state

        // We only allow transitions out of 'pending' to avoid double-processing balances!
        if (currentStatus !== 'pending') {
          throw new Error("Only pending transactions can have their authorization states modified.");
        }

        // Apply balance adjustments based on transition:
        if (freshTx.type === 'topup' || freshTx.fromAccountId === 'external') {
          // Deposit / Top up
          if (newStatus === 'completed') {
            // Add the money to the destination account
            const accountId = freshTx.toAccountId;
            const accountRef = doc(db, 'accounts', accountId);
            const accountSnap = await firebaseTx.get(accountRef);
            if (!accountSnap.exists()) {
              throw new Error("Target bank account for top-up does not exist.");
            }
            const currentBalance = accountSnap.data().balance || 0;
            firebaseTx.update(accountRef, {
              balance: currentBalance + freshTx.amount,
              lastTransactionId: freshTxSnap.id
            });
          }
          // If rejected/failed, no change in balance (since topup didn't add funds yet).
        } else {
          // Withdrawal or outbound transfer where money was already deducted on pending creation.
          // Since the money was deducted at creation, if it is rejected or failed, we must refund the user!
          if (newStatus === 'rejected' || newStatus === 'failed') {
            const accountId = freshTx.fromAccountId;
            const accountRef = doc(db, 'accounts', accountId);
            const accountSnap = await firebaseTx.get(accountRef);
            if (accountSnap.exists()) {
              const currentBalance = accountSnap.data().balance || 0;
              firebaseTx.update(accountRef, {
                balance: currentBalance + freshTx.amount,
                lastTransactionId: freshTxSnap.id
              });
            }
          }
          // If completed, the hold is confirmed. No balance adjustment.
        }

        // Update the transaction status and date updated
        firebaseTx.update(txRef, {
          status: newStatus,
          processedAt: serverTimestamp(),
        });
      });
    } catch (err: any) {
      console.error("Failed to update transaction status:", err);
      alert(err.message || "An error occurred while updating the transaction.");
    }
  };

  const filteredUsers = users.filter(u => 
    u.email.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.displayName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredTransactions = transactions.filter(tx => 
    tx.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (tx.toAccountNumber && tx.toAccountNumber.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (tx.description && tx.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (tx.fromUserId && tx.fromUserId.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (tx.status && tx.status.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="pt-24 pb-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 text-[10px] font-bold uppercase tracking-wider rounded border border-indigo-200">
                System Administrator
            </span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Admin Overview</h1>
          <p className="text-gray-500 mt-1">Global oversight and user management portal.</p>
        </div>

        <div className="flex bg-white p-1 rounded-2xl border border-gray-100 shadow-sm self-start md:self-auto">
          <button
            onClick={() => setActiveTab('users')}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${
              activeTab === 'users' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            <Users className="w-4 h-4" />
            Users
          </button>
          <button
            onClick={() => setActiveTab('transactions')}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${
              activeTab === 'transactions' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            <FileText className="w-4 h-4" />
            Transactions
          </button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-6 mb-10">
        <StatCard label="Total Users" value={users.length} icon={<Users className="text-indigo-600" />} />
        <StatCard label="Pending Approval" value={users.filter(u => u.status === 'pending').length} icon={<Clock className="text-amber-500" />} />
        <StatCard label="Live Transactions" value={transactions.length} icon={<FileText className="text-blue-600" />} />
        <StatCard label="Total Volume" value={`$${transactions.reduce((acc, t) => acc + t.amount, 0).toLocaleString()}`} icon={<Shield className="text-green-600" />} />
      </div>

      <div className="flex items-center gap-4 bg-white p-4 mb-8 rounded-3xl border border-gray-100 shadow-sm animate-fade-in">
          <Search className="w-5 h-5 text-gray-400 ml-2" />
          <input 
              type="text" 
              placeholder={activeTab === 'users' ? "Search users by name or email..." : "Search transactions by ID, account, description, status..."} 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 bg-transparent border-none focus:ring-0 text-gray-900 font-medium placeholder:text-gray-400 outline-none"
          />
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'users' ? (
          <motion.div
            key="users-tab"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden"
          >
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="border-bottom border-gray-50">
                            <th className="p-6 text-xs font-bold text-gray-400 uppercase tracking-widest bg-gray-50/50">User Details</th>
                            <th className="p-6 text-xs font-bold text-gray-400 uppercase tracking-widest bg-gray-50/50">Registration</th>
                            <th className="p-6 text-xs font-bold text-gray-400 uppercase tracking-widest bg-gray-50/50">Status</th>
                            <th className="p-6 text-xs font-bold text-gray-400 uppercase tracking-widest bg-gray-50/50">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {filteredUsers.map(user => (
                            <tr key={user.uid} className="hover:bg-gray-50 transition-colors">
                                <td className="p-6">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                                            {user.displayName ? user.displayName[0] : 'U'}
                                        </div>
                                        <div>
                                            <p className="font-bold text-gray-900 leading-tight">{user.displayName}</p>
                                            <p className="text-xs text-gray-500 font-medium">{user.email}</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="p-6 text-sm text-gray-600 font-medium">
                                    {user.createdAt?.toDate().toLocaleDateString()}
                                </td>
                                <td className="p-6">
                                    <StatusBadge status={user.status} />
                                </td>
                                <td className="p-6">
                                    <div className="flex items-center gap-1">
                                        {user.status === 'pending' ? (
                                            <>
                                                <button
                                                    onClick={() => handleStatusChange(user.uid, 'approved')}
                                                    className="p-2 text-green-600 hover:bg-green-50 rounded-xl transition-all"
                                                    title="Approve"
                                                >
                                                    <CheckCircle className="w-5 h-5" />
                                                </button>
                                                <button
                                                    onClick={() => handleStatusChange(user.uid, 'rejected')}
                                                    className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-all"
                                                    title="Reject"
                                                >
                                                    <XCircle className="w-5 h-5" />
                                                </button>
                                            </>
                                        ) : (
                                            <button
                                                onClick={() => handleStatusChange(user.uid, 'pending')}
                                                className="text-xs font-bold text-gray-400 hover:text-indigo-600 uppercase tracking-widest px-2"
                                                title="Reset approval status"
                                            >
                                                Reset
                                            </button>
                                        )}
                                        <div className="w-px h-5 bg-gray-100 mx-1" />
                                        <button
                                            onClick={() => handleToggleRole(user)}
                                            disabled={user.uid === currentAdmin?.uid}
                                            className={`p-2 rounded-xl transition-all disabled:opacity-30 disabled:cursor-not-allowed ${
                                              user.role === 'admin'
                                                ? 'text-indigo-500 hover:bg-indigo-50'
                                                : 'text-gray-400 hover:bg-gray-100 hover:text-indigo-500'
                                            }`}
                                            title={user.role === 'admin' ? 'Remove admin role' : 'Make admin'}
                                        >
                                            <UserCog className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => handleResetCompliance(user)}
                                            className="p-2 text-amber-500 hover:bg-amber-50 rounded-xl transition-all"
                                            title="Force compliance re-onboarding"
                                        >
                                            <RotateCcw className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => handleDeleteUser(user)}
                                            className="p-2 text-red-400 hover:bg-red-50 hover:text-red-600 rounded-xl transition-all"
                                            title="Delete user"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="trans-tab"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden"
          >
             <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="border-bottom border-gray-50">
                            <th className="p-6 text-xs font-bold text-gray-400 uppercase tracking-widest bg-gray-50/50">Details / Type</th>
                            <th className="p-6 text-xs font-bold text-gray-400 uppercase tracking-widest bg-gray-50/50">Routing</th>
                            <th className="p-6 text-xs font-bold text-gray-400 uppercase tracking-widest bg-gray-50/50">Amount</th>
                            <th className="p-6 text-xs font-bold text-gray-400 uppercase tracking-widest bg-gray-50/50">Description</th>
                            <th className="p-6 text-xs font-bold text-gray-400 uppercase tracking-widest bg-gray-50/50">Date</th>
                            <th className="p-6 text-xs font-bold text-gray-400 uppercase tracking-widest bg-gray-50/50">Status</th>
                            <th className="p-6 text-xs font-bold text-gray-400 uppercase tracking-widest bg-gray-50/50">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 text-sm">
                        {filteredTransactions.map(tx => {
                            const isDeposit = tx.fromUserId === 'external' || tx.type === 'topup';
                            const isWithdrawal = tx.type === 'withdraw';
                            return (
                                <tr key={tx.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="p-6">
                                        <div className="flex items-center gap-2.5">
                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                                                isDeposit ? 'bg-green-50 text-green-600' : isWithdrawal ? 'bg-amber-50 text-amber-600' : 'bg-indigo-50 text-indigo-600'
                                            }`}>
                                                {isDeposit ? <TrendingUp className="w-4 h-4" /> : isWithdrawal ? <ArrowUpRight className="w-4 h-4" /> : <Coins className="w-4 h-4" />}
                                            </div>
                                            <div>
                                                <span className="font-bold text-gray-900 block leading-tight capitalize">
                                                    {tx.type || (isDeposit ? 'topup' : 'transfer')}
                                                </span>
                                                <span className="text-[10px] text-gray-400 font-bold block mt-0.5">ID: {tx.id.slice(0, 8)}...</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-6">
                                        <div className="text-xs font-medium">
                                            <span className="text-gray-400 block font-bold uppercase tracking-wider text-[9px]">To Acct:</span>
                                            <span className="font-bold text-gray-800">{tx.toAccountNumber}</span>
                                            {tx.fromUserId !== 'external' && tx.fromUserId && (
                                                <span className="text-slate-400 block mt-0.5 font-sans">From User: {tx.fromUserId.slice(0, 8)}...</span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="p-6">
                                        <span className={`font-black text-sm ${isDeposit ? 'text-green-600' : 'text-gray-900'}`}>
                                            {isDeposit ? '+' : '-'}${tx.amount.toLocaleString()}
                                        </span>
                                    </td>
                                    <td className="p-6 text-gray-600 max-w-[180px] font-medium leading-relaxed truncate" title={tx.description}>
                                        {tx.description}
                                    </td>
                                    <td className="p-6 text-xs text-gray-500 font-bold font-mono">
                                        {tx.timestamp?.toDate().toLocaleDateString()}
                                    </td>
                                    <td className="p-6">
                                        <span className={`inline-flex items-center px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded border ${
                                            tx.status === 'pending' || !tx.status ? 'bg-amber-50 text-amber-700 border-amber-100' :
                                            tx.status === 'completed' ? 'bg-green-50 text-green-700 border-green-100' :
                                            tx.status === 'failed' ? 'bg-red-50 text-red-700 border-red-100' :
                                            'bg-gray-100 text-gray-600 border-gray-200'
                                        }`}>
                                            {tx.status || 'pending'}
                                        </span>
                                    </td>
                                    <td className="p-6">
                                        {(tx.status === 'pending' || !tx.status) ? (
                                            <div className="flex gap-2">
                                                <button 
                                                    onClick={() => handleTransactionStatusChange(tx, 'completed')}
                                                    className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-all border border-transparent hover:border-green-100"
                                                    title="Approve Settlement"
                                                >
                                                    <CheckCircle className="w-5 h-5" />
                                                </button>
                                                <button 
                                                    onClick={() => handleTransactionStatusChange(tx, 'rejected')}
                                                    className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-all border border-transparent hover:border-red-100"
                                                    title="Reject Settlement"
                                                >
                                                    <XCircle className="w-5 h-5" />
                                                </button>
                                            </div>
                                        ) : (
                                            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest italic flex items-center gap-1.5">
                                                <Shield className="w-3.5 h-3.5 text-gray-300" /> Lock
                                            </span>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
             </div>
          </motion.div>
        )}
      </AnimatePresence>

      {confirm && (
        <ConfirmModal
          title={confirm.title}
          message={confirm.message}
          onConfirm={() => { confirm.onConfirm(); setConfirm(null); }}
          onCancel={() => setConfirm(null)}
        />
      )}
    </div>
  );
};

const StatCard = ({ label, value, icon }: { label: string, value: string | number, icon: React.ReactNode }) => (
  <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
    <div className="flex items-center justify-between mb-4">
      <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center font-bold">
        {icon}
      </div>
    </div>
    <p className="text-3xl font-bold text-gray-900 tracking-tighter mb-1">{value}</p>
    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{label}</p>
  </div>
);

const StatusBadge = ({ status }: { status: UserProfile['status'] }) => {
  const styles = {
    pending: 'bg-amber-50 text-amber-700 border-amber-100',
    approved: 'bg-green-50 text-green-700 border-green-100',
    rejected: 'bg-red-50 text-red-700 border-red-100',
  };
  return (
    <span className={`px-3 py-1 text-[11px] font-bold uppercase tracking-wider rounded-full border ${styles[status]}`}>
      {status}
    </span>
  );
};

export default AdminDashboard;
