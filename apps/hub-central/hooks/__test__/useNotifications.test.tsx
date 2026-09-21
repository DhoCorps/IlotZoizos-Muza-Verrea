import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useNotifications } from '@/hooks/useNotifications';
import React from 'react';

// Configuration du client de test
const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } }
});

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

describe('Hook : useNotifications', () => {
  beforeEach(() => {
    queryClient.clear();
    global.fetch = vi.fn();
  });

  it('récupère correctement les notifications et le compteur de non-lues', async () => {
    (global.fetch as any).mockImplementation((url: string) => {
      if (url.includes('/api/notifications')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            unreadCount: 1,
            data: [{ uid: 'notif-1', isRead: false, payload: { message: 'Un nouvel écho résonne.' } }]
          })
        });
      }
    });

    const { result } = renderHook(() => useNotifications(), { wrapper });

    // Attente de la résolution du chargement asynchrone
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.notifications).toHaveLength(1);
    expect(result.current.unreadCount).toBe(1);
    expect(result.current.notifications[0].payload.message).toBe('Un nouvel écho résonne.');
  });
});