export interface MoralAnalysis {
  isSafe: boolean;
  score: number; 
  flags: string[];
  reason?: string; 
  suggestion?: string;
}

export class MoralChecker {
  private static readonly SHADOW_WORDS = ["haine", "insulte", "violence", "discrimination"];
  
  /**
   * 🛡️ LISTE DES MOTS RÉSERVÉS
   * On l'aligne sur les tests : ['ADMIN', 'SYSTEM', 'MODERATOR', 'ROOT', 'SUPPORT']
   * On garde 'nexus' et 'ilot' par sécurité.
   */
  private static readonly RESERVED_KEYWORDS = [
    "admin", "system", "nexus", "moderateur", "moderator", "root", "support", "ilot"
  ];

  private static normalizeLeet(text: string): string {
    return text
      .replace(/1/g, "i")
      .replace(/3/g, "e")
      .replace(/4/g, "a")
      .replace(/0/g, "o")
      .replace(/@/g, "a")
      .replace(/\$/g, "s")
      .replace(/!/g, "i")
      .toLowerCase();
  }

  static analyze(content: string): MoralAnalysis {
    const raw = content.trim();
    const normalized = this.normalizeLeet(raw);
    const foundFlags: string[] = [];
    
    // 1. Détection des mots réservés
    this.RESERVED_KEYWORDS.forEach(word => {
      if (normalized.includes(word)) foundFlags.push(`reserved_keyword:${word}`);
    });

    // 2. Détection des mots d'ombre
    this.SHADOW_WORDS.forEach(word => {
      if (normalized.includes(word)) foundFlags.push(`shadow_word:${word}`);
    });

    // 3. Détection du "Cri" (Majuscules)
    const upperCount = (raw.match(/[A-Z]/g) || []).length;
    if (raw.length > 10 && (upperCount / raw.length) > 0.7) {
      foundFlags.push("aggressive_shouting");
    }

    // 4. Calcul des pénalités
    let penalty = 0;
    foundFlags.forEach(flag => {
      if (flag.startsWith("shadow_word") || flag.startsWith("reserved_keyword")) {
        penalty += 50; 
      } else {
        penalty += 15;
      }
    });

    const score = Math.max(0, 100 - penalty);
    const isSafe = score >= 60;

    // 5. Verdict et Suggestions
    let reason = undefined;
    let suggestion = undefined;

    if (!isSafe) {
      const isReserved = foundFlags.some(f => f.startsWith("reserved_keyword"));
      
      if (isReserved) {
        reason = "Ce nom ou contenu est réservé au système.";
        suggestion = `Oiseau_${Math.floor(Math.random() * 1000)}`;
      } else {
        reason = "Contenu inapproprié détecté.";
        suggestion = "Cet oiseau chante un peu trop fort. Essaie de reformuler avec plus de douceur.";
      }
    }

    return {
      isSafe,
      score,
      flags: foundFlags,
      reason,
      suggestion
    };
  }
}