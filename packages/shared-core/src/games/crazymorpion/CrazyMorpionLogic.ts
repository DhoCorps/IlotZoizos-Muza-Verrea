// src/games/CrazyMorpion/CrazyMorpionLogic.ts

import {
    CrazyMorpionGrid,
    CrazyMorpionSymbol,
    CRAZYMORPION_SYMBOL_EMPTY,
    CRAZYMORPION_SYMBOL_STAR,
    CRAZYMORPION_SYMBOL_EQUAL,
    CRAZYMORPION_SYMBOL_PLUS,
    CRAZYMORPION_SYMBOL_MINUS
} from './CrazyMorpionTypes';

/**
 * @function createEmptyCrazyMorpionGrid
 * @description Crée une grille de jeu CrazyMorpion vide de 3x3.
 * Chaque cellule est initialisée avec le symbole vide (`CRAZYMORPION_SYMBOL_EMPTY`).
 * @returns {CrazyMorpionGrid} Une grille 3x3 prête pour une nouvelle partie.
 */
export function createEmptyCrazyMorpionGrid(): CrazyMorpionGrid {
    // Retourne un tableau de tableaux, représentant une grille 3x3.
    // Utilisation de constantes pour garantir la cohérence des symboles.
    return [
        [CRAZYMORPION_SYMBOL_EMPTY, CRAZYMORPION_SYMBOL_EMPTY, CRAZYMORPION_SYMBOL_EMPTY],
        [CRAZYMORPION_SYMBOL_EMPTY, CRAZYMORPION_SYMBOL_EMPTY, CRAZYMORPION_SYMBOL_EMPTY],
        [CRAZYMORPION_SYMBOL_EMPTY, CRAZYMORPION_SYMBOL_EMPTY, CRAZYMORPION_SYMBOL_EMPTY]
    ];
}

/**
 * @function getRandomCrazyMorpionSymbol
 * @description Génère un symbole de grille aléatoire parmi les symboles qui peuvent
 * être placés sur le plateau : 'CRAZYMORPION_SYMBOL_STAR', 'CRAZYMORPION_SYMBOL_PLUS',
 * 'CRAZYMORPION_SYMBOL_MINUS', 'CRAZYMORPION_SYMBOL_EQUAL'.
 * C'est le cœur de l'aspect "Crazy" du jeu, rendant chaque coup imprévisible.
 * @returns {CrazyMorpionSymbol} Un symbole CrazyMorpionSymbol choisi aléatoirement.
 */
export function getRandomCrazyMorpionSymbol(): CrazyMorpionSymbol {
    // Les symboles pouvant être placés à chaque coup.
    const symbols: CrazyMorpionSymbol[] = [
        CRAZYMORPION_SYMBOL_STAR,
        CRAZYMORPION_SYMBOL_PLUS,
        CRAZYMORPION_SYMBOL_MINUS,
        CRAZYMORPION_SYMBOL_EQUAL
    ];
    // Sélectionne un symbole au hasard dans le tableau 'symbols'.
    return symbols[Math.floor(Math.random() * symbols.length)];
}

/**
 * @function checkCrazyMorpionWinner
 * @description Vérifie si un joueur ou son adversaire a gagné la partie de CrazyMorpion.
 * Une combinaison est gagnante si trois cellules alignées contiennent
 * soit le symbole attitré du joueur (par ex. '+'),
 * soit le symbole "joker" ('='). Le symbole '*' n'est pas considéré comme gagnant.
 *
 * Cette fonction retourne les résultats pour les deux symboles (joueur actuel et adversaire).
 * La logique de jeu sur le serveur décidera qui est le "vainqueur" final de la manche
 * si les deux conditions sont remplies simultanément (très rare avec le joker).
 *
 * @param {CrazyMorpionGrid} grid La grille de jeu actuelle à évaluer.
 * @param {CrazyMorpionSymbol} playerSymbol Le symbole attitré du joueur qui vient de jouer.
 * @param {CrazyMorpionSymbol} ennemySymbol Le symbole attitré de l'adversaire.
 * @returns {{
 * playerHasWon: boolean;
 * ennemyHasWon: boolean;
 * playerWinningCells: { x: number; y: number; symbol: CrazyMorpionSymbol }[] | null;
 * ennemyWinningCells: { x: number; y: number; symbol: CrazyMorpionSymbol }[] | null;
 * playerWinningCombinationsCount: number;
 * ennemyWinningCombinationsCount: number;
 * }} Un objet contenant les informations de victoire pour le joueur et pour l'adversaire.
 */
export function checkCrazyMorpionWinner(
    grid: CrazyMorpionGrid,
    playerSymbol: CrazyMorpionSymbol,
    ennemySymbol: CrazyMorpionSymbol
): {
    playerHasWon: boolean;
    ennemyHasWon: boolean;
    playerWinningCells: { x: number; y: number; symbol: CrazyMorpionSymbol }[] | null;
    ennemyWinningCells: { x: number; y: number; symbol: CrazyMorpionSymbol }[] | null;
    playerWinningCombinationsCount: number;
    ennemyWinningCombinationsCount: number;
} {
    // Définition de tous les motifs gagnants possibles dans une grille 3x3 (lignes, colonnes, diagonales).
    const winningPatterns = [
        // Lignes
        [[0, 0], [0, 1], [0, 2]], // Ligne 0
        [[1, 0], [1, 1], [1, 2]], // Ligne 1
        [[2, 0], [2, 1], [2, 2]], // Ligne 2
        // Colonnes
        [[0, 0], [1, 0], [2, 0]], // Colonne 0
        [[0, 1], [1, 1], [2, 1]], // Colonne 1
        [[0, 2], [1, 2], [2, 2]], // Colonne 2
        // Diagonales
        [[0, 0], [1, 1], [2, 2]], // Diagonale principale
        [[0, 2], [1, 1], [2, 0]]  // Diagonale anti-principale
    ];

    let allPlayerWinningCells: { x: number; y: number; symbol: CrazyMorpionSymbol }[] = [];
    let allEnnemyWinningCells: { x: number; y: number; symbol: CrazyMorpionSymbol }[] = [];
    let playerWinningCombinationsCount = 0;
    let ennemyWinningCombinationsCount = 0;

    // Itération sur chaque motif gagnant prédéfini.
    for (const pattern of winningPatterns) {
        // Extrait les symboles et les coordonnées des cellules correspondant au motif actuel.
        // Note: pattern[i][0] est la ligne (y) et pattern[i][1] est la colonne (x).
        const cellsInPattern = [
            { y: pattern[0][0], x: pattern[0][1], symbol: grid![pattern[0][0]][pattern[0][1]] },
            { y: pattern[1][0], x: pattern[1][1], symbol: grid![pattern[1][0]][pattern[1][1]] },
            { y: pattern[2][0], x: pattern[2][1], symbol: grid![pattern[2][0]][pattern[2][1]] }
        ];

        let currentPatternIsWinningForPlayer = true;
        let currentPatternIsWinningForEnnemy = true;

        // Vérifie si chaque cellule du motif contribue à la victoire selon les règles.
        for (const cell of cellsInPattern) {
            const currentCellSymbol = cell.symbol;

            // Une cellule contribue à la victoire si son symbole est le symbole du joueur
            // OU le symbole joker ('=').
            // Le symbole '*' est un "coup perdu" et ne compte pas pour une victoire.
            if (!(currentCellSymbol === playerSymbol || currentCellSymbol === CRAZYMORPION_SYMBOL_EQUAL)) {
                // Si une cellule ne satisfait pas la condition, cette combinaison n'est pas gagnante pour le joueur.
                currentPatternIsWinningForPlayer = false;
            }

            // Vérifie pour l'adversaire de la même manière.
            if (!(currentCellSymbol === ennemySymbol || currentCellSymbol === CRAZYMORPION_SYMBOL_EQUAL)) {
                // Si une cellule ne satisfait pas la condition, cette combinaison n'est pas gagnante pour l'adversaire.
                currentPatternIsWinningForEnnemy = false;
            }
        }

        // Si le motif est validé comme gagnant pour le joueur.
        if (currentPatternIsWinningForPlayer) {
            playerWinningCombinationsCount++; // Incrémente le compteur de combinaisons gagnantes pour le joueur.
            // Ajoute les cellules de cette combinaison à la liste globale des cellules gagnantes du joueur,
            // en s'assurant d'éviter les doublons.
            for (const cell of cellsInPattern) {
                if (!allPlayerWinningCells.some(c => c.x === cell.x && c.y === cell.y)) {
                    allPlayerWinningCells.push(cell);
                }
            }
        }

        // If the pattern is validated as winning for the enemy.
        if (currentPatternIsWinningForEnnemy) {
            ennemyWinningCombinationsCount++; // Increment the enemy winning combinations count.
            // Add cells of this combination to the global list of enemy winning cells,
            // ensuring no duplicates.
            for (const cell of cellsInPattern) {
                if (!allEnnemyWinningCells.some(c => c.x === cell.x && c.y === cell.y)) {
                    allEnnemyWinningCells.push(cell);
                }
            }
        }
    }

    // Retourne le résultat de la vérification pour les deux joueurs.
    return {
        playerHasWon: playerWinningCombinationsCount > 0, // Le joueur a au moins une combinaison gagnante.
        ennemyHasWon: ennemyWinningCombinationsCount > 0, // L'adversaire a au moins une combinaison gagnante.
        playerWinningCells: allPlayerWinningCells.length > 0 ? allPlayerWinningCells : null, // Retourne les cellules gagnantes du joueur ou null.
        ennemyWinningCells: allEnnemyWinningCells.length > 0 ? allEnnemyWinningCells : null, // Retourne les cellules gagnantes de l'adversaire ou null.
        playerWinningCombinationsCount: playerWinningCombinationsCount, // Le nombre total de combinaisons gagnantes pour le joueur.
        ennemyWinningCombinationsCount: ennemyWinningCombinationsCount // Le nombre total de combinaisons gagnantes pour l'adversaire.
    };
}


/**
 * @function checkCrazyMorpionDraw
 * @description Vérifie si la partie de CrazyMorpion est un match nul.
 * Selon les règles spécifiques du Crazy Morpion, le jeu n'a pas de condition de match nul basée sur une grille pleine.
 * Les coups peuvent écraser des symboles existants, ce qui signifie que le jeu continue tant qu'il n'y a pas de vainqueur.
 * @param {CrazyMorpionGrid} grid La grille de jeu (non utilisée pour la détermination du match nul dans ce mode).
 * @returns {boolean} Toujours `false` car le match nul n'est pas basé sur la grille pleine dans ce mode de jeu.
 */


/**
 * @function makeCrazyMorpionMove
 * @description Applique un coup à la grille de CrazyMorpion.
 *
 * MODIFICATION: Si un `chosenSymbol` est fourni (option de triche), il est placé
 * en priorité. Sinon, un symbole aléatoire est généré.
 *
 * @param {CrazyMorpionGrid} currentGrid La grille de jeu actuelle avant le coup.
 * @param {number} x La coordonnée de la colonne (x) où le coup est joué.
 * @param {number} y La coordonnée de la ligne (y) où le coup est joué.
 * @param {CrazyMorpionSymbol} playerSymbol Le symbole attitré du joueur qui effectue le coup (ex: '+', '-').
 * Ce paramètre est utilisé pour la détermination de la victoire, mais pas directement pour le placement du symbole sur la grille.
 * @param {CrazyMorpionSymbol} [chosenSymbol] Un symbole que le joueur a tenté de placer manuellement (optionnel).
 * @returns {{ newGrid: CrazyMorpionGrid; actualSymbol: CrazyMorpionSymbol }}
 * Un objet contenant la nouvelle grille après le coup et le symbole qui a été réellement placé sur la grille.
 */
export function makeCrazyMorpionMove(
    currentGrid: CrazyMorpionGrid,
    x: number,
    y: number,
    playerSymbol: CrazyMorpionSymbol, // Maintenu pour la cohérence des appels, même si non utilisé pour le placement direct ici.
    chosenSymbol?: CrazyMorpionSymbol
): { newGrid: CrazyMorpionGrid; actualSymbol: CrazyMorpionSymbol } {
    // Crée une copie profonde de la grille actuelle pour s'assurer que le coup
    // ne modifie pas l'état original de la grille passée en paramètre.
    const newGrid = currentGrid!.map(row => [...row]);

    let symbolToPlace: CrazyMorpionSymbol; // Variable pour stocker le symbole qui sera finalement placé.

    // MODIFICATION ICI: Si chosenSymbol est fourni, il est utilisé. Sinon, un symbole aléatoire est choisi.
    if (chosenSymbol) {
        symbolToPlace = chosenSymbol;
    } else {
        symbolToPlace = getRandomCrazyMorpionSymbol();
    }

    // Applique le symbole déterminé à la cellule cible dans la nouvelle grille.
    newGrid[y][x] = symbolToPlace;
    // Retourne la nouvelle grille et le symbole qui a été effectivement placé.
    return { newGrid, actualSymbol: symbolToPlace };
}
/**
 * @function checkCrazyMorpionDraw
 * @description Vérifie si la partie de CrazyMorpion est un match nul.
 * Un match nul se produit si les deux joueurs ont un nombre égal de combinaisons gagnantes.
 * @param {CrazyMorpionGrid} grid La grille de jeu actuelle.
 * @param {CrazyMorpionSymbol} playerSymbol Le symbole du joueur actuel.
 * @param {CrazyMorpionSymbol} ennemySymbol Le symbole de l'adversaire.
 * @returns {boolean} `true` si c'est un match nul, `false` sinon.
 */
export function checkCrazyMorpionDraw(
    grid: CrazyMorpionGrid,
    playerSymbol: CrazyMorpionSymbol,
    ennemySymbol: CrazyMorpionSymbol
): boolean {
    // On réutilise la fonction checkCrazyMorpionWinner pour obtenir les comptes de combinaisons gagnantes.
    const { playerWinningCombinationsCount, ennemyWinningCombinationsCount } =
        checkCrazyMorpionWinner(grid, playerSymbol, ennemySymbol);

    // Il y a match nul si les deux joueurs ont le même nombre de combinaisons gagnantes,
    // et qu'au moins un des joueurs a au moins une combinaison gagnante (pour éviter un nul si personne n'a gagné).
    return (
        playerWinningCombinationsCount > 0 &&
        ennemyWinningCombinationsCount > 0 &&
        playerWinningCombinationsCount === ennemyWinningCombinationsCount
    );
}

