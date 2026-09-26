'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface UseLetrinOptions {
  category?: string;
  tag?: string;
}

export function useLetrin({ category, tag }: UseLetrinOptions = {}) {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [selectedUid, setSelectedUid] = useState<string | null>(null);

  // 🌀 SUTURE REACT QUERY : Récupération avec Filtrage Dynamique (API Unifiée)
  const { data: fonts = [], isLoading: loading } = useQuery({
    queryKey: ['letrin-sprites-hook', category, tag],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (category && category !== 'ALL') params.append('category', category);
      if (tag) params.append('tag', tag);

      const res = await fetch(`/api/letrin/sprites?${params.toString()}`);
      if (!res.ok) throw new Error("Échec de la récupération des sprites Letr'In");
      
      const data = await res.json();
      return Array.isArray(data) ? data : (data.data || []);
    }
  });

  // 🌀 SUTURE REACT QUERY : Sédimentation (Création/Mise à jour)
  const saveMutation = useMutation({
    mutationFn: async ({ payload, fontUid }: { payload: any; fontUid?: string }) => {
      const url = fontUid ? `/api/letrin/sprites/${fontUid}` : '/api/letrin/sprites';
      const method = fontUid ? 'PUT' : 'POST';
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Erreur de sédimentation");
      }
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['letrin-sprites-hook'] });
      queryClient.invalidateQueries({ queryKey: ['lettrin-fonts'] });
      toast.success("✨ Police typographique sédimentée et scellée avec succès !");
    },
    onError: (err: any) => {
      console.error("🔥 Erreur lors de la sédimentation :", err);
      toast.error(`🔥 Échec : ${err.message}`);
    }
  });

  // 🌀 SUTURE REACT QUERY : Dissolution
  const deleteMutation = useMutation({
    mutationFn: async (uid: string) => {
      const res = await fetch(`/api/letrin/sprites/${uid}`, { method: 'DELETE' });
      if (!res.ok) throw new Error("Échec de la désintégration de la police");
      return uid;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['letrin-sprites-hook'] });
      queryClient.invalidateQueries({ queryKey: ['lettrin-fonts'] });
      toast.success("✨ Police dissoute dans le néant matriciel.");
    },
    onError: (err: any) => {
      console.error("🔥 Erreur lors de la suppression de la police :", err);
      toast.error(`🔥 Échec de la suppression : ${err.message}`);
    }
  });

  const handleDelete = (uid: string) => {
    if (!confirm("Es-tu sûr de vouloir dissoudre cette police dans le néant ? Cette action est irréversible.")) return;
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
    saveMutation,
    deleteMutation,
    handleDelete 
  };
}