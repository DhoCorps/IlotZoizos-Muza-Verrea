import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

// 🛡️ HISSAGE GLOBAL DES MOCKS (Garantit l'interception avant l'import de la page)
const { mockGetCachedCanopyStats } = vi.hoisted(() => ({
  mockGetCachedCanopyStats: vi.fn(),
}));

vi.mock('@/lib/cache/canopy.cache', () => ({
  getCachedCanopyStats: mockGetCachedCanopyStats,
}));

// Mock du composant client pour isoler le test de la page serveur
vi.mock('@/components/canopy/CanopyStatsDashboard', () => ({
  default: ({ initialStats }: { initialStats: any }) => (
    <div data-testid="mock-stats-dashboard">
      Tableau de bord - {initialStats?.yearMonth || 'Aucun mois'}
    </div>
  )
}));

// Import de la page après le hissage des mocks
import CanopyStatsPage, { generateMetadata } from '@/app/[locale]/(inceptions)/canopy/stats/page';

describe('SSR & SEO : CanopyStatsPage (Inception)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('🟢 doit générer dynamiquement les métadonnées SEO avec le mois du bilan', async () => {
    mockGetCachedCanopyStats.mockResolvedValue({
      metadata: {
        statsSnapshot: { yearMonth: 'Août 2026' }
      },
      createdAt: new Date()
    });

    const metadata = await generateMetadata();
    expect(metadata.title).toContain('Août 2026');
  });

  it('🟢 doit rendre la page serveur et hydrater le dashboard avec les statistiques', async () => {
    mockGetCachedCanopyStats.mockResolvedValue({
      metadata: {
        statsSnapshot: {
          yearMonth: 'Août 2026',
          macroTotals: { totalVolumeCents: 15000, transactionCount: 12 },
          topSellers: [],
          topBuyers: [],
          mostCommented: [],
          mostReactive: []
        }
      },
      createdAt: new Date()
    });

    const ui = await CanopyStatsPage();
    render(ui);

    // Vérification de la présence des éléments clés et de l'hydratation du dashboard
    expect(screen.getByText('Chroniques de la Canopée')).toBeDefined();
    
    const dashboard = screen.getByTestId('mock-stats-dashboard');
    expect(dashboard.textContent).toContain('Août 2026');
  });
});