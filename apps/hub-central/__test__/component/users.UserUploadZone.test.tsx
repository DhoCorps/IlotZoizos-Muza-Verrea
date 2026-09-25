// apps/hub-central/__test__/component/users.UserUploadZone.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { UserUploadZone } from '@/components/users/UserUploadZone';

const globalFetchMock = vi.fn();
global.fetch = globalFetchMock;

describe('Composant : UserUploadZone', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('doit rejeter un fichier dont le format n\'est pas autorisé', async () => {
    render(<UserUploadZone imageType="avatarUrl" />);

    const fileInput = screen.getByTestId('file-input');
    const invalidFile = new File(['dummy content'], 'document.pdf', { type: 'application/pdf' });

    fireEvent.change(fileInput, { target: { files: [invalidFile] } });

    await waitFor(() => {
      expect(screen.getByTestId('status-message')).toBeDefined();
      expect(screen.getByText(/La Silice attend une image, pas du application\/pdf/i)).toBeDefined();
    });

    expect(globalFetchMock).not.toHaveBeenCalled();
  });

  it('doit réussir le téléversement (POST /api/users/upload) si le fichier est valide', async () => {
    const mockOnSuccess = vi.fn();
    globalFetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, publicUrl: 'https://storage.ilot/avatar.png' })
    });

    render(<UserUploadZone imageType="avatarUrl" onSuccess={mockOnSuccess} />);

    const fileInput = screen.getByTestId('file-input');
    const validFile = new File(['image dummy bytes'], 'avatar.png', { type: 'image/png' });

    fireEvent.change(fileInput, { target: { files: [validFile] } });

    await waitFor(() => {
      expect(globalFetchMock).toHaveBeenCalledWith(
        '/api/users/upload',
        expect.objectContaining({ method: 'POST' })
      );
      expect(mockOnSuccess).toHaveBeenCalledWith('https://storage.ilot/avatar.png');
      expect(screen.getByText(/L'apparence a muté avec succès/i)).toBeDefined();
    });
  });
});