import React, { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot, doc, setDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { Card, BankAccount } from '../types';
import { CreditCard, Plus, Lock, Unlock, Loader2, AlertCircle, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function Cards() {
  const { profile } = useAuth();
  const [cards, setCards] = useState<Card[]>([]);
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [selectedAccountId, setSelectedAccountId] = useState('');

  useEffect(() => {
    if (!profile) return;

    const qCards = query(collection(db, 'cards'), where('userId', '==', profile.uid));
    const unsubCards = onSnapshot(qCards, (snapshot) => {
      setCards(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Card)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'cards'));

    const qAccounts = query(collection(db, 'accounts'), where('userId', '==', profile.uid));
    const unsubAccounts = onSnapshot(qAccounts, (snapshot) => {
      setAccounts(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as BankAccount)));
      setLoading(false);
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'accounts'));

    return () => {
      unsubCards();
      unsubAccounts();
    };
  }, [profile]);

  const handleCreateCard = async () => {
    if (!profile || !selectedAccountId) return;
    setIsCreating(true);
    
    try {
      const cardId = `CARD-${Math.floor(Math.random() * 1000000)}`;
      const cardNumber = `4532 ${Math.floor(1000 + Math.random() * 9000)} ${Math.floor(1000 + Math.random() * 9000)} ${Math.floor(1000 + Math.random() * 9000)}`;
      const expiry = "12/28";

      await setDoc(doc(db, 'cards', cardId), {
        userId: profile.uid,
        accountId: selectedAccountId,
        cardHolder: profile.displayName,
        cardNumber,
        expiry,
        type: 'debit',
        status: 'active',
        createdAt: serverTimestamp()
      });
      setIsCreating(false);
    } catch (err: any) {
      console.error(err);
      alert("Failed to create card");
      setIsCreating(false);
    }
  };

  const toggleCardStatus = async (card: Card) => {
    try {
      await updateDoc(doc(db, 'cards', card.id), {
        status: card.status === 'active' ? 'locked' : 'active'
      });
    } catch (err: any) {
      console.error(err);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center p-12">
      <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
        <div>
          <h1 className="text-4xl font-black text-gray-900 tracking-tight mb-2">My Cards</h1>
          <p className="text-gray-500 font-medium italic">Manage your virtual and physical cards securely.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Card List */}
        <div className="lg:col-span-2 space-y-6">
          <AnimatePresence mode="popLayout">
            {cards.length === 0 ? (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-white rounded-3xl p-12 border-2 border-dashed border-gray-100 flex flex-col items-center text-center"
              >
                <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mb-4">
                  <CreditCard className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">No Cards Found</h3>
                <p className="text-gray-500 mb-6 max-w-xs">You haven't issued any cards yet. Create your first virtual card to start spending.</p>
              </motion.div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {cards.map((card) => (
                  <motion.div
                    key={card.id}
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className={`relative p-6 rounded-[2.5rem] shadow-xl overflow-hidden aspect-[1.6/1] flex flex-col justify-between transition-all group ${
                      card.status === 'locked' ? 'grayscale opacity-60' : ''
                    } bg-gradient-to-br from-gray-900 via-gray-800 to-indigo-900`}
                  >
                    <div className="flex justify-between items-start">
                      <ShieldCheck className="w-8 h-8 text-white/40" />
                      <div className="w-12 h-10 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-lg shadow-inner" />
                    </div>
                    
                    <div>
                      <p className="text-xl font-mono text-white tracking-[0.2em] mb-4 drop-shadow-md">
                        {card.cardNumber}
                      </p>
                      <div className="flex justify-between items-end">
                        <div className="space-y-1">
                          <p className="text-[10px] text-white/50 font-bold uppercase tracking-widest">Card Holder</p>
                          <p className="text-sm font-bold text-white uppercase">{card.cardHolder}</p>
                        </div>
                        <div className="text-right space-y-1">
                          <p className="text-[10px] text-white/50 font-bold uppercase tracking-widest">Expires</p>
                          <p className="text-sm font-bold text-white">{card.expiry}</p>
                        </div>
                      </div>
                    </div>

                    {/* Status Badge */}
                    <div className="absolute top-6 right-6">
                      <button 
                        onClick={() => toggleCardStatus(card)}
                        className={`p-2 rounded-xl backdrop-blur-md transition-all active:scale-95 ${
                          card.status === 'active' 
                            ? 'bg-red-500/20 text-red-100 hover:bg-red-500/40' 
                            : 'bg-green-500/20 text-green-100 hover:bg-green-500/40'
                        }`}
                      >
                        {card.status === 'active' ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </AnimatePresence>
        </div>

        {/* Create Card Sidebar */}
        <div className="space-y-6">
          <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Plus className="w-5 h-5 text-indigo-600" />
              Issue New Card
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Select Account</label>
                <select 
                  value={selectedAccountId}
                  onChange={(e) => setSelectedAccountId(e.target.value)}
                  className="w-full bg-gray-50 border-2 border-transparent focus:border-indigo-500 focus:bg-white rounded-2xl px-4 py-3 font-bold transition-all outline-none"
                >
                  <option value="">Choose an account...</option>
                  {accounts.map(acc => (
                    <option key={acc.id} value={acc.id}>
                      {acc.accountName} ({acc.balance.toLocaleString()})
                    </option>
                  ))}
                </select>
              </div>

              <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100">
                <div className="flex gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
                  <p className="text-xs text-amber-800 font-medium leading-relaxed">
                    Virtual cards are free of charge. Physical cards may incur a shipping fee of $9.99.
                  </p>
                </div>
              </div>

              <button
                onClick={handleCreateCard}
                disabled={isCreating || !selectedAccountId}
                className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-2xl font-bold transition-all flex items-center justify-center gap-2 active:scale-95"
              >
                {isCreating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
                Issue Virtual Card
              </button>
            </div>
          </div>

          <div className="bg-indigo-900 rounded-3xl p-6 text-white shadow-xl shadow-indigo-100">
            <h4 className="font-bold mb-2">Did you know?</h4>
            <p className="text-xs text-indigo-200 leading-relaxed font-medium">
              You can lock and unlock your cards instantly from the dashboard. This prevents unauthorized transactions if you misplace your card.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
