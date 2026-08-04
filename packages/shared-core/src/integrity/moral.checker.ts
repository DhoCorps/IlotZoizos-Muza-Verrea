// packages/shared-core/src/integrity/moral.checker.ts

export interface MoralAnalysis {
    isSafe: boolean;
    score: number; // Sur 100 (Indice de Fréquence Vibratoire)
    frequencyHz: number; // Simulé de 10Hz (Ombre) à 963Hz (Harmonie pure)
    flags: string[];
    reason?: string; 
    suggestion?: string;
    transmutedContent?: string; // 🌀 La version alchimique réharmonisée
    aura?: string; // 🌟 Qualification vibratoire de l'Oiseau
}

export class MoralChecker {
    // 🌑 Les spectres de l'Ombre (mots et intentions toxiques)
    private readonly SHADOW_PATTERNS = [
        /haine/i, /insulte/i, /violence/i, /discrimination/i, /racisme/i, /nazi/i,
        /detruire/i, /suicide/i, /mort\s+a/i, /idiot/i, /inutile/i, /connard/i, /merde/i
    ];
    
    // 🏛️ Les mots réservés au noyau de l'Îlot
    private readonly SYSTEM_KEYWORDS = [
        "admin", "system", "nexus", "moderateur", "moderator", 
        "root", "support", "ilot", "renewall", "dhÖ"
    ];

    // 🌀 Lexique de transmutation poétique pour purifier les ondes négatives
    private readonly TRANSMUTATION_MAP: Record<string, string> = {
        "haine": "souffle d'hiver",
        "colere": "orage passager sur l'Îlot",
        "idiot": "esprit égaré dans la brume",
        "guerre": "danse des vents contraires",
        "mort": "silence éternel",
        "détruire": "remodeler la matière",
        "connard": "vagabond égaré",
        "merde": "poussière d'étoile"
    };

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
     * 🔬 DÉTERMINATION DE L'AURA VIBRATOIRE
     */
    private calculateAura(score: number): string {
        if (score >= 90) return "Harmonie Pure (Céleste)";
        if (score >= 70) return "Résonance Sereine";
        if (score >= 40) return "Brume Instable";
        return "Discorde de l'Ombre";
    }

    /**
     * 🔬 ANALYSE SPECTRALE ET TRANSMUTATION QUANTIQUE
     */
    public analyze(content: string): MoralAnalysis {
        const raw = content.trim();
        if (!raw) {
            return {
                isSafe: false,
                score: 0,
                frequencyHz: 10,
                flags: ["empty_content"],
                reason: "Le silence est d'or, mais ici la volière a besoin de ton chant.",
                transmutedContent: "",
                aura: "Néant absolu"
            };
        }

        const normalized = this.normalizeLeet(raw);
        const foundFlags: string[] = [];
        let penalty = 0;

        // 1. Détection du Système (Interdiction absolue d'usurpation)
        const systemMatch = this.SYSTEM_KEYWORDS.find(word => normalized.includes(word));
        if (systemMatch) {
            foundFlags.push(`system_reserved:${systemMatch}`);
            penalty += 100;
        }

        // 2. Détection de l'Ombre (Mots toxiques)
        this.SHADOW_PATTERNS.forEach((pattern, index) => {
            if (pattern.test(normalized)) {
                foundFlags.push(`shadow_detected:${index}`);
                penalty += 50;
            }
        });

        // 3. Détection du "Cri" (Excès de majuscules - Agressivité visuelle)
        const upperCount = (raw.match(/[A-Z]/g) || []).length;
        if (raw.length > 5 && (upperCount / raw.length) > 0.6) {
            foundFlags.push("aggressive_shouting");
            penalty += 40; // Ajusté pour faire chuter le score à 60 (< 70)
        }

        // 4. Détection du "Chaos" (Spam de caractères spéciaux)
        const specialChars = (raw.match(/[^a-zA-Z0-9\s]/g) || []).length;
        if (raw.length > 3 && (specialChars / raw.length) > 0.4) {
            foundFlags.push("chaos_detected");
            penalty += 40; // Ajusté pour faire chuter le score à 60 (< 70)
        }

        // Calcul du score (0 à 100) et de la fréquence vibratoire en Hz (10Hz à 963Hz)
        const score = Math.max(0, 100 - penalty);
        const frequencyHz = Math.round(10 + (score / 100) * 953);
        const isSafe = score >= 70;
        const aura = this.calculateAura(score);

        // Génération de la version transmutée si des ondes négatives sont détectées
        let transmutedContent = raw;
        if (!isSafe) {
            for (const [shadowWord, poeticAlternative] of Object.entries(this.TRANSMUTATION_MAP)) {
                const regex = new RegExp(shadowWord, 'gi');
                transmutedContent = transmutedContent.replace(regex, poeticAlternative);
            }
            // Adoucissement des majuscules si c'était un cri
            if (foundFlags.includes("aggressive_shouting")) {
                transmutedContent = transmutedContent.toLowerCase();
            }
        }

        return {
            isSafe,
            score,
            frequencyHz,
            flags: foundFlags,
            ...this.generateFeedback(isSafe, foundFlags),
            transmutedContent: !isSafe ? transmutedContent : undefined,
            aura
        };
    }

    private generateFeedback(isSafe: boolean, flags: string[]): { reason?: string, suggestion?: string } {
        if (isSafe) return {};

        if (flags.some(f => f.startsWith("system_reserved"))) {
            return {
                reason: "Ce nom ou ce terme est protégé par les piliers et résonne trop près du cœur du Système.",
                suggestion: `Utilise plutôt une fréquence alternative comme Oiseau_${Math.floor(1000 + Math.random() * 9000)}.`
            };
        }

        if (flags.some(f => f.startsWith("shadow_detected"))) {
            return {
                reason: "L'Ombre a été détectée : des interférences sombres ont été captées dans ton flux.",
                suggestion: "L'Alchimiste a transmuté ton message pour purifier la fréquence de l'Îlot."
            };
        }

        if (flags.includes("aggressive_shouting")) {
            return {
                reason: "Ton signal est trop perçant et saturé (trop de cris en majuscules).",
                suggestion: "Baisse l'intensité pour que l'écho devienne mélodieux."
            };
        }

        return {
            reason: "Le flux textuel présente un taux de chaos trop élevé, la structure de ton message est instable.",
            suggestion: "Structure ton chant pour stabiliser la matrice."
        };
    }
}