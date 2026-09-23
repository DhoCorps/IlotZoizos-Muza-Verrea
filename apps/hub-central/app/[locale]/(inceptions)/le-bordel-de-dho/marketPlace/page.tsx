import { getCachedMarketplaceProducts } from '@/lib/cache/ecommerce.cache';
import { MarketPlaceInteractive } from './MarketPlaceInteractive';
import { Metadata } from 'next';
import React from 'react';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Le Grand Bazar | Îlot Zoizos',
  description: 'Place de marché ouverte des artefacts et créations souveraines.',
};

interface MarketPlacePageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function MarketPlacePage({ searchParams }: MarketPlacePageProps) {
  const resolvedParams = await searchParams;
  
  // Extraction sécurisée des paramètres d'URL
  const category = typeof resolvedParams.category === 'string' ? resolvedParams.category : 'ALL';
  const style = typeof resolvedParams.style === 'string' ? resolvedParams.style : 'ALL';
  const author = typeof resolvedParams.author === 'string' ? resolvedParams.author : 'ALL';
  
  let tags: string[] = [];
  if (resolvedParams.tag) {
    tags = Array.isArray(resolvedParams.tag) ? resolvedParams.tag : [resolvedParams.tag];
  }

  // 🚀 Fetch côté serveur (Bypass de la route API pour une vitesse maximale)
  const products = await getCachedMarketplaceProducts(
    category === 'ALL' ? null : category,
    style === 'ALL' ? null : style,
    author === 'ALL' ? null : author,
    tags.length > 0 ? tags : undefined
  );

  return (
    <MarketPlaceInteractive 
      initialProducts={products} 
      initialFilters={{ category, style, author, tagQuery: tags.join(', ') }} 
    />
  );
}