import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import KontaktCVEditorPage from '@/app/[locale]/(inceptions)/kontakt/cv-editor/page';

const globalFetchMock = vi.fn();
vi.stubGlobal('fetch', globalFetchMock);

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn()
  }
}));

const renderWithQueryClient = (ui: React.ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } }
  });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
};

describe('Page KontaktCVEditorPage (app/[locale]/(inceptions)/kontakt/cv-editor/page.tsx)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('🟢 doit envoyer archetypeClass et attributes lors de la sauvegarde du CV vers POST /api/kontakt/profiles', async () => {
    globalFetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: { uid: 'kontakt_cv_1', slug: 'architecte-fullstack' }
      })
    });

    renderWithQueryClient(<KontaktCVEditorPage />);

    expect(screen.getByText(/Éditeur Synaptique de Parchemin/i)).toBeInTheDocument();

    fireEvent.click(screen.getByText(/Sédimenter le CV/i));

    await waitFor(() => {
      expect(globalFetchMock).toHaveBeenCalledTimes(1);
      const [url, options] = globalFetchMock.mock.calls[0];
      expect(url).toBe('/api/kontakt/profiles');
      expect(options.method).toBe('POST');

      const body = JSON.parse(options.body);
      expect(body.professionalTitle).toBe('Architecte Fullstack & Sceaux Graphe');
      expect(body.archetypeClass).toBe('Mage de Silice'); // 🛡️ Champ requis bien présent !
      expect(body.attributes).toEqual({
        force: 12,
        agilite: 15,
        intelligence: 19,
        charisme: 14,
        empathieVoightKampff: 85
      });
    });
  });
});