// packages/shared-core/src/integrity/moral.checker.ts

export interface MoralAnalysis {
  isSafe: boolean;
  score: number; // Sur 100
  flags: string[];
  reason?: string; 
  suggestion?: string;
}

/**
 * ⚖️ MORAL CHECKER
 * Veille à ce que le chant des Oiseaux reste en harmonie avec l'Îlot.
 * Analyse l'Ombre (mots interdits), le Système (mots réservés) et l'Aggressivité (cris).
 */
export class MoralChecker {
  // Mots qui appellent l'Ombre
  private readonly SHADOW_WORDS = [
    "haine", "insulte", "violence", "discrimination", "racisme", "nazi"
  ];
  
  // Mots réservés aux piliers de l'Îlot
  private readonly SYSTEM_KEYWORDS = [
    "admin", "system", "nexus", "moderateur", "moderator", 
    "root", "support", "ilot", "renewall", "dhÖ"
  ];

  /**
   * 🧩 NORMALISATION DU CHANT
   * Déjoue les tentatives de camouflage (Leet Speak).
   */
  private normalizeLeet(text: string): string {
    return text
      .replace(/[1i!|]/g, "i")
      .replace(/[3e€]/g, "e")
      .replace(/[4a@]/g, "a")
      .replace(/[0oø]/g, "o")
      .replace(/[5s$]/g, "s")
      .replace(/[7t]/g, "t")
      .toLowerCase()
      .trim();
  }

  /**
   * 🔍 ANALYSE DE L'INTENTION
   */
  public analyze(content: string): MoralAnalysis {
    const raw = content.trim();
    if (!raw) return { isSafe: false, score: 0, flags: ["empty_content"], reason: "Le silence est d'or, mais ici il faut chanter." };

    const normalized = this.normalizeLeet(raw);
    const foundFlags: string[] = [];
    let penalty = 0;

    // 1. Détection du Système (Blocage critique)
    const systemMatch = this.SYSTEM_KEYWORDS.find(word => normalized.includes(word));
    if (systemMatch) {
      foundFlags.push(`system_reserved:${systemMatch}`);
      penalty += 100; // Blocage total immédiat
    }

    // 2. Détection de l'Ombre (Pénalité lourde)
    this.SHADOW_WORDS.forEach(word => {
      if (normalized.includes(word)) {
        foundFlags.push(`shadow_detected:${word}`);
        penalty += 60;
      }
    });

    // 3. Détection du "Cri" (Aggressivité visuelle)
    // ✅ SUTURE : On augmente la pénalité pour qu'un cri pur soit 'unsafe' (< 70)
    const upperCount = (raw.match(/[A-Z]/g) || []).length;
    if (raw.length > 5 && (upperCount / raw.length) > 0.6) {
      foundFlags.push("aggressive_shouting");
      penalty += 40; // Score tombera à 60
    }

    // 4. Détection du "Chaos" (Spam de caractères spéciaux)
    // ✅ SUTURE : On augmente la pénalité pour que le chaos soit 'unsafe'
    const specialChars = (raw.match(/[^a-zA-Z0-9\s]/g) || []).length;
    if (raw.length > 3 && (specialChars / raw.length) > 0.4) {
      foundFlags.push("chaos_detected");
      penalty += 40; // Score tombera à 60
    }

    // Calcul du score final
    const score = Math.max(0, 100 - penalty);
    const isSafe = score >= 70; // Seuil de tolérance de l'Îlot

    return {
      isSafe,
      score,
      flags: foundFlags,
      ...this.generateFeedback(isSafe, foundFlags)
    };
  }

  private generateFeedback(isSafe: boolean, flags: string[]): { reason?: string, suggestion?: string } {
    if (isSafe) return {};

    // ✅ SYNCHRONISATION LORE : Utilisation de 'Oiseau_' pour correspondre aux tests
    if (flags.some(f => f.startsWith("system_reserved"))) {
      return {
        reason: "Ce nom est protégé par les piliers de l'Îlot.",
        suggestion: `Oiseau_${Math.floor(1000 + Math.random() * 9000)}`
      };
    }

    if (flags.some(f => f.startsWith("shadow_detected"))) {
      return {
        reason: "L'Ombre a été détectée dans ton chant.",
        suggestion: "Essaie de porter un message plus constructif ou bienveillant."
      };
    }

    if (flags.includes("aggressive_shouting")) {
      return {
        reason: "Ton chant est trop perçant (trop de majuscules).",
        suggestion: "Baisse d'un ton pour que tout le monde puisse t'écouter."
      };
    }

    return {
      reason: "La structure de ton message est instable (trop de symboles ou chaos).",
      suggestion: "Utilise des mots plus clairs et moins de symboles."
    };
  }
}