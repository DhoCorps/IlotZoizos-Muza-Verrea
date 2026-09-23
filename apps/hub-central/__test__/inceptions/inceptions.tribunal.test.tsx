import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import TribunalPage from '@/app/[locale]/(inceptions)/tribunal/page';
import React from 'react';

// -------------------------------------------------------------------------
// 🎭 MOCKS DES COMPOSANTS CLIENTS LOURDS
// -------------------------------------------------------------------------
vi.mock('@/components/demopraxy/DemopraxyRegisterView', () => ({
  default: () => <div data-testid="mock-demopraxy-register">Mock Registre Démopraxique Public</div>
}));

vi.mock('@/components/tribunal/CanopyTribunal', () => ({
  CanopyTribunal: ({ reportUid }: { reportUid: string }) => (
    <div data-testid="mock-canopy-tribunal">Mock Tribunal Actif - Report: {reportUid}</div>
  )
}));

describe('Page SSR : Tribunal & Registre Démopraxique', () => {

  it('🟢 doit rendre la page par défaut avec uniquement le Registre Public (sans le tribunal d\'exécution)', async () => {
    // 🛡️ Simulation du comportement asynchrone d'un composant serveur React (Next.js 15)
    const PageComponent = await TribunalPage({ 
      searchParams: Promise.resolve({}) 
    });
    
    render(PageComponent);
    
    // Le registre doit être affiché
    expect(screen.getByTestId('mock-demopraxy-register')).toBeDefined();
    
    // Le tribunal d'exécution ne doit pas être affiché si aucun rapport n'est passé en URL
    expect(screen.queryByTestId('mock-canopy-tribunal')).toBeNull();
    expect(screen.queryByText(/Protocole de Justice Karmique/i)).toBeNull();
  });

  it('🟢 doit afficher le tribunal d\'exécution et le protocole d\'alerte si une convocation (reportId) est présente dans l\'URL', async () => {
    const PageComponent = await TribunalPage({ 
      searchParams: Promise.resolve({ reportId: 'report_777', plaintiff: 'user1', defendant: 'user2' }) 
    });
    
    render(PageComponent);

    // L'avertissement de sécurité et le composant d'exécution doivent être rendus
    expect(screen.getByText(/Protocole de Justice Karmique/i)).toBeDefined();
    expect(screen.getByTestId('mock-canopy-tribunal')).toBeDefined();
    expect(screen.getByText(/Mock Tribunal Actif - Report: report_777/i)).toBeDefined();
    
    // Le registre reste accessible en dessous
    expect(screen.getByTestId('mock-demopraxy-register')).toBeDefined();
  });
});