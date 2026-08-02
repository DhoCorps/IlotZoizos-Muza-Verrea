// apps/hub-central/app/[locale]/(inceptions)/marchand/components/ProductCard.tsx
import { Heart, ShoppingBag } from 'lucide-react';

export function ProductCard({ product, isWishlisted, onToggleWishlist }: { product: any; isWishlisted: boolean; onToggleWishlist: (uid: string) => void }) {
  return (
    <div className="p-6 bg-black/40 border border-white/5 rounded-3xl backdrop-blur-xl flex flex-col justify-between space-y-4 hover:border-cyan-500/30 transition-all group">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[9px] font-black px-2.5 py-1 rounded-full uppercase tracking-widest bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            {product.category}
          </span>
          <button 
            onClick={() => onToggleWishlist(product.uid)}
            className={`p-2 rounded-xl border transition-all ${isWishlisted ? 'bg-red-500/20 border-red-500 text-red-400' : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'}`}
          >
            <Heart size={16} className={isWishlisted ? 'fill-current' : ''} />
          </button>
        </div>
        <h3 className="text-lg font-black uppercase text-white group-hover:text-cyan-300 transition-colors">{product.title}</h3>
        <p className="text-xs text-slate-400 font-sans leading-relaxed line-clamp-2">{product.description}</p>
      </div>

      <div className="space-y-4 pt-4 border-t border-white/5 flex items-center justify-between">
        <div>
          <span className="text-[10px] font-mono text-slate-500 block">Valeur</span>
          <span className="text-lg font-black text-white font-mono">{(product.priceCents / 100).toFixed(2)} €</span>
        </div>
        <button className="px-4 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white font-black uppercase text-[10px] rounded-xl shadow-lg transition-all flex items-center gap-1.5">
          <ShoppingBag size={14} /> Acquérir
        </button>
      </div>
    </div>
  );
}