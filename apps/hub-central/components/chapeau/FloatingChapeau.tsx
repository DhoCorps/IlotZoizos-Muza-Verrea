// apps/hub-central/components/FloatingChapeau.tsx
'use client';

import React, { useState } from 'react';
import { Sparkles, Loader2, Send, ArrowRightLeft } from 'lucide-react';
import { useChapeau } from '@/context/ChapeauContext';

export function FloatingChapeau() {
  const { chapeauData } = useChapeau();
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<'tip' | 'exchange'>('tip');
  const [isLoading, setIsLoading] = useState(false);

  // Gestion dynamique du montant du pourboire (en centimes)
  const [selectedAmountCents, setSelectedAmountCents] = useState<number>(150);
  const [customAmount, setCustomAmount] = useState<string>('');
  
  // Objet sélectionné pour le troc
  const [selectedItemUid, setSelectedItemUid] = useState('item_mon_objet_1');

  const presetAmounts = [
    { label: '1 €', value: 100 },
    { label: '2 €', value: 200 },
    { label: '5 €', value: 500 },
  ];

  const handleQuickTip = async () => {
    setIsLoading(true);
    try {
      const amountToProcess = customAmount ? Math.round(parseFloat(customAmount) * 100) : selectedAmountCents;

      if (isNaN(amountToProcess) || amountToProcess <= 0) {
        throw new Error("Veuillez indiquer un montant valide.");
      }

      const response = await fetch('/api/payments/transaction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transactionUid: `tx_tip_${Date.now()}`,
          recipientUid: chapeauData.recipientUid,
          amountCents: amountToProcess,
          currency: 'EUR',
          storeUid: chapeauData.storeUid,
          description: `Soutien pour : ${chapeauData.targetTitle}`
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Erreur lors du transfert');

      alert(`🎩 Don de ${(amountToProcess / 100).toFixed(2)}€ envoyé avec succès à ${chapeauData.recipientPseudo} !`);
      setIsOpen(false);
      setCustomAmount('');
    } catch (error: any) {
      alert(`[Erreur Kompta] : ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleItemExchange = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/payments/exchange', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          exchangeUid: `ex_${Date.now()}`,
          recipientUid: chapeauData.recipientUid,
          offeredItemUid: selectedItemUid,
          targetTitle: chapeauData.targetTitle,
          description: `Troc universel en échange de : ${chapeauData.targetTitle}`
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Erreur lors du troc');

      alert(`📦 Troc scellé dans la matrice ! Votre objet a été transmis à ${chapeauData.recipientPseudo}.`);
      setIsOpen(false);
    } catch (error: any) {
      alert(`[Erreur Troc] : ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      {isOpen && (
        <div className="mb-3 w-80 rounded-2xl border border-amber-500/30 bg-slate-900/95 p-4 shadow-2xl backdrop-blur-md transition-all animate-in fade-in slide-in-from-bottom-3">
          <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-800">
            <span className="text-xs font-semibold tracking-wider text-amber-400 uppercase flex items-center gap-1.5">
              <Sparkles size={14} /> Chapeau — {chapeauData.recipientPseudo}
            </span>
            <button 
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-white text-sm px-1.5 py-0.5 rounded-md hover:bg-slate-800"
            >
              ✕
            </button>
          </div>

          {/* Sélecteur de mode : Soutien Kompta ou Troc d'objet */}
          <div className="flex rounded-xl bg-slate-800 p-1 mb-4 text-xs font-medium">
            <button
              onClick={() => setMode('tip')}
              className={`flex-1 rounded-lg py-1.5 transition-colors flex items-center justify-center gap-1.5 ${mode === 'tip' ? 'bg-amber-500 text-slate-950 font-bold shadow' : 'text-slate-300 hover:text-white'}`}
            >
              <Send size={12} /> Soutenir (€)
            </button>
            <button
              onClick={() => setMode('exchange')}
              className={`flex-1 rounded-lg py-1.5 transition-colors flex items-center justify-center gap-1.5 ${mode === 'exchange' ? 'bg-amber-500 text-slate-950 font-bold shadow' : 'text-slate-300 hover:text-white'}`}
            >
              <ArrowRightLeft size={12} /> Troc (📦)
            </button>
          </div>

          {mode === 'tip' ? (
            <div className="space-y-3">
              <p className="text-xs text-slate-400">
                Tu consultes <span className="text-amber-300 font-medium">"{chapeauData.targetTitle}"</span>. Envoie un signal de soutien direct à l'auteur.
              </p>

              {/* Boutons de sélection rapide du montant */}
              <div className="grid grid-cols-3 gap-2">
                {presetAmounts.map((preset) => (
                  <button
                    key={preset.value}
                    onClick={() => {
                      setSelectedAmountCents(preset.value);
                      setCustomAmount('');
                    }}
                    className={`rounded-xl py-1.5 text-xs font-mono font-bold transition-all border ${selectedAmountCents === preset.value && !customAmount ? 'bg-amber-500/20 border-amber-500 text-amber-300' : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'}`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>

              {/* Champ pour montant personnalisé */}
              <div>
                <input
                  type="number"
                  step="0.50"
                  min="0.50"
                  placeholder="Montant libre en €..."
                  value={customAmount}
                  onChange={(e) => setCustomAmount(e.target.value)}
                  className="w-full rounded-xl bg-slate-800 border border-slate-700 px-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500 font-mono"
                />
              </div>

              <button 
                onClick={handleQuickTip}
                disabled={isLoading}
                className="w-full rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold py-2.5 text-xs transition-colors shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 size={14} className="animate-spin" /> Transmission...
                  </>
                ) : (
                  `Offrir ${customAmount ? `${customAmount} €` : `${selectedAmountCents / 100} €`} à ${chapeauData.recipientPseudo}`
                )}
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-slate-400">
                Échange un objet ou une création de ton inventaire contre <span className="text-amber-300 font-medium">"{chapeauData.targetTitle}"</span>.
              </p>
              
              <div>
                <label className="block text-[10px] text-slate-400 mb-1">Sélectionner dans votre inventaire :</label>
                <select 
                  value={selectedItemUid}
                  onChange={(e) => setSelectedItemUid(e.target.value)}
                  className="w-full rounded-xl bg-slate-800 border border-slate-700 px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                >
                  <option value="item_mon_objet_1">🎨 Toile / Œuvre #1 (Votre Nid)</option>
                  <option value="item_ma_police_2">✒️ Police Typographique LeTrin</option>
                  <option value="item_mon_vinyle_3">🎵 Partition Partita inédite</option>
                </select>
              </div>

              <button 
                onClick={handleItemExchange}
                disabled={isLoading}
                className="w-full rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold py-2.5 text-xs transition-colors shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 size={14} className="animate-spin" /> Scellement...
                  </>
                ) : (
                  `Troc vers ${chapeauData.recipientPseudo}`
                )}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Le Bouton Flottant Principal */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="group relative flex items-center gap-3 rounded-full bg-slate-900/90 border border-amber-500/50 px-4 py-3 text-amber-400 shadow-2xl backdrop-blur-md hover:bg-slate-800 transition-all duration-300 hover:scale-105 animate-bounce-subtle"
        title="Ouvrir le Chapeau contextuel"
      >
        <span className="text-2xl transition-transform duration-300 group-hover:rotate-12">🎩</span>
        <div className="flex flex-col text-left">
          <span className="text-xs font-bold text-slate-100 group-hover:text-amber-300 transition-colors">Le Chapeau</span>
          <span className="text-[10px] text-slate-400 truncate max-w-[110px]">Pour {chapeauData.recipientPseudo}</span>
        </div>
        <span className="absolute -inset-0.5 rounded-full bg-amber-500/20 blur opacity-75 group-hover:opacity-100 transition duration-300 -z-10 animate-pulse"></span>
      </button>
    </div>
  );
}