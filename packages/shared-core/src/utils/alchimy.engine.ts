// packages/shared-core/src/utils/alchemyEngine.ts

export interface AudioTrackMetadata {
  title: string;
  author: string;
  mediaUrl: string;
}

export interface AlchemyContentItem {
  uid: string;
  sourceModule: string;
  title: string;
  metadata?: Record<string, any>;
  [key: string]: any;
}

export class AlchemyEngine {
  /**
   * Associe dynamiquement et de manière déterministe des pistes sonores d'ambiance 
   * aux contenus textuels ou visuels de l'Agora qui ne possèdent pas encore de son.
   */
  public static infuseAmbientAudio(items: AlchemyContentItem[]): AlchemyContentItem[] {
    if (!items || items.length === 0) return items;

    // 1. Extraction de toutes les pistes sonores consentantes (Partita / Samplotek)
    const ambientTracks: AudioTrackMetadata[] = items
      .filter(item => 
        (item.sourceModule === 'PARTITA' || item.sourceApp === 'PARTITA' || item.sourceModule === 'SAMPLOTEK') &&
        (item.consentForMusicSync === true || item.metadata?.consentForMusicSync === true) &&
        (item.mediaUrl || item.metadata?.mediaUrl)
      )
      .map(track => ({
        title: track.title,
        author: track.authorSlug || track.ownerSlug || track.authorUid || 'Inconnu',
        mediaUrl: track.mediaUrl || track.metadata?.mediaUrl
      }));

    // S'il n'y a aucune piste disponible, on retourne les éléments tels quels
    if (ambientTracks.length === 0) {
      return items;
    }

    // 2. Infusion de l'ambiance sonore sur les contenus textuels ou visuels
    return items.map((item, index) => {
      const isAudioSource = item.sourceModule === 'PARTITA' || item.sourceApp === 'PARTITA' || item.sourceModule === 'SAMPLOTEK';

      // Si le contenu n'est pas déjà une piste musicale et n'a pas d'ambiance
      if (!isAudioSource && (!item.metadata || !item.metadata.ambientTrackInfo)) {
        const assignedTrack = ambientTracks[index % ambientTracks.length];
        return {
          ...item,
          metadata: {
            ...(item.metadata || {}),
            ambientTrackInfo: assignedTrack
          }
        };
      }

      return item;
    });
  }
}