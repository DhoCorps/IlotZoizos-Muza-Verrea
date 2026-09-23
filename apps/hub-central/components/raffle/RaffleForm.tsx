'use client';

import React, { useState } from 'react';

interface RaffleFormProps {
  onSubmitRaffle: (data: {
    prizeProductUid: string;
    ticketPriceShards: number;
    maxTickets?: number;
    drawDate: string;
  }) => Promise<void>;
  isLoading?: boolean;
}

export function RaffleForm({ onSubmitRaffle, isLoading = false }: RaffleFormProps) {
  const [prizeProductUid, setPrizeProductUid] = useState('');
  const [ticketPriceShards, setTicketPriceShards] = useState<number>(10);
  const [maxTickets, setMaxTickets] = useState<string>('');
  const [drawDate, setDrawDate] = useState('');
  
  // 👁️ État de la stase (Modal de confirmation sévère)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handlePreSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!prizeProductUid.trim() || !drawDate) {
      setErrorMessage("Le contrat exige un artéfact et une date de stase.");
      return;
    }

    // Déclenchement du rituel de confirmation FOMO
    setIsModalOpen(true);
  };

  const handleConfirmSilo = async () => {
    setIsModalOpen(false);
    try {
      await onSubmitRaffle({
        prizeProductUid: prizeProductUid.trim(),
        ticketPriceShards: Number(ticketPriceShards),
        maxTickets: maxTickets ? Number(maxTickets) : undefined,
        drawDate,
      });
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "La Canopée a rejeté la mise en jeu.");
    }
  };

  return (
    <div className="relative border border-amber-900/50 bg-black/80 p-6 text-amber-100 shadow-2xl backdrop-blur-md">
      <div className="absolute -top-3 left-4 bg-amber-950 px-2 text-xs uppercase tracking-widest text-amber-400 border border-amber-800">
        ⚖️ Fondation de Loterie — Sceau du Bordel
      </div>

      {errorMessage && (
        <div className="mb-4 border border-red-600 bg-red-950/50 p-3 text-sm text-red-300">
          🔥 Erreur : {errorMessage}
        </div>
      )}

      <form onSubmit={handlePreSubmit} className="space-y-4">
        <div>
          <label htmlFor="prizeProductUid" className="block text-xs uppercase tracking-wider text-amber-400 mb-1">
            UID du Produit Mis en Jeu
          </label>
          <input
            id="prizeProductUid"
            type="text"
            value={prizeProductUid}
            onChange={(e) => setPrizeProductUid(e.target.value)}
            placeholder="ex: product_uuid_999"
            required
            className="w-full border border-amber-900/60 bg-black px-3 py-2 text-amber-200 placeholder-amber-700/50 focus:border-amber-500 focus:outline-none"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label htmlFor="ticketPriceShards" className="block text-xs uppercase tracking-wider text-amber-400 mb-1">
              Prix du Ticket (Éclats)
            </label>
            <input
              id="ticketPriceShards"
              type="number"
              min="0"
              value={ticketPriceShards}
              onChange={(e) => setTicketPriceShards(Number(e.target.value))}
              required
              className="w-full border border-amber-900/60 bg-black px-3 py-2 text-amber-200 focus:border-amber-500 focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="maxTickets" className="block text-xs uppercase tracking-wider text-amber-400 mb-1">
              Max Tickets (Optionnel)
            </label>
            <input
              id="maxTickets"
              type="number"
              min="1"
              value={maxTickets}
              onChange={(e) => setMaxTickets(e.target.value)}
              placeholder="Illimité si vide"
              className="w-full border border-amber-900/60 bg-black px-3 py-2 text-amber-200 placeholder-amber-700/50 focus:border-amber-500 focus:outline-none"
            />
          </div>
        </div>

        <div>
          <label htmlFor="drawDate" className="block text-xs uppercase tracking-wider text-amber-400 mb-1">
            Date et Heure du Tirage (FOMO)
          </label>
          <input
            id="drawDate"
            type="datetime-local"
            value={drawDate}
            onChange={(e) => setDrawDate(e.target.value)}
            required
            className="w-full border border-amber-900/60 bg-black px-3 py-2 text-amber-200 focus:border-amber-500 focus:outline-none"
          />
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-amber-700 py-3 font-bold uppercase tracking-widest text-black transition-colors hover:bg-amber-600 disabled:opacity-50"
        >
          {isLoading ? "Sédimentation en cours..." : "Sceller le Destin de la Loterie"}
        </button>
      </form>

      {/* ⚠️ MODAL DE CONFIRMATION SÉVÈRE */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4">
          <div className="max-w-md border-2 border-red-600 bg-neutral-950 p-6 text-center shadow-2xl">
            <div className="text-red-500 text-lg font-black uppercase tracking-widest mb-3">
              ⚡ Avertissement Sévère
            </div>
            <p className="text-sm text-neutral-200 mb-6 leading-relaxed">
              &ldquo;La date est gravée dans la Silice. Aucun retour en arrière possible.&rdquo;
            </p>
            <div className="flex justify-center gap-4">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="border border-neutral-700 px-4 py-2 text-xs uppercase text-neutral-400 hover:bg-neutral-800"
              >
                Renoncer
              </button>
              <button
                type="button"
                onClick={handleConfirmSilo}
                className="bg-red-700 px-4 py-2 text-xs font-bold uppercase tracking-wider text-white hover:bg-red-600"
              >
                Graver dans la Silice
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}