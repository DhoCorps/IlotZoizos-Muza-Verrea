import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { KomptaAnalytics, UnifiedAnalyticsData } from '../../components/kompta/KomptaAnalytics';

// 🛡️ Mock de Recharts pour garantir le rendu dans JSDOM
// ResponsiveContainer bloque le rendu de ses enfants dans un environnement sans dimensions (tests unitaires)
vi.mock('recharts', async (importOriginal) => {
  const Actual = await importOriginal<typeof import('recharts')>();
  return {
    ...Actual,
    ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
  };
});

describe('Composant : KomptaAnalytics (ERP & Trafic)', () => {

  const mockDataValide: UnifiedAnalyticsData = {
    revenue: {
      yearMonth: '2026-08',
      caTTC: 2400, // 24.00
      caHT: 2000,  // 20.00
      tvaCollected: 400, // 4.00
      platformFees: 100,
      netMargin: 1900,
      transactionCount: 2
    },
    traffic: {
      storeUid: 'store_123',
      yearMonth: '2026-08',
      dailyTraffic: [
        { date: '2026-08-01', visitors: 10, pageViews: 25 },
        { date: '2026-08-02', visitors: 15, pageViews: 30 }
      ],
      historicalMonthlyTraffic: []
    }
  };

  const mockDataVide: UnifiedAnalyticsData = {
    revenue: {
      yearMonth: '2026-08',
      caTTC: 0,
      caHT: 0,
      tvaCollected: 0,
      platformFees: 0,
      netMargin: 0,
      transactionCount: 0
    },
    traffic: {
      storeUid: 'store_123',
      yearMonth: '2026-08',
      dailyTraffic: [],
      historicalMonthlyTraffic: []
    }
  };

  it('🟢 doit s\'afficher correctement avec les titres et icônes d\'en-tête', () => {
    render(<KomptaAnalytics data={mockDataValide} />);
    
    // Vérification de la présence des titres des sections
    expect(screen.getByText('Analytique ERP & Trafic')).toBeDefined();
    expect(screen.getByText('Visites & Vues (Mois en cours)')).toBeDefined();
    expect(screen.getByText('Ventilation Fiscale (Devise)')).toBeDefined();
  });

  it('🟢 doit rendre les graphiques lorsque des données sont fournies', () => {
    const { container } = render(<KomptaAnalytics data={mockDataValide} />);
    
    // Les conteneurs "recharts-wrapper" doivent être présents dans le DOM
    const rechartsWrappers = container.querySelectorAll('.recharts-wrapper');
    
    // On s'attend à 2 graphiques (Ligne pour trafic, Barres pour revenus)
    expect(rechartsWrappers.length).toBe(2);
  });

  it('🟢 doit afficher des messages élégants de repli (fallback) si les données de trafic ou de revenus sont vides', () => {
    render(<KomptaAnalytics data={mockDataVide} />);
    
    // Les graphiques ne doivent pas s'afficher, on doit voir les messages textuels
    expect(screen.getByText('Aucune donnée de trafic ce mois-ci.')).toBeDefined();
    expect(screen.getByText('Aucun revenu généré ce mois-ci.')).toBeDefined();
  });
});