import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import CanopyStatsDashboard from '@/components/canopy/CanopyStatsDashBoard';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

describe('UI & Logique : CanopyStatsDashboard (React Query & Erreurs Unifiées)', () => {
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

  const renderDashboard = (initialStats?: any) => render(
    <QueryClientProvider client={queryClient}>
      <CanopyStatsDashboard initialStats={initialStats} />
    </QueryClientProvider>
  );

  it('🟢 doit afficher les statistiques correctement lorsqu’elles sont chargées', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        yearMonth: 'Août 2026',
        macroTotals: { totalVolumeCents: 10000, transactionCount: 5 },
        topSellers: [],
        topBuyers: [],
        mostCommented: [],
        mostReactive: []
      })
    });

    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText(/Août 2026/)).toBeDefined();
      expect(screen.getByText(/100.00 €/)).toBeDefined();
    });
  });

  it('🔴 doit gérer l’erreur unifiée renvoyée par l’API (data.error)', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      json: async () => ({
        success: false,
        error: "Aucun bilan de la canopée disponible pour le moment."
      })
    });

    renderDashboard();

    await waitFor(() => {
      // Le composant gère l'état d'erreur en affichant le message de repli de la canopée silencieuse
      expect(screen.getByText("La canopée est silencieuse ce mois-ci.")).toBeDefined();
    });
  });
});