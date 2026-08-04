// packages/shared-core/src/games/plumzee/PlumZeeLogic.ts
import { PlumZeeDie, PlumZeeSymbolValue, PlumZeeCombinationKey, PlumZeeSymbolMeta } from './PlumZeeTypes';

export class PlumZeeLogic {

    // Définition des métadonnées des symboles de l'Îlot Zoizos
    static readonly SYMBOLS: Record<PlumZeeSymbolValue, PlumZeeSymbolMeta> = {
        1: { id: 1, name: 'Plume', icon: '🪶', color: '#38BDF8' },       // Bleu ciel
        2: { id: 2, name: 'Sève', icon: '💧', color: '#10B981' },        // Vert émeraude
        3: { id: 3, name: 'Graine', icon: '🌰', color: '#D97706' },      // Ambre
        4: { id: 4, name: 'Astre', icon: '⭐', color: '#F59E0B' },        // Or
        5: { id: 5, name: 'Étincelle', icon: '⚡', color: '#EF4444' },    // Rouge vif
        6: { id: 6, name: 'Oiseau', icon: '<(:<', color: '#8B5CF6' }      // Violet mystique
    };

    /**
     * 🎲 Génère les 5 dés initiaux non verrouillés
     */
    static rollInitialDice(): PlumZeeDie[] {
        return Array.from({ length: 5 }, (_, index) => ({
            id: index,
            value: (Math.floor(Math.random() * 6) + 1) as PlumZeeSymbolValue,
            isLocked: false
        }));
    }

    /**
     * 🔄 Relance uniquement les dés non verrouillés
     */
    static rerollUnlockedDice(dice: PlumZeeDie[]): PlumZeeDie[] {
        return dice.map(die => {
            if (die.isLocked) return die;
            return {
                ...die,
                value: (Math.floor(Math.random() * 6) + 1) as PlumZeeSymbolValue
            };
        });
    }

    /**
     * 📊 Calcule le score d'une combinaison donnée en fonction des dés actuels
     */
    static calculateScore(combination: PlumZeeCombinationKey, dice: PlumZeeDie[]): number {
        const values = dice.map(d => d.value);
        const counts = values.reduce((acc, val) => {
            acc[val] = (acc[val] || 0) + 1;
            return acc;
        }, {} as Record<number, number>);

        const sumAll = values.reduce((a, b) => a + b, 0);

        switch (combination) {
            case 'FEATHER': return (counts[1] || 0) * 1;
            case 'SAP': return (counts[2] || 0) * 2;
            case 'SEED': return (counts[3] || 0) * 3;
            case 'STAR': return (counts[4] || 0) * 4;
            case 'SPARK': return (counts[5] || 0) * 5;
            case 'BIRD': return (counts[6] || 0) * 6;

            case 'BRELAN': {
                const hasThree = Object.values(counts).some(c => c >= 3);
                return hasThree ? sumAll : 0;
            }
            case 'CARRE': {
                const hasFour = Object.values(counts).some(c => c >= 4);
                return hasFour ? sumAll : 0;
            }
            case 'NID_DOUILLET': { // Full House (ex: 3 d'un type, 2 d'un autre)
                const hasThree = Object.values(counts).includes(3);
                const hasTwo = Object.values(counts).includes(2);
                const hasFive = Object.values(counts).includes(5); // Un Plum'zee compte aussi comme un full
                return (hasThree && hasTwo) || hasFive ? 25 : 0;
            }
            case 'PETITE_MIGRATION': { // Petite suite (4 symboles consécutifs)
                const uniqueSorted = Array.from(new Set(values)).sort((a, b) => a - b);
                let consecutive = 1;
                let maxConsecutive = 1;
                for (let i = 1; i < uniqueSorted.length; i++) {
                    if (uniqueSorted[i] === uniqueSorted[i - 1] + 1) {
                        consecutive++;
                    } else {
                        consecutive = 1;
                    }
                    maxConsecutive = Math.max(maxConsecutive, consecutive);
                }
                return maxConsecutive >= 4 ? 30 : 0;
            }
            case 'GRANDE_MIGRATION': { // Grande suite (5 symboles consécutifs)
                const uniqueSorted = Array.from(new Set(values)).sort((a, b) => a - b);
                const isSequence = uniqueSorted.length === 5 && uniqueSorted[4] - uniqueSorted[0] === 4;
                return isSequence ? 40 : 0;
            }
            case 'PLUMZEE': { // 5 symboles identiques
                const hasFive = Object.values(counts).includes(5);
                return hasFive ? 50 : 0;
            }
            case 'VENT_LIBRE': { // Chance (somme de tous les dés)
                return sumAll;
            }
            default:
                return 0;
        }
    }
}