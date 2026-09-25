// Fichier : __tests__/UserForm.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import BirdProfileForm from '@/components/users/UserForm';

const globalFetchMock = vi.fn();
global.fetch = globalFetchMock;

describe('Composant : BirdProfileForm (UserForm avec CvProfileEditor)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const initialProps = {
    initialData: {
      uid: 'bird-123',
      slug: 'bird-123',
      pseudo: 'AlphaBird',
      frequenceHEX: '#2D3748',
      capabilities: ['member:update'],
      cvProfile: {
        professionalStatus: 'FREELANCE',
        remotePreference: 'FULL_REMOTE',
        freelanceDailyRateCents: 50000,
        experiences: [{ title: 'Lead Dev', company: 'Ilot', isVisibleInCv: true }],
        educations: []
      }
    },
    userCapabilities: ['member:update']
  };

  it('doit rendre le formulaire avec les données initiales de l\'Oiseau, du profil CV et du sous-composant CvProfileEditor', () => {
    render(<BirdProfileForm {...initialProps} />);

    expect(screen.getByDisplayValue('AlphaBird')).toBeDefined();
    
    const statusSelect = screen.getByLabelText(/Statut Professionnel/i) as HTMLSelectElement;
    expect(statusSelect.value).toBe('FREELANCE');

    const remoteSelect = screen.getByLabelText(/Préférence Télétravail/i) as HTMLSelectElement;
    expect(remoteSelect.value).toBe('FULL_REMOTE');

    expect(screen.getByDisplayValue('500')).toBeDefined();
    expect(screen.getByDisplayValue('Lead Dev')).toBeDefined();
    expect(screen.getByDisplayValue('Ilot')).toBeDefined();
  });

  it('doit effectuer une requête PATCH vers /api/users/[slug] avec le cvProfile mis à jour lors de la soumission', async () => {
    globalFetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true })
    });

    render(<BirdProfileForm {...initialProps} />);

    const submitButton = screen.getByRole('button', { name: /SCELLER LE PROFIL & CV/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(globalFetchMock).toHaveBeenCalledWith(
        '/api/users/bird-123',
        expect.objectContaining({
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: expect.any(String)
        })
      );
    });

    const calledBody = JSON.parse(globalFetchMock.mock.calls[0][1].body);
    expect(calledBody.cvProfile.freelanceDailyRateCents).toBe(50000);
    expect(calledBody.cvProfile.professionalStatus).toBe('FREELANCE');
    expect(calledBody.cvProfile.experiences).toHaveLength(1);
    expect(calledBody.cvProfile.experiences[0].title).toBe('Lead Dev');
  });
});