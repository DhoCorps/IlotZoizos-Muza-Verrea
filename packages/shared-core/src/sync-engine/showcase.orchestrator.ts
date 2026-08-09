// packages/shared-core/src/sync-engine/showcase.orchestrator.ts
import { UniversalMediaModel } from '../../../infrastructure/src/database/models/nosql/universalMedia.model';
import { IUniversalMediaItem, ShowcaseFilterOptions } from '@ilot/types';
import { UserShowcaseShuffler } from '../utils/userShowcaseShuffler';
import { IlotError } from '../errors/ilot.errors';

export class ShowcaseOrchestrator {
  /**
   * 🎬 Récupère, filtre et ordonne le diaporama personnalisé pour un oiseau donné.
   * 🎵 Injecte dynamiquement des ambiances sonores sur les œuvres visuelles.
   */
  public static async getPersonalizedShowcase(
    userUid: string,
    filters: ShowcaseFilterOptions
  ): Promise<IUniversalMediaItem[]> {
    if (!userUid) {
      throw new IlotError("Identifiant d'oiseau requis pour invoquer le diaporama de la canopée.", "FORBIDDEN", 403);
    }

    try {
      // 1. Récupération de tous les médias autorisés pour le showcase dans la Silice
      const rawItems = await UniversalMediaModel.find({ consentForShowcase: true }).lean();

      // Conversion en objets typés propres
      const mediaItems: IUniversalMediaItem[] = rawItems.map((item: any) => ({
        mediaId: item.mediaId,
        sourceApp: item.sourceApp,
        ownerUid: item.ownerUid,
        ownerSlug: item.ownerSlug,
        title: item.title,
        mediaUrl: item.mediaUrl,
        thumbnailUrl: item.thumbnailUrl,
        priceCents: item.priceCents,
        metadata: item.metadata || {},
        consentForShowcase: item.consentForShowcase,
        consentForMusicSync: item.consentForMusicSync,
        createdAt: item.createdAt,
      }));

      // 2. Application du mélange pseudo-aléatoire personnalisé et anti-bashing d'auteur
      const personalizedPlaylist = UserShowcaseShuffler.shuffleForUser(mediaItems, userUid, filters);

      // 3. Moteur d'Association Multimédia (Visuel + Son)
      // Isolement des pistes musicales expressément consenties pour habiller les autres œuvres
      const ambientTracks = mediaItems.filter(item => item.consentForMusicSync === true && item.sourceApp === 'PARTITA');

      if (ambientTracks.length > 0) {
        personalizedPlaylist.forEach((item, index) => {
          // Si l'œuvre n'est pas déjà sonore
          if (item.sourceApp !== 'PARTITA') {
            // Attribution d'une piste de fond selon une rotation mathématique calée sur l'index de la playlist (déterministe)
            const ambientTrack = ambientTracks[index % ambientTracks.length];
            item.metadata = {
              ...item.metadata,
              ambientTrackInfo: {
                title: ambientTrack.title,
                author: ambientTrack.ownerSlug,
                mediaUrl: ambientTrack.mediaUrl
              }
            };
          }
        });
      }

      return personalizedPlaylist;
    } catch (error: any) {
      throw new IlotError(`Échec de la constitution du diaporama : ${error.message}`, "INTERNAL_ERROR", 500);
    }
  }
}