import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import KontaktProfileFormModal from '@/components/kontakt/KontaktProfileFormModal';
import React from 'react';

const globalFetchMock = vi.fn();
vi.stubGlobal('fetch', globalFetchMock);

describe('Composant KontaktProfileFormModal (POST, PUT, DELETE /api/kontakt/profiles)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('🟢 doit créer un profil Kontakt complet via POST /api/kontakt/profiles', async () => {
    globalFetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        message: 'Profil Kontakt sédimenté avec succès.',
        data: {
          uid: 'kontakt_01',
          slug: 'mage-fullstack',
          professionalTitle: 'Mage Fullstack',
          archetypeClass: 'Nécromancien Silice'
        }
      })
    });

    const onSavedMock = vi.fn();
    render(
      <KontaktProfileFormModal
        isOpen={true}
        onClose={() => {}}
        onSaved={onSavedMock}
      />
    );

    fireEvent.change(screen.getByLabelText(/Titre Professionnel/i), {
      target: { value: 'Mage Fullstack' }
    });
    fireEvent.change(screen.getByLabelText(/Classe \/ Archétype JDR/i), {
      target: { value: 'Nécromancien Silice' }
    });
    fireEvent.change(screen.getByLabelText(/Alignement JDR/i), {
      target: { value: 'CHAOTIC_GOOD' }
    });
    fireEvent.change(screen.getByLabelText(/Compétences/i), {
      target: { value: 'TypeScript, Neo4j, Next.js' }
    });

    fireEvent.click(screen.getByText(/Sédimenter le Profil/i));

    await waitFor(() => {
      expect(globalFetchMock).toHaveBeenCalledTimes(1);
      const [url, options] = globalFetchMock.mock.calls[0];
      expect(url).toBe('/api/kontakt/profiles');
      expect(options.method).toBe('POST');

      const body = JSON.parse(options.body);
      expect(body.professionalTitle).toBe('Mage Fullstack');
      expect(body.archetypeClass).toBe('Nécromancien Silice');
      expect(body.alignment).toBe('CHAOTIC_GOOD');
      expect(body.skills).toEqual(['TypeScript', 'Neo4j', 'Next.js']);
      expect(onSavedMock).toHaveBeenCalled();
    });
  });

  it('🟢 doit muter (PUT) et dissoudre (DELETE) un profil existant via /api/kontakt/profiles/[slug]', async () => {
    globalFetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          message: 'Le profil Kontakt a muté avec succès.',
          data: {
            uid: 'kontakt_01',
            slug: 'architecte-matrix',
            professionalTitle: 'Architecte Matrix'
          }
        })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          message: 'Le profil a été désintégré de la matrice.'
        })
      });

    const onDeletedMock = vi.fn();
    render(
      <KontaktProfileFormModal
        isOpen={true}
        onClose={() => {}}
        onDeleted={onDeletedMock}
        initialProfile={{
          uid: 'kontakt_01',
          slug: 'mage-fullstack',
          professionalTitle: 'Mage Fullstack',
          archetypeClass: 'Mage'
        }}
      />
    );

    // 1. Mutation (PUT)
    fireEvent.change(screen.getByLabelText(/Titre Professionnel/i), {
      target: { value: 'Architecte Matrix' }
    });
    fireEvent.click(screen.getByText(/Enregistrer la Mutation/i));

    await waitFor(() => {
      expect(globalFetchMock).toHaveBeenCalledTimes(1);
      expect(globalFetchMock.mock.calls[0][0]).toBe('/api/kontakt/profiles/mage-fullstack');
      expect(globalFetchMock.mock.calls[0][1].method).toBe('PUT');
    });

    // 2. Dissolution (DELETE)
    fireEvent.click(screen.getByText(/Dissoudre le Profil/i));

    await waitFor(() => {
      expect(globalFetchMock).toHaveBeenCalledTimes(2);
      expect(globalFetchMock.mock.calls[1][0]).toBe('/api/kontakt/profiles/mage-fullstack');
      expect(globalFetchMock.mock.calls[1][1].method).toBe('DELETE');
      expect(onDeletedMock).toHaveBeenCalledWith('mage-fullstack');
    });
  });
});