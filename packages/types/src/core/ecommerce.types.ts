import { z } from 'zod';

export const StoreSchema = z.object({
  uid: z.string(),
  ownerUid: z.string(), // L'Oiseau propriétaire de la boutique
  storeName: z.string().min(3, "Nom de boutique requis"),
  slug: z.string().min(1, "Slug requis"), // 🪡 L'EMPREINTE URL DE LA BOUTIQUE
  description: z.string().max(300).optional(),
  stripeAccountId: z.string().optional(), // ID Stripe Connect (acct_...) pour les paiements directs
  isVerified: z.boolean().default(false),
});

export const ProductSchema = z.object({
  uid: z.string(),
  storeUid: z.string(),
  title: z.string().min(2, "Titre de l'artefact requis"),
  slug: z.string().min(1, "Slug requis"), // 🪡 L'EMPREINTE URL DU PRODUIT
  description: z.string(),
  priceCents: z.number().min(0, "Le prix ne peut être négatif"), // en centimes pour éviter les erreurs de virgule
  currency: z.string().default('EUR'),
  stock: z.number().int().min(0).default(1),
  category: z.enum(['FONT_SPRITE', 'DIGITAL_GOOD', 'PHYSICAL_ARTIFACT', 'LORE_SCROLL']),
  imageUrl: z.string().url().optional(),
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
  initiatorUid: z.string(), // L'Oiseau qui initie l'échange
  receiverUid: z.string().optional(), // Cible spécifique, ou ouvert à tous si vide
  offeredProductUids: z.array(z.string()), // Ce que l'initiateur donne
  requestedProductUids: z.array(z.string()), // Ce que l'initiateur demande (ou catégorie souhaitée)
  status: z.enum(['PENDING', 'ACCEPTED', 'REJECTED', 'COMPLETED']).default('PENDING'),
  createdAt: z.date().optional(),
});

export interface IOrderItem {
  productUid: string;
  title: string;
  quantity: number;
  pricePaid: number;
  currency: 'EUR' | 'SHARDS';
}

export interface IOrder {
  uid: string;
  buyerUid: string;
  storeUid?: string;
  items: IOrderItem[];
  totalAmount: number;
  currency: 'EUR' | 'SHARDS';
  status: 'PENDING' | 'PAID' | 'COMPLETED' | 'CANCELLED';
  createdAt?: Date;
}

export type Store = z.infer<typeof StoreSchema>;
export type Product = z.infer<typeof ProductSchema>;
export type Wishlist = z.infer<typeof WishlistSchema>;
export type Order = z.infer<typeof OrderSchema>;
export type BarterOffer = z.infer<typeof BarterOfferSchema>;