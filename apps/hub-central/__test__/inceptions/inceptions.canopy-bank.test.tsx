import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

// 🛡️ HISSAGE GLOBAL DES MOCKS : Garantit que les mocks prennent effet avant l'import de la page
const { mockGetBalances, mockCountEntries, mockCountDocs, mockGetCachedSubsidies } = vi.hoisted(() => ({
  mockGetBalances: vi.fn().mockResolvedValue({ TOX: 1500, DHO: 300 }),
  mockCountEntries: vi.fn().mockResolvedValue(42),
  mockCountDocs: vi.fn().mockResolvedValue(5),
  mockGetCachedSubsidies: vi.fn().mockResolvedValue([
    { _id: 'sub_1', uid: 'sub_1', title: 'Aide au studio', motivation: 'Test', requestedAmount: 10000, currency: 'TOX', voteCount: 0, status: 'PENDING', isRented: false }
  ]),
}));

vi.mock('@ilot/infrastructure', () => ({
  KomptaLedgerService: {
    getUserBalances: mockGetBalances,
    countEntriesByCategory: mockCountEntries,
  },
  SubsidyModel: {
    countDocuments: mockCountDocs,
  }
}));

vi.mock('@/lib/cache/canopy.cache', () => ({
  getCachedSubsidies: mockGetCachedSubsidies
}));

// Mock du composant client pour isoler le test de la page serveur
vi.mock('@/components/canopy/CanopySubsidySection', () => ({
  CanopySubsidySection: ({ initialSubsidies }: { initialSubsidies: any[] }) => (
    <div data-testid="mock-subsidy-section">
      {initialSubsidies?.length || 0} subventions pré-chargées
    </div>
  )
}));

// Import de la page après le hissage des mocks
import CanopyBankPage from '@/app/[locale]/(inceptions)/canopy-bank/page';

describe('SSR & SEO : CanopyBankPage (Inception)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetBalances.mockResolvedValue({ TOX: 1500, DHO: 300 });
    mockCountEntries.mockResolvedValue(42);
    mockCountDocs.mockResolvedValue(5);
    mockGetCachedSubsidies.mockResolvedValue([
      { _id: 'sub_1', uid: 'sub_1', title: 'Aide au studio', motivation: 'Test', requestedAmount: 10000, currency: 'TOX', voteCount: 0, status: 'PENDING', isRented: false }
    ]);
  });

  it('🟢 doit générer la page serveur avec la trésorerie et hydrater les subventions', async () => {
    const ui = await CanopyBankPage();
    render(ui);

    // Vérification du rendu global et des valeurs de trésorerie
    expect(screen.getByText('La Réserve de la Canopée')).toBeDefined();
    expect(screen.getByText(/1[,\s ]500/)).toBeDefined(); 
    expect(screen.getByText('300')).toBeDefined();   
    expect(screen.getByText('42')).toBeDefined();    

    // Vérification de la transmission des props SSR au composant client
    const subsidySection = screen.getByTestId('mock-subsidy-section');
    expect(subsidySection.textContent).toContain('1 subventions pré-chargées');
  });
});