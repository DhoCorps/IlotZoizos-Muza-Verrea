import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import KontaktCVEditorPage from '@/app/[locale]/(inceptions)/kontakt/cv-editor/page';
import React from 'react';

// 🎭 Mocks globaux
const fetchMock = vi.fn();
vi.stubGlobal('fetch', fetchMock);

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() }
}));

vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
  useMutation: (options: any) => ({
    mutate: (payload: any) => options.mutationFn(payload).then(options.onSuccess).catch(options.onError),
    isPending: false,
  }),
}));

describe('Page d’inception KontaktCVEditorPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('🟢 doit rendre l’éditeur synaptique et permettre de sédimenter le CV', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true })
    });

    render(<KontaktCVEditorPage />);

    expect(screen.getByText('Éditeur Synaptique de Parchemin')).toBeInTheDocument();

    const saveButton = screen.getByText('Sédimenter le CV');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith('/api/kontakt/profiles', expect.objectContaining({
        method: 'POST',
      }));
    });
  });
});