import mongoose, { Schema, Document } from 'mongoose';

export interface IWishlistDocument extends Document {
  uid: string;
  userUid: string;
  productUids: string[];
}

const WishlistSchema = new Schema<IWishlistDocument>({
  uid: { type: String, required: true, unique: true, index: true },
  userUid: { type: String, required: true, unique: true, index: true },
  productUids: [{ type: String }],
}, { timestamps: true });

export const WishlistModel = mongoose.models.Wishlist || mongoose.model<IWishlistDocument>('Wishlist', WishlistSchema);