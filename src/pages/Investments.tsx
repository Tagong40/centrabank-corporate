import React, { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot, doc, setDoc, serverTimestamp, deleteDoc, runTransaction } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { Investment, BankAccount } from '../types';
import { TrendingUp, TrendingDown, Plus, Trash2, Loader2, DollarSign, Wallet, ArrowUpRight, BarChart3, HelpCircle, CheckCircle, Info, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const ASSET_TYPES = [
  { id: 'stock', name: 'Stocks', color: 'bg-blue-50 text-blue-600 border-blue-105' },
  { id: 'crypto', name: 'Crypto', color: 'bg-orange-50 text-orange-600 border-orange-105' },
  { id: 'fund', name: 'Index Funds', color: 'bg-emerald-50 text-emerald-600 border-emerald-105' },
];

export default function Investments() {
  const { profile } = useAuth();
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  
  // Form State for Adding
  const [assetType, setAssetType] = useState<'stock' | 'crypto' | 'fund'>('stock');
  const [symbol, setSymbol] = useState('');
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [price, setPrice] = useState('');

  // States for Selling
  const [selectedAssetForSale, setSelectedAssetForSale] = useState<Investment | null>(null);
  const [destinationAccountId, setDestinationAccountId] = useState('');
  const [sellQty, setSellQty] = useState('');
  const [sellingInProgress, setSellingInProgress] = useState(false);
  const [sellError, setSellError] = useState<string | null>(null);

  useEffect(() => {
    if (!profile) return;

    // Listen to Investments
    const q = query(collection(db, 'investments'), where('userId', '==', profile.uid));
    const unsub = onSnapshot(q, (snapshot) => {
      setInvestments(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Investment)));
      setLoading(false);
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'investments'));

    // Listen to Bank Accounts
    const qAccounts = query(collection(db, 'accounts'), where('userId', '==', profile.uid));
    const unsubAccounts = onSnapshot(qAccounts, (snapshot) => {
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as BankAccount));
      setAccounts(data);
      if (data.length > 0 && !destinationAccountId) {
        setDestinationAccountId(data[0].id);
      }
    });

    return () => {
      unsub();
      unsubAccounts();
    };
  }, [profile]);

  const handleAddInvestment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setIsAdding(true);

    try {
      const invId = `INV-${Math.floor(Math.random() * 1000000)}`;
      const numQuantity = parseFloat(quantity);
      const numPrice = parseFloat(price);
      
      await setDoc(doc(db, 'investments', invId), {
        userId: profile.uid,
        assetType,
        symbol: symbol.toUpperCase(),
        name,
        quantity: numQuantity,
        averagePrice: numPrice,
        currentValue: (numQuantity * numPrice) * (1 + (Math.random() * 0.1 - 0.05)), // Simulate slight profit/loss variation
        createdAt: serverTimestamp()
      });

      setSymbol('');
      setName('');
      setQuantity('');
      setPrice('');
      setIsAdding(false);
    } catch (err: any) {
      console.error(err);
      alert("Failed to create investment holding.");
      setIsAdding(false);
    }
  };

  const handleSellAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !selectedAssetForSale) return;
    
    setSellError(null);
    const qtyToSell = parseFloat(sellQty);
    
    if (isNaN(qtyToSell) || qtyToSell <= 0) {
      setSellError("Please enter a valid quantity.");
      return;
    }

    if (qtyToSell > selectedAssetForSale.quantity) {
      setSellError(`You cannot sell more than your current holding of ${selectedAssetForSale.quantity} units.`);
      return;
    }

    const matchedAccount = accounts.find(a => a.id === destinationAccountId);
    if (!matchedAccount) {
      setSellError("Please select a target payout account.");
      return;
    }

    setSellingInProgress(true);

    try {
      // Calculate unit price at current value
      const totalUnits = selectedAssetForSale.quantity;
      const currentPricePerUnit = selectedAssetForSale.currentValue / (totalUnits || 1);
      const totalPayoutProceeds = qtyToSell * currentPricePerUnit;
      
      const txId = doc(collection(db, 'transactions')).id;

      await runTransaction(db, async (transaction) => {
        // Read account
        const accountRef = doc(db, 'accounts', matchedAccount.id);
        const accDoc = await transaction.get(accountRef);
        if (!accDoc.exists()) throw new Error("Payout destination account not found.");
        const currentBalance = accDoc.data().balance;

        // Read investment holding
        const investmentRef = doc(db, 'investments', selectedAssetForSale.id);
        const invDoc = await transaction.get(investmentRef);
        if (!invDoc.exists()) throw new Error("Investment holding reference expired.");

        const existingUnits = invDoc.data().quantity;
        const existingValue = invDoc.data().currentValue;

        if (existingUnits < qtyToSell) throw new Error("Quantity constraint deviation.");

        // Writes
        // 1. Credit target account balance
        transaction.update(accountRef, {
          balance: currentBalance + totalPayoutProceeds,
          lastTransactionId: txId
        });

        // 2. Adjust or delete investment
        const remainingUnits = existingUnits - qtyToSell;
        if (remainingUnits <= 0.0001) {
          transaction.delete(investmentRef);
        } else {
          transaction.update(investmentRef, {
            quantity: remainingUnits,
            currentValue: Math.max(0, existingValue - totalPayoutProceeds)
          });
        }

        // 3. Log a detailed transaction
        const transRef = doc(db, 'transactions', txId);
        transaction.set(transRef, {
          fromAccountId: 'investments',
          fromUserId: 'investments',
          toAccountId: matchedAccount.id,
          toUserId: profile.uid,
          toAccountNumber: matchedAccount.accountNumber,
          amount: totalPayoutProceeds,
          description: `Liquidated position: Sold ${qtyToSell} ${selectedAssetForSale.symbol}`,
          status: 'completed',
          type: 'internal',
          lastTransactionId: txId,
          timestamp: serverTimestamp()
        });
      });

      setSelectedAssetForSale(null);
      setSellQty('');
    } catch (err: any) {
      console.error(err);
      setSellError(err.message || "Failed to process asset sale.");
    } finally {
      setSellingInProgress(false);
    }
  };

  const totalPortfolioValue = investments.reduce((acc, inv) => acc + inv.currentValue, 0);
  const totalCostBasis = investments.reduce((acc, inv) => acc + (inv.quantity * inv.averagePrice), 0);
  const totalProfit = totalPortfolioValue - totalCostBasis;
  const profitPercentage = totalCostBasis > 0 ? (totalProfit / totalCostBasis) * 100 : 0;

  if (loading) return (
    <div className="flex items-center justify-center p-12 pt-24">
      <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto px-4 py-12 pt-24">
      
      {/* Header Info Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
        <div>
          <h1 className="text-4xl font-black text-gray-900 tracking-tight mb-2">Liquid Assets Portfolio</h1>
          <p className="text-gray-500 font-medium italic">Track corporate equity margins, crypto caches, and index funds securely. Liquidate anytime to balance sheets.</p>
        </div>
        
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-6">
          <div className="text-right">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Portfolio Worth</p>
            <p className="text-3xl font-black text-indigo-600">${totalPortfolioValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
          </div>
          <div className={`px-4 py-2 rounded-2xl flex items-center gap-2 font-bold text-sm ${totalProfit >= 0 ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
            {totalProfit >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            {Math.abs(profitPercentage).toFixed(2)}%
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Holdings Catalog (Left Column: 2/3 width) */}
        <div className="lg:col-span-2 space-y-6">
          <AnimatePresence mode="popLayout">
            {investments.length === 0 ? (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-white rounded-3xl p-12 border-2 border-dashed border-gray-100 flex flex-col items-center text-center"
              >
                <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mb-4">
                  <BarChart3 className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">No active investments found</h3>
                <p className="text-gray-500 mb-6 max-w-xs text-xs font-semibold leading-relaxed">Grow liquidity bounds by logging acquisition positions using the form to the right.</p>
              </motion.div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {investments.map((inv) => {
                  const profit = inv.currentValue - (inv.quantity * inv.averagePrice);
                  const isProfit = profit >= 0;
                  const typeStyles = ASSET_TYPES.find(t => t.id === inv.assetType);
                  
                  return (
                    <motion.div
                      key={inv.id}
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-all group"
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-3">
                          <div className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase ${typeStyles?.color}`}>
                            {inv.assetType}
                          </div>
                          <h4 className="font-black text-gray-900">{inv.symbol}</h4>
                        </div>
                        
                        {/* Sell position activator */}
                        <button 
                          onClick={() => {
                            setSelectedAssetForSale(inv);
                            setSellQty(inv.quantity.toString());
                            setSellError(null);
                          }}
                          className="text-[10px] font-black uppercase tracking-wider text-indigo-650 hover:text-white bg-indigo-50 hover:bg-indigo-600 rounded-lg py-1 px-2.5 transition-all"
                        >
                          Sell Position
                        </button>
                      </div>

                      <div className="mb-6">
                        <p className="text-xs text-gray-500 font-medium mb-1">{inv.name}</p>
                        <div className="flex items-baseline gap-2">
                          <p className="text-2xl font-black text-gray-900">${inv.currentValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                          <span className={`text-xs font-bold ${isProfit ? 'text-green-600' : 'text-red-600'}`}>
                            {isProfit ? '+' : ''}{profit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-50">
                        <div>
                          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1">Shares Custodied</p>
                          <p className="text-sm font-bold text-gray-900">{inv.quantity.toLocaleString(undefined, { maximumFractionDigits: 6 })}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1">Buy Price Avg</p>
                          <p className="text-sm font-bold text-gray-900">${inv.averagePrice.toLocaleString()}</p>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </AnimatePresence>
        </div>

        {/* Add Asset Form Panel (Right Column: 1/3 width) */}
        <div className="space-y-6">
          <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm sticky top-28">
            <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-3 uppercase tracking-tight">
              <Plus className="w-6 h-6 text-indigo-600 animate-pulse" />
              Acquire Holding
            </h3>
            
            <form onSubmit={handleAddInvestment} className="space-y-4">
              <div className="grid grid-cols-3 gap-2">
                {ASSET_TYPES.map(type => (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => setAssetType(type.id as any)}
                    className={`py-2 rounded-xl text-[10px] font-black uppercase tracking-tight transition-all border-2 ${
                      assetType === type.id 
                        ? 'bg-indigo-600 border-indigo-600 text-white' 
                        : 'bg-white border-gray-100 text-gray-400 hover:border-gray-200'
                    }`}
                  >
                    {type.name}
                  </button>
                ))}
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">Asset Symbol</label>
                <input 
                  type="text" 
                  value={symbol}
                  onChange={e => setSymbol(e.target.value)}
                  placeholder="e.g. AAPL, BRK.B, BTC"
                  required
                  className="w-full bg-gray-50 border-2 border-transparent focus:border-indigo-500 focus:bg-white rounded-2xl px-4 py-3 font-bold text-xs transition-all outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">Asset Name</label>
                <input 
                  type="text" 
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g. Apple Inc Corporate Common stock"
                  required
                  className="w-full bg-gray-50 border-2 border-transparent focus:border-indigo-500 focus:bg-white rounded-2xl px-4 py-3 font-bold text-xs transition-all outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">Quantity</label>
                  <input 
                    type="number" 
                    step="0.000001"
                    value={quantity}
                    onChange={e => setQuantity(e.target.value)}
                    placeholder="0.00"
                    required
                    className="w-full bg-gray-50 border-2 border-transparent focus:border-indigo-500 focus:bg-white rounded-2xl px-4 py-3 font-bold text-xs transition-all outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">Avg Price ($)</label>
                  <input 
                    type="number" 
                    step="0.01"
                    value={price}
                    onChange={e => setPrice(e.target.value)}
                    placeholder="0.00"
                    required
                    className="w-full bg-gray-50 border-2 border-transparent focus:border-indigo-500 focus:bg-white rounded-2xl px-4 py-3 font-bold text-xs transition-all outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isAdding}
                className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-2xl font-bold text-xs tracking-wider uppercase transition-all flex items-center justify-center gap-2 mt-4"
              >
                {isAdding ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-4 h-4" />}
                Add Asset Position
              </button>
            </form>
          </div>
        </div>

      </div>

      {/* Sell Asset Payout Modal Overlay */}
      <AnimatePresence>
        {selectedAssetForSale && (
          <div className="fixed inset-0 bg-gray-950/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-[2.5rem] p-8 w-full max-w-lg border border-gray-150 shadow-2xl space-y-6"
            >
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-black text-indigo-700 uppercase tracking-widest flex items-center gap-1.5 border border-indigo-100 bg-indigo-50 py-1 px-2.5 rounded-lg">
                  <DollarSign className="w-3.5 h-3.5" />
                  Asset Liquidation Drawer
                </span>
                <button 
                  onClick={() => setSelectedAssetForSale(null)}
                  className="text-gray-400 hover:text-gray-650 text-xs font-black uppercase"
                >
                  Close
                </button>
              </div>

              <div>
                <h4 className="text-xl font-black text-gray-900 leading-tight">
                  Sell Positions of {selectedAssetForSale.symbol}
                </h4>
                <p className="text-xs text-gray-400 uppercase font-bold tracking-wider mt-0.5">
                  {selectedAssetForSale.name}
                </p>
              </div>

              <form onSubmit={handleSellAsset} className="space-y-4">
                
                {/* Select target payout Account */}
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase mb-2">
                    Send Liquidity Proceeds To
                  </label>
                  {accounts.length === 0 ? (
                    <div className="p-3 bg-red-50 text-red-700 text-xs font-semibold rounded-xl flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      Must have at least one open bank account to deposit liquidation proceeds.
                    </div>
                  ) : (
                    <select
                      value={destinationAccountId}
                      onChange={e => setDestinationAccountId(e.target.value)}
                      className="w-full bg-gray-50 border-2 border-transparent focus:border-indigo-650 rounded-2xl px-4 py-3 font-bold text-xs text-gray-900 outline-none"
                    >
                      {accounts.map(acc => (
                        <option key={acc.id} value={acc.id}>
                          {acc.accountName} ({acc.accountNumber}) — {acc.balance.toLocaleString('en-US', { style: 'currency', currency: acc.currency })}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Quantity to sell */}
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase mb-2">
                      Holding Quantity to sell (Max: {selectedAssetForSale.quantity})
                    </label>
                    <div className="relative">
                      <input 
                        type="number"
                        step="0.000001"
                        max={selectedAssetForSale.quantity}
                        required
                        value={sellQty}
                        onChange={e => {
                          setSellQty(e.target.value);
                          setSellError(null);
                        }}
                        className="w-full bg-gray-50 border-2 border-transparent focus:border-indigo-650 rounded-2xl pl-4 pr-16 py-3 font-bold text-xs text-gray-900 outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setSellQty(selectedAssetForSale.quantity.toString())}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] bg-indigo-50 border border-indigo-200 text-indigo-700 font-extrabold px-2 py-1 rounded hover:bg-indigo-100 transition"
                      >
                        Sell All
                      </button>
                    </div>
                  </div>

                  {/* Calculated return value */}
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase mb-2">
                      Estimated Return (USD)
                    </label>
                    <div className="h-11 flex items-center bg-green-50/60 border border-green-100 px-4 rounded-xl font-mono font-black text-green-700 text-sm">
                      ${( parseFloat(sellQty || '0') * (selectedAssetForSale.currentValue / (selectedAssetForSale.quantity || 1)) ).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                </div>

                {sellError && (
                  <div className="p-3 bg-red-50 text-red-700 border border-red-100 rounded-xl text-xs font-semibold flex items-start gap-2">
                    <AlertCircle className="w-4.5 h-4.5 shrink-0 mt-0.5" />
                    <span>{sellError}</span>
                  </div>
                )}

                <div className="bg-indigo-50/50 p-3 rounded-xl border border-indigo-100 flex items-start gap-2.5">
                  <Info className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                  <p className="text-[10px] text-indigo-900 leading-normal font-semibold">
                    Settlements execute in standard business clearing cycles. The proceeds will be added to your selected ledger balance immediately upon audit check confirmation.
                  </p>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={sellingInProgress || accounts.length === 0}
                    className="w-full h-12 bg-indigo-605 hover:bg-indigo-750 disabled:opacity-50 text-white font-bold text-xs tracking-wide uppercase rounded-xl transition flex items-center justify-center gap-2"
                  >
                    {sellingInProgress ? (
                      <>
                        <Loader2 className="w-4.5 h-4.5 animate-spin" />
                        Auditing Position & crediting ledger...
                      </>
                    ) : (
                      <>
                        <ArrowUpRight className="w-4.5 h-4.5" />
                        Execute Position Liquidation Sweep
                      </>
                    )}
                  </button>
                </div>

              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
