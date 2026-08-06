import { WikiOracleArticle, WikiOracleTheme, QuizQuestion, WikiOracleChoicesMode } from "./WikiOracleTypes";

export class WikiOracleLogic {
    private static articleCache: WikiOracleArticle[] = [];

    // Récupère des articles aléatoires ou par thème via l'API Wikipedia
    public static async fetchWikiArticles(theme: WikiOracleTheme = 'random'): Promise<WikiOracleArticle[]> {
        try {
            // On récupère un lot d'articles aléatoires depuis l'API REST Wikipedia française
            const promises = Array.from({ length: 10 }).map(async () => {
                const res = await fetch('https://fr.wikipedia.org/api/rest_v1/page/random/summary', {
                    headers: { 'User-Agent': 'IlotZoizosGameServer/1.0 (contact@ilot-zoizos.local)' }
                });
                if (!res.ok) return null;
                return await res.json() as WikiOracleArticle;
            });

            const results = await Promise.all(promises);
            const valid = results.filter((art): art is WikiOracleArticle => !!art && !!art.title && !!art.extract);
            return valid;
        } catch (err) {
            console.error("[WikiOracleLogic] Erreur lors de l'appel à l'API Wikipedia :", err);
            return [];
        }
    }

    public static async getQuizQuestion(theme: WikiOracleTheme, choicesMode: WikiOracleChoicesMode): Promise<QuizQuestion | null> {
        const articles = await WikiOracleLogic.fetchWikiArticles(theme);
        if (articles.length === 0) return null;

        // Sélection de l'article cible
        const target = articles[Math.floor(Math.random() * articles.length)];
        const correctAnswer = target.title;

        // Génération d'indices progressifs
        const hints: string[] = [
            `Indice 1 (Général) : ${target.description || 'Article encyclopédique de Wikipédia.'}`,
            `Indice 2 (Contexte) : ${target.extract.substring(0, 120)}...`,
            `Indice 3 (Précision) : Le titre commence par la lettre "${correctAnswer.charAt(0).toUpperCase()}" et comporte ${correctAnswer.length} caractères.`
        ];

        // Génération des options (si mode QCM 2, 4 ou 8 choix)
        let options: string[] = [correctAnswer];
        if (choicesMode !== '0') {
            const count = parseInt(choicesMode, 10) || 4;
            const fakes = articles
                .filter(a => a.title !== correctAnswer)
                .map(a => a.title);

            while (options.length < count && fakes.length > 0) {
                const idx = Math.floor(Math.random() * fakes.length);
                const fake = fakes.splice(idx, 1)[0];
                if (!options.includes(fake)) options.push(fake);
            }
        }

        // Mélange des options
        options = options.sort(() => Math.random() - 0.5);

        return {
            questionTitle: "Devinez l'article Wikipédia à partir des indices progressifs !",
            correctAnswer,
            options,
            hints,
            imageUrl: target.thumbnail?.source,
            wikiUrl: target.content_urls?.desktop?.page
        };
    }

    public static shuffleArray<T>(array: T[]): T[] {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }
}