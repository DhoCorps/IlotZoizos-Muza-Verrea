// src/games/kooontreez/AtomikKFardELogic.ts

import {
    AtomikGrid, AtomikCard, AtomikCardType, AtomikDeck, AtomikKFardEMode, AtomikKFardEOption,
    DuelOutcome, CellOwner, GridCell, ConquestRoundResult, CellCoordinates
} from "./Atomik-K-FarTypes";

let cardIdCounter = 0;
function generateUniqueCardId(): string {
    return `card-${Date.now()}-${cardIdCounter++}`;
}

export class AtomikKFardELogic {
    private static readonly initialCardPool: AtomikCardType[] = ['Pierre', 'Feuille', 'Ciseaux', 'Cafard(e)', 'Bombe H'];

    private static readonly optionQuantities: { [key in AtomikKFardEOption]: number } = {
        'Sonic': 1, // Base size 1, donc grille 3x3
        'Alex Kid': 2, // Base size 2, donc grille 6x6
        'Megaman': 3, // Base size 3, donc grille 9x9
        'Lara Croft': 4, // Base size 4, donc grille 12x12
        'Géralt de Riv': 5, // Base size 5, donc grille 15x15
        'Choisir une Option de Jeu': 0
    };

    /**
     * @description Définition des règles de jeu (Pierre-Feuille-Ciseaux + Bombe/Cafard).
     */
    private static readonly gameRules: {
        [key in AtomikCardType]: {
            beats: AtomikCardType[];
            scoreWin: number;
            scoreLoss: number;
            scoreTie: number;
            scoreSpecial?: number;
        }
    } = {
        'Pierre': { beats: ['Ciseaux', 'Cafard(e)'], scoreWin: 6, scoreLoss: 0, scoreTie: 0 },
        'Feuille': { beats: ['Pierre', 'Cafard(e)'], scoreWin: 6, scoreLoss: 0, scoreTie: 0 },
        'Ciseaux': { beats: ['Feuille', 'Cafard(e)'], scoreWin: 6, scoreLoss: 0, scoreTie: 0 },
        'Cafard(e)': { beats: ['Bombe H'], scoreWin: 10, scoreLoss: 0, scoreTie: 5 },
        'Bombe H': { beats: ['Pierre', 'Feuille', 'Ciseaux'], scoreWin: 4, scoreLoss: -5, scoreTie: -10, scoreSpecial: -10 }
    };

    /**
     * @description Génère un deck complet de cartes basé sur le mode et l'option.
     */
    public static generateFullDeck(mode: AtomikKFardEMode, option: AtomikKFardEOption): AtomikDeck {
        let deck: AtomikDeck = [];
        const multiplier = AtomikKFardELogic.optionQuantities[option] || 1;
        const totalCards = mode === 'Random' ? multiplier * 10 : multiplier * this.initialCardPool.length;

        for (let i = 0; i < totalCards; i++) {
            const cardType = mode === 'Random' 
                ? this.initialCardPool[Math.floor(Math.random() * this.initialCardPool.length)]
                : this.initialCardPool[i % this.initialCardPool.length];
            deck.push({ id: generateUniqueCardId(), type: cardType });
        }
        return deck;
    }

    /**
     * @description Mélange un tableau de n'importe quel type (utilisé pour les cartes volées/défaussées).
     */
    public static shuffleArray<T>(array: T[]): T[] {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }

    /**
     * @description Mélange le deck de jeu principal.
     */
    public static shuffleDeck(deck: AtomikDeck): AtomikDeck {
        return this.shuffleArray(deck);
    }

    /**
     * @description Crée une grille vide avec les propriétés avancées (isRadioactive, isNest).
     */
    public static createEmptyAtomikKFardEGrid(option: AtomikKFardEOption): AtomikGrid {
        const baseSize = AtomikKFardELogic.optionQuantities[option] || 1;
        const size = baseSize * 3;
        
        return Array.from({ length: size }, () => 
            Array.from({ length: size }, () => ({
                card: null,
                owner: CellOwner.None,
                color: '#CCCCCC',
                isPermanentlyContested: false,
                isRadioactive: false,
                isNest: false
            }))
        );
    }

    /**
     * @description Reconstitue la main d'un joueur après un tour (gère les vols et les pertes).
     */
    public static drawNewHand(currentHand: AtomikDeck, gameDeck: AtomikDeck, cardsStolen: AtomikCard[], cardsToLose: AtomikCard[]): AtomikDeck {
        let newHand = currentHand.filter(card => 
            !cardsToLose.some(c => c.id === card.id) && !cardsStolen.some(c => c.id === card.id)
        );

        while (newHand.length < 7 && gameDeck.length > 0) {
            newHand.push(gameDeck.shift()!);
        }
        return newHand;
    }

    /**
     * @description Résout mathématiquement un duel entre deux cartes.
     */
    public static resolveDuel(playerCard: AtomikCard, opponentCard: AtomikCard): DuelOutcome {
        const playerRule = AtomikKFardELogic.gameRules[playerCard.type];
        const opponentRule = AtomikKFardELogic.gameRules[opponentCard.type];

        if (!playerRule || !opponentRule) return { playerHasWon: false, ennemyHasWon: false, player1ScoreChange: 0, player2ScoreChange: 0 };

        if (playerCard.type === 'Bombe H' && opponentCard.type === 'Bombe H') {
            return { playerHasWon: false, ennemyHasWon: false, player1ScoreChange: playerRule.scoreSpecial!, player2ScoreChange: opponentRule.scoreSpecial! };
        }
        if (playerCard.type === 'Cafard(e)' && opponentCard.type === 'Cafard(e)') {
            return { playerHasWon: false, ennemyHasWon: false, player1ScoreChange: playerRule.scoreTie, player2ScoreChange: opponentRule.scoreTie };
        }
        if (playerRule.beats.includes(opponentCard.type)) {
            return { playerHasWon: true, ennemyHasWon: false, player1ScoreChange: playerRule.scoreWin, player2ScoreChange: opponentRule.scoreLoss };
        }
        if (opponentRule.beats.includes(playerCard.type)) {
            return { playerHasWon: false, ennemyHasWon: true, player1ScoreChange: playerRule.scoreLoss, player2ScoreChange: opponentRule.scoreWin };
        }

        return { playerHasWon: false, ennemyHasWon: false, player1ScoreChange: playerRule.scoreTie, player2ScoreChange: opponentRule.scoreTie };
    }

    /**
     * @description Résout un round de conquête, place les cartes, applique les dégâts et la propagation (Nids/Radiations).
     */
    public static resolveConquestRound(player1Grid: AtomikGrid, player2Grid: AtomikGrid, option: AtomikKFardEOption): ConquestRoundResult {
        const rows = player1Grid.length;
        const cols = player1Grid[0].length;
        const finalGrid = AtomikKFardELogic.createEmptyAtomikKFardEGrid(option);
        
        let p1Cells = 0, p2Cells = 0, p1Score = 0, p2Score = 0;
        let stealP1: AtomikCard[] = [], stealP2: AtomikCard[] = [], loseCards: AtomikCard[] = [];
        
        // Stockage des origines de propagation pour le balayage de fin de round
        const radioactiveOrigins: CellCoordinates[] = [];
        const nestOrigins: CellCoordinates[] = [];

        // 1er Balayage : Résolution des duels
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const c1 = player1Grid[r][c].card;
                const c2 = player2Grid[r][c].card;
                let cellResult = { ...finalGrid[r][c] };

                // Gestion des cases déjà radioactives
                if (finalGrid[r][c].isRadioactive && c1?.type !== 'Cafard(e)' && c2?.type !== 'Cafard(e)') {
                    cellResult.owner = CellOwner.Special;
                    cellResult.color = '#6F42C1';
                    cellResult.isRadioactive = true;
                    finalGrid[r][c] = cellResult;
                    continue;
                }

                if (!c1 && !c2) continue;

                if (!c1 && c2) {
                    cellResult.owner = CellOwner.Player2; cellResult.color = '#007BFF'; p2Cells++; p2Score++;
                } else if (c1 && !c2) {
                    cellResult.owner = CellOwner.Player1; cellResult.color = '#DC3545'; p1Cells++; p1Score++;
                } else if (c1 && c2) {
                    const duel = this.resolveDuel(c1, c2);
                    p1Score += duel.player1ScoreChange;
                    p2Score += duel.player2ScoreChange;

                    if (c1.type === 'Bombe H' && c2.type === 'Bombe H') {
                        cellResult.owner = CellOwner.Special; cellResult.color = '#6F42C1'; cellResult.isRadioactive = true;
                        radioactiveOrigins.push({ r, c }); loseCards.push(c1, c2);
                    } else if (c1.type === 'Cafard(e)' && c2.type === 'Cafard(e)') {
                        cellResult.owner = CellOwner.Special; cellResult.color = '#343A40'; cellResult.isNest = true; cellResult.isPermanentlyContested = true;
                        nestOrigins.push({ r, c }); loseCards.push(c1, c2);
                    } else if (c1.type === 'Cafard(e)' && c2.type === 'Bombe H') {
                        cellResult.owner = CellOwner.Player1; cellResult.color = '#DC3545'; p1Cells++; stealP2.push(c2);
                    } else if (c1.type === 'Bombe H' && c2.type === 'Cafard(e)') {
                        cellResult.owner = CellOwner.Player2; cellResult.color = '#007BFF'; p2Cells++; stealP1.push(c1);
                    } else if (duel.playerHasWon) {
                        cellResult.owner = CellOwner.Player1; cellResult.color = '#DC3545'; p1Cells++;
                    } else if (duel.ennemyHasWon) {
                        cellResult.owner = CellOwner.Player2; cellResult.color = '#007BFF'; p2Cells++;
                    } else {
                        cellResult.owner = CellOwner.Tie; cellResult.color = '#6C757D'; loseCards.push(c1, c2);
                    }
                }
                finalGrid[r][c] = cellResult;
            }
        }

        // 2ème Balayage : Propagation (Helper function)
        const propagate = (origins: CellCoordinates[], isRadioactive: boolean, color: string) => {
            for (const { r, c } of origins) {
                // Les 4 cases adjacentes (Haut, Bas, Gauche, Droite)
                [{ r: r - 1, c }, { r: r + 1, c }, { r, c: c - 1 }, { r, c: c + 1 }].forEach(n => {
                    if (n.r >= 0 && n.r < rows && n.c >= 0 && n.c < cols) {
                        const target = finalGrid[n.r][n.c];
                        // On ne contamine pas un nid existant, et un nid ne remplace pas une zone radioactive
                        if (!target.isRadioactive && !target.isNest) {
                            target.owner = CellOwner.Special;
                            target.color = color;
                            if (isRadioactive) target.isRadioactive = true;
                            else { target.isNest = true; target.isPermanentlyContested = true; }
                        }
                    }
                });
            }
        };

        // On déclenche les propagations
        propagate(radioactiveOrigins, true, '#8A2BE2'); // Bombe H
        propagate(nestOrigins, false, '#2F4F4F');       // Nid de Cafards

        const roundWinner = p1Cells > p2Cells ? CellOwner.Player1 
                          : p2Cells > p1Cells ? CellOwner.Player2 
                          : p1Score > p2Score ? CellOwner.Player1 
                          : p2Score > p1Score ? CellOwner.Player2 : CellOwner.Tie;

        return {
            player1ControlledCells: p1Cells,
            player2ControlledCells: p2Cells,
            player1TotalScore: p1Score,
            player2TotalScore: p2Score,
            roundWinner,
            finalBoardState: finalGrid,
            cardsToStealFromPlayer2: this.shuffleArray(stealP2),
            cardsToStealFromPlayer1: this.shuffleArray(stealP1),
            cardsToLoseForTie: this.shuffleArray(loseCards),
            bombPropagationOrigin: radioactiveOrigins[0] || null,
            cafardBombPlayer1PropagationOrigin: null,
            cafardBombPlayer2PropagationOrigin: null
        };
    }

    /**
     * @description Fusionne les grilles d'une même équipe en mode 2vs2.
     */
    public static fuseTeamGrids(playerGrids: Record<string, AtomikGrid>, t1: string[], t2: string[], option: AtomikKFardEOption) {
        const size = (this.optionQuantities[option] || 1) * 3;
        const g1 = this.createEmptyAtomikKFardEGrid(option);
        const g2 = this.createEmptyAtomikKFardEGrid(option);

        for (let r = 0; r < size; r++) {
            for (let c = 0; c < size; c++) {
                // Prends la première carte trouvée par un membre de l'équipe sur cette case
                const c1 = t1.map(id => playerGrids[id]?.[r]?.[c]?.card).find(Boolean);
                const c2 = t2.map(id => playerGrids[id]?.[r]?.[c]?.card).find(Boolean);

                if (c1) { g1[r][c].card = c1; g1[r][c].owner = CellOwner.Player1; }
                if (c2) { g2[r][c].card = c2; g2[r][c].owner = CellOwner.Player2; }
            }
        }
        return { team1CombinedGrid: g1, team2CombinedGrid: g2 };
    }
}