import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { UniversalAnnotationsView } from '@/components/resonance/annotations/UniversalAnnotationsView';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { toast } from 'sonner';
import React from 'react';

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() }
}));

describe('UI & Logique : UniversalAnnotationsView (Codex Universel des Notes)', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();

    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false }
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

  it('🟢 doit afficher les notes universelles (Livres et Articles) récupérées depuis /api/annotations', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: [
          {
            uid: 'annot_1',
            targetUid: 'book_123',
            targetType: 'BOOK',
            targetTitle: 'Le Chant des Oiseaux',
            selectedText: 'La liberté commence où l’ignorance finit.',
            comment: 'Fulgurance remarquable.',
            importance: 3,
            createdAt: new Date().toISOString()
          },
          {
            uid: 'annot_2',
            targetUid: 'article_456',
            targetType: 'ARTICLE',
            targetTitle: 'Monorépo & Architecture',
            selectedText: 'Le couplage lâche est essentiel.',
            emotion: '💡',
            importance: 4,
            createdAt: new Date().toISOString()
          }
        ]
      })
    });

    renderWithClient(<UniversalAnnotationsView />);

    expect(screen.getByText(/Le Codex des Notes & Passages/i)).toBeDefined();

    await waitFor(() => {
      expect(screen.getAllByText('Le Chant des Oiseaux').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Monorépo & Architecture').length).toBeGreaterThan(0);
      expect(screen.getByText(/La liberté commence où l’ignorance finit/)).toBeDefined();
      expect(screen.getByText(/Le couplage lâche est essentiel/)).toBeDefined();
    });
  });

  it('🟢 doit filtrer les notes par type (ex: Articles uniquement)', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: [
          {
            uid: 'annot_1',
            targetUid: 'book_123',
            targetType: 'BOOK',
            targetTitle: 'Livre Test',
            selectedText: 'Texte livre',
            importance: 2,
            createdAt: new Date().toISOString()
          },
          {
            uid: 'annot_2',
            targetUid: 'article_456',
            targetType: 'ARTICLE',
            targetTitle: 'Article Test',
            selectedText: 'Texte article',
            importance: 5,
            createdAt: new Date().toISOString()
          }
        ]
      })
    });

    renderWithClient(<UniversalAnnotationsView />);

    await waitFor(() => {
      expect(screen.getAllByText('Livre Test').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Article Test').length).toBeGreaterThan(0);
    });

    // Clic sur le filtre "Articles"
    const articleFilterBtn = screen.getByText('📝 Articles');
    fireEvent.click(articleFilterBtn);

    // L'article doit toujours être visible, mais le livre doit être filtré de la liste
    expect(screen.getAllByText('Article Test').length).toBeGreaterThan(0);
    // On vérifie que le filtre par onglet de livre a disparu ou que la carte du livre n'est plus affichée
    expect(screen.queryByText('Texte livre')).toBeNull();
  });

  it('🟢 doit ouvrir la modale de confirmation et supprimer la note via /api/annotations/[uid]', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: [
          {
            uid: 'annot_1',
            targetUid: 'article_456',
            targetType: 'ARTICLE',
            targetTitle: 'Monorépo & Architecture',
            selectedText: 'Texte à supprimer',
            importance: 2,
            createdAt: new Date().toISOString()
          }
        ]
      })
    });

    renderWithClient(<UniversalAnnotationsView />);

    await waitFor(() => {
      expect(screen.getAllByText('Monorépo & Architecture').length).toBeGreaterThan(0);
    });

    // 1. Clic sur le bouton de suppression
    const deleteIconBtn = screen.getByTestId('delete-annot-annot_1');
    fireEvent.click(deleteIconBtn);

    // 2. Vérification que la modale s'affiche
    expect(screen.getByText(/Dissoudre la note/i)).toBeDefined();

    // 3. Mock de la réponse de suppression et du re-fetch
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true })
    });
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, data: [] })
    });

    // 4. Validation de la suppression
    const confirmBtn = screen.getByTestId('confirm-delete-btn');
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/annotations/annot_1', expect.objectContaining({
        method: 'DELETE'
      }));
      expect(toast.success).toHaveBeenCalledWith(expect.stringContaining('néant'));
    });
  });
});