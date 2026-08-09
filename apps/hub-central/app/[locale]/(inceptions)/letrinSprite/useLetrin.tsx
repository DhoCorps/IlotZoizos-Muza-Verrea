// apps/hub-central/app/[locale]/(inceptions)/letrinSprite/useLetrin.ts
'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export function useLetrin() {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [selectedUid, setSelectedUid] = useState<string | null>(null);

  // 🌀 SUTURE REACT QUERY : Remplacement du useEffect + fetch par useQuery
  const { data: fonts = [], isLoading: loading } = useQuery({
    queryKey: ['letrin-fonts-hook'],
    queryFn: async () => {
      const res = await fetch('/api/letrin');
      if (!res.ok) throw new Error("Échec de la récupération des polices Letr'In");
      const data = await res.json();
      return Array.isArray(data) ? data : (data.data || []);
    }
  });

  // 🌀 SUTURE REACT QUERY : Mutation pour la dissolution d'une police
  const deleteMutation = useMutation({
    mutationFn: async (uid: string) => {
      const res = await fetch(`/api/letrin/${uid}`, { method: 'DELETE' });
      if (!res.ok) throw new Error("Échec de la désintégration de la police");
      return uid;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['letrin-fonts-hook'] });
      queryClient.invalidateQueries({ queryKey: ['lettrin-fonts'] }); // Synchronisation globale du cache si besoin
      toast.success("✨ Police dissoute dans le néant.");
    },
    onError: (err: any) => {
      console.error("🔥 Erreur lors de la suppression de la police :", err);
      toast.error(`🔥 Échec de la suppression : ${err.message}`);
    }
  });

  const handleDelete = (uid: string) => {
    if (!confirm("Es-tu sûr de vouloir dissoudre cette police dans le néant ?")) return;
    deleteMutation.mutate(uid);
  };

  return { 
    session, 
    fonts, 
    loading, 
    activeModal, 
    setActiveModal, 
    selectedUid, 
    setSelectedUid, 
    fetchFonts: () => {
      queryClient.invalidateQueries({ queryKey: ['letrin-fonts-hook'] });
    }, 
    handleDelete 
  };
}