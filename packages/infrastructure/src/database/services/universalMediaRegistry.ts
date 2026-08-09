// infrastructure/src/database/services/universalMediaRegistry.ts
import { UniversalMediaModel } from '../models/nosql/universalMedia.model';
import { UniversalMediaType } from '@ilot/types';

export interface IndexMediaPayload {
  mediaId: string;
  sourceApp: UniversalMediaType;
  ownerUid: string;
  ownerSlug: string;
  title: string;
  mediaUrl: string;
  thumbnailUrl?: string;
  priceCents?: number;
  metadata?: Record<string, any>;
  consentForShowcase: boolean;
  consentForMusicSync?: boolean;
  createdAt?: Date;
}

export const UniversalMediaRegistry = {
  /**
   * 🌟 Indexe ou met à jour un média dans le Registre Universel
   */
  async indexItem(payload: IndexMediaPayload) {
    try {
      const updatedMedia = await UniversalMediaModel.findOneAndUpdate(
        { mediaId: payload.mediaId },
        {
          mediaId: payload.mediaId,
          sourceApp: payload.sourceApp,
          ownerUid: payload.ownerUid,
          ownerSlug: payload.ownerSlug,
          title: payload.title,
          mediaUrl: payload.mediaUrl,
          thumbnailUrl: payload.thumbnailUrl || payload.mediaUrl,
          priceCents: payload.priceCents || 0,
          metadata: payload.metadata || {},
          consentForShowcase: payload.consentForShowcase,
          consentForMusicSync: payload.consentForMusicSync || false,
          createdAt: payload.createdAt || new Date(),
        },
        { upsert: true, new: true }
      );

      console.log(`✨ [UniversalMediaRegistry] Artefact indexé : ${payload.mediaId} (${payload.sourceApp})`);
      return updatedMedia;
    } catch (error: any) {
      console.error(`🔥 [UniversalMediaRegistry] Échec de l'indexation pour ${payload.mediaId}:`, error.message);
      throw error;
    }
  },

  /**
   * 🗑️ Retire un média du Registre Universel (lors d'une suppression)
   */
  async removeItem(mediaId: string) {
    try {
      await UniversalMediaModel.findOneAndDelete({ mediaId });
      console.log(`🗑️ [UniversalMediaRegistry] Artefact désindexé : ${mediaId}`);
    } catch (error: any) {
      console.error(`🔥 [UniversalMediaRegistry] Échec de la désindexation pour ${mediaId}:`, error.message);
      throw error;
    }
  }
};