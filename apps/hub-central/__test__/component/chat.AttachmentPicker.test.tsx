// apps/hub-central/__test__/component/chat.AttachmentPicker.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import React from 'react';
import { AttachmentPicker } from '@/components/chat/AttachmentPicker';

const globalFetchMock = vi.fn();
vi.stubGlobal('fetch', globalFetchMock);

describe('Composant AttachmentPicker (SSOT EntityTarget)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('🟢 doit charger les créations de la source par défaut (LETRIN) et permettre la sélection d’un élément', async () => {
    globalFetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        items: [
          {
            slug: 'police-cyber-silice',
            title: 'Police Cyber Silice',
            subtitle: 'Typographie 16x16',
            thumbnailUrl: 'https://cdn.ilot/font.png'
          }
        ]
      })
    });

    const onSelectMock = vi.fn();
    const onCloseMock = vi.fn();

    render(<AttachmentPicker onSelect={onSelectMock} onClose={onCloseMock} />);

    await waitFor(() => {
      expect(globalFetchMock).toHaveBeenCalledWith('/api/creations/search?sourceType=LETRIN');
      expect(screen.getByText('Police Cyber Silice')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Police Cyber Silice'));

    expect(onSelectMock).toHaveBeenCalledWith({
      sourceType: 'LETRIN',
      entitySlug: 'police-cyber-silice'
    });
    expect(onCloseMock).toHaveBeenCalledTimes(1);
  });

  it('🟢 doit changer d’onglet source (SHOP, PARTITA, BLOG) et relancer la recherche', async () => {
    globalFetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ items: [] })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          items: [
            {
              slug: 'partition-fretless',
              title: 'Partition Basse Fretless'
            }
          ]
        })
      });

    render(<AttachmentPicker onSelect={() => {}} onClose={() => {}} />);

    await waitFor(() => {
      expect(screen.getByText('Aucune création trouvée ici.')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('PARTITA'));

    await waitFor(() => {
      expect(globalFetchMock).toHaveBeenCalledWith('/api/creations/search?sourceType=PARTITA');
      expect(screen.getByText('Partition Basse Fretless')).toBeInTheDocument();
    });
  });
});