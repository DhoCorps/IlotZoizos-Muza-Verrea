// apps/hub-central/app/[locale]/(inceptions)/partita/usePartita.ts
'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface UsePartitaFilters {
  instrument?: string | null;
  status?: string | null;
}

export function usePartita(filters?: UsePartitaFilters) {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [selectedUid, setSelectedUid] = useState<string | null>(null);

  // 🌀 SUTURE REACT QUERY : Route avec prise en charge des filtres optionnels (Instrument / Statut)
  const queryKey = ['partitions', filters?.instrument || 'all', filters?.status || 'all'];

  const { data: partitions = [], isLoading: loading } = useQuery({
    queryKey,
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.instrument) params.append('instrument', filters.instrument);
      if (filters?.status) params.append('status', filters.status);

      const url = `/api/partita${params.toString() ? `?${params.toString()}` : ''}`;
      const res = await fetch(url);
      
      if (!res.ok) throw new Error("Échec de la récupération des partitions");
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    }
  });

  // 🌀 SUTURE REACT QUERY : Mutation pour la dissolution d'une partition sur /api/partita/[slug]
  const deleteMutation = useMutation({
    mutationFn: async (uidOrSlug: string) => {
      const res = await fetch(`/api/partita/${uidOrSlug}`, { method: 'DELETE' });
      if (!res.ok) throw new Error("Échec de la désintégration");
      return uidOrSlug;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partitions'] });
      toast.success("✨ Partition dissoute dans le néant.");
    },
    onError: (err: any) => {
      console.error("🔥 Erreur lors de la suppression de la partition :", err);
      toast.error(`🔥 Échec de la suppression : ${err.message}`);
    }
  });

  const handleDelete = (uidOrSlug: string) => {
    if (!confirm("Es-tu sûr de vouloir dissoudre cette partition dans le néant ?")) return;
    deleteMutation.mutate(uidOrSlug);
  };

  return { 
    session, 
    partitions, 
    loading, 
    activeModal, 
    setActiveModal, 
    selectedUid, 
    setSelectedUid, 
    fetchPartitions: () => queryClient.invalidateQueries({ queryKey: ['partitions'] }), 
    handleDelete 
  };
}