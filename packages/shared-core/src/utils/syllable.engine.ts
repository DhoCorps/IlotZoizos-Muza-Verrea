// packages/shared-core/src/utils/syllable.engine.ts

export class SyllableEngine {
  /**
   * 🪶 Compteur de Syllabes Quantique
   * Évalue le nombre de pieds (syllabes poétiques) d'un vers en appliquant 
   * rigoureusement les règles de la scansion classique française.
   */
  public static countPieds(line: string): number {
    if (!line.trim()) return 0;
    
    // 1. Nettoyage extrême : retrait de la ponctuation ET des chiffres
    const cleanLine = line.toLowerCase().replace(/[0-9.,/#!$%^&*;:{}=\-_`~()]/g, '');
    
    // 2. Séparation par espaces. On supprime les apostrophes pour fusionner (l'aube -> laube)
    const words = cleanLine.replace(/'/g, '').split(/\s+/).filter(Boolean);
    
    let totalSyllables = 0;

    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      const nextWord = words[i + 1];

      let w = word;
      
      // 3. Fusion Heuristique des Diphtongues et Synérèses
      // Remplacement par une seule voyelle ('a') pour que le bloc compte pour 1 pied.
      // Groupes de 3+ lettres d'abord :
      w = w.replace(/(eau|œu|ieu|ien|ion|iau|oui)/g, 'a');
      // Groupes de 2 lettres ensuite :
      w = w.replace(/(au|ou|où|oû|eu|eû|ei|ai|oi|ui|ay|oy|ey|ie|ia|io)/g, 'a');
      
      const matches = w.match(/[aeiouyéèêëàâäîïôöùûüœæ]/g);
      let syllables = matches ? matches.length : 0;

      if (syllables === 0) {
        // Sécurité : Un mot sans voyelle reconnue vaut 1 (ex: onomatopées bizarres)
        totalSyllables += 1;
        continue;
      }

      // 4. Règle absolue du 'E' muet poétique
      if (word.endsWith('e')) {
        // Élision : le mot suivant commence par une voyelle (ou h muet)
        if (nextWord && /^[aeiouyéèêëàâäîïôöùûüœæh]/i.test(nextWord)) {
          syllables -= 1; 
        } 
        // Apocope : fin absolue du vers, le 'e' s'efface
        else if (!nextWord) {
          syllables -= 1; 
        }
      } 
      // Apocope pour les rimes féminines complexes (es, ent) en fin de vers
      else if (word.endsWith('es') || word.endsWith('ent')) {
         if (!nextWord && syllables > 1) {
           syllables -= 1;
         }
      }

      // Un mot grammatical valide compte toujours au moins 1 syllabe (ex: "le", "je")
      totalSyllables += Math.max(syllables, 1); 
    }

    return totalSyllables;
  }

  /**
   * 🌌 Analyse un poème complet pour en déduire sa structure et sa forme.
   */
  public static analyzePoem(content: string): { totalLines: number; structure: number[]; format: string } {
    const lines = content.split('\n').map(l => l.trim()).filter(Boolean);
    const structure = lines.map(l => this.countPieds(l));
    
    let format = 'FREE_VERSE';
    
    // Détection des structures classiques
    if (structure.length === 14) {
      format = 'SONNET';
    } else if (structure.length === 3 && structure[0] === 5 && structure[1] === 7 && structure[2] === 5) {
      format = 'HAIKU';
    } else if (structure.length > 0 && structure.every(s => s === 12)) {
      format = 'ALEXANDRINE';
    }

    return {
      totalLines: lines.length,
      structure,
      format
    };
  }
}