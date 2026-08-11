// packages/shared-core/src/sync-engine/showcase.orchestrator.ts
import { UniversalMediaModel } from '../../../infrastructure/src/database/models/nosql/universalMedia.model';
import { OiseauModel } from '../../../infrastructure/src/database/models/nosql/user.model';
import { IUniversalMediaItem, ShowcaseFilterOptions } from '@ilot/types';
import { UserShowcaseShuffler } from '../utils/userShowcaseShuffler';
import { IlotError } from '../errors/ilot.errors';

export class ShowcaseOrchestrator {
  
  /**
   * 🛡️ Utilitaire interne pour valider la présence de l'Oiseau dans la Silice.
   * Empêche la génération de flux pour des entités fantômes.
   */
  private static async resolveCanonicalUserUid(identifier: string): Promise<string> {
    const user = await OiseauModel.findOne({ 
      $or: [{ slug: identifier }, { uid: identifier }, { pseudo: identifier }] 
    }).lean();
    
    if (!user) {
      throw new IlotError(`Oiseau introuvable dans la Silice : ${identifier}`, "NOT_FOUND", 404);
    }
    return (user as any).uid;
  }

  /**
   * 🎬 Récupère, filtre et ordonne le diaporama personnalisé pour un oiseau donné.
   * 🎵 Injecte dynamiquement des ambiances sonores sur les œuvres visuelles.
   */
  public static async getPersonalizedShowcase(
    userIdentifier: string,
    filters: ShowcaseFilterOptions
  ): Promise<IUniversalMediaItem[]> {
    if (!userIdentifier) {
      throw new IlotError("Identifiant d'oiseau requis pour invoquer le diaporama de la canopée.", "FORBIDDEN", 403);
    }

    try {
      // 1. Résolution stricte de l'identité pour sécuriser la graine de hasard (Seed)
      const canonicalUid = await this.resolveCanonicalUserUid(userIdentifier);

      // 2. Récupération optimisée (Projection des champs stricts pour économiser la RAM)
      const rawItems = await UniversalMediaModel.find({ consentForShowcase: true })
        .select('mediaId sourceApp ownerUid ownerSlug title mediaUrl thumbnailUrl priceCents metadata consentForShowcase consentForMusicSync createdAt')
        .lean();

      if (!rawItems || rawItems.length === 0) {
        return [];
      }

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

      // 3. Application du mélange pseudo-aléatoire personnalisé et anti-bashing d'auteur
      const personalizedPlaylist = UserShowcaseShuffler.shuffleForUser(mediaItems, canonicalUid, filters);

      // 4. Moteur d'Association Multimédia (Visuel + Son)
      const ambientTracks = mediaItems.filter(item => item.consentForMusicSync === true && item.sourceApp === 'PARTITA');

      if (ambientTracks.length > 0) {
        personalizedPlaylist.forEach((item, index) => {
          // Si l'œuvre n'est pas déjà sonore
          if (item.sourceApp !== 'PARTITA') {
            // Attribution d'une piste de fond selon une rotation mathématique calée sur l'index (déterministe)
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
      if (error instanceof IlotError) throw error;
      throw new IlotError(`Échec de la constitution du diaporama : ${error.message}`, "INTERNAL_ERROR", 500);
    }
  }
}