import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAbyssBlog } from '@/hooks/useAbyssBlog';
import React from 'react';

// Configuration du client de test
const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } }
});

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

describe('Hook : useAbyssBlog', () => {
  beforeEach(() => {
    queryClient.clear();
    global.fetch = vi.fn();
  });

  it('récupère correctement les sujets et les projets', async () => {
    (global.fetch as any).mockImplementation((url: string) => {
      if (url.includes('/api/sujets')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve([{ uid: 's-1', title: 'Test' }]) });
      }
      if (url.includes('/api/projects')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve([{ uid: 'p-1' }]) });
      }
    });

    const { result } = renderHook(() => useAbyssBlog(), { wrapper });

    // Attendre la fin du chargement
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.sujets).toHaveLength(1);
    expect(result.current.sujets[0].title).toBe('Test');
    expect(result.current.projects).toHaveLength(1);
  });
});