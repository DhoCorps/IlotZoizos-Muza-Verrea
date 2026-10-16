// Fichier : packages/types/src/core/ecommerce.types.ts
import { z } from 'zod';
import { CryptographicSealSchema } from './cryptoSeal.types';
import { CurrencyEnum, ICurrency } from './economy.types'; // 🌟 Importation de la SSOT des devises

export const CreationVisibilitySchema = z.enum(['PUBLIC', 'EXCHANGEABLE', 'VISIBLE', 'PRIVATE']);
export type CreationVisibility = z.infer<typeof CreationVisibilitySchema>;

export const ProductDomainSchema = z.enum(['MUSIC', 'GRAPHIC', 'VIDEO', 'CINEMA', 'PHYSICAL_GOODS', 'LORE', 'FONT', 'OTHER']);
export type ProductDomain = z.infer<typeof ProductDomainSchema>;

export const ProductNatureSchema = z.enum(['PHYSICAL', 'DIGITAL']);
export type ProductNature = z.infer<typeof ProductNatureSchema>;

export const ProductVariantSchema = z.object({
  uid: z.string(),
  name: z.string().min(1, "Nom de la déclinaison requis (ex: Taille M, Rouge)"),
  sku: z.string().optional(),
  priceOffsetCents: z.number().default(0),
  costPriceCents: z.number().min(0, "Le coût de revient ne peut être négatif").default(0),
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
  ownerUid: z.string().optional(),
  ownerSlug: z.string().optional(),
  sellerUid: z.string().optional(),
  title: z.string().min(2, "Titre de l'artefact requis"),
  slug: z.string().min(1, "Slug requis"),
  description: z.string(),
  nature: ProductNatureSchema.default('DIGITAL'),
  priceExclTaxCents: z.number().min(0, "Le prix HT ne peut être négatif"),
  taxRatePercent: z.number().min(0).default(0),
  priceCents: z.number().min(0, "Le prix TTC ne peut être négatif"),
  costPriceCents: z.number().min(0, "Le coût d'achat ou de fabrication ne peut être négatif").default(0),
  marginCents: z.number().optional(),
  marginPercent: z.number().optional(),
  currency: CurrencyEnum.default('EURO'), // 🌟 Harmonisation SSOT Devise
  stock: z.number().int().min(0).default(1),
  variants: z.array(ProductVariantSchema).optional(),
  tags: z.array(z.string()).optional(),
  seoMetadata: z.object({
    title: z.string().optional(),
    description: z.string().optional(),
  }).optional(),
  cryptoSeal: CryptographicSealSchema.optional(),
  isRouletteActive: z.boolean().default(false),
  wagerAmount: z.number().min(0).default(0),
  secretPriceCents: z.number().min(0).optional(),
  category: z.enum(['FONT_SPRITE', 'DIGITAL_GOOD', 'PHYSICAL_ARTIFACT', 'LORE_SCROLL', 'LUCKY_DROP']),
  imageUrl: z.string().url().optional(),
  visibility: CreationVisibilitySchema.default('PUBLIC'),
  settings: z.record(z.unknown()).optional(),
});

export const RouletteSessionSchema = z.object({
  uid: z.string(),
  buyerUid: z.string(),
  productUid: z.string(),
  rolledPriceCents: z.number(),
  status: z.enum(['PENDING', 'BOUGHT', 'ABANDONED']).default('PENDING'),
  expiresAt: z.coerce.date(), // ⏳ Harmonisation Date
  createdAt: z.coerce.date().optional(), // ⏳ Harmonisation Date
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
  costPriceCents: z.number().optional(),
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
  createdAt: z.coerce.date().optional(), // ⏳ Harmonisation Date
});

export const BarterOfferSchema = z.object({
  uid: z.string(),
  initiatorUid: z.string(),
  receiverUid: z.string().optional(),
  offeredProductUids: z.array(z.string()),
  requestedProductUids: z.array(z.string()),
  status: z.enum(['PENDING', 'ACCEPTED', 'REJECTED', 'COMPLETED']).default('PENDING'),
  createdAt: z.coerce.date().optional(), // ⏳ Harmonisation Date
});

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
  currency: ICurrency; // 🌟 Harmonisation Interface TS
};

export type IOrder = {
  uid: string;
  buyerUid: string;
  storeUid?: string;
  items: IOrderItem[];
  totalAmount: number;
  currency: ICurrency; // 🌟 Harmonisation Interface TS
  status: 'PENDING' | 'PAID' | 'COMPLETED' | 'CANCELLED';
  createdAt?: Date;
};