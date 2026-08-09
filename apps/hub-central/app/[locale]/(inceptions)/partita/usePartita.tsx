// apps/hub-central/app/[locale]/(inceptions)/partita/usePartita.ts
'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export function usePartita() {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [selectedUid, setSelectedUid] = useState<string | null>(null);

  // 🌀 SUTURE REACT QUERY : Remplacement du useEffect + fetch par useQuery
  const { data: partitions = [], isLoading: loading } = useQuery({
    queryKey: ['partitions'],
    queryFn: async () => {
      const res = await fetch('/api/partitions');
      if (!res.ok) throw new Error("Échec de la récupération des partitions");
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    }
  });

  // 🌀 SUTURE REACT QUERY : Mutation pour la dissolution d'une partition
  const deleteMutation = useMutation({
    mutationFn: async (uid: string) => {
      const res = await fetch(`/api/partitions/${uid}`, { method: 'DELETE' });
      if (!res.ok) throw new Error("Échec de la désintégration");
      return uid;
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

  const handleDelete = (uid: string) => {
    if (!confirm("Es-tu sûr de vouloir dissoudre cette partition dans le néant ?")) return;
    deleteMutation.mutate(uid);
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