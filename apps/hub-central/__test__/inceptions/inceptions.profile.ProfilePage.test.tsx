// apps/hub-central/__test__/inceptions/inceptions.profile.ProfilePage.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import ProfilePage from '@/app/[locale]/(inceptions)/profile/[slug]/page';
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

describe('Page : ProfilePage (Server/Client Hybrid)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('doit charger et afficher les informations du profil et du coffre-fort', async () => {
    const mockProfile = {
      uid: 'u-123',
      pseudo: 'AlphaBird',
      frequenceHEX: '#2D3748',
      sanctuaire: {
        biographie: 'Je veille sur le Nexus.',
        localisation: 'Bruxelles'
      },
      cvProfile: {
        professionalStatus: 'FREELANCE',
        remotePreference: 'FULL_REMOTE',
        freelanceDailyRateCents: 50000
      }
    };

    globalFetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => mockProfile,
    });

    const jsx = await ProfilePage({ params: { slug: 'u-123' } });

    render(
      <QueryClientProvider client={queryClient}>
        {jsx}
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(/Ton Coffre-Fort/i)).toBeDefined();
      // Utilisation de getAllByText car 'AlphaBird' apparaît à plusieurs endroits (Coffre-fort + UserCard)
      const alphaBirdElements = screen.getAllByText('AlphaBird');
      expect(alphaBirdElements.length).toBeGreaterThan(0);
      
      expect(screen.getByText('Je veille sur le Nexus.')).toBeDefined();
      expect(screen.getByText('FREELANCE')).toBeDefined();
    });
  });
});