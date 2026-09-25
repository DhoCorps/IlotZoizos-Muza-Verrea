// apps/hub-central/__test__/inceptions/inceptions.profile.ProfileClient.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import ProfileClient from '@/app/[locale]/(inceptions)/profile/[slug]/ProfileClient';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('next-auth/react', () => ({
  useSession: () => ({
    data: { user: { uid: 'u-123', capabilities: [] } },
    status: 'authenticated',
  }),
}));

const globalFetchMock = vi.fn();
global.fetch = globalFetchMock;

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false },
  },
});

describe('Composant : ProfileClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('doit charger et afficher le profil et le coffre-fort de l\'Oiseau', async () => {
    const mockProfileData = {
      uid: 'u-123',
      pseudo: 'AlphaBird',
      frequenceHEX: '#2D3748',
      sanctuaire: {
        biographie: 'Je veille sur le Nexus.',
        localisation: 'Paris'
      },
      cvProfile: {
        professionalStatus: 'FREELANCE',
        remotePreference: 'FULL_REMOTE',
        freelanceDailyRateCents: 50000
      }
    };

    globalFetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => mockProfileData,
    });

    render(
      <QueryClientProvider client={queryClient}>
        <ProfileClient slug="u-123" />
      </QueryClientProvider>
    );

    // Attente du rendu complet après la résolution de la requête React Query
    await waitFor(() => {
      expect(screen.getByText(/Ton Coffre-Fort/i)).toBeDefined();
      
      // Utilisation de getAllByText pour gérer la présence multiple de 'AlphaBird'
      const alphaBirdElements = screen.getAllByText('AlphaBird');
      expect(alphaBirdElements.length).toBeGreaterThan(0);

      expect(screen.getByText('Je veille sur le Nexus.')).toBeDefined();
      expect(screen.getByText('FREELANCE')).toBeDefined();
      expect(screen.getByText('FULL_REMOTE')).toBeDefined();
    });
  });
});