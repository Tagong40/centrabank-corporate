import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, doc, setDoc, serverTimestamp, deleteDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import {
  Plus, TrendingUp, TrendingDown, ShieldCheck, Gem, Coins,
  Package, KeyRound, Loader2, BarChart3, AlertCircle
} from 'lucide-react';

// ─── Asset catalog ────────────────────────────────────────────────────────────
const ASSET_CATALOG = [
  { type: 'Gold',          category: 'Precious Metal', basePrice: 3250,  unit: 'oz'     },
  { type: 'Silver',        category: 'Precious Metal', basePrice: 35,    unit: 'oz'     },
  { type: 'Platinum',      category: 'Precious Metal', basePrice: 1020,  unit: 'oz'     },
  { type: 'Palladium',     category: 'Precious Metal', basePrice: 1080,  unit: 'oz'     },
  { type: 'Diamond',       category: 'Gemstone',       basePrice: 5200,  unit: 'carat'  },
  { type: 'Emerald',       category: 'Gemstone',       basePrice: 2100,  unit: 'carat'  },
  { type: 'Ruby',          category: 'Gemstone',       basePrice: 2500,  unit: 'carat'  },
  { type: 'Sapphire',      category: 'Gemstone',       basePrice: 1800,  unit: 'carat'  },
  { type: 'Fine Art',      category: 'Collectible',    basePrice: 75000, unit: 'piece'  },
  { type: 'Vintage Watch', category: 'Collectible',    basePrice: 22000, unit: 'piece'  },
  { type: 'Rare Coin',     category: 'Collectible',    basePrice: 1500,  unit: 'piece'  },
  { type: 'Wine Collection', category: 'Collectible',  basePrice: 800,   unit: 'bottle' },
];

type MarketPrices = Record<string, { price: number; change: number }>;

function generateMarketPrices(): MarketPrices {
  const t = Date.now() / 60000;
  return Object.fromEntries(
    ASSET_CATALOG.map(({ type, basePrice }) => {
      const seed = type.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
      const change = Math.sin(t * 0.11 + seed) * 1.4 + Math.cos(t * 0.073 + seed * 1.3) * 0.7;
      return [type, { price: basePrice * (1 + change / 100), change }];
    })
  );
}

// ─── Types ────────────────────────────────────────────────────────────────────
interface VaultAsset {
  id: string;
  userId: string;
  name: string;
  assetType: string;
  category: string;
  quantity: number;
  unit: string;
  depositedValuePerUnit: number;
  insuranceTier: string;
  secretPIN: string;
  notes: string;
  createdAt: any;
}

// ─── Sub-components (module scope — no remount on re-render) ──────────────────
const CategoryIcon = ({ category }: { category: string }) => {
  if (category === 'Precious Metal') return <Coins className="w-4 h-4" />;
  if (category === 'Gemstone') return <Gem className="w-4 h-4" />;
  return <Package className="w-4 h-4" />;
};

// ─── Main component ───────────────────────────────────────────────────────────
export default function VaultDepositBox() {
  const { profile } = useAuth();
  const [assets, setAssets] = useState<VaultAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [marketPrices, setMarketPrices] = useState<MarketPrices>(generateMarketPrices);

  // Deposit form
  const [isDepositing, setIsDepositing] = useState(false);
  const [assetType, setAssetType] = useState('Gold');
  const [assetName, setAssetName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [insuranceTier, setInsuranceTier] = useState("$100,000 Lloyd's Insured");
  const [pin, setPin] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Vacate (withdraw) PIN modal
  const [vacatingAsset, setVacatingAsset] = useState<VaultAsset | null>(null);
  const [vacatePin, setVacatePin] = useState('');
  const [vacatePinError, setVacatePinError] = useState(false);

  // Refresh market prices every 30 s
  useEffect(() => {
    const id = setInterval(() => setMarketPrices(generateMarketPrices()), 30000);
    return () => clearInterval(id);
  }, []);

  // Load assets
  useEffect(() => {
    if (!profile) return;
    const q = query(collection(db, 'deposit_boxes'), where('userId', '==', profile.uid));
    const unsub = onSnapshot(
      q,
      snap => {
        setAssets(snap.docs.map(d => ({ id: d.id, ...d.data() } as VaultAsset)));
        setLoading(false);
      },
      err => handleFirestoreError(err, OperationType.LIST, 'deposit_boxes')
    );
    return () => unsub();
  }, [profile]);

  const catalogItem = ASSET_CATALOG.find(a => a.type === assetType)!;
  const estimatedPrice = marketPrices[assetType]?.price ?? catalogItem.basePrice;
  const estimatedTotal = parseFloat(quantity || '0') * estimatedPrice;

  const handleDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || pin.length < 4) { setFormError('PIN must be exactly 4 digits.'); return; }
    if (!quantity || parseFloat(quantity) <= 0) { setFormError('Enter a valid quantity.'); return; }
    setFormError(null);
    setSubmitting(true);
    try {
      const id = `VAULT-${Date.now()}-${Math.floor(Math.random() * 9999)}`;
      await setDoc(doc(db, 'deposit_boxes', id), {
        userId: profile.uid,
        name: assetName.trim() || `${quantity} ${catalogItem.unit} of ${assetType}`,
        assetType,
        category: catalogItem.category,
        quantity: parseFloat(quantity),
        unit: catalogItem.unit,
        depositedValuePerUnit: estimatedPrice,
        insuranceTier,
        secretPIN: pin,
        notes: notes.trim(),
        createdAt: serverTimestamp(),
      });
      setAssetType('Gold'); setAssetName(''); setQuantity('');
      setPin(''); setNotes(''); setIsDepositing(false);
    } catch (err: any) {
      setFormError(err.message || 'Failed to deposit asset.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleVacateDigit = (digit: string) => {
    if (vacatePin.length >= 4) return;
    const next = vacatePin + digit;
    setVacatePin(next);
    setVacatePinError(false);
    if (next.length === 4) {
      if (vacatingAsset?.secretPIN === next) {
        deleteDoc(doc(db, 'deposit_boxes', vacatingAsset.id))
          .then(() => { setVacatingAsset(null); setVacatePin(''); })
          .catch(console.error);
      } else {
        setTimeout(() => { setVacatePinError(true); setVacatePin(''); }, 220);
      }
    }
  };

  // Portfolio totals
  const totalCurrentValue = assets.reduce((sum, a) => {
    const price = marketPrices[a.assetType]?.price ?? a.depositedValuePerUnit;
    return sum + a.quantity * price;
  }, 0);
  const totalDepositedValue = assets.reduce((sum, a) => sum + a.quantity * a.depositedValuePerUnit, 0);
  const totalGain = totalCurrentValue - totalDepositedValue;
  const totalGainPct = totalDepositedValue > 0 ? (totalGain / totalDepositedValue) * 100 : 0;

  if (loading) return null;

  return (
    <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-sm space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between gap-4 border-b border-gray-50 pb-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center flex-shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h3 className="text-base font-black text-gray-900 uppercase tracking-tight">Physical Asset Vault</h3>
            <p className="text-[10px] text-gray-400 font-bold tracking-wider uppercase truncate">Insured Custody · Live Market Valuation</p>
          </div>
        </div>
        {!isDepositing && (
          <button
            onClick={() => { setIsDepositing(true); setFormError(null); }}
            className="flex-shrink-0 flex items-center gap-1.5 bg-gray-900 hover:bg-indigo-700 text-white text-[10px] font-black uppercase tracking-wider py-2 px-4 rounded-xl transition-all"
          >
            <Plus className="w-3.5 h-3.5" /> Deposit
          </button>
        )}
      </div>

      {/* Portfolio summary */}
      {assets.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
            <p className="text-[9px] font-black text-gray-400 uppercase tracking-wider mb-1">Holdings</p>
            <p className="text-lg font-black text-gray-900">{assets.length}</p>
            <p className="text-[9px] text-gray-400">Asset{assets.length !== 1 ? 's' : ''}</p>
          </div>
          <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
            <p className="text-[9px] font-black text-gray-400 uppercase tracking-wider mb-1">Current Value</p>
            <p className="text-lg font-black text-gray-900">${totalCurrentValue.toLocaleString('en-US', { maximumFractionDigits: 0 })}</p>
            <p className="text-[9px] text-gray-400">Live market</p>
          </div>
          <div className={`rounded-2xl p-4 border ${totalGain >= 0 ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100'}`}>
            <p className="text-[9px] font-black text-gray-400 uppercase tracking-wider mb-1">Unrealized P&L</p>
            <p className={`text-lg font-black ${totalGain >= 0 ? 'text-green-700' : 'text-red-600'}`}>
              {totalGain >= 0 ? '+' : '-'}${Math.abs(totalGain).toLocaleString('en-US', { maximumFractionDigits: 0 })}
            </p>
            <p className={`text-[9px] font-bold flex items-center gap-0.5 ${totalGain >= 0 ? 'text-green-600' : 'text-red-500'}`}>
              {totalGain >= 0 ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
              {totalGain >= 0 ? '+' : ''}{totalGainPct.toFixed(2)}%
            </p>
          </div>
        </div>
      )}

      {/* Market prices ticker */}
      <div className="bg-gray-50 rounded-2xl border border-gray-100 overflow-hidden">
        <div className="px-4 py-2 border-b border-gray-100 flex items-center gap-2">
          <BarChart3 className="w-3.5 h-3.5 text-indigo-500" />
          <span className="text-[9px] font-black text-gray-500 uppercase tracking-wider">Live Spot Prices</span>
          <span className="ml-auto text-[9px] text-gray-300 font-medium">Refreshes every 30s</span>
        </div>
        <div className="flex overflow-x-auto divide-x divide-gray-100">
          {ASSET_CATALOG.slice(0, 6).map(({ type, unit }) => {
            const m = marketPrices[type];
            const up = (m?.change ?? 0) >= 0;
            return (
              <div key={type} className="flex-shrink-0 px-4 py-2.5 min-w-[120px]">
                <p className="text-[9px] font-black text-gray-500 uppercase">{type}</p>
                <p className="text-xs font-black text-gray-900 mt-0.5">
                  ${m?.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  <span className="text-[9px] text-gray-400 font-medium">/{unit}</span>
                </p>
                <p className={`text-[9px] font-bold flex items-center gap-0.5 ${up ? 'text-green-600' : 'text-red-500'}`}>
                  {up ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
                  {up ? '+' : ''}{m?.change.toFixed(2)}%
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Deposit form */}
      <AnimatePresence>
        {isDepositing && (
          <motion.form
            key="deposit-form"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            onSubmit={handleDeposit}
            className="space-y-4 bg-gray-50 p-5 rounded-2xl border border-gray-150"
          >
            <div className="flex justify-between items-center">
              <span className="text-xs font-black text-gray-700 uppercase">Deposit Physical Asset</span>
              <button type="button" onClick={() => { setIsDepositing(false); setFormError(null); }}
                className="text-xs font-bold text-gray-400 hover:text-gray-600">Cancel</button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[9px] font-black uppercase text-gray-400 tracking-wider mb-1">Asset Type</label>
                <select
                  value={assetType}
                  onChange={e => setAssetType(e.target.value)}
                  className="w-full bg-white border border-gray-200 focus:border-indigo-500 rounded-xl px-3.5 py-2.5 font-bold text-xs text-gray-900 outline-none"
                >
                  {['Precious Metal', 'Gemstone', 'Collectible'].map(cat => (
                    <optgroup key={cat} label={cat}>
                      {ASSET_CATALOG.filter(a => a.category === cat).map(a => (
                        <option key={a.type} value={a.type}>{a.type} (per {a.unit})</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[9px] font-black uppercase text-gray-400 tracking-wider mb-1">
                  Quantity ({catalogItem.unit})
                </label>
                <input
                  type="number"
                  required
                  min="0.001"
                  step="any"
                  placeholder={`e.g. 10`}
                  value={quantity}
                  onChange={e => setQuantity(e.target.value)}
                  className="w-full bg-white border border-gray-200 focus:border-indigo-500 rounded-xl px-3.5 py-2.5 font-bold text-xs text-gray-900 outline-none"
                />
              </div>
            </div>

            {/* Estimated deposit value */}
            {parseFloat(quantity) > 0 && (
              <div className="bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-2.5 flex items-center justify-between">
                <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">Estimated Deposit Value</span>
                <span className="text-sm font-black text-indigo-700">
                  ${estimatedTotal.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                </span>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[9px] font-black uppercase text-gray-400 tracking-wider mb-1">Description (Optional)</label>
                <input
                  type="text"
                  placeholder={`e.g. Valcambi ${assetType} Bar`}
                  value={assetName}
                  onChange={e => setAssetName(e.target.value)}
                  className="w-full bg-white border border-gray-200 focus:border-indigo-500 rounded-xl px-3.5 py-2.5 font-bold text-xs text-gray-900 outline-none"
                />
              </div>
              <div>
                <label className="block text-[9px] font-black uppercase text-gray-400 tracking-wider mb-1">Vault Access PIN (4 Digits)</label>
                <input
                  type="password"
                  required
                  maxLength={4}
                  placeholder="e.g. 7291"
                  pattern="[0-9]{4}"
                  value={pin}
                  onChange={e => setPin(e.target.value.replace(/\D/g, ''))}
                  className="w-full bg-white border border-gray-200 focus:border-indigo-500 rounded-xl px-3.5 py-2.5 font-mono font-bold text-xs tracking-widest text-gray-900 outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-[9px] font-black uppercase text-gray-400 tracking-wider mb-1">Insurance Coverage</label>
              <select
                value={insuranceTier}
                onChange={e => setInsuranceTier(e.target.value)}
                className="w-full bg-white border border-gray-200 focus:border-indigo-500 rounded-xl px-3.5 py-2.5 font-bold text-xs text-gray-900 outline-none"
              >
                <option value="$100,000 Lloyd's Insured">$100,000 Lloyd's Sweep Vault Guarantee</option>
                <option value="$500,000 Lloyd's Insured">$500,000 Lloyd's Sweep Vault Guarantee</option>
                <option value="$1,000,000 Premium Insured">$1,000,000 Premium Fiduciary Vault Guarantee</option>
              </select>
            </div>

            {formError && (
              <p className="text-xs text-red-600 font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4" /> {formError}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full h-11 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-black text-xs tracking-wide uppercase rounded-xl transition-all flex items-center justify-center gap-2"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirm Asset Deposit'}
            </button>
          </motion.form>
        )}
      </AnimatePresence>

      {/* Asset grid */}
      {assets.length === 0 ? (
        <div className="bg-gray-50/50 rounded-2xl p-8 text-center border-2 border-dashed border-gray-150">
          <ShieldCheck className="w-8 h-8 text-gray-300 mx-auto mb-2" />
          <h4 className="text-xs font-black text-gray-900 uppercase">Vault is Empty</h4>
          <p className="text-[11px] text-gray-400 mt-1">No physical assets deposited yet. Click "Deposit Asset" to begin.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {assets.map(asset => {
            const marketData = marketPrices[asset.assetType];
            const currentPrice = marketData?.price ?? asset.depositedValuePerUnit;
            const currentTotal = currentPrice * asset.quantity;
            const depositedTotal = asset.depositedValuePerUnit * asset.quantity;
            const gain = currentTotal - depositedTotal;
            const gainPct = depositedTotal > 0 ? (gain / depositedTotal) * 100 : 0;
            const isUp = gain >= 0;

            return (
              <motion.div key={asset.id} layout
                className="p-5 rounded-2xl border border-gray-100 bg-gray-50/30 hover:border-indigo-100 hover:bg-indigo-50/10 transition-all"
              >
                {/* Top row */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center flex-shrink-0">
                      <CategoryIcon category={asset.category} />
                    </div>
                    <div>
                      <p className="text-xs font-black text-gray-900 leading-tight">
                        {asset.name || `${asset.assetType} Holdings`}
                      </p>
                      <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">
                        {asset.quantity} {asset.unit} · {asset.assetType}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => { setVacatingAsset(asset); setVacatePin(''); setVacatePinError(false); }}
                    className="text-[10px] font-bold text-gray-300 hover:text-red-500 uppercase tracking-wider transition flex-shrink-0"
                  >
                    Vacate
                  </button>
                </div>

                {/* Value row */}
                <div className="flex items-end justify-between pt-3 border-t border-gray-100">
                  <div>
                    <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">Current Value</p>
                    <p className="text-base font-black text-gray-900">
                      ${currentTotal.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                    </p>
                    <p className="text-[9px] text-gray-400 font-medium">
                      ${currentPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/{asset.unit}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">vs. Deposit</p>
                    <div className={`flex items-center gap-0.5 justify-end ${isUp ? 'text-green-600' : 'text-red-500'}`}>
                      {isUp ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                      <span className="text-sm font-black">{isUp ? '+' : ''}{gainPct.toFixed(2)}%</span>
                    </div>
                    <p className={`text-[9px] font-bold ${isUp ? 'text-green-500' : 'text-red-400'}`}>
                      {isUp ? '+' : '-'}${Math.abs(gain).toLocaleString('en-US', { maximumFractionDigits: 0 })}
                    </p>
                  </div>
                </div>

                {/* Insurance */}
                <div className="mt-3 flex items-center gap-1.5">
                  <ShieldCheck className="w-3 h-3 text-indigo-400 flex-shrink-0" />
                  <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider truncate">{asset.insuranceTier}</span>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Vacate PIN modal */}
      <AnimatePresence>
        {vacatingAsset && (
          <div className="fixed inset-0 bg-gray-950/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-[2.5rem] p-8 w-full max-w-sm border border-gray-150 shadow-2xl space-y-6 text-center"
            >
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Asset Withdrawal</span>
                <button onClick={() => setVacatingAsset(null)} className="text-gray-400 hover:text-gray-600 text-xs font-black uppercase">Close</button>
              </div>
              <div>
                <div className="w-12 h-12 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-3">
                  <KeyRound className="w-6 h-6 animate-pulse" />
                </div>
                <h4 className="text-sm font-black text-gray-900">Vacate Asset</h4>
                <p className="text-[10px] text-gray-400 mt-1 leading-relaxed">
                  Enter your vault PIN to withdraw<br />
                  <span className="font-bold text-gray-700">{vacatingAsset.name || vacatingAsset.assetType}</span>
                </p>
              </div>

              {/* PIN dots */}
              <div className="flex justify-center gap-3">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className={`w-4 h-4 rounded-full border-2 transition-all ${
                    i < vacatePin.length ? 'bg-red-500 border-red-500 scale-110'
                    : vacatePinError ? 'border-red-400 bg-red-100'
                    : 'border-gray-200 bg-gray-50'
                  }`} />
                ))}
              </div>
              {vacatePinError && (
                <p className="text-[10px] text-red-500 font-extrabold uppercase animate-bounce">Incorrect PIN. Try again.</p>
              )}

              {/* Keypad */}
              <div className="grid grid-cols-3 gap-3">
                {['1','2','3','4','5','6','7','8','9'].map(n => (
                  <button key={n} onClick={() => handleVacateDigit(n)}
                    className="h-14 font-mono font-black text-lg text-gray-900 border border-gray-150 bg-gray-50 hover:bg-gray-100 rounded-2xl transition active:scale-95"
                  >{n}</button>
                ))}
                <button onClick={() => setVacatePin('')} className="h-14 font-black text-[10px] uppercase text-gray-400 rounded-2xl">Clear</button>
                <button onClick={() => handleVacateDigit('0')}
                  className="h-14 font-mono font-black text-lg text-gray-900 border border-gray-150 bg-gray-50 hover:bg-gray-100 rounded-2xl transition active:scale-95"
                >0</button>
                <div className="h-14 flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5 text-indigo-400" />
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
