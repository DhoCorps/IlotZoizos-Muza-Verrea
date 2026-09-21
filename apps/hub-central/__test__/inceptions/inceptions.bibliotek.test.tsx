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

describe('UI & Logique : BibliotekPage (Dashboard)', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
    
    // 🛡️ Suture absolue : Un QueryClient configuré pour neutraliser la remontée des rejets asynchrones
    queryClient = new QueryClient({
      defaultOptions: { 
        queries: { retry: false },
        mutations: { 
          retry: false,
          onError: () => {} // Capture l'erreur de mutation au niveau global du client pour éviter l'Unhandled Rejection
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

  it('🟢 doit rendre l\'en-tête de la Bibliotek et afficher les ouvrages depuis l\'API', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: [
          { uid: 'book_1', title: 'Le Chant des Oiseaux', writingType: 'roman', style: 'poetique', slug: 'chant-des-oiseaux', digitalSignature: 'abc123hash' }
        ]
      })
    });

    renderWithClient(<BibliotekPage />);

    expect(screen.getByText('Bibliotek')).toBeDefined();
    
    await waitFor(() => {
      expect(screen.getByText('Le Chant des Oiseaux')).toBeDefined();
    });

    expect(screen.getByText('Sceau : abc123hash...')).toBeDefined();
    expect(screen.getByText('Ouvrir la Liseuse 📖')).toBeDefined();
  });

  it('🟢 doit mettre à jour les filtres et refetcher les données', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: [] })
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
      json: async () => ({ success: true, data: [] })
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
        body: expect.stringContaining('Le Manifeste de la Silice')
      }));

      expect(toast.success).toHaveBeenCalledWith(expect.stringContaining('hashcryptogr'));
      expect(screen.queryByTestId('mock-scriptorium')).toBeNull();
    });
  });

  it('🔴 doit afficher une erreur toast si la sédimentation échoue', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, data: [] })
    });

    renderWithClient(<BibliotekPage />);

    fireEvent.click(screen.getByText(/Ouvrir le Scriptorium/i));

    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: "La matrice rejette cette sédimentation." })
    });

    const saveBtn = screen.getByText('Simuler Sauvegarde');
    
    // On intercepte explicitement le rejet de la promesse de mutation pour satisfaire le test d'échec asynchrone
    const originalConsoleError = console.error;
    console.error = () => {};

    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(expect.stringContaining('La matrice rejette cette sédimentation.'));
    });

    console.error = originalConsoleError;
  });
});