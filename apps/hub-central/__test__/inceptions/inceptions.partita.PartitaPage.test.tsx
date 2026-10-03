// apps/hub-central/__test__/inceptions/inceptions.partita.PartitaPage.test.tsx
import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import PartitaDashboard from '../../app/[locale]/(inceptions)/partita/page';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

// -------------------------------------------------------------------------
// 🎭 MOCKS DES DÉPENDANCES ET DE NEXT-AUTH
// -------------------------------------------------------------------------
vi.mock('next-auth/react', () => ({
  useSession: () => ({ data: { user: { name: 'Oiseau Test' } }, status: 'authenticated' }),
  SessionProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/hooks/usePageChapeauContext', () => ({
  usePageChapeauContext: vi.fn(),
}));

vi.mock('@/components/resonance/ResonanceButton', () => ({
  default: () => <div data-testid="resonance-btn">Resonance</div>
}));

vi.mock('@/components/partita/PartitaCard', () => ({
  PartitaCard: ({ partition, onEdit, onDelete }: any) => (
    <div data-testid={`card-${partition.uid}`}>
      <span>{partition.title}</span>
      <button onClick={() => onEdit(partition)} data-testid={`edit-${partition.uid}`}>Éditer</button>
      <button onClick={() => onDelete(partition.uid)} data-testid={`delete-${partition.uid}`}>Supprimer</button>
    </div>
  )
}));

vi.mock('@/components/partita/PartitaForm', () => ({
  PartitaForm: ({ onSuccess }: any) => (
    <div data-testid="partita-form">
      <button onClick={onSuccess} data-testid="submit-form-mock">Valider Formulaire</button>
    </div>
  )
}));

global.fetch = vi.fn();
global.confirm = vi.fn(() => true);

const createTestQueryClient = () => new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

function createWrapper() {
  const queryClient = createTestQueryClient();
  return ({ children }: { children: React.ReactNode }) => (
    React.createElement(QueryClientProvider, { client: queryClient }, children)
  );
}

describe('PartitaDashboard Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Mock des réponses fetch par défaut (Partitions et Projets)
    vi.mocked(global.fetch).mockImplementation(async (url: any) => {
      if (url.includes('/api/partita')) {
        return {
          ok: true,
          json: async () => [
            { uid: 'part_1', title: 'Sonate en La', status: 'PUBLISHED', instrument: 'GUITAR' },
            { uid: 'part_2', title: 'Basse Fretless Loop', status: 'DRAFT', instrument: 'BASS' }
          ]
        } as any;
      }
      if (url.includes('/api/projects')) {
        return {
          ok: true,
          json: async () => [{ uid: 'proj_1', name: 'Chantier Canopée' }]
        } as any;
      }
      return { ok: false } as any;
    });
  });

  it('🟢 doit afficher le tableau de bord avec les partitions récupérées', async () => {
    render(<PartitaDashboard />, { wrapper: createWrapper() });

    expect(screen.getByText('La Partitionnerie')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByTestId('card-part_1')).toBeInTheDocument();
      expect(screen.getByTestId('card-part_2')).toBeInTheDocument();
      expect(screen.getByText('Sonate en La')).toBeInTheDocument();
      expect(screen.getByText('Basse Fretless Loop')).toBeInTheDocument();
    });
  });

  it('🟢 doit ouvrir la modale de création au clic sur le bouton Nouvelle Partition', async () => {
    render(<PartitaDashboard />, { wrapper: createWrapper() });

    const createBtn = screen.getByTestId('btn-new-partition');
    fireEvent.click(createBtn);

    await waitFor(() => {
      expect(screen.getByTestId('partita-form')).toBeInTheDocument();
      expect(screen.getByText('Inscrire une Partition')).toBeInTheDocument();
    });
  });

  it('🟢 doit ouvrir la modale d\'édition avec les données au clic sur Éditer', async () => {
    render(<PartitaDashboard />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByTestId('edit-part_1')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('edit-part_1'));

    await waitFor(() => {
      expect(screen.getByTestId('partita-form')).toBeInTheDocument();
      expect(screen.getByText('Ajuster la Partition')).toBeInTheDocument();
    });
  });

  it('🟢 doit filtrer les partitions selon la recherche textuelle', async () => {
    render(<PartitaDashboard />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Sonate en La')).toBeInTheDocument();
      expect(screen.getByText('Basse Fretless Loop')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText('Rechercher une note, une tab...');
    fireEvent.change(searchInput, { target: { value: 'Basse' } });

    expect(screen.queryByText('Sonate en La')).not.toBeInTheDocument();
    expect(screen.getByText('Basse Fretless Loop')).toBeInTheDocument();
  });
});