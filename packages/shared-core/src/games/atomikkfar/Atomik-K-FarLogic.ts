// src/games/kooontreez/AtomikKFardELogic.ts

import {
    AtomikGrid, AtomikCard, AtomikCardType, AtomikDeck, AtomikKFardEMode, AtomikKFardEOption,
    DuelOutcome, CellOwner, GridCell, ConquestRoundResult, CellCoordinates,
    AtomikKFardEGameRoom // Assurez-vous que Player est importé si utilisé
} from "./Atomik-K-FarTypes";

// Importez une bibliothèque UUID si vous voulez des IDs robustes, sinon utilisez une fonction simple comme ci-dessous.
// import { v4 as uuidv4 } from 'uuid'; // Si vous avez `npm install uuid` et `@types/uuid`

// Pour l'exemple, une fonction simple de génération d'ID.
let cardIdCounter = 0;
function generateUniqueCardId(): string {
    // return uuidv4(); // Utilisez ceci si vous avez uuid
    return `card-${Date.now()}-${cardIdCounter++}`;
}

export class AtomikKFardELogic {
    // `initialCardPool` doit maintenant stocker les TYPES de cartes, pas les instances de cartes.
    // Les instances de cartes avec des IDs uniques seront créées au moment de la génération du deck.
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
     * @description Définition des règles de jeu en tant que propriété statique de la classe.
     * Chaque AtomikCard (type) a des règles de combat prédéfinies.
     * Notez que les clés sont maintenant de type `AtomikCardType`.
     */
    private static readonly gameRules: {
        [key in AtomikCardType]: { // Utilisez AtomikCardType ici
            beats: AtomikCardType[];
            losesTo?: AtomikCardType[];
            tiesWith?: AtomikCardType[];
            scoreWin: number;
            scoreLoss: number;
            scoreTie: number;
            scoreSpecial?: number;
        }
    } = {
        'Pierre': {
            beats: ['Ciseaux', 'Cafard(e)'],
            losesTo: ['Feuille', 'Bombe H'],
            tiesWith: ['Pierre'],
            scoreWin: 6,
            scoreLoss: 0,
            scoreTie: 0,
        },
        'Feuille': {
            beats: ['Pierre', 'Cafard(e)'],
            losesTo: ['Ciseaux', 'Bombe H'],
            tiesWith: ['Feuille'],
            scoreWin: 6,
            scoreLoss: 0,
            scoreTie: 0,
        },
        'Ciseaux': {
            beats: ['Feuille', 'Cafard(e)'],
            losesTo: ['Pierre', 'Bombe H'],
            tiesWith: ['Ciseaux'],
            scoreWin: 6,
            scoreLoss: 0,
            scoreTie: 0,
        },
        'Cafard(e)': {
            beats: ['Bombe H'],
            losesTo: ['Pierre', 'Feuille', 'Ciseaux'],
            tiesWith: ['Cafard(e)'],
            scoreWin: 10,
            scoreLoss: 0,
            scoreTie: 5,
        },
        'Bombe H': {
            beats: ['Pierre', 'Feuille', 'Ciseaux'],
            losesTo: ['Cafard(e)'],
            tiesWith: ['Bombe H'],
            scoreWin: 4,
            scoreLoss: -5,
            scoreTie: -10,
            scoreSpecial: -10
        }
    };

    /**
     * @function generateFullDeck
     * @description Génère un deck complet de cartes Atomik-K-Fard(e) basé sur le mode de jeu et l'option.
     * Chaque carte générée est un objet AtomikCard avec un ID unique.
     * @param {AtomikKFardEMode} mode Le mode de jeu ('Stratege' ou 'Random').
     * @param {AtomikKFardEOption} option L'option de jeu pour le multiplicateur de cartes.
     * @returns {AtomikDeck} Le deck de cartes généré.
     */
    public static generateFullDeck(mode: AtomikKFardEMode, option: AtomikKFardEOption): AtomikDeck {
        let deck: AtomikDeck = [];
        const multiplier = AtomikKFardELogic.optionQuantities[option] || 1;
        const baseCardTypes: AtomikCardType[] = ['Pierre', 'Feuille', 'Ciseaux', 'Cafard(e)', 'Bombe H'];

        switch (mode) {
            case 'Stratege':
                for (let i = 0; i < multiplier; i++) {
                    baseCardTypes.forEach(cardType => {
                        deck.push({ id: generateUniqueCardId(), type: cardType }); // Crée une instance de carte
                    });
                }
                break;
            case 'Random':
                const totalCards = multiplier * 10;
                for (let i = 0; i < totalCards; i++) {
                    const randomType = baseCardTypes[Math.floor(Math.random() * baseCardTypes.length)];
                    deck.push({ id: generateUniqueCardId(), type: randomType }); // Crée une instance de carte
                }
                break;
            default:
                for (let i = 0; i < multiplier; i++) {
                    baseCardTypes.forEach(cardType => {
                        deck.push({ id: generateUniqueCardId(), type: cardType }); // Crée une instance de carte
                    });
                }
                break;
        }
        return deck;
    }

    /**
     * @function shuffleDeck
     * @description Mélange un deck de cartes.
     * @param {AtomikDeck} deck Le deck à mélanger.
     * @returns {AtomikDeck} Le deck mélangé.
     */
    public static shuffleDeck(deck: AtomikDeck): AtomikDeck {
        // Le `!` n'est plus nécessaire si AtomikDeck est défini comme `AtomikCard[]` et non `AtomikCard[] | null` ou `undefined`.
        for (let i = deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [deck[i], deck[j]] = [deck[j], deck[i]];
        }
        return deck;
    }

    /**
     * @function createEmptyAtomikKFardEGrid
     * @description Crée une grille de jeu Atomik-K-Fard(e) vide de taille variable pour le mode conquête.
     * Chaque cellule est initialisée avec un objet GridCell par défaut (vide, sans propriétaire, couleur neutre).
     * La taille de la grille est déterminée par l'option de jeu choisie.
     * @param {AtomikKFardEOption} option L'option de jeu pour déterminer la taille de la grille.
     * @returns {AtomikGrid} Une grille prête pour une nouvelle partie de conquête.
     */
    public static createEmptyAtomikKFardEGrid(option: AtomikKFardEOption): AtomikGrid {
        const baseSize = AtomikKFardELogic.optionQuantities[option];
        if (baseSize === 0) {
            console.warn(`[AtomikKFardELogic] Option de jeu "${option}" n'a pas de taille de grille valide. Utilisation de la taille par défaut (3x3).`);
            return AtomikKFardELogic.createEmptyAtomikKFardEGrid('Sonic');
        }
        const rows = baseSize * 3;
        const cols = baseSize * 3;

        const grid: AtomikGrid = [];

        for (let i = 0; i < rows; i++) {
            const row: GridCell[] = [];
            for (let j = 0; j < cols; j++) {
                row.push({
                    card: null, // `card` est de type `AtomikCard | null`
                    owner: CellOwner.None,
                    color: '#CCCCCC',
                    isPermanentlyContested: false,
                    conquerableBy: undefined
                });
            }
            grid.push(row);
        }
        return grid;
    }

    /**
     * @function drawNewHand
     * @description Gère la pioche de nouvelles cartes, le vol de cartes et la défausse de cartes en cas d'égalité.
     * @param {AtomikDeck} currentHand La main actuelle du joueur.
     * @param {AtomikDeck} gameDeck Le deck de jeu global.
     * @param {AtomikCard[]} cardsStolen Ce sont les cartes que l'on veut VOLER à ce joueur.
     * @param {AtomikCard[]} cardsToLose Ce sont les cartes que ce joueur doit PERDRE (défausser) en cas d'égalité.
     * @returns {AtomikDeck} La nouvelle main du joueur.
     */
    public static drawNewHand(
        currentHand: AtomikDeck,
        gameDeck: AtomikDeck,
        cardsStolen: AtomikCard[],
        cardsToLose: AtomikCard[]
    ): AtomikDeck {
        let newHand = [...currentHand];

        // 1. Gérer les cartes à perdre (défausser) en cas d'égalité
        // Utilise l'ID pour trouver et retirer la carte
        for (const cardToLose of cardsToLose) {
            const index = newHand.findIndex(c => c.id === cardToLose.id);
            if (index !== -1) {
                newHand.splice(index, 1);
            }
        }

        // 2. Gérer les cartes volées (retirer de la main du joueur actuel)
        // Utilise l'ID pour trouver et retirer la carte
        for (const cardStolen of cardsStolen) {
            const index = newHand.findIndex(c => c.id === cardStolen.id);
            if (index !== -1) {
                newHand.splice(index, 1);
            }
        }

        // 3. Piocher de nouvelles cartes jusqu'à avoir 7 cartes
        const HAND_SIZE = 7;
        while (newHand.length < HAND_SIZE && gameDeck.length > 0) { // Enlève le `!` car gameDeck est AtomikDeck, donc pas null/undefined
            const drawnCard = gameDeck.shift();
            if (drawnCard) {
                newHand.push(drawnCard);
            }
        }

        return newHand;
    }

    /**
     * @function resolveDuel
     * @description Résout un duel classique entre deux cartes.
     * Prend les cartes complètes (avec ID), mais résout le duel basé sur leur type.
     * @param {AtomikCard} playerCard La carte jouée par le joueur.
     * @param {AtomikCard} opponentCard La carte jouée par l'adversaire.
     * @returns {DuelOutcome} Le résultat du duel (qui gagne, impact sur le score).
     */
    public static resolveDuel(playerCard: AtomikCard, opponentCard: AtomikCard): DuelOutcome {
        // Accéder aux règles via le `type` de la carte
        const playerRule = AtomikKFardELogic.gameRules[playerCard.type];
        const opponentRule = AtomikKFardELogic.gameRules[opponentCard.type];

        if (!playerRule || !opponentRule) {
            console.warn(`Règle non trouvée pour une des cartes: Joueur ${playerCard.type}, Adversaire ${opponentCard.type}. Retourne un résultat neutre.`);
            return { playerHasWon: false, ennemyHasWon: false, player1ScoreChange: 0, player2ScoreChange: 0 };
        }

        let player1ScoreChange = 0;
        let player2ScoreChange = 0;
        let playerHasWon = false;
        let ennemyHasWon = false;

        // Utiliser `playerCard.type` et `opponentCard.type` pour les comparaisons de règles
        if (playerCard.type === 'Bombe H' && opponentCard.type === 'Bombe H') {
            player1ScoreChange = playerRule.scoreSpecial || playerRule.scoreTie;
            player2ScoreChange = opponentRule.scoreSpecial || opponentRule.scoreTie;
        } else if (playerCard.type === 'Cafard(e)' && opponentCard.type === 'Cafard(e)') {
            player1ScoreChange = playerRule.scoreTie;
            player2ScoreChange = opponentRule.scoreTie;
        } else if (playerCard.type === 'Cafard(e)' && opponentCard.type === 'Bombe H') {
            playerHasWon = true;
            player1ScoreChange = playerRule.scoreWin;
            player2ScoreChange = opponentRule.scoreLoss;
        } else if (playerCard.type === 'Bombe H' && opponentCard.type === 'Cafard(e)') {
            ennemyHasWon = true;
            player1ScoreChange = playerRule.scoreLoss;
            player2ScoreChange = opponentRule.scoreWin;
        }
        // Règles générales (Pierre-Feuille-Ciseaux et interaction avec Bombe H / Cafard(e))
        else if (playerRule.beats.includes(opponentCard.type)) {
            playerHasWon = true;
            player1ScoreChange = playerRule.scoreWin;
            player2ScoreChange = opponentRule.scoreLoss;
        } else if (opponentRule.beats.includes(playerCard.type)) {
            ennemyHasWon = true;
            player1ScoreChange = playerRule.scoreLoss;
            player2ScoreChange = opponentRule.scoreWin;
        } else if (playerCard.type === opponentCard.type) {
            player1ScoreChange = playerRule.scoreTie;
            player2ScoreChange = opponentRule.scoreTie;
        } else {
            player1ScoreChange = 0;
            player2ScoreChange = 0;
            console.warn(`[resolveDuel] Cas non géré: ${playerCard.type} vs ${opponentCard.type}. Traité comme un nul.`);
        }

        return { playerHasWon, ennemyHasWon, player1ScoreChange, player2ScoreChange };
    }

    /**
     * @function resolveConquestRound
     * @description Résout un round complet du mode "Conquête de Territoire".
     * Prend les grilles complétées des deux joueurs et détermine l'état final du plateau et le vainqueur du round.
     * Intègre les règles spéciales de conquête et d'état des cases.
     * @param {AtomikGrid} player1PlayedGrid La grille du joueur 1 avec ses cartes jouées.
     * @param {AtomikGrid} player2PlayedGrid La grille du joueur 2 avec ses cartes jouées.
     * @param {AtomikKFardEOption} gameOption L'option de jeu pour la taille de la grille (nécessaire pour créer l'état final).
     * @returns {ConquestRoundResult} Le résultat détaillé du round de conquête.
     */
    public static resolveConquestRound(player1PlayedGrid: AtomikGrid, player2PlayedGrid: AtomikGrid, gameOption: AtomikKFardEOption): ConquestRoundResult {
        const rows = player1PlayedGrid.length;
        const cols = player1PlayedGrid[0].length;

        let player1ControlledCells = 0;
        let player2ControlledCells = 0;
        let player1TotalScore = 0;
        let player2TotalScore = 0;

        // Ces tableaux doivent stocker les objets AtomikCard complets
        let cardsToStealFromPlayer2: AtomikCard[] = [];
        let cardsToStealFromPlayer1: AtomikCard[] = [];
        let cardsToLoseForTie: AtomikCard[] = [];

        let bombPropagationOrigin: CellCoordinates | null = null;
        let cafardBombPlayer1PropagationOrigin: CellCoordinates | null = null;
        let cafardBombPlayer2PropagationOrigin: CellCoordinates | null = null;

        const finalBoardState: AtomikGrid = AtomikKFardELogic.createEmptyAtomikKFardEGrid(gameOption);

        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const p1CellData = player1PlayedGrid[r][c];
                const p2CellData = player2PlayedGrid[r][c];

                const cellResult: GridCell = { ...finalBoardState[r][c] };

                if (p1CellData.card === null && p2CellData.card === null) {
                    // Les deux sont vides : la case reste neutre
                    // finalBoardState[r][c] est déjà CellOwner.None par défaut.
                } else if (p1CellData.card === null) {
                    // Seul le joueur 2 a joué
                    cellResult.owner = CellOwner.Player2;
                    cellResult.card = p2CellData.card;
                    cellResult.color = '#007BFF';
                    player2ControlledCells++;
                    player2TotalScore += 1;
                } else if (p2CellData.card === null) {
                    // Seul le joueur 1 a joué
                    cellResult.owner = CellOwner.Player1;
                    cellResult.card = p1CellData.card;
                    cellResult.color = '#DC3545';
                    player1ControlledCells++;
                    player1TotalScore += 1;
                } else {
                    // Les deux joueurs ont joué une carte, on résout le duel
                    const player1Card = p1CellData.card;
                    const player2Card = p2CellData.card;

                    const duelOutcome = AtomikKFardELogic.resolveDuel(player1Card, player2Card);

                    // Les cartes sont consommées dans le duel, donc la case ne "contient" plus de carte,
                    // sauf si une carte a un effet persistant à représenter visuellement.
                    cellResult.card = null; // Par défaut, la carte est consommée.

                    // Appliquer les règles spéciales d'égalité et de Bombe H / Cafard(e) en premier
                    if (player1Card.type === 'Bombe H' && player2Card.type === 'Bombe H') {
                        cellResult.owner = CellOwner.Special;
                        cellResult.color = '#6F42C1';
                        cellResult.conquerableBy = 'Cafard(e)';
                        cellResult.isPermanentlyContested = false;
                        player1TotalScore += duelOutcome.player1ScoreChange;
                        player2TotalScore += duelOutcome.player2ScoreChange;
                        if (bombPropagationOrigin === null) {
                            bombPropagationOrigin = { r, c };
                        }
                        cardsToLoseForTie.push(player1Card, player2Card); // Ajouter les objets carte complets
                    } else if (player1Card.type === 'Cafard(e)' && player2Card.type === 'Cafard(e)') {
                        cellResult.owner = CellOwner.Special;
                        cellResult.color = '#343A40';
                        cellResult.isPermanentlyContested = true;
                        cellResult.conquerableBy = undefined;
                        player1TotalScore += duelOutcome.player1ScoreChange;
                        player2TotalScore += duelOutcome.player2ScoreChange;
                        cardsToLoseForTie.push(player1Card, player2Card); // Ajouter les objets carte complets
                    } else if (player1Card.type === 'Cafard(e)' && player2Card.type === 'Bombe H') {
                        cellResult.owner = CellOwner.Player1;
                        cellResult.color = '#DC3545';
                        cellResult.isPermanentlyContested = true;
                        player1ControlledCells++;
                        player1TotalScore += duelOutcome.player1ScoreChange;
                        player2TotalScore += duelOutcome.player2ScoreChange;
                        cardsToStealFromPlayer2.push(player2Card); // Ajouter l'objet carte complet
                        if (cafardBombPlayer1PropagationOrigin === null) {
                            cafardBombPlayer1PropagationOrigin = { r, c };
                        }
                    } else if (player1Card.type === 'Bombe H' && player2Card.type === 'Cafard(e)') {
                        cellResult.owner = CellOwner.Player2;
                        cellResult.color = '#007BFF';
                        cellResult.isPermanentlyContested = true;
                        player2ControlledCells++;
                        player2TotalScore += duelOutcome.player2ScoreChange;
                        player1TotalScore += duelOutcome.player1ScoreChange;
                        cardsToStealFromPlayer1.push(player1Card); // Ajouter l'objet carte complet
                        if (cafardBombPlayer2PropagationOrigin === null) {
                            cafardBombPlayer2PropagationOrigin = { r, c };
                        }
                    }
                    // Ensuite, les règles normales de victoire/défaite/nul si pas de cas spécial
                    else if (duelOutcome.playerHasWon) {
                        cellResult.owner = CellOwner.Player1;
                        cellResult.color = '#DC3545';
                        player1ControlledCells++;
                        player1TotalScore += duelOutcome.player1ScoreChange;
                        player2TotalScore += duelOutcome.player2ScoreChange;
                    } else if (duelOutcome.ennemyHasWon) {
                        cellResult.owner = CellOwner.Player2;
                        cellResult.color = '#007BFF';
                        player2ControlledCells++;
                        player2TotalScore += duelOutcome.player2ScoreChange;
                        player1TotalScore += duelOutcome.player1ScoreChange;
                    } else { // Match nul standard (Pierre vs Pierre, etc.)
                        cellResult.owner = CellOwner.Tie;
                        cellResult.color = '#6C757D';
                        player1TotalScore += duelOutcome.player1ScoreChange;
                        player2TotalScore += duelOutcome.player2ScoreChange;
                        cardsToLoseForTie.push(player1Card, player2Card); // Ajouter les objets carte complets
                    }
                }
                finalBoardState[r][c] = cellResult;
            }
        }

        let roundWinner: CellOwner.Player1 | CellOwner.Player2 | CellOwner.Tie = CellOwner.Tie;
        if (player1ControlledCells > player2ControlledCells) {
            roundWinner = CellOwner.Player1;
        } else if (player2ControlledCells > player1ControlledCells) {
            roundWinner = CellOwner.Player2;
        } else {
            if (player1TotalScore > player2TotalScore) {
                roundWinner = CellOwner.Player1;
            } else if (player2TotalScore > player1TotalScore) {
                roundWinner = CellOwner.Player2;
            }
        }

        return {
            player1ControlledCells,
            player2ControlledCells,
            player1TotalScore,
            player2TotalScore,
            roundWinner,
            finalBoardState,
            cardsToStealFromPlayer2: AtomikKFardELogic.shuffleArray(cardsToStealFromPlayer2),
            cardsToStealFromPlayer1: AtomikKFardELogic.shuffleArray(cardsToStealFromPlayer1),
            cardsToLoseForTie: AtomikKFardELogic.shuffleArray(cardsToLoseForTie),
            bombPropagationOrigin,
            cafardBombPlayer1PropagationOrigin,
            cafardBombPlayer2PropagationOrigin
        };
    }

    /**
     * @function fuseTeamGrids
     * @description Fusionne les soumissions individuelles des joueurs de chaque équipe en une grille combinée par équipe.
     * Gère les conflits intra-équipes en choisissant la première carte jouée sur une cellule en cas de multiples soumissions.
     * @param {Record<string, AtomikGrid>} playerSubmittedGrids - Grilles soumises par chaque joueur (clé: playerId, valeur: AtomikGrid).
     * @param {string[]} team1Players - Liste des IDs des joueurs de l'équipe 1.
     * @param {string[]} team2Players - Liste des IDs des joueurs de l'équipe 2.
     * @param {AtomikKFardEOption} option - Options de jeu pour la taille de la grille.
     * @returns {{ team1CombinedGrid: AtomikGrid, team2CombinedGrid: AtomikGrid }} Les grilles combinées pour chaque équipe.
     */
    public static fuseTeamGrids(
        playerSubmittedGrids: Record<string, AtomikGrid>,
        team1Players: string[],
        team2Players: string[],
        option: AtomikKFardEOption
    ): { team1CombinedGrid: AtomikGrid, team2CombinedGrid: AtomikGrid } {

        const baseSize = AtomikKFardELogic.optionQuantities[option];
        const numRows = baseSize * 3;
        const numCols = baseSize * 3;

        const team1CombinedGrid = AtomikKFardELogic.createEmptyAtomikKFardEGrid(option);
        const team2CombinedGrid = AtomikKFardELogic.createEmptyAtomikKFardEGrid(option);

        for (let r = 0; r < numRows; r++) {
            for (let c = 0; c < numCols; c++) {
                const cardsOnCellTeam1: AtomikCard[] = [];
                const cardsOnCellTeam2: AtomikCard[] = [];

                // Collecter toutes les cartes jouées sur cette cellule par l'équipe 1
                for (const playerId of team1Players) {
                    const playerGrid = playerSubmittedGrids[playerId];
                    if (playerGrid && playerGrid[r] && playerGrid[r][c] && playerGrid[r][c].card) {
                        cardsOnCellTeam1.push(playerGrid[r][c].card!); // Pousse l'objet AtomikCard
                    }
                }

                // Collecter toutes les cartes jouées sur cette cellule par l'équipe 2
                for (const playerId of team2Players) {
                    const playerGrid = playerSubmittedGrids[playerId];
                    if (playerGrid && playerGrid[r] && playerGrid[r][c] && playerGrid[r][c].card) {
                        cardsOnCellTeam2.push(playerGrid[r][c].card!); // Pousse l'objet AtomikCard
                    }
                }

                let finalCardTeam1: AtomikCard | null = null;
                let finalCardTeam2: AtomikCard | null = null;

                // Conflit Intra-Équipe: Pour l'instant, on prend la première carte jouée sur la cellule.
                // Si tu veux une logique plus complexe (ex: la carte la plus forte), il faudrait l'implémenter ici.
                if (cardsOnCellTeam1.length > 0) {
                    finalCardTeam1 = cardsOnCellTeam1[0];
                    // Alternative si tu veux une logique de sélection "plus intelligente" pour les conflits intra-équipe:
                    // finalCardTeam1 = this.chooseBestCardForTeam(cardsOnCellTeam1);
                }
                if (cardsOnCellTeam2.length > 0) {
                    finalCardTeam2 = cardsOnCellTeam2[0];
                    // Alternative:
                    // finalCardTeam2 = this.chooseBestCardForTeam(cardsOnCellTeam2);
                }

                // Placer les cartes finales sur les grilles combinées d'équipes
                if (finalCardTeam1) {
                    team1CombinedGrid[r][c].card = finalCardTeam1;
                    team1CombinedGrid[r][c].owner = CellOwner.Player1; // Représente l'équipe 1
                }
                if (finalCardTeam2) {
                    team2CombinedGrid[r][c].card = finalCardTeam2;
                    team2CombinedGrid[r][c].owner = CellOwner.Player2; // Représente l'équipe 2
                }
            }
        }

        return { team1CombinedGrid, team2CombinedGrid };
    }

    /**
     * @function chooseBestCardForTeam
     * @description Fonction d'exemple pour choisir la "meilleure" carte parmi plusieurs jouées par une équipe sur une cellule.
     * Cette logique est arbitraire et doit être définie selon tes règles.
     * Pour l'instant, elle retourne la première carte, mais tu pourrais implémenter une logique de "force".
     * @param {AtomikCard[]} cards Les cartes jouées par les membres d'une équipe sur une cellule.
     * @returns {AtomikCard} La carte choisie pour représenter l'équipe sur cette cellule.
     */
    // private static chooseBestCardForTeam(cards: AtomikCard[]): AtomikCard {
    //     // Exemple de logique: Si une Bombe H est jouée, elle est prioritaire.
    //     // Sinon, on pourrait classer par force (ex: Pierre > Ciseaux > Feuille, etc.)
    //     // Pour l'instant, retourne la première carte, mais c'est un point d'extension.
    //     if (cards.some(card => card.type === 'Bombe H')) {
    //         return cards.find(card => card.type === 'Bombe H')!;
    //     }
    //     // Ou, si tu as une notion de "score" ou "puissance" sur AtomikCardType
    //     // cards.sort((a, b) => AtomikKFardELogic.getCardPower(b.type) - AtomikKFardELogic.getCardPower(a.type));
    //     // return cards[0];
    //     return cards[0];
    // }

    /**
     * @function shuffleArray
     * @description Fonction utilitaire pour mélanger un tableau.
     * @param {T[]} array Le tableau à mélanger.
     * @returns {T[]} Le tableau mélangé.
     */
    public static shuffleArray<T>(array: T[]): T[] {
        const shuffledArray = [...array];
        for (let i = shuffledArray.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffledArray[i], shuffledArray[j]] = [shuffledArray[j], shuffledArray[i]];
        }
        return shuffledArray;
    }
}