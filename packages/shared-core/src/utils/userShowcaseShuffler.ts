// packages/shared-core/src/utils/userShowcaseShuffler.ts
import { IUniversalMediaItem, ShowcaseFilterOptions } from '@ilot/types';

export class UserShowcaseShuffler {
  /**
   * 🎲 Mélange personnalisé et pseudo-aléatoire des médias pour un utilisateur donné.
   * Utilise une graine basée sur le userUid pour garantir un ordre unique par oiseau,
   * tout en respectant les filtres granulaires et en espaçant au maximum les auteurs.
   */
  public static shuffleForUser(
    mediaItems: IUniversalMediaItem[],
    userUid: string,
    filters: ShowcaseFilterOptions
  ): IUniversalMediaItem[] {
    // 1. Application des filtres granulaires
    let filtered = mediaItems.filter(item => item.consentForShowcase);

    if (filters.selectedApps && filters.selectedApps.length > 0) {
      filtered = filtered.filter(item => filters.selectedApps.includes(item.sourceApp));
    }

    if (filters.onlyTradable) {
      filtered = filtered.filter(item => (item.priceCents || 0) > 0);
    }

    if (filtered.length <= 1) return filtered;

    // 2. Génération d'une valeur numérique simple (seed) à partir du userUid de l'oiseau
    let seed = 0;
    for (let i = 0; i < userUid.length; i++) {
      seed = (seed << 5) - seed + userUid.charCodeAt(i);
      seed |= 0;
    }

    const random = () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };

    // 3. Mélange initial de Fisher-Yates
    const shuffled = [...filtered];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    // 4. Post-traitement robuste (Passes multiples d'anti-rapprochement d'auteur)
    let passes = 0;
    let hasAdjacentSameAuthor = true;

    while (hasAdjacentSameAuthor && passes < 5) {
      hasAdjacentSameAuthor = false;
      passes++;

      for (let i = 0; i < shuffled.length - 1; i++) {
        if (shuffled[i].ownerUid === shuffled[i + 1].ownerUid) {
          hasAdjacentSameAuthor = true;
          // Trouver un élément plus loin qui a un ownerUid différent pour effectuer un échange
          let swapIdx = -1;
          for (let k = i + 2; k < shuffled.length; k++) {
            if (shuffled[k].ownerUid !== shuffled[i].ownerUid) {
              swapIdx = k;
              break;
            }
          }
          if (swapIdx !== -1) {
            [shuffled[i + 1], shuffled[swapIdx]] = [shuffled[swapIdx], shuffled[i + 1]];
          } else {
            // Si aucun échange lointain n'est possible vers la droite, essayer vers la gauche
            for (let k = 0; k < i; k++) {
              if (shuffled[k].ownerUid !== shuffled[i + 1].ownerUid) {
                swapIdx = k;
                break;
              }
            }
            if (swapIdx !== -1) {
              [shuffled[i], shuffled[swapIdx]] = [shuffled[swapIdx], shuffled[i]];
            }
          }
        }
      }
    }

    return shuffled;
  }
}