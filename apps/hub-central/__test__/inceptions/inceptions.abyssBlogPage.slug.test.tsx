import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AbyssBlogClientView from '@/app/[locale]/(inceptions)/abyss-blog/[slug]/AbyssBlogClientView';
import React from 'react';

// 🎭 MOCKS GLOBAUX
vi.mock('next/navigation', () => ({
  useParams: () => ({ slug: 'mon-sujet-test' }),
  useRouter: () => ({ push: vi.fn() })
}));

vi.mock('@/hooks/usePageChapeauContext', () => ({
  usePageChapeauContext: vi.fn()
}));

vi.mock('../../../../../components/widget/OmniActionWidget', () => ({
  OmniActionWidget: () => <div data-testid="omni-widget">Widget Mock</div>
}));

// Mock du store Zustand du Tiroir global et de son hook d'ouverture
const mockOpenDrawer = vi.fn();
vi.mock('@/components/global/UniversalCommentDrawer', () => ({
  UniversalCommentDrawer: () => <div data-testid="universal-drawer-mock">Tiroir Mock</div>,
  useCommentDrawer: () => ({
    openDrawer: mockOpenDrawer
  })
}));

const mockPlay = vi.fn();
const mockPause = vi.fn();

describe('Page Client : AbyssBlogClientView & Tiroir Integration', () => {
  let queryClient: QueryClient;

  const mockSujet = {
    uid: 's-123',
    slug: 'mon-sujet-test',
    title: 'Titre Sublime',
    content: 'Le contenu profond du sujet...',
    category: 'POETRY',
    createdAt: new Date().toISOString(),
    media: { audioTrackUrl: 'https://cdn.ilot/audio.mp3' },
    authorUid: 'author_1'
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
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    global.fetch = vi.fn();
  });

  const renderComponent = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <AbyssBlogClientView sujet={mockSujet} initialComments={mockInitialComments} />
      </QueryClientProvider>
    );
  };

  it('rend correctement le sujet, les commentaires initiaux SSR et le bouton d\'ouverture des résonances', async () => {
    renderComponent();

    expect(screen.getByText('Titre Sublime')).toBeDefined();
    expect(screen.getByText('Le contenu profond du sujet...')).toBeDefined();
    expect(screen.getByText('Premier écho SSR')).toBeDefined();

    // Vérification de la présence du bouton pour ouvrir le tiroir des résonances
    const openDrawerBtn = screen.getByTestId('open-resonance-drawer-btn');
    expect(openDrawerBtn).toBeDefined();

    // Test de l'appel au store Zustand lors du clic
    fireEvent.click(openDrawerBtn);
    expect(mockOpenDrawer).toHaveBeenCalledWith('s-123', 'BLOG');
  });

  it('permet de basculer l\'audio attaché', async () => {
    renderComponent();

    const audioBtn = screen.getByTestId('audio-toggle-btn');
    expect(audioBtn).toBeDefined();

    fireEvent.click(audioBtn);
    expect(mockPlay).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Silence')).toBeDefined();

    fireEvent.click(audioBtn);
    expect(mockPause).toHaveBeenCalledTimes(1);
  });
});