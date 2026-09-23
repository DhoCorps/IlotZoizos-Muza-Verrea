import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import StorePage from '@/app/[locale]/(inceptions)/le-bordel-de-dho/store/[slug]/page';
import { StoreModel, ProductModel, findEntityBySlugOrUid } from '@ilot/infrastructure';
import { notFound } from 'next/navigation';
import React from 'react';

vi.mock('@ilot/infrastructure', () => ({
  StoreModel: {},
  ProductModel: {
    find: vi.fn()
  },
  findEntityBySlugOrUid: vi.fn()
}));

vi.mock('next/navigation', () => ({
  notFound: vi.fn(() => { throw new Error('NOT_FOUND'); })
}));

describe('Urupapuro rwa SSR StorePage ([slug])', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('igomba kwerekana neza amakuru y\'iduka n\'ibicuruzwa byaryo', async () => {
    vi.mocked(findEntityBySlugOrUid).mockResolvedValueOnce({
      uid: 'store_1',
      storeName: 'Forge Cyber',
      description: 'Intwaro na polisi zandika.',
      isVerified: true
    } as any);

    vi.mocked(ProductModel.find).mockReturnValue({
      lean: vi.fn().mockResolvedValue([
        { uid: 'prod_1', title: 'Police Cyber', priceCents: 1500, category: 'FONT_SPRITE', tags: ['font'] }
      ])
    } as any);

    const ui = await StorePage({ params: Promise.resolve({ slug: 'forge-cyber', locale: 'fr' }) });
    render(ui);

    expect(screen.getByText('Forge Cyber')).toBeDefined();
    expect(screen.getByText('Intwaro na polisi zandika.')).toBeDefined();
    expect(screen.getByText('Police Cyber')).toBeDefined();
    expect(screen.getByText('15.00 €')).toBeDefined();
  });

  it('igomba guhita ihamagara notFound iyo iduka ritabonetse', async () => {
    vi.mocked(findEntityBySlugOrUid).mockResolvedValueOnce(null);

    await expect(
      StorePage({ params: Promise.resolve({ slug: 'itaria-ntayo', locale: 'fr' }) })
    ).rejects.toThrow('NOT_FOUND');
    
    expect(notFound).toHaveBeenCalled();
  });
});