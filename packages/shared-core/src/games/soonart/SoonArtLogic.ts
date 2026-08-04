// packages/shared-core/src/games/soonart/SoonArtLogic.ts
import { Point, Treasure, CircleSelection } from './SoonArtTypes';

export class SoonArtLogic {

    /**
     * 📏 Calcule la distance euclidienne entre deux points sur la map
     */
    static getDistance(p1: Point, p2: Point): number {
        const dx = p1.x - p2.x;
        const dy = p1.y - p2.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    /**
     * 🎯 Vérifie si un point (trésor) se trouve à l'intérieur d'un cercle de recherche
     */
    static isPointInCircle(point: Point, center: Point, radius: number): boolean {
        return this.getDistance(point, center) <= radius;
    }

    /**
     * 🔍 Compte combien de trésors non découverts se cachent dans un cercle donné
     */
    static countTreasuresInCircle(center: Point, radius: number, treasures: Treasure[]): number {
        let count = 0;
        for (const treasure of treasures) {
            if (this.isPointInCircle(treasure.position, center, radius)) {
                count++;
            }
        }
        return count;
    }

    /**
     * 🎨 Attribue une couleur artistique au cercle selon le nombre de trésors détectés
     */
    static getColorForDensity(count: number, radius: number): string {
        // Plus le cercle est grand et vide, plus la couleur est froide (bleu/violet)
        // Plus il y a de trésors, plus la couleur s'embrase (or, ambre, écarlate)
        if (count === 0) return 'rgba(59, 130, 246, 0.2)'; // Bleu translucide (Rien)
        if (count === 1) return 'rgba(16, 185, 129, 0.3)'; // Vert émeraude (1 trésor)
        if (count === 2) return 'rgba(245, 158, 11, 0.4)';  // Ambre (2 trésors)
        return 'rgba(239, 68, 68, 0.5)';                  // Rouge intense (Hotspot majeur !)
    }

    /**
     * 🗺️ Génère aléatoirement les positions secrètes des trésors sur la map
     */
    static generateRandomTreasures(count: number, width: number, height: number, margin: number = 50): Treasure[] {
        const treasures: Treasure[] = [];
        for (let i = 0; i < count; i++) {
            treasures.push({
                id: `treasure_${i + 1}`,
                position: {
                    x: Math.floor(Math.random() * (width - 2 * margin)) + margin,
                    y: Math.floor(Math.random() * (height - 2 * margin)) + margin
                },
                isDiscovered: false
            });
        }
        return treasures;
    }

    /**
     * 🏆 Calcule les points de précision et le bonus de vitesse (premier découvreur)
     * Plus la distance avec le vrai trésor est faible, plus le score de base est élevé.
     */
    static calculateGuessAccuracyScore(
        guessPos: Point, 
        actualTreasures: Treasure[]
    ): { score: number, matchedId: string | null, isFirstDiscovery: boolean } {
        let closestTreasure: Treasure | null = null;
        let minDistance = Infinity;

        for (const treasure of actualTreasures) {
            const dist = this.getDistance(guessPos, treasure.position);
            if (dist < minDistance) {
                minDistance = dist;
                closestTreasure = treasure;
            }
        }

        // Seuil de tolérance (à moins de 30 pixels, c'est une trouvaille validée)
        const PERFECT_THRESHOLD = 30;
        const MAX_SCORE = 100;
        const FIRST_DISCOVERY_BONUS = 20; // Léger bonus de rapidité pour le premier découvreur

        if (!closestTreasure || minDistance > 150) {
            // Trop loin, aucun point
            return { score: 0, matchedId: null, isFirstDiscovery: false };
        }

        // Calcul dégressif du score en fonction de la distance
        const accuracyRatio = Math.max(0, 1 - (minDistance / 150));
        let score = Math.round(MAX_SCORE * Math.pow(accuracyRatio, 1.5));
        
        const isWithinThreshold = minDistance <= PERFECT_THRESHOLD;
        const matchedId = isWithinThreshold ? closestTreasure.id : null;
        let isFirstDiscovery = false;

        // Si le trésor est trouvé et n'avait pas encore été découvert par un autre joueur
        if (matchedId && !closestTreasure.isDiscovered) {
            isFirstDiscovery = true;
            score += FIRST_DISCOVERY_BONUS; // Récompense mesurée pour la vitesse
        }

        return {
            score,
            matchedId,
            isFirstDiscovery
        };
    }
}