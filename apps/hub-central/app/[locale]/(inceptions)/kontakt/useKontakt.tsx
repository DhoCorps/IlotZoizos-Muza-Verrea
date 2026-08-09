// apps/hub-central/app/[locale]/(inceptions)/kontakt/useKontakt.ts
'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';

export function useKontakt() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'swipe' | 'quests' | 'my-profile'>('swipe');

  // 🌀 SUTURE REACT QUERY : Récupération des profils Kontakt
  const { data: profiles = [], isLoading: profilesLoading } = useQuery({
    queryKey: ['kontakt-profiles'],
    queryFn: async () => {
      const res = await fetch('/api/kontakt/profiles');
      if (!res.ok) throw new Error("Échec de la récupération des profils");
      const data = await res.json();
      return Array.isArray(data) ? data : (data.data || []);
    }
  });

  // 🌀 SUTURE REACT QUERY : Récupération des quêtes
  const { data: quests = [], isLoading: questsLoading } = useQuery({
    queryKey: ['kontakt-quests'],
    queryFn: async () => {
      const res = await fetch('/api/kontakt/quests');
      if (!res.ok) throw new Error("Échec de la récupération des quêtes");
      const data = await res.json();
      return Array.isArray(data) ? data : (data.data || []);
    }
  });

  const loading = profilesLoading || questsLoading;

  const refreshKontakt = () => {
    queryClient.invalidateQueries({ queryKey: ['kontakt-profiles'] });
    queryClient.invalidateQueries({ queryKey: ['kontakt-quests'] });
  };

  return {
    profiles,
    quests,
    loading,
    activeTab,
    setActiveTab,
    refreshKontakt
  };
}