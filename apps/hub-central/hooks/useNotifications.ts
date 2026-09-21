'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export function useNotifications() {
  const queryClient = useQueryClient();

  // 1. Récupération des notifications et du compteur non-lu
  const { data: responseData, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const res = await fetch('/api/notifications');
      if (!res.ok) throw new Error("Échec de la récupération des notifications.");
      const data = await res.json();
      return data;
    },
    refetchInterval: 15000, // Actualisation périodique pour suivre les flux en direct
  });

  const notifications = responseData?.data || [];
  const unreadCount = responseData?.unreadCount || 0;

  // 2. Mutation pour marquer les notifications comme lues (Apaisement des échos)
  const markAsReadMutation = useMutation({
    mutationFn: async (notificationUids: string[]) => {
      const res = await fetch('/api/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'MARK_READ', notificationUids }),
      });
      if (!res.ok) throw new Error("Échec de l'apaisement des échos.");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
    onError: (err: Error) => {
      console.error("Erreur lors de la lecture des notifications :", err);
      toast.error(`Ineptie technique : ${err.message}`);
    },
  });

  // 3. Mutation pour configurer le rythme du Digest (Canopée Tampon)
  const updateDigestMutation = useMutation({
    mutationFn: async ({ targetUid, mode, digestHour }: { targetUid: string; mode: 'REALTIME' | 'DIGEST' | 'ZEN'; digestHour?: number }) => {
      const res = await fetch('/api/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'UPDATE_DIGEST', targetUid, mode, digestHour }),
      });
      if (!res.ok) throw new Error("Échec de la configuration du Digest.");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast.success("Le rythme de la Canopée a été ajusté avec succès.");
    },
    onError: (err: Error) => {
      console.error("Erreur lors de la configuration du Digest :", err);
      toast.error(`Ineptie technique : ${err.message}`);
    },
  });

  return {
    notifications,
    unreadCount,
    isLoading,
    markAsRead: markAsReadMutation.mutate,
    isMarkingRead: markAsReadMutation.isPending,
    updateDigest: updateDigestMutation.mutate,
    isUpdatingDigest: updateDigestMutation.isPending,
  };
}