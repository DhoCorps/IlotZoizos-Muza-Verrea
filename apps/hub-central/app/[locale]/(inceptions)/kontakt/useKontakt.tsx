// apps/hub-central/app/[locale]/(inceptions)/kontakt/useKontakt.ts
'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { Profile } from '@/components/kontakt/KontaktSwipeDeck';

export type KontaktTab = 'swipe' | 'quests' | 'profiles' | 'my-profile';

export function useKontakt() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<KontaktTab>('swipe');
  const [alignmentFilter, setAlignmentFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');

  // 🛡️ SUTURE REACT QUERY : Récupération des profils Kontakt (avec filtres optionnels supportés par GET /api/kontakt/profiles)
  const { 
    data: profiles = [], 
    isLoading: profilesLoading, 
    error: profilesError 
  } = useQuery<Profile[]>({
    queryKey: ['kontakt-profiles', alignmentFilter, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (alignmentFilter) params.set('alignment', alignmentFilter);
      if (statusFilter) params.set('status', statusFilter);
      const queryString = params.toString();
      const url = queryString ? `/api/kontakt/profiles?${queryString}` : '/api/kontakt/profiles';

      const res = await fetch(url);
      if (!res.ok) throw new Error("Échec de la récupération des profils");
      const data = await res.json();
      return Array.isArray(data) ? data : (data.data || []);
    }
  });

  // 🛡️ SUTURE REACT QUERY : Récupération des quêtes actives
  const { 
    data: quests = [], 
    isLoading: questsLoading, 
    error: questsError 
  } = useQuery<Profile[]>({
    queryKey: ['kontakt-quests'],
    queryFn: async () => {
      const res = await fetch('/api/kontakt/quests');
      if (!res.ok) throw new Error("Échec de la récupération des quêtes");
      const data = await res.json();
      return Array.isArray(data) ? data : (data.data || []);
    }
  });

  const loading = profilesLoading || questsLoading;
  const error = (profilesError as Error)?.message || (questsError as Error)?.message || null;

  const refreshKontakt = () => {
    queryClient.invalidateQueries({ queryKey: ['kontakt-profiles'] });
    queryClient.invalidateQueries({ queryKey: ['kontakt-quests'] });
  };

  return {
    profiles,
    quests,
    loading,
    error,
    activeTab,
    setActiveTab,
    alignmentFilter,
    setAlignmentFilter,
    statusFilter,
    setStatusFilter,
    refreshKontakt
  };
}