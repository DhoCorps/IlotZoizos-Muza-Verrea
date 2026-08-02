// apps/hub-central/app/[locale]/(inceptions)/kontakt/useKontakt.ts
'use client';

import { useState, useEffect, useCallback } from 'react';

export function useKontakt() {
  const [profiles, setProfiles] = useState<any[]>([]);
  const [quests, setQuests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'swipe' | 'quests' | 'my-profile'>('swipe');

  const fetchKontaktData = useCallback(async () => {
    setLoading(true);
    try {
      const [resProfiles, resQuests] = await Promise.all([
        fetch('/api/kontakt/profiles'),
        fetch('/api/kontakt/quests')
      ]);
      
      if (resProfiles.ok) {
        const data = await resProfiles.json();
        if (Array.isArray(data)) setProfiles(data);
      }
      if (resQuests.ok) {
        const data = await resQuests.json();
        if (Array.isArray(data)) setQuests(data);
      }
    } catch (err) {
      console.error("🌊 Fracture lors de la synchronisation de Kontakt-RH :", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchKontaktData();
  }, [fetchKontaktData]);

  return {
    profiles,
    quests,
    loading,
    activeTab,
    setActiveTab,
    refreshKontakt: fetchKontaktData
  };
}