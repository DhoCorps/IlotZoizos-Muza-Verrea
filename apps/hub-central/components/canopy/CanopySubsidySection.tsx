'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export interface Subsidy {
  _id: string;
  uid?: string;
  title: string;
  motivation: string;
  requestedAmount: number;
  currency: 'TOX' | 'DHO';
  voteCount: number;
  status: string;
  isRented: boolean;
}

interface CanopySubsidySectionProps {
  initialSubsidies?: Subsidy[];
}

export const CanopySubsidySection: React.FC<CanopySubsidySectionProps> = ({ initialSubsidies = [] }) => {
  const queryClient = useQueryClient();

  // État local du formulaire
  const [title, setTitle] = useState('');
  const [motivation, setMotivation] = useState('');
  const [requestedAmount, setRequestedAmount] = useState(100);
  const [currency, setCurrency] = useState<'TOX' | 'DHO'>('TOX');
  const [isRented, setIsRented] = useState(false);

  // État pour le module de commentaires (Débattre)
  const [activeCommentId, setActiveCommentId] = useState<string | null>(null);

  // 🌿 1. Fetch hydraté (TanStack Query) pour le SSR
  const { data: subsidies = [] } = useQuery<Subsidy[]>({
    queryKey: ['canopy-subsidies'],
    queryFn: async () => {
      const res = await fetch('/api/canopy/subsidy');
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error("Erreur de chargement");
      return data.subsidies;
    },
    initialData: initialSubsidies,
    staleTime: 1000 * 60 * 5, // Cache de 5 minutes
  });

  // ✨ 2. Mutation pour le Dépôt
  const createMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch('/api/canopy/subsidy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur lors du dépôt.');
      return data;
    },
    onSuccess: () => {
      toast.success('Dossier de subvention enregistré dans la canopée ! 🦅');
      queryClient.invalidateQueries({ queryKey: ['canopy-subsidies'] });
      setTitle('');
      setMotivation('');
    },
    onError: (err: Error) => {
      toast.error(`⚠️ ${err.message}`);
    }
  });

  // ✨ 3. Mutation pour le Vote avec OPTIMISTIC UPDATE
  const voteMutation = useMutation({
    mutationFn: async (subsidyId: string) => {
      const res = await fetch('/api/canopy/subsidy/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subsidyId })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur lors du vote.');
      return data;
    },
    onMutate: async (subsidyId: string) => {
      // 1. Annuler les refetchs en cours pour ne pas écraser l'optimistic update
      await queryClient.cancelQueries({ queryKey: ['canopy-subsidies'] });

      // 2. Sauvegarder l'ancienne liste dans un snapshot pour un éventuel rollback
      const previousSubsidies = queryClient.getQueryData<Subsidy[]>(['canopy-subsidies']);

      // 3. Mettre à jour immédiatement le cache local (Incrémentation instantanée du vote)
      queryClient.setQueryData<Subsidy[]>(['canopy-subsidies'], (old = []) =>
        old.map(sub => 
          (sub.uid === subsidyId || sub._id === subsidyId)
            ? { ...sub, voteCount: sub.voteCount + 1 }
            : sub
        )
      );

      return { previousSubsidies };
    },
    onError: (err: Error, _subsidyId, context: any) => {
      // En cas d'échec réseau, on restaure l'ancien état (rollback)
      if (context?.previousSubsidies) {
        queryClient.setQueryData(['canopy-subsidies'], context.previousSubsidies);
      }
      toast.error(`⚠️ ${err.message}`);
    },
    onSuccess: () => {
      toast.success('Vote enregistré avec succès ! 🗳️');
    },
    onSettled: () => {
      // Synchroniser définitivement le cache avec le serveur après coup
      queryClient.invalidateQueries({ queryKey: ['canopy-subsidies'] });
    }
  });

  const handleCreateSubsidy = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({ title, motivation, requestedAmount, currency, isRented });
  };

  return (
    <div className="max-w-5xl mx-auto mt-16 space-y-8">
      <div className="border-t border-slate-800 pt-10">
        <h2 className="text-2xl font-bold flex items-center gap-3 mb-2">
          <span>🗳️</span> Le Guichet des Subventions de la Canopée
        </h2>
        <p className="text-slate-400 text-sm">
          Plébiscitez les projets de la communauté ou déposez votre propre dossier pour le tirage au sort mensuel.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Formulaire de dépôt */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl h-fit">
          <h3 className="text-lg font-bold mb-4 text-amber-400">Déposer un dossier</h3>
          <form onSubmit={handleCreateSubsidy} className="space-y-4">
            <div>
              <label htmlFor="titleInput" className="block text-xs font-medium text-slate-300 mb-1">Titre du Projet</label>
              <input 
                id="titleInput"
                type="text" 
                className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm text-white"
                value={title}
                onChange={e => setTitle(e.target.value)}
                required
              />
            </div>
            
            <div>
              <label htmlFor="motivationInput" className="block text-xs font-medium text-slate-300 mb-1">Motivation / Description</label>
              <textarea 
                id="motivationInput"
                className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm text-white h-24"
                value={motivation}
                onChange={e => setMotivation(e.target.value)}
                required
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="amountInput" className="block text-xs font-medium text-slate-300 mb-1">Montant</label>
                <input 
                  id="amountInput"
                  type="number" 
                  className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm text-white"
                  value={requestedAmount}
                  onChange={e => setRequestedAmount(Number(e.target.value))}
                  min={1}
                  required
                />
              </div>
              <div>
                <label htmlFor="currencySelect" className="block text-xs font-medium text-slate-300 mb-1">Devise</label>
                <select 
                  id="currencySelect"
                  className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm text-white"
                  value={currency}
                  onChange={e => setCurrency(e.target.value as any)}
                >
                  <option value="TOX">TôX</option>
                  <option value="DHO">DhÔ</option>
                </select>
              </div>
            </div>
            
            <div className="flex items-center gap-2 pt-2">
              <input 
                type="checkbox" 
                id="isRented"
                checked={isRented}
                onChange={e => setIsRented(e.target.checked)}
                className="rounded bg-slate-800 border-slate-700 text-indigo-600"
              />
              <label htmlFor="isRented" className="text-xs text-slate-300 cursor-pointer">
                Option Rente Échelonnée (si éligible)
              </label>
            </div>

            <button
              type="submit"
              disabled={createMutation.isPending}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2 px-4 rounded transition-all shadow-lg mt-2 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {createMutation.isPending ? "Scellement..." : "Soumettre au Guichet 🦅"}
            </button>
          </form>
        </div>

        {/* Liste des dossiers en cours de plébiscite */}
        <div className="lg:col-span-2 space-y-4">
          <h3 className="text-lg font-bold text-slate-200">Dossiers en lice ({subsidies.length})</h3>
          {subsidies.length === 0 ? (
            <div className="bg-slate-900/50 border border-slate-800/80 rounded-2xl p-8 text-center text-slate-500 text-sm">
              Aucun dossier déposé pour l'instant. Soyez le premier oiseau à soumettre une initiative !
            </div>
          ) : (
            <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
              {subsidies.map(sub => {
                const subId = sub.uid || sub._id;
                return (
                  <div key={subId} className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col justify-between gap-4">
                    <div>
                      <div className="flex justify-between items-start">
                        <h4 className="font-bold text-white text-base">{sub.title}</h4>
                        <span className="text-xs font-mono px-2 py-0.5 bg-indigo-950 border border-indigo-800 text-indigo-300 rounded">
                          {sub.requestedAmount} {sub.currency}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-2 leading-relaxed">{sub.motivation}</p>
                    </div>
                    
                    <div className="flex justify-between items-center pt-3 border-t border-slate-800 text-xs">
                      <span className="text-amber-400 font-medium">🔥 Plébiscite : {sub.voteCount} votes</span>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => setActiveCommentId(activeCommentId === subId ? null : subId)}
                          className={`px-3 py-1.5 rounded transition-all border ${activeCommentId === subId ? 'bg-slate-700 text-white border-slate-600' : 'bg-transparent text-slate-400 hover:text-white border-slate-700 hover:bg-slate-800'}`}
                        >
                          Débattre 💬
                        </button>
                        
                        <button
                          onClick={() => voteMutation.mutate(subId)}
                          disabled={voteMutation.isPending}
                          className="bg-slate-800 hover:bg-slate-700 text-white px-3 py-1.5 rounded transition-all border border-slate-700 disabled:opacity-50"
                        >
                          Voter 🗳️
                        </button>
                      </div>
                    </div>

                    {activeCommentId === subId && (
                      <div className="mt-4 p-4 bg-slate-950 border border-slate-800 rounded-lg animate-in fade-in slide-in-from-top-2 duration-300">
                        <p className="text-xs text-slate-500 mb-2 font-mono uppercase tracking-wider">Interface UniversalComment (Cible: SUBSIDY)</p>
                        <div className="h-16 border border-dashed border-slate-700 flex items-center justify-center text-xs text-slate-600 rounded">
                          Composant UniversalComment injecté ici
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};