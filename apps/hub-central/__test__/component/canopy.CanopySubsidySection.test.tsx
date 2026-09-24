import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CanopySubsidySection } from '@/components/canopy/CanopySubsidySection';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { toast } from 'sonner';
import React from 'react';

// 🎭 Mocks
vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() }
}));

describe('UI & Logique : CanopySubsidySection (React Query & Optimistic Updates)', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
    
    queryClient = new QueryClient({
      defaultOptions: { 
        queries: { retry: false },
        mutations: { retry: false } 
      }
    });
  });

  const renderSection = (initialSubsidies: any[] = []) => render(
    <QueryClientProvider client={queryClient}>
      <CanopySubsidySection initialSubsidies={initialSubsidies} />
    </QueryClientProvider>
  );

  it('🟢 doit afficher les subventions hydratées via le SSR (initialData)', () => {
    const mockData = [{
      _id: 'sub_1',
      uid: 'sub_1',
      title: 'Projet A',
      motivation: 'Motiv A',
      requestedAmount: 500,
      currency: 'TOX',
      voteCount: 10,
      status: 'PENDING',
      isRented: false
    }];

    renderSection(mockData);
    
    expect(screen.getByText('Projet A')).toBeDefined();
    expect(screen.getByText(/Motiv A/)).toBeDefined();
    expect(screen.getByText(/500 TOX/)).toBeDefined();
    expect(screen.getByText(/10 votes/)).toBeDefined();
  });

  it('🟢 doit effectuer une mise à jour optimiste du vote instantanément avant la réponse réseau', async () => {
    const mockData = [{
      _id: 'sub_2',
      uid: 'sub_2',
      title: 'Projet B',
      motivation: 'Motiv B',
      requestedAmount: 100,
      currency: 'DHO',
      voteCount: 0,
      status: 'PENDING',
      isRented: false
    }];

    renderSection(mockData);

    let resolveFetch: any;
    const delayedFetch = new Promise((resolve) => {
      resolveFetch = resolve;
    });

    (global.fetch as any).mockReturnValueOnce(delayedFetch);

    fireEvent.click(screen.getByText(/Voter 🗳️/i));

    await waitFor(() => {
      expect(screen.getByText((_, node) => {
        const text = node?.textContent || '';
        return Boolean(
          node?.children.length === 0 &&
          text.includes('Plébiscite') && 
          text.includes('1') && 
          text.includes('votes')
        );
      })).toBeDefined();
    });

    resolveFetch({
      ok: true,
      json: async () => ({ success: true })
    });

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith(expect.stringContaining('Vote enregistré'));
    });
  });

  it('🟢 doit ouvrir le module de débat (UniversalComment) au clic sur "Débattre"', () => {
    const mockData = [{
      _id: 'sub_3',
      uid: 'sub_3',
      title: 'Projet C',
      motivation: 'Motiv C',
      requestedAmount: 100,
      currency: 'DHO',
      voteCount: 0,
      status: 'PENDING',
      isRented: false
    }];

    renderSection(mockData);

    expect(screen.queryByText(/Composant UniversalComment injecté ici/)).toBeNull();

    fireEvent.click(screen.getByText(/Débattre 💬/i));

    expect(screen.getByText(/Interface UniversalComment \(Cible: SUBSIDY\)/)).toBeDefined();
  });
});