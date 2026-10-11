import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import KontaktDashboard from '@/app/[locale]/(inceptions)/kontakt/page';

const globalFetchMock = vi.fn();
vi.stubGlobal('fetch', globalFetchMock);

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn()
  }
}));

const renderWithQueryClient = (ui: React.ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } }
  });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
};

describe('Page KontaktDashboard (app/[locale]/(inceptions)/kontakt/page.tsx)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('🟢 doit charger les profils et les quêtes et permettre la sédimentation du profil depuis l’onglet Fiche de Personnage', async () => {
    // 1. Mock GET /api/kontakt/profiles et GET /api/kontakt/quests (+ appel initial du KontaktSwipeDeck)
    globalFetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: [
          {
            uid: 'quest_1',
            title: 'Quête Graphe',
            description: 'Sceller Neo4j',
            status: 'ACTIVE',
            requiredSkills: ['Neo4j']
          }
        ]
      })
    });

    renderWithQueryClient(<KontaktDashboard />);

    await waitFor(() => {
      expect(screen.getByText(/Le Tinder des Équipages/i)).toBeInTheDocument();
    });

    // Passage sur l'onglet Fiche de Personnage
    fireEvent.click(screen.getByText(/Fiche de Personnage/i));

    const titleInput = await screen.findByLabelText(/Intitulé Professionnel/i);
    fireEvent.change(titleInput, { target: { value: 'Architecte Suprême Silice' } });

    fireEvent.click(screen.getByText(/Sédimenter les Modifications/i));

    await waitFor(() => {
      const postProfileCall = globalFetchMock.mock.calls.find(
        call => call[0] === '/api/kontakt/profiles' && call[1]?.method === 'POST'
      );
      expect(postProfileCall).toBeDefined();
      const body = JSON.parse(postProfileCall![1].body);
      expect(body.professionalTitle).toBe('Architecte Suprême Silice');
      expect(body.archetypeClass).toBe('Mage de Silice');
    });
  });
});