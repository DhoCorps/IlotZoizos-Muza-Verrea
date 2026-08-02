'use client';
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

export function usePartita() {
  const { data: session } = useSession();
  const [partitions, setPartitions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [selectedUid, setSelectedUid] = useState<string | null>(null);

  const fetchPartitions = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/partitions');
      const data = await res.json();
      if (Array.isArray(data)) setPartitions(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { 
    fetchPartitions(); 
  }, []);

  const handleDelete = async (uid: string) => {
    try {
      const res = await fetch(`/api/partitions/${uid}`, { method: 'DELETE' });
      if (res.ok) {
        await fetchPartitions();
      }
    } catch(err) {
      console.error("🔥 Erreur lors de la suppression de la partition :", err);
    }
  };

  return { 
    session, 
    partitions, 
    loading, 
    activeModal, 
    setActiveModal, 
    selectedUid, 
    setSelectedUid, 
    fetchPartitions, 
    handleDelete 
  };
}