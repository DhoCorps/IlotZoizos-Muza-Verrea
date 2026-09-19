'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export function useAbyssBlog() {
  const queryClient = useQueryClient();

  const { data: sujets = [], isLoading: loadingSujets } = useQuery({
    queryKey: ['sujets'],
    queryFn: async () => {
      const res = await fetch('/api/sujets');
      if (!res.ok) throw new Error("Échec de la récupération des sujets");
      const data = await res.json();
      return Array.isArray(data) ? data : (data.data || data.sujets || []);
    }
  });

  const { data: projects = [], isLoading: loadingProjects } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const res = await fetch('/api/projects');
      if (!res.ok) throw new Error("Échec de la récupération des projets");
      const data = await res.json();
      return Array.isArray(data) ? data : (data.data || data.projects || []);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (uid: string) => {
      const res = await fetch(`/api/sujets/${uid}`, { method: 'DELETE' });
      if (!res.ok) throw new Error("Échec de la désintégration du monologue");
      return uid;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sujets'] });
      toast.success("Monologue dissous dans le néant.");
    },
    onError: (err: Error) => {
      console.error("🔥 Erreur lors de la désintégration :", err);
      toast.error(`Ineptie technique : ${err.message}`);
    }
  });

  return { 
    sujets, 
    projects,
    loading: loadingSujets || loadingProjects, 
    deleteSujet: deleteMutation.mutate,
    isDeleting: deleteMutation.isPending
  };
}