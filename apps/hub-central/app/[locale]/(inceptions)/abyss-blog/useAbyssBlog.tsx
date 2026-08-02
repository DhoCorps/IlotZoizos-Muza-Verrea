'use client';
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

export function useAbyssBlog() {
  const { data: session } = useSession();
  const [sujets, setSujets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [selectedUid, setSelectedUid] = useState<string | null>(null);

  const fetchSujets = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/sujets');
      setSujets(await res.json());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchSujets(); }, []);

  const handleDelete = async (uid: string) => {
    try {
      await fetch(`/api/sujets/${uid}`, { method: 'DELETE' });
      await fetchSujets();
    } catch(err) {}
  };

  return { session, sujets, loading, activeModal, setActiveModal, selectedUid, setSelectedUid, fetchSujets, handleDelete };
}