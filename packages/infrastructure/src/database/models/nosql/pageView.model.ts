import mongoose from 'mongoose';
import type { Document } from 'mongoose';

const { Schema } = mongoose;

export interface IPageView extends Document {
  storeUid: string;      // La boutique ou l'entité visitée
  visitorUid: string;    // L'Oiseau visiteur (ou un ID de session anonyme)
  path?: string;         // L'URL ou la ressource exacte consultée (optionnel)
  createdAt: Date;       // Horodatage de la visite
}

const PageViewSchema = new Schema<IPageView>({
  storeUid: { type: String, required: true, index: true },
  visitorUid: { type: String, required: true },
  path: { type: String },
  createdAt: { type: Date, default: Date.now, index: true }
});

// 🚀 Index composé optimisé spécifiquement pour l'agrégation de trafic (MonthlyStatsOrchestrator)
PageViewSchema.index({ storeUid: 1, createdAt: -1 });

export const PageViewModel = mongoose.models.PageView || mongoose.model<IPageView>('PageView', PageViewSchema);