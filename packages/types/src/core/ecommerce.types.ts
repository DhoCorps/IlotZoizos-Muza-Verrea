import { z } from 'zod';
import { CopyrightMetadataSchema } from '../../../shared-core/src/types/shared.types'; // 🚀 Import DRY pour le copyright unifié

export const CreationVisibilitySchema = z.enum(['PUBLIC', 'EXCHANGEABLE', 'VISIBLE', 'PRIVATE']);
export type CreationVisibility = z.infer<typeof CreationVisibilitySchema>;

export const ProductDomainSchema = z.enum(['MUSIC', 'GRAPHIC', 'VIDEO', 'CINEMA', 'PHYSICAL_GOODS', 'LORE', 'FONT', 'OTHER']);
export type ProductDomain = z.infer<typeof ProductDomainSchema>;

// Nature du produit : Matériel ou Immatériel
export const ProductNatureSchema = z.enum(['PHYSICAL', 'DIGITAL']);
export type ProductNature = z.infer<typeof ProductNatureSchema>;

// Schéma pour une déclinaison (ex: Taille, Couleur, Matière) avec son propre coût et prix
export const ProductVariantSchema = z.object({
  uid: z.string(),
  name: z.string().min(1, "Nom de la déclinaison requis (ex: Taille M, Rouge)"),
  sku: z.string().optional(),
  priceOffsetCents: z.number().default(0), // Ajustement de prix TTC par rapport au produit de base
  costPriceCents: z.number().min(0, "Le coût de revient ne peut être négatif").default(0), // Pour Kompta
  stock: z.number().int().min(0).default(1),
  attributes: z.record(z.string()).optional(),
});
export type IProductVariant = z.infer<typeof ProductVariantSchema>;

export const StoreSchema = z.object({
  uid: z.string(),
  ownerUid: z.string(),
  storeName: z.string().min(3, "Nom de boutique requis"),
  slug: z.string().min(1, "Slug requis"),
  description: z.string().max(300).optional(),
  stripeAccountId: z.string().optional(),
  isVerified: z.boolean().default(false),
});

export const ProductSchema = z.object({
  uid: z.string(),
  storeUid: z.string(),
  // 🛡️ SUTURES DE SOUVERAINETÉ & INDEXATION
  ownerUid: z.string().optional(),
  ownerSlug: z.string().optional(),
  sellerUid: z.string().optional(),
  title: z.string().min(2, "Titre de l'artefact requis"),
  slug: z.string().min(1, "Slug requis"),
  description: z.string(),

  // 💰 GESTION FINANCIÈRE (HT, Taxe, TTC, Coût & Marge pour Kompta)
  nature: ProductNatureSchema.default('DIGITAL'),
  priceExclTaxCents: z.number().min(0, "Le prix HT ne peut être négatif"),
  taxRatePercent: z.number().min(0).default(0), // ex: 20 pour 20%
  priceCents: z.number().min(0, "Le prix TTC ne peut être négatif"), // Prix TTC public
  costPriceCents: z.number().min(0, "Le coût d'achat ou de fabrication ne peut être négatif").default(0), // Prix de revient brut
  marginCents: z.number().optional(), // Marge brute réalisée (Prix HT - Coût de revient)
  marginPercent: z.number().optional(), // Taux de marge en %
  
  currency: z.string().default('EUR'),
  stock: z.number().int().min(0).default(1),
  
  // 🎨 DÉCLINAISONS (Variantes)
  variants: z.array(ProductVariantSchema).optional(),

  // 🏷️ TAGS & SEO
  tags: z.array(z.string()).optional(),
  seoMetadata: z.object({
    title: z.string().optional(),
    description: z.string().optional(),
  }).optional(),

  // 📜 COPYRIGHT ET EXCLUSIVITÉ ÎLOT (DRY)
  copyrightMetadata: CopyrightMetadataSchema.optional(),

  // 🎡 OPTIONS DE LA ROULETTE KARMIQUE
  isRouletteActive: z.boolean().default(false),
  wagerAmount: z.number().min(0).default(0), // La mise d'entrée en Éclats (Shards)
  secretPriceCents: z.number().min(0).optional(),

  // 🎟️ AJOUT DE LA CATÉGORIE LUCKY_DROP
  category: z.enum(['FONT_SPRITE', 'DIGITAL_GOOD', 'PHYSICAL_ARTIFACT', 'LORE_SCROLL', 'LUCKY_DROP']),
  imageUrl: z.string().url().optional(),
  visibility: CreationVisibilitySchema.default('PUBLIC'),
  settings: z.record(z.unknown()).optional(),
});

// 🎲 SCHÉMA DES SESSIONS DE ROULETTE (Bloquées 24h)
export const RouletteSessionSchema = z.object({
  uid: z.string(),
  buyerUid: z.string(),
  productUid: z.string(),
  rolledPriceCents: z.number(),
  status: z.enum(['PENDING', 'BOUGHT', 'ABANDONED']).default('PENDING'),
  expiresAt: z.date(),
  createdAt: z.date().optional(),
});
export type IRouletteSession = z.infer<typeof RouletteSessionSchema>;

export const WishlistSchema = z.object({
  uid: z.string(),
  userUid: z.string(),
  productUids: z.array(z.string()),
});

export const OrderItemSchema = z.object({
  productUid: z.string(),
  variantUid: z.string().optional(),
  title: z.string(),
  priceCents: z.number(),
  costPriceCents: z.number().optional(), // Enregistré au moment de la vente pour l'historique Kompta
  quantity: z.number().min(1),
});

export const OrderSchema = z.object({
  uid: z.string(),
  buyerUid: z.string(),
  storeUid: z.string(),
  items: z.array(OrderItemSchema),
  totalAmountCents: z.number(),
  stripePaymentIntentId: z.string(),
  status: z.enum(['PENDING', 'PAID', 'FULFILLED', 'CANCELLED']).default('PENDING'),
  createdAt: z.date().optional(),
});

export const BarterOfferSchema = z.object({
  uid: z.string(),
  initiatorUid: z.string(),
  receiverUid: z.string().optional(),
  offeredProductUids: z.array(z.string()),
  requestedProductUids: z.array(z.string()),
  status: z.enum(['PENDING', 'ACCEPTED', 'REJECTED', 'COMPLETED']).default('PENDING'),
  createdAt: z.date().optional(),
});

// ==========================================
// 🏷️ INTERFACES ET TYPES HARMONISÉS
// ==========================================

export type IStore = z.infer<typeof StoreSchema>;
export type IProduct = z.infer<typeof ProductSchema>;
export type IWishlist = z.infer<typeof WishlistSchema>;
export type IBarterOffer = z.infer<typeof BarterOfferSchema>;

export type Order = z.infer<typeof OrderSchema>;
export type IOrderItem = {
  productUid: string;
  variantUid?: string;
  title: string;
  quantity: number;
  pricePaid: number;
  costPrice?: number;
  currency: 'EUR' | 'SHARDS';
};

export type IOrder = {
  uid: string;
  buyerUid: string;
  storeUid?: string;
  items: IOrderItem[];
  totalAmount: number;
  currency: 'EUR' | 'SHARDS';
  status: 'PENDING' | 'PAID' | 'COMPLETED' | 'CANCELLED';
  createdAt?: Date;
};