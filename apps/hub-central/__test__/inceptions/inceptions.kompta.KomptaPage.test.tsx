import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import KomptaInceptionPage from '../../app/[locale]/(inceptions)/kompta/page';
import { usePageChapeauContext } from '@/hooks/usePageChapeauContext';

// 🛡️ Mock des composants enfants pour isoler le test de la structure de la page
vi.mock('@/components/kompta/DashBoard', () => ({
  KomptaDashboard: () => <div data-testid="kompta-dashboard-mock">Dashboard ERP</div>
}));

vi.mock('@/components/canopy/CanopySubsidySection', () => ({
  CanopySubsidySection: () => <div data-testid="canopy-subsidy-mock">Subventions de la Canopée</div>
}));

// 🛡️ Mock du hook de contexte
vi.mock('@/hooks/usePageChapeauContext', () => ({
  usePageChapeauContext: vi.fn()
}));

describe('Page Inception : Kompta', () => {
  it('🟢 doit initialiser le contexte du chapeau avec les bonnes identités de trésorerie', () => {
    render(<KomptaInceptionPage />);

    expect(usePageChapeauContext).toHaveBeenCalledWith({
      recipientUid: 'canopy_kompta_treasury',
      recipientPseudo: 'Trésorerie Kompta',
      targetTitle: 'Grand Livre & Comptabilité',
    });
  });

  it('🟢 doit encadrer les composants avec le QueryClientProvider et afficher les deux sections', () => {
    render(<KomptaInceptionPage />);

    // Les enfants ne s'afficheraient pas si le QueryClientProvider échouait
    expect(screen.getByTestId('kompta-dashboard-mock')).toBeDefined();
    expect(screen.getByTestId('canopy-subsidy-mock')).toBeDefined();
  });

  it('🟢 doit utiliser une structure élargie pour laisser respirer l\'ERP', () => {
    const { container } = render(<KomptaInceptionPage />);
    
    // Vérification de la présence de la classe CSS d'élargissement
    const mainWrapper = container.querySelector('.max-w-\\[1400px\\]');
    expect(mainWrapper).not.toBeNull();
  });
});