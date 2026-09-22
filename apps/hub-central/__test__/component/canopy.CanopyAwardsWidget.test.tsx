import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import CanopyAwardsWidget from '@/components/canopy/CanopyAwardsWidget';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { toast } from 'sonner';
import React from 'react';

// 🎭 Mocks
vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() }
}));

describe('UI & Logique : CanopyAwardsWidget (React Query & Résonance Optimiste)', () => {
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

  const renderWidget = () => render(
    <QueryClientProvider client={queryClient}>
      <CanopyAwardsWidget />[cite: 2]
    </QueryClientProvider>
  );

  it('🟢 doit afficher uniquement le bouton flottant au montage (fermé par défaut)', () => {
    renderWidget();
    expect(screen.getByTitle('Ouvrir le Panthéon de la Canopée')).toBeDefined();
    expect(screen.queryByText('Panthéon de la Canopée')).toBeNull();
  });

  it('🟢 doit ouvrir la modale, fetcher les trophées et les afficher', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        awards: [
          {
            awardKey: 'TEST_GLORY',
            title: 'Trophée de l\'Aube',
            recipientUid: 'bird_winner',
            category: 'GLORY',
            loreDescription: 'Le premier rayon.',
            yearMonth: '2026-08'
          }
        ]
      })
    });

    renderWidget();

    fireEvent.click(screen.getByTitle('Ouvrir le Panthéon de la Canopée'));

    expect(screen.getByText('Panthéon de la Canopée')).toBeDefined();
    expect(global.fetch).toHaveBeenCalledWith('/api/canopy/awards');

    await waitFor(() => {
      expect(screen.getByText('Trophée de l\'Aube')).toBeDefined();
      expect(screen.getByText('bird_winner')).toBeDefined();
      expect(screen.getByText('GLORY')).toBeDefined();
    });
  });

  it('🟢 doit appliquer une mise à jour optimiste instantanée ("Célébré 🌟") au clic sur "Féliciter"', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        awards: [
          {
            awardKey: 'TEST_GLORY',
            title: 'Trophée de l\'Aube',
            recipientUid: 'bird_winner',
            category: 'GLORY',
            yearMonth: '2026-08'
          }
        ]
      })
    });

    renderWidget();
    fireEvent.click(screen.getByTitle('Ouvrir le Panthéon de la Canopée'));

    await waitFor(() => {
      expect(screen.getByText('Féliciter')).toBeDefined();
    });

    // Retarder intentionnellement la réponse du POST /api/praises
    let resolveFetch: any;
    const delayedFetch = new Promise((resolve) => {
      resolveFetch = resolve;
    });
    (global.fetch as any).mockReturnValueOnce(delayedFetch);

    fireEvent.click(screen.getByText('Féliciter'));

    // Vérification optimiste immédiate : le bouton change instantanément d'état
    expect(screen.getByText('Célébré')).toBeDefined();
    expect(screen.getByText('🌟')).toBeDefined();

    // Résoudre la requête réseau après coup
    resolveFetch({
      ok: true,
      json: async () => ({ success: true })
    });

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/praises', expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('bird_winner')
      }));
      expect(toast.success).toHaveBeenCalledWith(expect.stringContaining('Louanges propagées'));
    });
  });
});