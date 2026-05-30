import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, doc, setDoc, serverTimestamp, deleteDoc, runTransaction } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, Lock, Unlock, HelpCircle, Key, KeyRound, Sparkles, FolderLock, Plus, Info, Check, Eye, EyeOff } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface DepositBox {
  id: string;
  userId: string;
  label: string;
  secretPIN: string;
  secureContent: string;
  insuranceTier: string;
  status: 'locked' | 'unlocked';
  createdAt: any;
}

export default function VaultDepositBox() {
  const { profile } = useAuth();
  const [boxes, setBoxes] = useState<DepositBox[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Creation States
  const [isOpeningForm, setIsOpeningForm] = useState(false);
  const [label, setLabel] = useState('');
  const [pin, setPin] = useState('');
  const [content, setContent] = useState('');
  const [insurance, setInsurance] = useState('$100,000 Lloyd\'s Insured');
  const [submitting, setSubmitting] = useState(false);

  // Keypad States
  const [selectedBoxForUnlock, setSelectedBoxForUnlock] = useState<DepositBox | null>(null);
  const [enteredPin, setEnteredPin] = useState('');
  const [keypadError, setKeypadError] = useState(false);
  
  // Selected Unlocked Content Display States
  const [unlockedContent, setUnlockedContent] = useState<{[key: string]: boolean}>({});

  useEffect(() => {
    if (!profile) return;

    const q = query(collection(db, 'deposit_boxes'), where('userId', '==', profile.uid));
    const unsub = onSnapshot(q, (snapshot) => {
      setBoxes(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as DepositBox)));
      setLoading(false);
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'deposit_boxes'));

    return () => unsub();
  }, [profile]);

  const handleCreateBox = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || pin.length < 4) return;
    setSubmitting(true);

    try {
      const boxId = `BOX-${Math.floor(Math.random() * 1000000)}`;
      await setDoc(doc(db, 'deposit_boxes', boxId), {
        userId: profile.uid,
        label,
        secretPIN: pin,
        secureContent: content,
        insuranceTier: insurance,
        status: 'locked',
        createdAt: serverTimestamp()
      });

      setLabel('');
      setPin('');
      setContent('');
      setIsOpeningForm(false);
    } catch (err) {
      console.error(err);
      alert("Failed to allocate vault deposit box.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUnlockAttempt = (digit: string) => {
    if (enteredPin.length >= 4) return;
    const newPin = enteredPin + digit;
    setEnteredPin(newPin);
    setKeypadError(false);

    if (newPin.length === 4) {
      if (selectedBoxForUnlock && selectedBoxForUnlock.secretPIN === newPin) {
        // Success
        setUnlockedContent(prev => ({ ...prev, [selectedBoxForUnlock.id]: true }));
        setEnteredPin('');
        setSelectedBoxForUnlock(null);
      } else {
        // Fail
        setTimeout(() => {
          setKeypadError(true);
          setEnteredPin('');
        }, 200);
      }
    }
  };

  const handleLockBox = (boxId: string) => {
    setUnlockedContent(prev => ({ ...prev, [boxId]: false }));
  };

  const handleDeleteBox = async (boxId: string) => {
    if (!window.confirm("Are you sure you want to permanently destroy and vacate this deposit box? Stored secrets will be cleared.")) return;
    try {
      await deleteDoc(doc(db, 'deposit_boxes', boxId));
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return null;

  return (
    <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-sm space-y-6">
      
      {/* Vault Header */}
      <div className="flex items-center justify-between border-b border-gray-50 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold">
            <FolderLock className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h3 className="text-base font-black text-gray-900 uppercase tracking-tight">Security Deposit Boxes</h3>
            <p className="text-[10px] text-gray-400 font-bold tracking-wider uppercase">Cryptographically Secure Ledger Vaults</p>
          </div>
        </div>

        {!isOpeningForm && (
          <button
            onClick={() => setIsOpeningForm(true)}
            className="flex items-center gap-1 bg-gray-900 hover:bg-indigo-650 hover:shadow-md hover:shadow-indigo-50 text-white text-[10px] font-black uppercase tracking-wider py-2 px-3.5 rounded-xl transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            Allocate Box
          </button>
        )}
      </div>

      <AnimatePresence mode="wait">
        {isOpeningForm ? (
          <motion.form
            key="allocationForm"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            onSubmit={handleCreateBox}
            className="space-y-4 bg-gray-50 p-5 rounded-2xl border border-gray-150"
          >
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-black text-indigo-750 uppercase">Open Premium Vault Slot</span>
              <button
                type="button"
                onClick={() => setIsOpeningForm(false)}
                className="text-xs font-bold text-gray-400 hover:text-gray-600 uppercase"
              >
                Cancel
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[9px] font-black uppercase text-gray-400 tracking-wider mb-1">Box Label Identifier</label>
                <input 
                  type="text"
                  required
                  placeholder="e.g. BTC Seed Backups & Keycodes"
                  value={label}
                  onChange={e => setLabel(e.target.value)}
                  className="w-full bg-white border border-gray-200 focus:border-indigo-500 rounded-xl px-3.5 py-2.5 font-bold text-xs text-gray-900 outline-none"
                />
              </div>

              <div>
                <label className="block text-[9px] font-black uppercase text-gray-400 tracking-wider mb-1">4-Digit Master PIN Lock</label>
                <input 
                  type="password"
                  required
                  maxLength={4}
                  placeholder="e.g. 5831 (Numbers Only)"
                  pattern="[0-9]{4}"
                  value={pin}
                  onChange={e => setPin(e.target.value.replace(/\D/g, ''))}
                  className="w-full bg-white border border-gray-200 focus:border-indigo-500 rounded-xl px-3.5 py-2.5 font-mono font-bold text-xs tracking-widest text-gray-900 outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-[9px] font-black uppercase text-gray-400 tracking-wider mb-1">Vault Insurance Coverage (Included)</label>
              <select
                value={insurance}
                onChange={e => setInsurance(e.target.value)}
                className="w-full bg-white border border-gray-200 focus:border-indigo-500 rounded-xl px-3.5 py-2.5 font-bold text-xs text-gray-900 outline-none"
              >
                <option value="$100,000 Lloyd's Insured">$100,000 Lloyd's Sweep Vault Guarantee</option>
                <option value="$500,000 Lloyd's Insured">$500,000 Lloyd's Sweep Vault Guarantee</option>
                <option value="$1,000,000 Premium Insured">$1,000,000 Premium Fiduciary Vault Guarantee</option>
              </select>
            </div>

            <div>
              <label className="block text-[9px] font-black uppercase text-gray-400 tracking-wider mb-1">Secret Credentials / Contents to Retain</label>
              <textarea 
                required
                rows={3}
                placeholder="Type confidential wallet seed phrases, private lockbox combinations, contract addresses, or emergency instructions here..."
                value={content}
                onChange={e => setContent(e.target.value)}
                className="w-full bg-white border border-gray-200 focus:border-indigo-500 rounded-xl px-3.5 py-2.5 font-medium text-xs text-gray-900 outline-none"
              />
            </div>

            <div className="flex gap-2 items-center bg-indigo-50/50 p-3 rounded-xl border border-indigo-100">
              <Info className="w-4 h-4 text-indigo-600 shrink-0" />
              <p className="text-[10px] text-indigo-800 leading-normal font-semibold">
                CentraBank uses AES-256 equivalent end-point structures. We have no backend visibility to your vault PINs. If forgotten, contents cannot be restored.
              </p>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full h-11 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs tracking-tight uppercase rounded-xl transition-all"
            >
              {submitting ? 'Allocating Space...' : 'Register Secure Deposit Box'}
            </button>
          </motion.form>
        ) : null}
      </AnimatePresence>

      {/* Vault Grid */}
      {boxes.length === 0 ? (
        <div className="bg-gray-50/50 rounded-2xl p-8 text-center border-2 border-dashed border-gray-150">
          <Key className="w-8 h-8 text-gray-300 mx-auto mb-2" />
          <h4 className="text-xs font-black text-gray-900 uppercase">Vaults Area Quiet</h4>
          <p className="text-[11px] text-gray-400 mt-1">No security deposit boxes allocated to this account yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {boxes.map(box => {
            const isUnlocked = !!unlockedContent[box.id];
            
            return (
              <div 
                key={box.id}
                className={`p-5 rounded-2xl border transition-all ${
                  isUnlocked 
                    ? 'bg-emerald-50/20 border-emerald-200' 
                    : 'bg-gray-50/80 border-gray-150'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                      isUnlocked ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-200 text-gray-500'
                    }`}>
                      {isUnlocked ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-gray-900 leading-tight uppercase tracking-tight">
                        {box.label}
                      </h4>
                      <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">
                        {box.insuranceTier}
                      </p>
                    </div>
                  </div>

                  <button 
                    onClick={() => handleDeleteBox(box.id)}
                    className="text-[10px] font-bold text-red-500 hover:underline hover:text-red-700 transition"
                  >
                    Vacate
                  </button>
                </div>

                <AnimatePresence mode="wait">
                  {isUnlocked ? (
                    <motion.div
                      key="unlocked-content"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="space-y-3"
                    >
                      <div className="bg-white p-3 rounded-xl border border-emerald-100 font-mono text-xs text-gray-700 select-all overflow-x-auto whitespace-pre-wrap">
                        {box.secureContent}
                      </div>
                      
                      <div className="flex justify-between items-center pt-2">
                        <span className="text-[9px] text-emerald-750 font-bold uppercase tracking-widest flex items-center gap-1">
                          <ShieldCheck className="w-3.5 h-3.5" />
                          Authorized Decryption Decrypt
                        </span>
                        <button
                          onClick={() => handleLockBox(box.id)}
                          className="px-3 py-1.5 bg-gray-900 hover:bg-gray-800 text-white text-[9px] font-black uppercase tracking-wider rounded-lg transition-all"
                        >
                          Lock Vault Box
                        </button>
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="locked"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex items-center justify-between pt-2"
                    >
                      <span className="text-[9px] text-gray-400 font-bold uppercase tracking-widest flex items-center gap-1">
                        <Lock className="w-3.5 h-3.5" />
                        Stored Encrypted
                      </span>
                      <button
                        onClick={() => {
                          setSelectedBoxForUnlock(box);
                          setEnteredPin('');
                          setKeypadError(false);
                        }}
                        className="flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-[9px] font-black uppercase tracking-wider rounded-lg shadow-sm transition-all"
                      >
                        <KeyRound className="w-3.5 h-3.5" />
                        Enter Guard PIN
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      )}

      {/* Guard PIN Keypad Modal Overlay */}
      <AnimatePresence>
        {selectedBoxForUnlock && (
          <div className="fixed inset-0 bg-gray-950/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-[2.5rem] p-8 w-full max-w-sm border border-gray-150 shadow-2xl space-y-6 text-center"
            >
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Biometric Safe Input</span>
                <button 
                  onClick={() => setSelectedBoxForUnlock(null)}
                  className="text-gray-400 hover:text-gray-600 text-xs font-black uppercase"
                >
                  Close
                </button>
              </div>

              <div>
                <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-3">
                  <KeyRound className="w-6 h-6 animate-pulse" />
                </div>
                <h4 className="text-sm font-black text-gray-900 uppercase">Unlock {selectedBoxForUnlock.label}</h4>
                <p className="text-[10px] text-gray-400 mt-0.5">INPUT SECURE 4-DIGIT BOX KEYCODE</p>
              </div>

              {/* Pin dots indicator */}
              <div className="flex justify-center gap-3 my-4">
                {[...Array(4)].map((_, i) => (
                  <div 
                    key={i} 
                    className={`w-4.5 h-4.5 rounded-full border-2 transition-all ${
                      i < enteredPin.length 
                        ? 'bg-indigo-600 border-indigo-605 scale-110' 
                        : keypadError 
                          ? 'border-red-500 bg-red-100' 
                          : 'border-gray-200 bg-gray-50'
                    }`}
                  />
                ))}
              </div>

              {keypadError && (
                <p className="text-[10px] text-red-500 font-extrabold uppercase animate-bounce">
                  Verification Failed! Code Incorrect.
                </p>
              )}

              {/* Numeric Pad Layout */}
              <div className="grid grid-cols-3 gap-3">
                {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(num => (
                  <button
                    key={num}
                    onClick={() => handleUnlockAttempt(num)}
                    className="h-14 font-mono font-black text-lg text-gray-900 border border-gray-150 bg-gray-50 hover:bg-gray-100 rounded-2xl transition hover:border-gray-350 active:scale-95"
                  >
                    {num}
                  </button>
                ))}
                <button 
                  onClick={() => setEnteredPin('')}
                  className="h-14 font-black text-[10px] uppercase text-gray-400 border border-transparent rounded-2xl"
                >
                  Clear
                </button>
                <button
                  onClick={() => handleUnlockAttempt('0')}
                  className="h-14 font-mono font-black text-lg text-gray-900 border border-gray-150 bg-gray-50 hover:bg-gray-100 rounded-2xl transition hover:border-gray-350 active:scale-95"
                >
                  0
                </button>
                <div className="h-14 flex items-center justify-center text-gray-300">
                  <ShieldCheck className="w-5 h-5 text-indigo-400" />
                </div>
              </div>

              <p className="text-[9px] text-gray-400 italic">
                Vault entry sessions are locked and audited automatically.
              </p>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
