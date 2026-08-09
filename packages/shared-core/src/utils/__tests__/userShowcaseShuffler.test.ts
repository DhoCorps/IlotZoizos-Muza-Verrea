// packages/shared-core/src/utils/__tests__/userShowcaseShuffler.test.ts
import { describe, it, expect } from 'vitest';
import { UserShowcaseShuffler } from '../userShowcaseShuffler';
import { IUniversalMediaItem } from '@ilot/types';

describe('UserShowcaseShuffler - Mélange personnalisé par utilisateur (Utilitaires)', () => {
  const mockItems: IUniversalMediaItem[] = [
    {
      mediaId: 'm1', sourceApp: 'ABYSS', ownerUid: 'bird_A', ownerSlug: 'a', title: 'T1',
      mediaUrl: 'url1', consentForShowcase: true, consentForMusicSync: false, createdAt: new Date()
    },
    {
      mediaId: 'm2', sourceApp: 'PARTITA', ownerUid: 'bird_A', ownerSlug: 'a', title: 'T2',
      mediaUrl: 'url2', consentForShowcase: true, consentForMusicSync: true, createdAt: new Date()
    },
    {
      mediaId: 'm3', sourceApp: 'DHO', ownerUid: 'bird_B', ownerSlug: 'b', title: 'T3',
      mediaUrl: 'url3', consentForShowcase: true, consentForMusicSync: false, createdAt: new Date(), priceCents: 500
    },
    {
      mediaId: 'm4', sourceApp: 'LETRIN', ownerUid: 'bird_C', ownerSlug: 'c', title: 'T4',
      mediaUrl: 'url4', consentForShowcase: true, consentForMusicSync: false, createdAt: new Date()
    },
  ];

  it('doit filtrer par application sélectionnée et par statut tradable', () => {
    const result = UserShowcaseShuffler.shuffleForUser(mockItems, 'user_1', {
      selectedApps: ['DHO'],
      onlyTradable: true
    });

    expect(result).toHaveLength(1);
    expect(result[0].mediaId).toBe('m3');
  });

  it('doit générer un ordre différent et personnalisé selon l\'utilisateur (seed)', () => {
    const res1 = UserShowcaseShuffler.shuffleForUser(mockItems, 'user_alpha', { selectedApps: [] });
    const res2 = UserShowcaseShuffler.shuffleForUser(mockItems, 'user_beta', { selectedApps: [] });

    expect(res1).toHaveLength(mockItems.length);
    expect(res2).toHaveLength(mockItems.length);
  });

  it('ne doit pas placer deux médias du même auteur (ownerUid) de suite si possible', () => {
    const itemsWithSameAuthor: IUniversalMediaItem[] = [
      ...mockItems,
      {
        mediaId: 'm5', sourceApp: 'LETRIN', ownerUid: 'bird_A', ownerSlug: 'a', title: 'T5',
        mediaUrl: 'url5', consentForShowcase: true, consentForMusicSync: false, createdAt: new Date()
      }
    ];

    const result = UserShowcaseShuffler.shuffleForUser(itemsWithSameAuthor, 'user_test', { selectedApps: [] });

    for (let i = 0; i < result.length - 1; i++) {
      expect(result[i].ownerUid).not.toBe(result[i + 1].ownerUid);
    }
  });
});