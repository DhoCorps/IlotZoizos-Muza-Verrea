import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import DemopraxyRegisterView from '@/components/demopraxy/DemopraxyRegisterView';
import React from 'react';

// 🛡️ Mock du routeur Next.js pour valider la synchronisation d'URL
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: () => '/tribunal',
  useSearchParams: () => new URLSearchParams(),
}));

const mockRegisterData = {
  success: true,
  data: [
    {
      uid: 'demo_123',
      userIdentifier: 'bird_toxique',
      actorUid: 'gardien_1',
      metrics: { computedEx: 18.5, systemicHatredScore: 8, recurrenceCount: 2 },
      sanctionCategory: 'SYSTEMIC_HATRED',
      tags: ['récidiviste', 'insultes'],
      isExcluded: true,
      actionMessage: 'Seuil d\'exclusion atteint.',
      createdAt: '2026-09-22T10:00:00Z'
    },
    {
      uid: 'demo_456',
      userIdentifier: 'bird_bavard',
      actorUid: 'gardien_1',
      metrics: { computedEx: 5.0, systemicHatredScore: 2, recurrenceCount: 1 },
      sanctionCategory: 'HARASSMENT',
      tags: ['spam'],
      isExcluded: false,
      actionMessage: 'Avertissement simple.',
      createdAt: '2026-09-21T10:00:00Z'
    }
  ],
  pagination: { total: 2, page: 1, limit: 10, totalPages: 1 }
};

describe('UI Component : DemopraxyRegisterView (Registre Public URL-Sync)', () => {
  const mockFetch = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', mockFetch);
  });

  it('🟢 doit rendre le registre, lire l\'URL initiale et afficher les cartes', async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify(mockRegisterData), { status: 200, headers: { 'Content-Type': 'application/json' } })
    );

    render(<DemopraxyRegisterView />);

    expect(screen.getByRole('heading', { name: /Registre de Justice/i })).toBeDefined();

    const cibleToxique = await screen.findByText(/@bird_toxique/i);
    expect(cibleToxique).toBeDefined();

    expect(screen.getByText(/SYSTEMIC HATRED/i)).toBeDefined();
    expect(screen.getByText(/#récidiviste/i)).toBeDefined();
    expect(screen.getAllByText('Stase').length).toBeGreaterThan(0);
    
    expect(screen.getByText(/@bird_bavard/i)).toBeDefined();
    expect(screen.getAllByText('Avertissement').length).toBeGreaterThan(0);

    // Vérification du paramètre par défaut lu depuis useSearchParams
    expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('page=1&limit=10'));
  });

  it('🟢 doit synchroniser les filtres avec l\'URL (useRouter) lors de leur modification', async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify(mockRegisterData), { status: 200, headers: { 'Content-Type': 'application/json' } })
    );

    render(<DemopraxyRegisterView />);
    await screen.findByText(/@bird_toxique/i);

    // 🛡️ Modification de la catégorie -> Déclenche updateUrl -> router.push
    const categorySelect = screen.getByLabelText(/Catégorie/i);
    fireEvent.change(categorySelect, { target: { value: 'TOXICITY' } });
    expect(mockPush).toHaveBeenCalledWith('/tribunal?sanctionCategory=TOXICITY&page=1', { scroll: false });

    // Modification du statut
    const statusSelect = screen.getByLabelText(/Statut du Jugement/i);
    fireEvent.change(statusSelect, { target: { value: 'TRUE' } });
    expect(mockPush).toHaveBeenCalledWith('/tribunal?isExcluded=TRUE&page=1', { scroll: false });

    // Saisie d'un tag (déclenche le debounce optimisé de 400ms avant le push)
    const tagInput = screen.getByLabelText(/Recherche par Tag/i);
    fireEvent.change(tagInput, { target: { value: 'spam' } });
    
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/tribunal?tag=spam&page=1', { scroll: false });
    });
  });

  it('🟢 doit afficher un message clair si le registre est vide', async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ success: true, data: [], pagination: { total: 0, page: 1, limit: 10, totalPages: 1 } }), 
      { status: 200, headers: { 'Content-Type': 'application/json' } })
    );

    render(<DemopraxyRegisterView />);

    const emptyMessage = await screen.findByText(/Aucun enregistrement démopraxique trouvé/i);
    expect(emptyMessage).toBeDefined();
  });
});