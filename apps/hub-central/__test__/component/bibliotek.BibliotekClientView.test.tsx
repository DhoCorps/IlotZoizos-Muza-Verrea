import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BibliotekClientView } from '@/components/bibliotek/BibliotekClientView';
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

vi.mock('@/components/bibliotek/OracleVerifierWidget', () => ({
  OracleVerifierWidget: () => <div data-testid="mock-oracle-widget">Oracle Widget</div>
}));

describe('UI & Logique : BibliotekClientView (Split Client-Serveur)', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
    
    queryClient = new QueryClient({
      defaultOptions: { 
        queries: { 
          retry: false,
          staleTime: Infinity // Maintien du comportement Infinity pour les tests isolés
        },
        mutations: { retry: false, onError: () => {} } 
      }
    });
  });

  const renderWithClient = (initialData: any[] = []) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <BibliotekClientView 
          initialData={initialData} 
          initialTotal={initialData.length} 
          initialLimit={9} 
        />
      </QueryClientProvider>
    );
  };

  it('🟢 doit rendre l\'en-tête, l\'Oracle, et afficher les ouvrages SSR sans fetch initial', async () => {
    const mockInitialData = [
      { uid: 'book_1', title: 'Le Chant des Oiseaux', writingType: 'roman', style: 'poetique', slug: 'chant-des-oiseaux', digitalSignature: 'abc123hash' }
    ];

    // Mock préventif au cas où, mais il ne doit pas être appelé
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: [] })
    });

    renderWithClient(mockInitialData);

    expect(screen.getByText('Bibliotek')).toBeDefined();
    expect(screen.getByTestId('mock-oracle-widget')).toBeDefined();
    
    // Le fetch réseau ne sera pas appelé grâce au staleTime optimisé
    expect(global.fetch).not.toHaveBeenCalled();
    expect(screen.getByText('Le Chant des Oiseaux')).toBeDefined();
    expect(screen.getByText('Sceau : abc123hash...')).toBeDefined();
  });

  it('🟢 doit mettre à jour les filtres et refetcher les données (Côté Client)', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: [], pagination: { total: 0, page: 1, limit: 9, totalPages: 1 } })
    });

    renderWithClient([]); // Démarrage à vide pour forcer le refetch via interaction

    const typeSelect = screen.getByDisplayValue("Tous les types d'écrits");
    const styleSelect = screen.getByDisplayValue("Tous les styles");

    fireEvent.change(typeSelect, { target: { value: 'essai' } });
    fireEvent.change(styleSelect, { target: { value: 'philosophie' } });

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('writingType=essai'));
      expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('style=philosophie'));
    });
  });

  it('🟢 doit ouvrir le Scriptorium, sédimenter un brouillon et invalider le cache', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: [], pagination: { total: 0, page: 1, limit: 9, totalPages: 1 } })
    });

    renderWithClient([]);

    fireEvent.click(screen.getByText(/Écrire/i));
    expect(screen.getByTestId('mock-scriptorium')).toBeDefined();

    const saveBtn = screen.getByText('Simuler Sauvegarde');
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/bibliotek', expect.objectContaining({
        method: 'POST',
        body: expect.any(FormData)
      }));

      // Vérifie que le toast confirme que c'est un brouillon
      expect(toast.success).toHaveBeenCalledWith(expect.stringContaining('Brouillon sédimenté'));
      expect(screen.queryByTestId('mock-scriptorium')).toBeNull(); // La modale se ferme
    });
  });
});