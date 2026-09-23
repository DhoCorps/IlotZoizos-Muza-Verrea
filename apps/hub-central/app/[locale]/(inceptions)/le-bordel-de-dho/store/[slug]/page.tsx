import { notFound } from 'next/navigation';
import { StoreModel, ProductModel, findEntityBySlugOrUid } from '@ilot/infrastructure';
import { IStore, IProduct } from '@ilot/types';
import { ProductCard } from '@/components/ecommerce/products/ProductCard';
import { Store, ShieldCheck } from 'lucide-react';

interface StorePageProps {
  params: Promise<{ slug: string; locale: string }>;
}

export const dynamic = 'force-dynamic';

export default async function StorePage({ params }: StorePageProps) {
  const resolvedParams = await params;
  const identifier = resolvedParams.slug;

  // Gushakisha iduka hifashishijwe umufasha unuze (Slug cyangwa UID)
  const store = await findEntityBySlugOrUid(StoreModel, identifier) as IStore | null;

  if (!store) {
    notFound();
  }

  // Gushakisha ibicuruzwa / artefacts bihuza n'iyi boutique (storeUid)
  const products = await ProductModel.find({ storeUid: store.uid }).lean() as unknown as IProduct[];

  return (
    <div className="space-y-8 pb-32">
      {/* Imiterere n'ibiranga Iduka (Store Metadata) */}
      <div className="p-8 bg-black/40 border border-white/10 rounded-3xl backdrop-blur-xl space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-black px-3 py-1 rounded-full uppercase tracking-widest bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 flex items-center gap-1.5">
            <ShieldCheck size={14} /> {store.isVerified ? 'Boutique Vérifiée' : 'En attente'}
          </span>
          <Store className="text-cyan-400" size={28} />
        </div>
        <div>
          <h1 className="text-3xl font-black uppercase text-white tracking-tight">{store.storeName}</h1>
          <p className="text-sm text-slate-400 font-sans mt-2 max-w-2xl">{store.description || "Nta busobanuro bwatanzwe kuri iyi boutique."}</p>
        </div>
        {store.stripeAccountId && (
          <div className="pt-2">
            <span className="text-[10px] font-mono text-slate-500 uppercase block">Stripe Connect :</span>
            <code className="text-xs font-mono bg-black/60 px-3 py-1.5 rounded-lg border border-white/10 text-cyan-400 inline-block">
              {store.stripeAccountId}
            </code>
          </div>
        )}
      </div>

      {/* Urutonde rw'ibicuruzwa byihariye by'iyi boutique */}
      <div className="space-y-4">
        <h2 className="text-lg font-black uppercase text-white tracking-widest">Artefacts de la Boutique ({products.length})</h2>
        
        {products.length === 0 ? (
          <div className="p-12 text-center bg-black/20 border border-white/5 rounded-2xl text-slate-500 font-mono text-xs uppercase">
            Nta artefact yatangajwe muri iyi boutique kugeza ubu.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map((product) => (
              <ProductCard 
                key={product.uid} 
                product={product} 
                isWishlisted={false} 
                onToggleWishlist={() => {}} 
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}