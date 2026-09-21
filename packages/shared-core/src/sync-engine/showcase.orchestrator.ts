import { UniversalMediaModel, OiseauModel } from '@ilot/infrastructure';
import { IUniversalMediaItem, ShowcaseFilterOptions, SourceApp } from '@ilot/types';
import { UserShowcaseShuffler } from '../utils/userShowcaseShuffler';
import { IlotError } from '../errors/ilot.errors';
import { resolveCanonicalUid } from '../utils/orchestrator.engine'; // 🛡️ Import de l'utilitaire global unifié

interface IRawMediaDocument {
  mediaId: string;
  sourceApp: string;
  ownerUid: string;
  ownerSlug: string;
  title: string;
  mediaUrl: string;
  thumbnailUrl?: string;
  priceCents?: number;
  metadata?: Record<string, unknown>;
  consentForShowcase: boolean;
  consentForMusicSync: boolean;
  createdAt: Date;
  [key: string]: unknown;
}

export class ShowcaseOrchestrator {
  
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
      // ⏱️ SYNCHRONISATION DES HORODATAGES : Constante unique 'now' pour figer la requête du diaporama
      const now = new Date();

      // 1. Résolution stricte de l'identité pour sécuriser la graine de hasard (Seed) via l'utilitaire global
      const canonicalUid = await resolveCanonicalUid(OiseauModel, userIdentifier, "Oiseau");

      // 2. Récupération optimisée (Projection des champs stricts pour économiser la RAM)
      const rawItems = (await UniversalMediaModel.find({ consentForShowcase: true })
        .select('mediaId sourceApp ownerUid ownerSlug title mediaUrl thumbnailUrl priceCents metadata consentForShowcase consentForMusicSync createdAt')
        .lean()) as unknown as IRawMediaDocument[];

      if (!rawItems || rawItems.length === 0) {
        return [];
      }

      // Conversion en objets typés propres avec assertion stricte de sourceApp vers UniversalMediaType
      const mediaItems: IUniversalMediaItem[] = rawItems.map((item) => ({
        mediaId: item.mediaId,
        sourceApp: item.sourceApp as SourceApp,
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
                mediaUrl: ambientTrack.mediaUrl,
                synchronizedAt: now.toISOString()
              }
            };
          }
        });
      }

      return personalizedPlaylist;
    } catch (error: unknown) {
      if (error instanceof IlotError) throw error;
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new IlotError(`Échec de la constitution du diaporama : ${errorMessage}`, "INTERNAL_ERROR", 500);
    }
  }
}