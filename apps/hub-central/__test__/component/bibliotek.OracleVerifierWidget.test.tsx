import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { OracleVerifierWidget } from '@/components/bibliotek/OracleVerifierWidget';
import React from 'react';

describe('UI & Logique : OracleVerifierWidget (Vérification d’antériorité)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  it('🟢 doit rendre le widget d’oracle avec son champ de recherche et son bouton', () => {
    render(<OracleVerifierWidget />);

    expect(screen.getByText("L'Oracle du Sceau")).toBeDefined();
    expect(screen.getByPlaceholderText(/Colle le sceau SHA-256/i)).toBeDefined();
    expect(screen.getByTestId('oracle-submit-btn')).toBeDefined();
  });

  it('🟢 doit interroger l’API oracle et afficher les métadonnées de l’ouvrage en cas de sceau valide', async () => {
    const mockBookData = {
      uid: 'book_abc',
      title: 'Le Chant de la Silice',
      authorSlug: 'Oiseau Solitaire',
      writingType: 'essai',
      style: 'philosophie',
      digitalSignature: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      timestampedAt: new Date().toISOString(),
    };

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        verified: true,
        data: mockBookData
      })
    });

    render(<OracleVerifierWidget />);

    const input = screen.getByPlaceholderText(/Colle le sceau SHA-256/i);
    fireEvent.change(input, { target: { value: mockBookData.digitalSignature } });

    const submitBtn = screen.getByTestId('oracle-submit-btn');
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(`/api/bibliotek/oracle?signature=${mockBookData.digitalSignature}`);
      expect(screen.getByTestId('oracle-success-box')).toBeDefined();
      expect(screen.getByText('Le Chant de la Silice')).toBeDefined();
      expect(screen.getByText('Oiseau Solitaire')).toBeDefined();
    });
  });

  it('🔴 doit afficher une erreur si l’Oracle rejette le sceau (404)', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      json: async () => ({
        success: false,
        error: "Aucun ouvrage ne correspond à ce sceau dans le Sanctuaire."
      })
    });

    render(<OracleVerifierWidget />);

    const input = screen.getByPlaceholderText(/Colle le sceau SHA-256/i);
    fireEvent.change(input, { target: { value: 'bad_hash_999' } });

    fireEvent.click(screen.getByTestId('oracle-submit-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('oracle-error-box')).toBeDefined();
      expect(screen.getByText(/Aucun ouvrage ne correspond à ce sceau/i)).toBeDefined();
    });
  });
});