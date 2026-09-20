import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AbyssBlogClientView from '@/app/[locale]/(inceptions)/abyss-blog/[slug]/AbyssBlogClientView';
import React from 'react';

// ==========================================
// MOCKS GLOBAUX
// ==========================================
vi.mock('next/navigation', () => ({
  useParams: () => ({ slug: 'mon-sujet-test' }),
  useRouter: () => ({ push: vi.fn() })
}));

vi.mock('@/hooks/usePageChapeauContext', () => ({
  usePageChapeauContext: vi.fn()
}));

vi.mock('../../../../../../components/widget/OmniActionWidget', () => ({
  OmniActionWidget: () => <div data-testid="omni-widget">Widget Mock</div>
}));

const mockOpenDrawer = vi.fn();
vi.mock('@/components/global/UniversalCommentDrawer', () => ({
  UniversalCommentDrawer: () => <div data-testid="universal-drawer-mock">Tiroir Mock</div>,
  useCommentDrawer: () => ({
    openDrawer: mockOpenDrawer
  })
}));

const mockPlay = vi.fn();
const mockPause = vi.fn();

describe('UI & Logique : AbyssBlogClientView', () => {
  let queryClient: QueryClient;

  // 🟢 Ajout des tags au mock
  const mockSujet = {
    uid: 's-123',
    slug: 'mon-sujet-test',
    title: 'Titre Sublime',
    content: 'Le contenu profond du sujet...',
    category: 'POETRY',
    createdAt: new Date().toISOString(),
    media: { audioTrackUrl: 'https://cdn.ilot/audio.mp3' },
    authorUid: 'author_1',
    tags: ['abysse', 'poésie']
  };

  const mockInitialComments = [
    { uid: 'e-1', content: 'Premier écho SSR', createdAt: new Date().toISOString(), authorUid: 'oiseau_1' }
  ];

  beforeAll(() => {
    Object.defineProperty(window.HTMLMediaElement.prototype, 'play', { configurable: true, value: mockPlay });
    Object.defineProperty(window.HTMLMediaElement.prototype, 'pause', { configurable: true, value: mockPause });
  });

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } }
    });
    global.fetch = vi.fn();
  });

  const renderComponent = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <AbyssBlogClientView sujet={mockSujet} initialComments={mockInitialComments} />
      </QueryClientProvider>
    );
  };

  it('🟢 doit rendre correctement le sujet, ses tags, les commentaires SSR et le bouton d\'ouverture des résonances', () => {
    renderComponent();

    expect(screen.getByText('Titre Sublime')).toBeDefined();
    expect(screen.getByText('Le contenu profond du sujet...')).toBeDefined();
    expect(screen.getByText('Premier écho SSR')).toBeDefined();
    
    // 💥 Vérification de l'affichage des tags
    expect(screen.getByText('abysse')).toBeDefined();
    expect(screen.getByText('poésie')).toBeDefined();

    const openDrawerBtn = screen.getByTestId('open-resonance-drawer-btn');
    expect(openDrawerBtn).toBeDefined();

    fireEvent.click(openDrawerBtn);
    expect(mockOpenDrawer).toHaveBeenCalledWith('s-123', 'BLOG');
  });

  it('🟢 doit permettre de basculer la lecture audio (Play / Pause)', () => {
    renderComponent();

    const audioBtn = screen.getByTestId('audio-toggle-btn');
    expect(audioBtn).toBeDefined();
    expect(screen.getByText('Écouter')).toBeDefined();

    fireEvent.click(audioBtn);
    expect(mockPlay).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Silence')).toBeDefined();

    fireEvent.click(audioBtn);
    expect(mockPause).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Écouter')).toBeDefined();
  });

  it('🟢 doit permettre de soumettre un nouvel écho textuel', async () => {
    (global.fetch as any).mockImplementation((url: string, options?: any) => {
      if (options?.method === 'POST') {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ success: true }) });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
    });

    renderComponent();

    const textarea = screen.getByPlaceholderText('Ajouter un écho...');
    const submitBtn = screen.getByText('Propager');

    fireEvent.change(textarea, { target: { value: 'Mon nouveau commentaire dans l\'abysse' } });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/resonance/echoes', expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('Mon nouveau commentaire dans l\'abysse')
      }));
    });
  });
});