// apps/hub-central/app/[locale]/(inceptions)/partita/__tests__/usePartita.test.ts
import { renderHook, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { usePartita } from '@/app/[locale]/(inceptions)/partita/usePartita';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

// -------------------------------------------------------------------------
// 🎭 MOCKS DES DÉPENDANCES GLOBALES
// -------------------------------------------------------------------------
vi.mock('next-auth/react', () => ({
  useSession: () => ({ data: { user: { name: 'Oiseau Test' } } })
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  }
}));

global.fetch = vi.fn();
global.confirm = vi.fn(() => true); // Simule la validation de la boîte de dialogue de suppression

const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: { retry: false },
  },
});

function createWrapper() {
  const queryClient = createTestQueryClient();
  return ({ children }: { children: React.ReactNode }) => (
    React.createElement(QueryClientProvider, { client: queryClient }, children)
  );
}

describe('Hook : usePartita', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('🟢 doit récupérer et lister les partitions avec succès', async () => {
    const mockPartitions = [{ uid: 'part_1', title: 'Sonate en Ut' }];
    
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => mockPartitions,
    } as any);

    const { result } = renderHook(() => usePartita(), { wrapper: createWrapper() });

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.partitions).toEqual(mockPartitions);
      expect(result.current.loading).toBe(false);
    });

    expect(global.fetch).toHaveBeenCalledWith('/api/partita');
  });

  it('🟢 doit gérer la suppression (dissolution) d\'une partition avec succès', async () => {
    // 1. Mock du chargement initial
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => [{ uid: 'part_1', title: 'À supprimer' }],
    } as any);

    // 2. Mock de la requête DELETE
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    } as any);

    const { result } = renderHook(() => usePartita(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.partitions).toHaveLength(1);
    });

    // Déclenchement de la suppression
    await act(async () => {
      result.current.handleDelete('part_1');
    });

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/partita/part_1', { method: 'DELETE' });
    });
  });

  it('🟢 doit manipuler l\'état des modales (activeModal et selectedUid)', () => {
    const { result } = renderHook(() => usePartita(), { wrapper: createWrapper() });

    expect(result.current.activeModal).toBeNull();
    expect(result.current.selectedUid).toBeNull();

    act(() => {
      result.current.setActiveModal('edit-score');
      result.current.setSelectedUid('part_999');
    });

    expect(result.current.activeModal).toBe('edit-score');
    expect(result.current.selectedUid).toBe('part_999');
  });
});