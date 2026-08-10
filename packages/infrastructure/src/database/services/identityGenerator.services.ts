import { connectToDatabase } from "../mongoose";
import { LexiconEntryModel } from "../models/nosql/lexiconEntry.model"; // Modèle MongoDB d'Univers'Hall

export interface GeneratedIdentity {
    pseudo: string;
    frequenceHEX: string;
}

/**
 * Pioche un mot aléatoire d'une catégorie grammaticale donnée dans la base d'Univers'Hall
 */
async function getRandomWordByPart(part: 'noun' | 'jective' | 'verb' | 'adjective', language: 'fr' | 'en' = 'fr'): Promise<string> {
    try {
        await connectToDatabase();
        
        // On normalise 'jective' ou 'adjective' pour la requête
        const targetPart = part === 'jective' ? 'adjective' : part;

        // On cherche un mot correspondant au type grammatical
        const count = await LexiconEntryModel.countDocuments({ partOfSpeech: targetPart, language });
        if (count === 0) {
            // Fallback si la base est vide ou en cours d'ingestion
            if (targetPart === 'noun') return 'Faucon';
            if (targetPart === 'adjective') return 'Sélénite';
            return 'Résonne';
        }

        const random = Math.floor(Math.random() * count);
        const entry = await LexiconEntryModel.findOne({ partOfSpeech: targetPart, language }).skip(random);

        if (!entry || !entry.word) {
            return targetPart === 'noun' ? 'Piaf' : 'Silencieux';
        }

        // Met une majuscule au mot pour faire un joli nom/titre
        const word = entry.word.toLowerCase();
        return word.charAt(0).toUpperCase() + word.slice(1);
    } catch (error) {
        console.error(`🔥 [IdentityGenerator] Erreur lors de la pioche du mot (${part}):`, error);
        return part === 'noun' ? 'Efluvial' : part === 'adjective' ? 'Bleuté' : 'S\'élève';
    }
}

/**
 * Génère une fréquence HEX aléatoire et élégante pour l'aura de l'oiseau (teintes de gris bleuté, rouge corail ou sève)
 */
function generateOiseauColor(): string {
    const ecoColors = [
        '#2D3748', // Gris bleuté profond
        '#E53E3E', // Rouge corail vivant
        '#4A5568', // Silice
        '#C53030', // Sève ardente
        '#718096'  // Brume de canopée
    ];
    return ecoColors[Math.floor(Math.random() * ecoColors.length)];
}

/**
 * Génère le pseudonyme unique de l'Oiseau : Adjectif + Nom + Verbe
 * (ex: "Le Brumeux Faucon Chante" ou "Sélénite Faucon Résonne")
 */
export async function generateOiseauIdentity(): Promise<GeneratedIdentity> {
    const adjective = await getRandomWordByPart('adjective');
    const noun = await getRandomWordByPart('noun');
    const verb = await getRandomWordByPart('verb');

    // Formule poétique : [Adjectif] [Nom] [Verbe]
    const pseudo = `${adjective} ${noun} ${verb}`;
    const frequenceHEX = generateOiseauColor();

    return {
        pseudo,
        frequenceHEX
    };
}