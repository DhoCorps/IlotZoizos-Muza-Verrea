import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BibliotekAnnotationsView } from '@/components/bibliotek/BibliotekAnnotationsView';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { toast } from 'sonner';
import React from 'react';

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() }
}));

describe('UI & Logique : BibliotekAnnotationsView (Codex des Notes)', () => {
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

  it('🟢 doit afficher les notes et passages surlignés récupérés depuis l\'API', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: [
          {
            uid: 'annot_1',
            bookUid: 'book_123',
            bookTitle: 'Le Chant des Oiseaux',
            selectedText: 'La liberté commence où l’ignorance finit.',
            comment: 'Une fulgurance remarquable sur la conscience.',
            importance: 3,
            createdAt: new Date().toISOString()
          }
        ]
      })
    });

    renderWithClient(<BibliotekAnnotationsView />);

    expect(screen.getByText(/Le Codex des Notes & Passages/i)).toBeDefined();

    await waitFor(() => {
      expect(screen.getByText('Le Chant des Oiseaux')).toBeDefined();
      expect(screen.getByText(/La liberté commence où l’ignorance finit/)).toBeDefined();
      expect(screen.getByText('Une fulgurance remarquable sur la conscience.')).toBeDefined();
    });
  });

  it('🟢 doit ouvrir la modale moderne de confirmation et supprimer la note avec succès', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: [
          {
            uid: 'annot_1',
            bookUid: 'book_123',
            bookTitle: 'Le Chant des Oiseaux',
            selectedText: 'Texte à supprimer',
            importance: 2,
            createdAt: new Date().toISOString()
          }
        ]
      })
    });

    renderWithClient(<BibliotekAnnotationsView />);

    await waitFor(() => {
      expect(screen.getByText('Le Chant des Oiseaux')).toBeDefined();
    });

    // 1. Clic sur le bouton de suppression (ouvre la modale moderne)
    const deleteIconBtn = screen.getByTestId('delete-annot-annot_1');
    fireEvent.click(deleteIconBtn);

    // 2. Vérification que la modale de confirmation s'affiche bien
    expect(screen.getByText(/Dissoudre la note/i)).toBeDefined();
    
    // 🛠️ CORRECTION : Utilisation de getAllByText pour gérer les occurrences multiples du titre dans la page
    const matchingElements = screen.getAllByText(/Le Chant des Oiseaux/);
    expect(matchingElements.length).toBeGreaterThan(0);

    // 3. Mock de la réponse de suppression de l'API
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true })
    });

    // Mock du re-fetch des notes après suppression
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, data: [] })
    });

    // 4. Validation de la suppression dans la modale
    const confirmBtn = screen.getByTestId('confirm-delete-btn');
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/bibliotek/annotations/annot_1', expect.objectContaining({
        method: 'DELETE'
      }));
      expect(toast.success).toHaveBeenCalledWith(expect.stringContaining('néant'));
    });
  });
});