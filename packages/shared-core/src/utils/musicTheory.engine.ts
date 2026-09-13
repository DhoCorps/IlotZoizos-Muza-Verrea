// packages/shared-core/src/utils/musicTheory.engine.ts

export type Note = 'C' | 'C#' | 'D' | 'D#' | 'E' | 'F' | 'F#' | 'G' | 'G#' | 'A' | 'A#' | 'B';

export interface ScaleDefinition {
  name: string;
  intervals: number[]; // Intervalles en demi-tons
  flavor: string; // Pour l'affichage UI
}

export class MusicTheoryEngine {
  // L'ordre chromatique absolu
  private static readonly CHROMATIC_SCALE: Note[] = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

  // LE DICTIONNAIRE DES GAMMES (Formules mathématiques)
  public static readonly SCALES: Record<string, ScaleDefinition> = {
    // Classiques
    MAJOR: { name: 'Majeure', intervals: [2, 2, 1, 2, 2, 2, 1], flavor: 'Lumineux, Joyeux' },
    MINOR_NATURAL: { name: 'Mineure Naturelle', intervals: [2, 1, 2, 2, 1, 2, 2], flavor: 'Mélancolique, Sombre' },
    
    // Les Mystiques & Néoclassiques
    HARMONIC_MINOR: { name: 'Mineure Harmonique', intervals: [2, 1, 2, 2, 1, 3, 1], flavor: 'Néoclassique, Tendu' },
    MELODIC_MINOR: { name: 'Mineure Mélodique', intervals: [2, 1, 2, 2, 2, 2, 1], flavor: 'Jazz, Fluide' },
    
    // Les Exotiques & Orientales
    PHRYGIAN_DOMINANT: { name: 'Phrygien Dominant', intervals: [1, 3, 1, 2, 1, 2, 2], flavor: 'Flamenco, Égyptien' },
    DOUBLE_HARMONIC: { name: 'Double Harmonique (Arabe)', intervals: [1, 3, 1, 2, 1, 3, 1], flavor: 'Oriental, Mystique' },
    HIRAJOSHI: { name: 'Hirajoshi (Japon)', intervals: [2, 1, 4, 1, 4], flavor: 'Asiatique, Suspendu' }, // Pentatonique
    
    // Blues & Rock
    BLUES: { name: 'Blues', intervals: [3, 2, 1, 1, 3, 2], flavor: 'Grit, Tension' },
  };

  /**
   * Génère les notes d'une gamme à partir de sa fondamentale.
   * Ex: getNotesInScale('A', SCALES.HARMONIC_MINOR) -> ['A', 'B', 'C', 'D', 'E', 'F', 'G#']
   */
  public static getNotesInScale(root: Note, scaleDef: ScaleDefinition): Note[] {
    const rootIndex = this.CHROMATIC_SCALE.indexOf(root);
    const notes: Note[] = [root];
    let currentIndex = rootIndex;

    // On parcourt les intervalles (sauf le dernier qui ramène à l'octave)
    for (let i = 0; i < scaleDef.intervals.length - 1; i++) {
      currentIndex = (currentIndex + scaleDef.intervals[i]) % 12;
      notes.push(this.CHROMATIC_SCALE[currentIndex]);
    }

    return notes;
  }

  /**
   * LE DÉTECTEUR (Magie pure) :
   * Prend un tableau de notes brutes trouvées dans une partition, 
   * et retourne les gammes les plus probables avec un score de correspondance.
   */
  public static detectScale(playedNotes: Note[]): { root: Note; scaleName: string; scaleKey: string; flavor: string; score: number }[] {
    // 1. Dédoublonner les notes jouées
    const uniqueNotes = Array.from(new Set(playedNotes));
    const results = [];

    // 2. Tester toutes les fondamentales (C, C#, D...)
    for (const root of this.CHROMATIC_SCALE) {
      // 3. Tester toutes les gammes du dictionnaire
      for (const [scaleKey, scaleDef] of Object.entries(this.SCALES)) {
        const scaleNotes = this.getNotesInScale(root, scaleDef);
        
        // Combien de notes jouées appartiennent à cette gamme ?
        const matchingNotes = uniqueNotes.filter(n => scaleNotes.includes(n));
        const matchPercentage = (matchingNotes.length / uniqueNotes.length) * 100;

        // Si la correspondance est excellente (ex: > 85%), on l'enregistre
        if (matchPercentage > 85) {
          results.push({
            root,
            scaleName: scaleDef.name,
            scaleKey,
            flavor: scaleDef.flavor,
            score: matchPercentage,
          });
        }
      }
    }

    // Trier par meilleur score décroissant
    return results.sort((a, b) => b.score - a.score);
  }
}