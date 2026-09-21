import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import BibliotekPage from '@/app/[locale]/(inceptions)/bibliotek/page';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { toast } from 'sonner';
import React from 'react';

// ==========================================
// 🎭 MOCKS DES DÉPENDANCES ET COMPOSANTS
// ==========================================
vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() }
}));

vi.mock('@/components/bibliotek/ScriptoriumEditor', () => ({
  ScriptoriumEditor: ({ onSave }: { onSave: Function }) => (
    <div data-testid="mock-scriptorium">
      <button 
        onClick={() => onSave({ 
          title: 'Le Manifeste de la Silice', 
          content: 'Contenu brut', 
          writingType: 'manifeste', 
          style: 'cyberpunk' 
        })}
      >
        Simuler Sauvegarde
      </button>
    </div>
  )
}));

// Mock léger du widget de l'Oracle pour se concentrer sur la page principale
vi.mock('@/components/bibliotek/OracleVerifierWidget', () => ({
  OracleVerifierWidget: () => <div data-testid="mock-oracle-widget">Oracle Widget</div>
}));

describe('UI & Logique : BibliotekPage (Dashboard)', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
    
    queryClient = new QueryClient({
      defaultOptions: { 
        queries: { retry: false },
        mutations: { 
          retry: false,
          onError: () => {}
        } 
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

  it('🟢 doit rendre l\'en-tête de la Bibliotek, l\'Oracle Widget et afficher les ouvrages depuis l\'API', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: [
          { uid: 'book_1', title: 'Le Chant des Oiseaux', writingType: 'roman', style: 'poetique', slug: 'chant-des-oiseaux', digitalSignature: 'abc123hash' }
        ],
        pagination: { total: 1, page: 1, limit: 9, totalPages: 1 }
      })
    });

    renderWithClient(<BibliotekPage />);

    expect(screen.getByText('Bibliotek')).toBeDefined();
    expect(screen.getByTestId('mock-oracle-widget')).toBeDefined();
    
    await waitFor(() => {
      expect(screen.getByText('Le Chant des Oiseaux')).toBeDefined();
    });

    expect(screen.getByText('Sceau : abc123hash...')).toBeDefined();
    expect(screen.getByText('Ouvrir la Liseuse 📖')).toBeDefined();
  });

  it('🟢 doit mettre à jour les filtres et refetcher les données', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: [], pagination: { total: 0, page: 1, limit: 9, totalPages: 1 } })
    });

    renderWithClient(<BibliotekPage />);

    const typeSelect = screen.getByDisplayValue("Tous les types d'écrits");
    const styleSelect = screen.getByDisplayValue("Tous les styles");

    fireEvent.change(typeSelect, { target: { value: 'essai' } });
    fireEvent.change(styleSelect, { target: { value: 'philosophie' } });

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('writingType=essai'));
      expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('style=philosophie'));
    });
  });

  it('🟢 doit ouvrir le Scriptorium, sédimenter un livre et invalider le cache', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, data: [], pagination: { total: 0, page: 1, limit: 9, totalPages: 1 } })
    });

    renderWithClient(<BibliotekPage />);

    const openBtn = screen.getByText(/Ouvrir le Scriptorium/i);
    fireEvent.click(openBtn);

    expect(screen.getByTestId('mock-scriptorium')).toBeDefined();

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ 
        success: true, 
        digitalSignature: 'hashcryptographierencoredu texte',
        data: { uid: 'new_book' } 
      })
    });

    const saveBtn = screen.getByText('Simuler Sauvegarde');
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/bibliotek', expect.objectContaining({
        method: 'POST',
        body: expect.any(FormData)
      }));

      expect(toast.success).toHaveBeenCalledWith(expect.stringContaining('hashcryptogr'));
      expect(screen.queryByTestId('mock-scriptorium')).toBeNull();
    });
  });

  it('🔴 doit afficher une erreur toast si la sédimentation échoue', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, data: [], pagination: { total: 0, page: 1, limit: 9, totalPages: 1 } })
    });

    renderWithClient(<BibliotekPage />);

    fireEvent.click(screen.getByText(/Ouvrir le Scriptorium/i));

    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: "La matrice rejette cette sédimentation." })
    });

    const saveBtn = screen.getByText('Simuler Sauvegarde');
    
    const originalConsoleError = console.error;
    console.error = () => {};

    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(expect.stringContaining('La matrice rejette cette sédimentation.'));
    });

    console.error = originalConsoleError;
  });
});