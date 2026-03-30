// packages/shared-core/src/integrity/moral-checker.ts

export interface MoralAnalysis {
  isSafe: boolean;
  score: number; // 0 à 100 (100 = pur, 0 = toxique)
  flags: string[];
  suggestion?: string;
}

export class MoralChecker {
  // Liste noire extensible (on pourra la charger depuis MongoDB plus tard)
  private static readonly SHADOW_WORDS = [
    "haine", "insulte", "violence", "discrimination"
    // À compléter avec l'expertise de DhÖ
  ];

  /**
   * Analyse un contenu textuel pour l'Ilot
   */
  static analyze(content: string): MoralAnalysis {
    const normalized = content.toLowerCase();
    const foundFlags: string[] = [];
    
    // 1. Détection des mots d'ombre
    this.SHADOW_WORDS.forEach(word => {
      if (normalized.includes(word)) {
        foundFlags.push(`shadow_word:${word}`);
      }
    });

    // 2. Vérification de la longueur / Spam
    if (content.length > 2000) foundFlags.push("too_long");
    
    // 3. Calcul du score de bienveillance
    // (Logique simplifiée pour commencer)
    const score = Math.max(0, 100 - (foundFlags.length * 25));

    return {
      isSafe: score >= 50,
      score,
      flags: foundFlags,
      suggestion: score < 50 
        ? "Cet oiseau chante un peu trop fort. Essaie de reformuler avec plus de douceur. <(:<" 
        : undefined
    };
  }
}