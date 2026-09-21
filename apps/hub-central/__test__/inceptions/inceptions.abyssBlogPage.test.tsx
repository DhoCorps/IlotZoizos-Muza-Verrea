import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import AbyssBlogDashboard from '@/app/[locale]/(inceptions)/abyss-blog/page';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

// -------------------------------------------------------------------------
// 🎭 MOCKS GLOBAUX
// -------------------------------------------------------------------------

// 1. Mock de next-auth
vi.mock('next-auth/react', () => ({
  useSession: vi.fn(() => ({
    data: { user: { uid: 'u-123', capabilities: [] } },
    status: 'authenticated'
  }))
}));

// 2. Mock du Hook métier
vi.mock('@/hooks/useAbyssBlog', () => ({
  useAbyssBlog: () => ({
    sujets: [
      { uid: 's-mine', title: 'Mon Propre Sujet', authorUid: 'u-123', tags: ['philosophie', 'neo4j'], status: 'PUBLISHED' },
      { uid: 's-other', title: 'Le Sujet de Dho', authorUid: 'u-456', status: 'DRAFT' }
    ],
    projects: [],
    loading: false,
    deleteSujet: vi.fn()
  })
}));

// 3. 🟢 CORRECTION CRITIQUE : Mock du fichier navigation.ts
// Depuis "__test__/inceptions/", la racine "hub-central" est à "../../"
vi.mock('../../navigation', () => ({
  Link: ({ children, href }: any) => <a href={href}>{children}</a>,
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() })
}));

// (Sécurité supplémentaire) Mock de l'alias au cas où il serait utilisé ailleurs
vi.mock('@/navigation', () => ({
  Link: ({ children, href }: any) => <a href={href}>{children}</a>,
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() })
}));

// 4. 🟢 SÉCURITÉ NEXT-INTL : On neutralise le provider de traduction globalement
vi.mock('next-intl', () => ({
  useLocale: () => 'fr',
  useTranslations: () => (key: string) => key,
  NextIntlClientProvider: ({ children }: any) => <>{children}</>
}));

// 5. Mocks des sous-composants
vi.mock('@/components/resonance/ResonanceButton', () => ({
  default: () => <button>ResonanceMock</button>
}));

// -------------------------------------------------------------------------
// 🧪 SUITE DE TESTS
// -------------------------------------------------------------------------

describe('Page : AbyssBlogDashboard', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    vi.clearAllMocks();
  });

  const renderComponent = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <AbyssBlogDashboard />
      </QueryClientProvider>
    );
  };

  it('doit rendre les sujets et afficher correctement les tags', () => {
    renderComponent();
    
    expect(screen.getByText('Mon Propre Sujet')).toBeDefined();
    expect(screen.getByText('Le Sujet de Dho')).toBeDefined();
    
    // Vérification de l'affichage des tags pour le premier sujet
    expect(screen.getByText('#philosophie')).toBeDefined();
    expect(screen.getByText('#neo4j')).toBeDefined();
  });

  it('ne doit afficher les boutons d\'Édition et de Suppression que sur les sujets de l\'Oiseau', () => {
    renderComponent();
    
    // Pour "Mon Propre Sujet" (u-123), le bouton d'édition doit être présent
    const editBtnMine = screen.getByTestId('btn-edit-s-mine');
    expect(editBtnMine).toBeDefined();

    // Pour "Le Sujet de Dho" (u-456), le bouton d'édition ne doit PAS exister
    const editBtnOther = screen.queryByTestId('btn-edit-s-other');
    expect(editBtnOther).toBeNull();
  });
});