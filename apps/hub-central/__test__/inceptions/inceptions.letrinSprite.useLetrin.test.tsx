import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useLetrin } from '@/app/[locale]/(inceptions)/letrinSprite/useLetrin';

vi.mock('next-auth/react', () => ({
  useSession: vi.fn(() => ({ data: { user: { id: 'u-123' } } }))
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() }
}));

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } }
});

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>
    {children}
  </QueryClientProvider>
);

describe('Hook : useLetrin (Logique Client-Serveur)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    queryClient.clear();
  });

  it('🟢 Doit récupérer les polices avec les filtres taxonomiques attachés à l\'URL', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: [{ uid: 'f_1', name: 'GothFont' }] })
    } as Response);

    const { result } = renderHook(() => useLetrin({ category: 'GOTHIQUE', tag: 'sombre' }), { wrapper });

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(global.fetch).toHaveBeenCalledWith('/api/letrin/sprites?category=GOTHIQUE&tag=sombre');
    expect(result.current.fonts).toHaveLength(1);
    expect(result.current.fonts[0].name).toBe('GothFont');
  });

  it('🟢 Doit déclencher la mutation DELETE sur la route dynamique unifiée', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({}) } as Response);

    const { result } = renderHook(() => useLetrin(), { wrapper });

    // Contourne le window.confirm
    vi.spyOn(window, 'confirm').mockImplementation(() => true);

    result.current.handleDelete('f_1');

    await waitFor(() => expect(result.current.deleteMutation.isSuccess).toBe(true));
    expect(global.fetch).toHaveBeenCalledWith('/api/letrin/sprites/f_1', { method: 'DELETE' });
  });
});