// packages/types/src/ecommerce.types.ts
import { z } from 'zod';

export const CreationVisibilitySchema = z.enum(['PUBLIC', 'EXCHANGEABLE', 'VISIBLE', 'PRIVATE']);
export type CreationVisibility = z.infer<typeof CreationVisibilitySchema>;

export const ProductDomainSchema = z.enum(['MUSIC', 'GRAPHIC', 'VIDEO', 'CINEMA', 'PHYSICAL_GOODS', 'LORE', 'FONT', 'OTHER']);
export type ProductDomain = z.infer<typeof ProductDomainSchema>;

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
  // 🛡️ SUTURES DE SOUVERAINETÉ & INDEXATION : Ajout des attributs de propriété et de configuration
  ownerUid: z.string().optional(),
  ownerSlug: z.string().optional(),
  sellerUid: z.string().optional(),
  title: z.string().min(2, "Titre de l'artefact requis"),
  slug: z.string().min(1, "Slug requis"),
  description: z.string(),
  priceCents: z.number().min(0, "Le prix ne peut être négatif"),
  currency: z.string().default('EUR'),
  stock: z.number().int().min(0).default(1),
  category: z.enum(['FONT_SPRITE', 'DIGITAL_GOOD', 'PHYSICAL_ARTIFACT', 'LORE_SCROLL']),
  imageUrl: z.string().url().optional(),
  visibility: CreationVisibilitySchema.default('PUBLIC'),
  settings: z.record(z.unknown()).optional(),
});

export const WishlistSchema = z.object({
  uid: z.string(),
  userUid: z.string(),
  productUids: z.array(z.string()),
});

export const OrderItemSchema = z.object({
  productUid: z.string(),
  title: z.string(),
  priceCents: z.number(),
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
// 🏷️ INTERFACES ET TYPES HARMONISÉS AVEC LE PRÉFIXE 'I'
// ==========================================

export type IStore = z.infer<typeof StoreSchema>;
export type IProduct = z.infer<typeof ProductSchema>;
export type IWishlist = z.infer<typeof WishlistSchema>;
export type IBarterOffer = z.infer<typeof BarterOfferSchema>;

// Pour la commande, on sépare l'interface métier legacy (IOrder) du type validé par Zod (Order)
export type Order = z.infer<typeof OrderSchema>;
export type IOrderItem = {
  productUid: string;
  title: string;
  quantity: number;
  pricePaid: number;
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