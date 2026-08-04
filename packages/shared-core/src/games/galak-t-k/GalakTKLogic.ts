// packages/shared-core/src/games/galaktk/GalakTKLogic.ts
import { GalakTKPoint, GalakTKGameOptions } from './GalakTKTypes';

export class GalakTKLogic {

    /**
     * 🌌 Génère aléatoirement les positions uniques des étoiles sur la grille
     */
    static generateRandomStars(options: GalakTKGameOptions): GalakTKPoint[] {
        const stars: GalakTKPoint[] = [];
        const { gridWidth, gridHeight, totalStars } = options;
        
        while (stars.length < totalStars) {
            const rx = Math.floor(Math.random() * gridWidth);
            const ry = Math.floor(Math.random() * gridHeight);

            const exists = stars.some(s => s.x === rx && s.y === ry);
            if (!exists) {
                stars.push({ x: rx, y: ry });
            }
        }
        return stars;
    }

    /**
     * 🔭 Calcule le nombre d'étoiles situées sur les axes (Ligne, Colonne, Diagonales) depuis un point cliqué
     */
    static countStarsOnAxes(
        clickPoint: GalakTKPoint, 
        stars: GalakTKPoint[], 
        options: GalakTKGameOptions
    ): { starCount: number, isStar: boolean } {
        const { x, y } = clickPoint;

        // 1. Vérifier si le point cliqué est directement une étoile cachée
        const targetStar = stars.find(s => s.x === x && s.y === y);
        if (targetStar) {
            return { starCount: 0, isStar: true };
        }

        const uniqueStarIds = new Set<string>();

        for (const star of stars) {
            let matchesAxis = false;

            if (options.mode === 'global') {
                // Mode Facile : Toute la ligne, toute la colonne, et les deux diagonales d'un bout à l'autre
                const isRow = star.y === y;
                const isCol = star.x === x;
                const isMainDiag = (star.x + star.y) === (x + y);       // Diagonale /
                const isAntiDiag = (star.x - star.y) === (x - y);       // Diagonale \

                if (isRow || isCol || isMainDiag || isAntiDiag) {
                    matchesAxis = true;
                }
            } else {
                // Mode Difficile : Voisinage restreint (ex: distance de Chebyshev <= 2)
                const chebyshevDist = Math.max(Math.abs(star.x - x), Math.abs(star.y - y));
                if (chebyshevDist <= 2 && chebyshevDist > 0) {
                    matchesAxis = true;
                }
            }

            if (matchesAxis) {
                uniqueStarIds.add(`${star.x},${star.y}`);
            }
        }

        return { starCount: uniqueStarIds.size, isStar: false };
    }

    /**
     * 🏆 Calcule le score "gamer" honorifique (basé sur la rapidité et l'optimisation des coups)
     */
    static calculateGamerScore(turnsTaken: number, totalTimeMs: number, totalStars: number): number {
        const baseScore = totalStars * 1000;
        const turnPenalty = turnsTaken * 15;
        const timePenalty = Math.floor(totalTimeMs / 1000) * 2;

        return Math.max(100, baseScore - turnPenalty - timePenalty);
    }
}