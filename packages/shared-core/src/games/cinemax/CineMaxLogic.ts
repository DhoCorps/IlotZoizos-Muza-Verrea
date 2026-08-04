// packages/shared-core/src/games/cinemax/CineMaxLogic.ts
import { CineMaxDifficulty } from './CineMaxTypes';

export class CineMaxLogic {
    
    /**
     * 🎬 Calcule la récompense individuelle après une bonne réponse (Le Risk/Reward)
     */
    static getPointsForDifficulty(difficulty: CineMaxDifficulty): number {
        switch (difficulty) {
            case 2: return 2;
            case 4: return 5;
            case 8: return 10;
            case 'TEXT': return 20; // Le jackpot pour les cinéphiles purs
            default: return 5;
        }
    }

    /**
     * 💡 Calcule de combien de % l'affiche s'éclaircit pour tout le monde
     */
    static getBlurReductionForDifficulty(difficulty: CineMaxDifficulty): number {
        switch (difficulty) {
            case 2: return 2;   // -2% de flou
            case 4: return 5;   // -5% de flou
            case 8: return 10;  // -10% de flou
            case 'TEXT': return 20; // -20% : Un énorme coup de projecteur !
            default: return 5;
        }
    }

    /**
     * 🚨 Pénalité Progressive du Buzzer (Sanctionne les clics au hasard)
     * @param errorCount Le nombre de fois où le joueur s'est trompé sur cette manche
     */
    static calculateBuzzerPenalty(errorCount: number): number {
        // La sanction monte très vite ! -2, -5, -15, -30, puis -50 constants
        const penalties = [2, 5, 15, 30, 50]; 
        // L'index correspond à (errorCount - 1), on plafonne à la dernière valeur
        const index = Math.max(0, Math.min(errorCount - 1, penalties.length - 1));
        return penalties[index];
    }

    /**
     * 🎲 Sélectionne une difficulté aléatoire pour le mode "SERVER_CHAOS"
     */
    static getRandomDifficulty(): CineMaxDifficulty {
        const rand = Math.random();
        if (rand < 0.3) return 2;       // 30% de chances (Facile)
        if (rand < 0.7) return 4;       // 40% de chances (Normal)
        if (rand < 0.9) return 8;       // 20% de chances (Difficile)
        return 'TEXT';                  // 10% de chances (Hardcore)
    }

    /**
     * 🛠️ Mélange un tableau de manière robuste (Algorithme de Fisher-Yates)
     */
    static shuffleArray<T>(array: T[]): T[] {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }

    /**
     * 🎞️ MOCK : Prépare la structure pour récupérer les données TMDB.
     * Cette fonction sera appelée par le Manager UNE SEULE FOIS au début du round.
     */
    static async fetchRoundDataFromTMDB(tmdbApiKey: string) {
        // TODO: Implémenter l'appel réel à l'API TMDB (ex: /movie/popular, puis /movie/{id}/credits)
        // L'objectif est de retourner un objet contenant le film cible, 
        // son affiche, et un "pool" d'acteurs/réalisateurs pour générer les questions.
        return {
            targetMovieId: "550", // Fight Club (exemple)
            title: "Fight Club",
            posterPath: "/pB8O4LaSqru31CpKvO3KXzCq9N3.jpg",
            cast: [
                { name: "Brad Pitt", character: "Tyler Durden", profilePath: "/cckcYc2v0yh1tc9QjRelptcOBko.jpg" },
                { name: "Edward Norton", character: "The Narrator", profilePath: "/5XBzD5WuTyVQZeS4VI25z2moMeY.jpg" }
            ],
            director: { name: "David Fincher", profilePath: "/mSzaFcw8Gpvz5F5bB4F50G7926k.jpg" }
        };
    }
}