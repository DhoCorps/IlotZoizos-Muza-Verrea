import { describe, it, expect } from 'vitest';
import type { ILibraryBookMediaEntity, LibraryBookEconomyMetadata } from '../core/bibliotek.types';

describe('Types partagés : Bibliotek Media, Gacha & Barter', () => {
  it('🟢 doit valider la structure complète d’un ouvrage enrichi avec l’économie Barter et Gacha', () => {
    const mockEconomy: LibraryBookEconomyMetadata = {
      priceCents: 1500, // 15.00 € ou équivalent Silice
      currency: 'EUR',
      rights: {
        allowCommercial: true,
        allowBarter: true,
        allowLending: true,
        transferable: true,
      },
      barterAllowed: true,
      gachaTier: 'rare',
      isTradable: true,
    };

    const mockBook: ILibraryBookMediaEntity = {
      uid: 'book_gacha_001',
      title: 'Le Traité des Oiseaux Silencieux',
      slug: 'traite-des-oiseaux-silencieux',
      authorUid: 'bird_zen_99',
      authorSlug: 'zen-bird',
      writingType: 'traite',
      style: 'philosophie',
      fileUrl: 'https://cdn.ilot/books/traite.txt',
      coverUrl: null,
      digitalSignature: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      timestampedAt: new Date(),
      economy: mockEconomy,
      createdAt: new Date(),
    };

    expect(mockBook.uid).toBe('book_gacha_001');
    expect(mockBook.economy.priceCents).toBe(1500);
    expect(mockBook.economy.barterAllowed).toBe(true);
    expect(mockBook.economy.gachaTier).toBe('rare');
    expect(mockBook.economy.rights.allowBarter).toBe(true);
  });

  it('🟢 doit accepter des types et styles libres (extensibles)', () => {
    const customWritingType = 'chronique-sauvage' as const;
    const customStyle = 'cyber-alchimie' as const;

    const mockEconomy: LibraryBookEconomyMetadata = {
      priceCents: 0,
      rights: { allowBarter: true },
      barterAllowed: true,
      gachaTier: 'common',
      isTradable: false,
    };

    const mockBook: ILibraryBookMediaEntity = {
      uid: 'book_custom_02',
      title: 'Chronique des Circuits',
      slug: 'chronique-des-circuits',
      authorUid: 'bird_01',
      authorSlug: 'bird-one',
      writingType: customWritingType,
      style: customStyle,
      fileUrl: 'https://cdn.ilot/file.txt',
      digitalSignature: 'abc123hash',
      timestampedAt: new Date(),
      economy: mockEconomy,
      createdAt: new Date(),
    };

    expect(mockBook.writingType).toBe('chronique-sauvage');
    expect(mockBook.style).toBe('cyber-alchimie');
  });
});