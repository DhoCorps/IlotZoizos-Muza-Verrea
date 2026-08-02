'use client';
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

export function useLetrin() {
  const { data: session } = useSession();
  const [fonts, setFonts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [selectedUid, setSelectedUid] = useState<string | null>(null);

  const fetchFonts = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/letrin');
      const data = await res.json();
      if (Array.isArray(data)) setFonts(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { 
    fetchFonts(); 
  }, []);

  const handleDelete = async (uid: string) => {
    if (!confirm("Es-tu sûr de vouloir dissoudre cette police dans le néant ?")) return;
    try {
      const res = await fetch(`/api/letrin/${uid}`, { method: 'DELETE' });
      if (res.ok) {
        await fetchFonts();
      }
    } catch(err) {
      console.error("🔥 Erreur lors de la suppression de la police :", err);
    }
  };

  return { 
    session, 
    fonts, 
    loading, 
    activeModal, 
    setActiveModal, 
    selectedUid, 
    setSelectedUid, 
    fetchFonts, 
    handleDelete 
  };
}