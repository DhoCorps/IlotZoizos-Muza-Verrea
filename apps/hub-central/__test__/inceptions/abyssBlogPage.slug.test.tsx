import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AbyssBlogPostPage from '@/app/[locale]/(inceptions)/abyss-blog/[slug]/page';
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

// Mock de l'API Audio native
const mockPlay = vi.fn();
const mockPause = vi.fn();

describe('Page : AbyssBlogPostPage', () => {
  let queryClient: QueryClient;

  beforeAll(() => {
    // 🛡️ CORRECTION : On mock le prototype DOM natif au lieu d'écraser le constructeur Audio
    // Cela permet à `new Audio()` de créer un vrai HTMLAudioElement pour JSDOM.
    Object.defineProperty(window.HTMLMediaElement.prototype, 'play', {
      configurable: true,
      value: mockPlay
    });
    Object.defineProperty(window.HTMLMediaElement.prototype, 'pause', {
      configurable: true,
      value: mockPause
    });
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
        <AbyssBlogPostPage />
      </QueryClientProvider>
    );
  };

  it('affiche un état de chargement initial', () => {
    (global.fetch as any).mockImplementation(() => new Promise(() => {}));
    renderComponent();
    expect(screen.getByTestId('loader')).toBeDefined();
  });

  it('affiche le message d\'erreur si le sujet n\'existe pas', async () => {
    (global.fetch as any).mockImplementation((url: string) => {
      if (url.includes('/api/sujets')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
    });

    renderComponent();
    
    await waitFor(() => {
      expect(screen.getByText("Ce monologue s'est évaporé.")).toBeDefined();
    });
  });

  it('rend correctement le sujet, le lecteur audio et la liste des échos', async () => {
    (global.fetch as any).mockImplementation((url: string) => {
      if (url.includes('/api/sujets')) {
        return Promise.resolve({ 
          ok: true, 
          json: () => Promise.resolve([{
            uid: 's-123',
            slug: 'mon-sujet-test',
            title: 'Titre Sublime',
            content: 'Le contenu profond du sujet...',
            category: 'POETRY',
            createdAt: new Date().toISOString(),
            media: { audioTrackUrl: 'https://cdn.ilot/audio.mp3' }
          }]) 
        });
      }
      if (url.includes('/api/resonance/echoes')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([{ uid: 'e-1', content: 'Superbe texte !', createdAt: new Date().toISOString() }])
        });
      }
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Titre Sublime')).toBeDefined();
      expect(screen.getByText('Le contenu profond du sujet...')).toBeDefined();
      expect(screen.getByText('POETRY')).toBeDefined();
    });

    expect(screen.getByText('Superbe texte !')).toBeDefined();

    const audioBtn = screen.getByTestId('audio-toggle-btn');
    expect(audioBtn).toBeDefined();
    expect(screen.getByText('Écouter')).toBeDefined();

    fireEvent.click(audioBtn);
    expect(mockPlay).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Silence')).toBeDefined();

    fireEvent.click(audioBtn);
    expect(mockPause).toHaveBeenCalledTimes(1);
  });

  it('permet de soumettre un nouvel écho', async () => {
    (global.fetch as any).mockImplementation((url: string, options?: any) => {
      if (options?.method === 'POST') {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ success: true }) });
      }
      if (url.includes('/api/sujets')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve([{ uid: 's-123', slug: 'mon-sujet-test', title: 'Test' }]) });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Test')).toBeDefined();
    });

    const textarea = screen.getByPlaceholderText('Ajouter un écho...');
    const submitBtn = screen.getByText('Propager');

    fireEvent.change(textarea, { target: { value: 'Mon nouveau commentaire' } });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/resonance/echoes', expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('Mon nouveau commentaire')
      }));
    });
  });
});