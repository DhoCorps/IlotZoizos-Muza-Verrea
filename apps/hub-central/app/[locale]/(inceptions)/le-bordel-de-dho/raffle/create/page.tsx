'use client';

import React from 'react';
import { RaffleForm } from '@/components/raffle/RaffleForm';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useMutation, useQueryClient } from '@tanstack/react-query';

export default function CreateRafflePage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  // 🌀 SUTURE REACT QUERY : Mutation pour la sédimentation sécurisée de la loterie
  const createRaffleMutation = useMutation({
    mutationFn: async (data: {
      prizeProductUid: string;
      ticketPriceShards: number;
      maxTickets?: number;
      drawDate: string;
    }) => {
      const res = await fetch('/api/raffles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const json = await res.json();
      if (!json.success) {
        throw new Error(json.error || "Échec de la sédimentation de la loterie.");
      }
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketplace'] });
      toast.success("Loterie sédimentée avec succès dans la Canopée.");
      router.push('/marketplace');
    },
    onError: (err: any) => {
      toast.error(`Erreur : ${err.message}`);
    }
  });

  const handleCreateRaffle = async (data: {
    prizeProductUid: string;
    ticketPriceShards: number;
    maxTickets?: number;
    drawDate: string;
  }) => {
    await createRaffleMutation.mutateAsync(data);
  };

  return (
    <div className="space-y-6">
      <div className="p-6 bg-black/40 border border-white/5 rounded-3xl backdrop-blur-xl">
        <p className="text-xs font-mono text-slate-400 leading-relaxed">
          Associe un artefact de ton catalogue à une loterie souveraine. Fixe la valeur des tickets en éclats et choisis la date fatidique. Une fois gravée dans la Silice, aucun retour en arrière n'est permis.
        </p>
      </div>

      <RaffleForm 
        onSubmitRaffle={handleCreateRaffle} 
        isLoading={createRaffleMutation.isPending} 
      />
    </div>
  );
}