// apps/hub-central/app/[locale]/(inceptions)/ecommerce/[slug]/page.tsx
import { notFound } from 'next/navigation';
import { ProductModel, StoreModel, findEntityBySlugOrUid } from '@ilot/infrastructure';
import { IProduct, IStore } from '@ilot/types';
import { Metadata } from 'next';
import { ArrowLeft, Store as StoreIcon, User } from 'lucide-react';
import { Link } from '@/navigation';
import { ProductDetailInteractive } from './ProductDetailInteractive';
import { UniversalComment } from '@/components/global/UniversalComment';
import { CopyrightBanner } from '@/components/global/CopyrightBanner'; // 🚀 Import du composant DRY de Copyright

interface ProductPageProps {
  params: Promise<{ slug: string; locale?: string }>;
}

export const dynamic = 'force-dynamic';

// 🔍 Génération des métadonnées SEO pour l'artefact
export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await findEntityBySlugOrUid(ProductModel, slug) as IProduct | null;

  if (!product) {
    return { title: 'Artefact introuvable | Îlot Zoizos' };
  }

  return {
    title: `${product.title} | Îlot Zoizos`,
    description: product.description || 'Artefact souverain forgé dans la canopée de l’Îlot.',
  };
}

export default async function ProductDetailPage({ params }: ProductPageProps) {
  const { slug } = await params;
  const product = await findEntityBySlugOrUid(ProductModel, slug) as IProduct | null;

  if (!product) {
    notFound();
  }

  // 🏛️ Récupération optionnelle de la boutique associée
  let store: IStore | null = null;
  if (product.storeUid) {
    store = await StoreModel.findOne({ uid: product.storeUid }).lean() as unknown as IStore | null;
  }

  const creatorSlug = (product as any).authorSlug || product.ownerUid || 'createur-inconnu';
  const storeSlug = store?.slug || product.storeUid;

  const serializedProduct = JSON.parse(JSON.stringify(product));

  return (
    <div className="max-w-6xl mx-auto space-y-12 pb-24 animate-in fade-in duration-500">
      
      {/* 🌐 Barre de Navigation & Séparation Identitaire (Boutique / Créateur) */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/5 pb-4">
        <Link href="/marketplace" className="text-xs font-mono text-slate-400 hover:text-white flex items-center gap-1.5 transition-colors">
          <ArrowLeft size={14} /> Retour au Grand Bazar
        </Link>
        
        <div className="flex items-center gap-3">
          {storeSlug && (
            <Link 
              href={`/store/${storeSlug}` as any}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-700/80 rounded-xl text-xs font-bold text-cyan-400 transition-all flex items-center gap-2 shadow-lg"
            >
              <StoreIcon size={14} /> Visiter la Boutique
            </Link>
          )}

          <Link 
            href={`/oiseau/${creatorSlug}` as any}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-700/80 rounded-xl text-xs font-bold text-amber-400 transition-all flex items-center gap-2 shadow-lg"
          >
            <User size={14} /> Profil du Créateur
          </Link>
        </div>
      </div>

      {/* 🚀 Intégration de la Bannière de Copyright en mode display si des métadonnées existent */}
      {serializedProduct.copyrightMetadata && (
        <CopyrightBanner mode="display" metadata={serializedProduct.copyrightMetadata} />
      )}

      {/* 🧩 Composant Client Interactif */}
      <ProductDetailInteractive product={serializedProduct} />

      {/* 💬 Intégration des Avis Clients & Résonances */}
      <div className="pt-8 border-t border-white/5 space-y-6">
        <div className="space-y-1">
          <h3 className="text-sm font-black uppercase tracking-widest text-white">Avis & Résonances de la Canopée</h3>
          <p className="text-xs text-slate-400 font-mono">Partage ton ressenti vibratoire sur cet artefact.</p>
        </div>
        <div className="bg-black/40 border border-white/5 rounded-3xl p-6 backdrop-blur-xl">
          <UniversalComment targetUid={product.uid} targetType="PROJECT" />
        </div>
      </div>
    </div>
  );
}