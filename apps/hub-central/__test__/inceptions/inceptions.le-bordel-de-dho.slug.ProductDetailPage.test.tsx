import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import ProductDetailPage, { generateMetadata } from '@/app/[locale]/(inceptions)/le-bordel-de-dho/[slug]/page';
import { ProductModel, StoreModel, findEntityBySlugOrUid } from '@ilot/infrastructure';
import { notFound } from 'next/navigation';
import React from 'react';

vi.mock('@ilot/infrastructure', () => ({
  ProductModel: {},
  StoreModel: {
    findOne: vi.fn(),
  },
  findEntityBySlugOrUid: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  notFound: vi.fn(() => { throw new Error('NOT_FOUND'); }),
}));

vi.mock('@ilot/shared-core', () => ({
  UniversalGridCanvas: () => <div data-testid="grid-canvas">Canvas</div>,
  useCartStore: () => ({ addItem: vi.fn() }),
  useWishlistStore: () => ({
    wishlists: [{ id: 'w1', name: 'Favoris' }],
    createWishlist: vi.fn(),
    toggleItemInWishlist: vi.fn(),
    isInWishlist: vi.fn().mockReturnValue(false),
  }),
}));

vi.mock('@/components/global/UniversalComment', () => ({
  UniversalComment: () => <div data-testid="universal-comments">Comments</div>,
}));

vi.mock('@/navigation', () => ({
  Link: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a>,
}));

// 🚀 Mock du CopyrightBanner pour valider son affichage dans les tests de page
vi.mock('@/components/global/CopyrightBanner', () => ({
  CopyrightBanner: ({ metadata }: { metadata: any }) => (
    <div data-testid="mock-copyright-banner">
      <span>{metadata?.role}</span>
      {metadata?.isExclusiveIlot && <span>Exclusivité</span>}
    </div>
  ),
}));

describe('ProductDetailPage (SSR Server Component)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('doit générer les métadonnées SEO correctement', async () => {
    vi.mocked(findEntityBySlugOrUid).mockResolvedValueOnce({
      title: 'Artefact Majestueux',
      description: 'Description test',
    } as any);

    const metadata = await generateMetadata({ params: Promise.resolve({ slug: 'artefact-majestueux' }) });
    expect(metadata.title).toContain('Artefact Majestueux');
  });

  it('doit rendre la page du produit avec la bannière de copyright, les liens vers la boutique et le profil', async () => {
    vi.mocked(findEntityBySlugOrUid).mockResolvedValueOnce({
      uid: 'prod_1',
      title: 'Artefact Majestueux',
      description: 'Description test',
      priceCents: 3500,
      stock: 5,
      storeUid: 'store_1',
      authorSlug: 'oiseau-createur',
      copyrightMetadata: { role: 'CREATOR', isExclusiveIlot: true }
    } as any);

    vi.mocked(StoreModel.findOne).mockReturnValue({
      lean: vi.fn().mockResolvedValue({ uid: 'store_1', slug: 'ma-boutique', storeName: 'Ma Boutique' })
    } as any);

    const ui = await ProductDetailPage({ params: Promise.resolve({ slug: 'artefact-majestueux' }) });
    render(ui);

    expect(screen.getByText('Artefact Majestueux')).toBeDefined();
    expect(screen.getByTestId('mock-copyright-banner')).toBeDefined();
    expect(screen.getByText('CREATOR')).toBeDefined();
    expect(screen.getByText('Exclusivité')).toBeDefined();
    expect(screen.getByText('Visiter la Boutique')).toBeDefined();
    expect(screen.getByText('Profil du Créateur')).toBeDefined();
    expect(screen.getByTestId('universal-comments')).toBeDefined();
  });

  it('doit déclencher notFound si le produit est introuvable', async () => {
    vi.mocked(findEntityBySlugOrUid).mockResolvedValueOnce(null);

    await expect(
      ProductDetailPage({ params: Promise.resolve({ slug: 'introuvable' }) })
    ).rejects.toThrow('NOT_FOUND');

    expect(notFound).toHaveBeenCalled();
  });
});