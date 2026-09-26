import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import KontaktDashboard from '@/app/[locale]/(inceptions)/kontakt/page';
import React from 'react';

// 🎭 Mock du hook useKontakt
vi.mock('@/app/[locale]/(inceptions)/kontakt/useKontakt', () => ({
  useKontakt: () => ({
    quests: [
      { uid: 'quest_1', title: 'Quête Neo4j', description: 'Sauver le graphe', status: 'ACTIVE', requiredSkills: ['Neo4j'] }
    ],
    profiles: [],
    loading: false,
    error: null,
    activeTab: 'quests',
    setActiveTab: vi.fn(),
    refreshKontakt: vi.fn(),
  })
}));

// 🎭 Mock de react-query et sonner
vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
  useMutation: () => ({ mutate: vi.fn(), isPending: false }),
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() }
}));

describe('Page d’inception KontaktDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('🟢 doit afficher le tableau des quêtes avec succès', async () => {
    render(<KontaktDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Le Tinder des Équipages')).toBeInTheDocument();
      expect(screen.getByText('Quête Neo4j')).toBeInTheDocument();
      expect(screen.getByText('Sauver le graphe')).toBeInTheDocument();
    });
  });
});