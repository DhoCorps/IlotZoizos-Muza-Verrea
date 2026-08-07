import mongoose from 'mongoose';

const WishlistSchema = new mongoose.Schema({
    uid: { type: String, required: true, unique: true },
    userUid: { type: String, required: true },
    name: { type: String, required: true },
    productUids: [{ type: String }],
    createdAt: { type: Date, default: Date.now }
});
export const WishlistModel = mongoose.models.Wishlist || mongoose.model('Wishlist', WishlistSchema);
