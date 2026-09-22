import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import CanopyStatsDashboard from '@/components/canopy/CanopyStatsDashBoard';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

describe('UI & Logique : CanopyStatsDashboard (React Query & SSR)', () => {
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

  const renderDashboard = (initialStats?: any) => render(
    <QueryClientProvider client={queryClient}>
      <CanopyStatsDashboard initialStats={initialStats} />
    </QueryClientProvider>
  );

  it('🟢 doit afficher les statistiques hydratées via le SSR (initialData)', () => {
    const mockStats = {
      yearMonth: '2026-08',
      macroTotals: { totalVolumeCents: 50000, transactionCount: 42 },
      topSellers: [{ _id: 'bird_1', totalVolumeCents: 10000 }],
      topBuyers: [],
      mostCommented: [{ _id: 'bird_2', commentCount: 15 }],
      mostReactive: []
    };

    renderDashboard(mockStats);
    
    expect(screen.getByText(/Le Bilan de la Canopée/)).toBeDefined();
    expect(screen.getByText('2026-08')).toBeDefined();
    
    // Vérification des mathématiques (10000 cents = 100.00 €, 50000 cents = 500.00 €)
    expect(screen.getByText(/500.00 €/)).toBeDefined(); 
    expect(screen.getByText(/42 transactions/)).toBeDefined();
    expect(screen.getByText(/bird_1/)).toBeDefined();
    expect(screen.getByText(/100.00 €/)).toBeDefined(); 
    expect(screen.getByText(/bird_2/)).toBeDefined();
    expect(screen.getByText(/15 commentaires/)).toBeDefined();
  });

  it('🟢 doit fetcher les statistiques si initialData est vide ou non fourni', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        yearMonth: '2026-09',
        macroTotals: { totalVolumeCents: 15000, transactionCount: 5 },
        topSellers: [],
        topBuyers: [],
        mostCommented: [],
        mostReactive: []
      })
    });

    renderDashboard();

    expect(screen.getByText(/Écoute de la canopée en cours.../)).toBeDefined();

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/canopy/stats');
      expect(screen.getByText('2026-09')).toBeDefined();
      expect(screen.getByText(/150.00 €/)).toBeDefined(); // 15000 cents
      expect(screen.getByText(/5 transactions/)).toBeDefined();
    });
  });

  it('🔴 doit afficher un message de silence en cas d\'erreur ou de données absentes', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ success: false })
    });

    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText(/La canopée est silencieuse ce mois-ci./)).toBeDefined();
    });
  });
});