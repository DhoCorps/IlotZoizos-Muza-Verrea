// apps/hub-central/__test__/component/users.UserCard.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { UserCard } from '@/components/users/UserCard';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false },
  },
});

describe('Composant : UserCard', () => {
  const mockUser = {
    uid: 'bird-123',
    slug: 'bird-123',
    pseudo: 'AlphaBird',
    frequenceHEX: '#2D3748',
    capabilities: ['user'],
    sanctuaire: {
      biographie: 'Je chante dans la canopée.',
      localisation: 'Paris'
    },
    cvProfile: {
      professionalStatus: 'FREELANCE',
      remotePreference: 'FULL_REMOTE',
      freelanceDailyRateCents: 45000 // 450 €
    }
  };

  it('doit afficher toutes les informations de l\'Oiseau, y compris le profil CV et la biographie', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <UserCard user={mockUser as any} />
      </QueryClientProvider>
    );

    // Utilisation d'une regex insensible à la casse pour le pseudo
    expect(screen.getByText(/alphabird/i)).toBeDefined();
    expect(screen.getByText('Je chante dans la canopée.')).toBeDefined();
    expect(screen.getByText('Paris')).toBeDefined();
    expect(screen.getByText('FREELANCE')).toBeDefined();
    expect(screen.getByText('FULL_REMOTE')).toBeDefined();
    expect(screen.getByText('450 €')).toBeDefined();
  });
});