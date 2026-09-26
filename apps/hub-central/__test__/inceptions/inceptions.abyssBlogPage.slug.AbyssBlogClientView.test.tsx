import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AbyssBlogClientView from '@/app/[locale]/(inceptions)/abyss-blog/[slug]/AbyssBlogClientView';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

// -------------------------------------------------------------------------
// 🎭 MOCKS
// -------------------------------------------------------------------------
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() })
}));

vi.mock('next-auth/react', () => ({
  useSession: () => ({ data: { user: { uid: 'user_123', capabilities: ['*'] } } })
}));

vi.mock('@/hooks/usePageChapeauContext', () => ({
  usePageChapeauContext: vi.fn()
}));

vi.mock('@/components/global/UniversalCommentDrawer', () => ({
  useCommentDrawer: () => ({ openDrawer: vi.fn() })
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() }
}));

describe('UI & Logique : AbyssBlogClientView (Vue Client de l\'Article)', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } }
    });
  });

  const mockSujet = {
    uid: 'sujet_123',
    title: 'Chronique des Profondeurs',
    content: 'Ceci est le contenu secret de l’abysse.',
    category: 'TUTORIAL',
    status: 'PUBLISHED',
    authorUid: 'author_123',
    authorName: 'Oiseau des Abysses',
    createdAt: new Date().toISOString(),
    tags: ['matrix', 'neo4j'],
    media: { audioTrackUrl: '' }
  };

  const mockComments = [
    {
      uid: 'comm_1',
      actorUid: 'scholar_1',
      content: 'Une fulgurance remarquable validée.',
      isScholarSealed: true,
      isHidden: false,
      createdAt: new Date().toISOString()
    }
  ];

  it('🟢 doit afficher le contenu de l’article, le wrapper de sélection et les échos remarquables', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <AbyssBlogClientView sujet={mockSujet} initialComments={mockComments} />
      </QueryClientProvider>
    );

    // Vérification du titre et du contenu
    expect(screen.getByText('Chronique des Profondeurs')).toBeDefined();
    expect(screen.getByText('Ceci est le contenu secret de l’abysse.')).toBeDefined();

    // Vérifie que les échos remarquables (Sceau de l'Érudit) s'affichent correctement
    expect(screen.getByText('Échos Remarquables')).toBeDefined();
    expect(screen.getByText('Une fulgurance remarquable validée.')).toBeDefined();
    expect(screen.getByText("📜 Sceau de l'Érudit")).toBeDefined();
  });

  it('🟢 doit permettre d’envoyer un nouvel écho via le formulaire de propagation', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true })
    });

    render(
      <QueryClientProvider client={queryClient}>
        <AbyssBlogClientView sujet={mockSujet} initialComments={mockComments} />
      </QueryClientProvider>
    );

    const textarea = screen.getByPlaceholderText('Ajouter un écho...');
    fireEvent.change(textarea, { target: { value: 'Super article, bravo !' } });

    const submitBtn = screen.getByText('Propager');
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/resonance/echoes', expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('Super article, bravo !')
      }));
    });
  });
});