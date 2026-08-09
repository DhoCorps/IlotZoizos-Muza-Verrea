// packages/types/src/__tests__/showcase.types.test.ts
import { describe, it, expect } from 'vitest';
import { IUniversalMediaItem, ShowcaseFilterOptions, UniversalMediaType } from '../core/showcase.types';

describe('Showcase Types - Validation des structures et typages de la Canopée', () => {
  it('doit valider la structure complète d\'un IUniversalMediaItem', () => {
    const mockMediaItem: IUniversalMediaItem = {
      mediaId: 'media_123',
      sourceApp: 'PARTITA',
      ownerUid: 'bird_alpha',
      ownerSlug: 'alpha-bird',
      title: 'Symphonie de la Silice',
      mediaUrl: 'https://cdn.ilot.local/audio/symphony.mp3',
      thumbnailUrl: 'https://cdn.ilot.local/thumbs/symphony.png',
      priceCents: 1500,
      metadata: { tempo: 120, scale: 'C minor' },
      consentForShowcase: true,
      consentForMusicSync: true,
      createdAt: new Date(),
    };

    expect(mockMediaItem.mediaId).toBe('media_123');
    expect(mockMediaItem.sourceApp).toBe('PARTITA');
    expect(mockMediaItem.consentForShowcase).toBe(true);
    expect(mockMediaItem.priceCents).toBe(1500);
  });

  it('doit accepter l\'ensemble des types d\'applications supportés (UniversalMediaType)', () => {
    const supportedApps: UniversalMediaType[] = ['PARTITA', 'LETRIN', 'ABYSS', 'DHO', 'GALLERY', 'SPRITE'];

    expect(supportedApps).toHaveLength(6);
    expect(supportedApps).toContain('PARTITA');
    expect(supportedApps).toContain('DHO');
  });

  it('doit valider les options de filtrage granulaire (ShowcaseFilterOptions)', () => {
    const filterOptions: ShowcaseFilterOptions = {
      selectedApps: ['ABYSS', 'LETRIN'],
      onlyTradable: true,
    };

    expect(filterOptions.selectedApps).toEqual(['ABYSS', 'LETRIN']);
    expect(filterOptions.onlyTradable).toBe(true);
  });
});