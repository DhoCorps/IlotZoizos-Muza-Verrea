// apps/hub-central/components/ecommerce/CartDrawer.tsx
'use client';

import React, { useState } from 'react';
import { ShoppingBag, X, Trash2, Coins, ArrowRight, Loader2, Sparkles } from 'lucide-react';
import { useCartStore } from '@ilot/shared-core'; // ou ton chemin local de store

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CartDrawer({ isOpen, onClose }: CartDrawerProps) {
  const { items, currency, setCurrency, removeItem, clearCart } = useCartStore();
  const [checkingOut, setCheckingOut] = useState(false);

  if (!isOpen) return null;

  // Calcul du montant total selon la devise choisie
  const totalAmount = items.reduce((acc, item) => {
    const price = currency === 'EUR' ? item.priceEUR : item.priceShards;
    return acc + price * item.quantity;
  }, 0);

  const handleCheckout = async () => {
    if (items.length === 0) return;

    try {
      setCheckingOut(true);
      const payload = {
        buyerUid: 'oiseau-souverain', // Sera remplacé par l'ID de session si connecté
        items: items.map(i => ({
          productUid: i.productUid,
          title: i.title,
          quantity: i.quantity,
          pricePaid: currency === 'EUR' ? i.priceEUR : i.priceShards,
          currency: currency
        })),
        totalAmount,
        currency
      };

      const res = await fetch('/api/ecommerce/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (res.ok) {
        alert("✨ Commande validée ! L'artefact est désormais inscrit dans votre grimoire.");
        clearCart();
        onClose();
      } else {
        alert(`🔥 Échec de la transaction : ${data.error || 'Erreur inconnue'}`);
      }
    } catch (err) {
      console.error("Erreur lors du checkout :", err);
    } finally {
      setCheckingOut(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/80 backdrop-blur-md animate-in fade-in">
      <div className="w-full max-w-md bg-[#0A0D14] border-l border-white/10 h-full flex flex-col justify-between p-6 md:p-8 shadow-2xl relative animate-in slide-in-from-right duration-300">
        
        {/* En-tête */}
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-4 border-b border-white/5">
            <div className="flex items-center gap-2">
              <ShoppingBag size={18} className="text-[#E5484D]" />
              <h2 className="text-sm font-black text-white uppercase tracking-widest">Panier de l'Îlot</h2>
            </div>
            <button 
              onClick={onClose}
              className="p-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
            >
              <X size={16} />
            </button>
          </div>

          {/* Sélecteur de Devise */}
          <div className="flex items-center justify-between bg-black/50 border border-white/5 p-1.5 rounded-2xl">
            <button
              onClick={() => setCurrency('EUR')}
              className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
                currency === 'EUR' ? 'bg-[#E5484D] text-white shadow-lg' : 'text-slate-400 hover:text-white'
              }`}
            >
              Euros (€)
            </button>
            <button
              onClick={() => setCurrency('SHARDS')}
              className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
                currency === 'SHARDS' ? 'bg-amber-500 text-black shadow-lg font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              Éclats (Shards)
            </button>
          </div>
        </div>

        {/* Liste des articles */}
        <div className="flex-1 overflow-y-auto py-6 space-y-4 custom-scrollbar">
          {items.map((item) => {
            const itemPrice = currency === 'EUR' ? item.priceEUR : item.priceShards;
            return (
              <div 
                key={item.productUid}
                className="p-4 bg-black/40 border border-white/5 rounded-2xl flex items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <h4 className="text-xs font-black uppercase text-white">{item.title}</h4>
                  <p className="text-[10px] font-mono text-slate-400">
                    Quantité : {item.quantity} × {itemPrice} {currency === 'EUR' ? '€' : 'Éclats'}
                  </p>
                </div>
                <button
                  onClick={() => removeItem(item.productUid)}
                  className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl transition-colors"
                  title="Retirer"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            );
          })}

          {items.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-3 py-20">
              <Sparkles className="w-8 h-8 text-slate-600 animate-pulse" />
              <p className="text-xs font-mono uppercase tracking-widest text-slate-500">
                Votre panier est vide dans cette dimension.
              </p>
            </div>
          )}
        </div>

        {/* Pied de page & Paiement */}
        <div className="space-y-4 pt-4 border-t border-white/5">
          <div className="flex items-center justify-between text-sm font-black">
            <span className="text-slate-400 uppercase text-xs">Total à régler :</span>
            <span className="text-white text-base">
              {totalAmount} {currency === 'EUR' ? '€' : 'Éclats'}
            </span>
          </div>

          <button
            onClick={handleCheckout}
            disabled={checkingOut || items.length === 0}
            className="w-full py-4 bg-[#E5484D] hover:bg-[#c43d41] text-white font-black uppercase text-xs rounded-2xl shadow-[0_0_20px_rgba(229,72,77,0.3)] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {checkingOut ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
            Sceller la Commande
          </button>
        </div>

      </div>
    </div>
  );
}