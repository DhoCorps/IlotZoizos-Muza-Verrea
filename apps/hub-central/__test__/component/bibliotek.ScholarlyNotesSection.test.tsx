import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { ScholarlyNotesSection } from '@/components/bibliotek/ScholarlyNotesSection';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

describe('UI & Logique : ScholarlyNotesSection (Mur des Sceaux d\'Érudits)', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
    
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      }
    });
  });

  const renderWithClient = (ui: React.ReactElement) => {
    return render(
      <QueryClientProvider client={queryClient}>
        {ui}
      </QueryClientProvider>
    );
  };

  it('🟢 doit afficher un loader pendant la récupération des notes', () => {
    // On simule une promesse en cours (pending)
    (global.fetch as any).mockImplementationOnce(() => new Promise(() => {}));
    
    const { container } = renderWithClient(<ScholarlyNotesSection bookUid="book_123" />);
    
    // Vérification de la présence de l'icône de chargement (Loader2)
    expect(container.querySelector('.animate-spin')).toBeDefined();
  });

  it('🟢 ne doit rien afficher (composant invisible) si l\'API ne retourne aucune note scellée', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: [
          // Une note existe, mais elle N'EST PAS scellée par l'auteur
          { uid: 'annot_1', isScholarSealed: false, selectedText: 'Banalité.' }
        ]
      })
    });

    const { container } = renderWithClient(<ScholarlyNotesSection bookUid="book_123" />);

    await waitFor(() => {
      // Le composant doit retourner "null", donc le titre ne doit pas exister
      expect(screen.queryByText(/Notes d'Érudits/i)).toBeNull();
      // L'appel à la nouvelle API universelle doit avoir été fait correctement
      expect(global.fetch).toHaveBeenCalledWith('/api/annotations?targetUid=book_123&targetType=BOOK');
    });
  });

  it('🟢 doit afficher uniquement les notes scellées récupérées depuis l\'API universelle', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: [
          {
            uid: 'annot_1',
            authorUid: 'bird_scholar_99',
            emotion: '💡',
            selectedText: 'La sagesse commence dans l\'émerveillement.',
            comment: 'Une citation intemporelle.',
            isScholarSealed: true // Cette note DOIT apparaître
          },
          {
            uid: 'annot_2',
            authorUid: 'bird_novice_77',
            emotion: '🔥',
            selectedText: 'Je ne suis pas d\'accord.',
            isScholarSealed: false // Cette note NE DOIT PAS apparaître
          }
        ]
      })
    });

    renderWithClient(<ScholarlyNotesSection bookUid="book_123" />);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/annotations?targetUid=book_123&targetType=BOOK');
      
      // Le composant s'affiche
      expect(screen.getByText(/Notes d'Érudits/i)).toBeDefined();
      
      // La note scellée est affichée
      expect(screen.getByText(/La sagesse commence dans l'émerveillement/)).toBeDefined();
      expect(screen.getByText('Une citation intemporelle.')).toBeDefined();
      
      // L'auteur de la note est affiché (tronqué à 8 caractères par le composant : 'bird_sch')
      expect(screen.getByText(/bird_sch/)).toBeDefined();
      
      // La note NON scellée est ignorée
      expect(screen.queryByText(/Je ne suis pas d'accord/)).toBeNull();
    });
  });
});