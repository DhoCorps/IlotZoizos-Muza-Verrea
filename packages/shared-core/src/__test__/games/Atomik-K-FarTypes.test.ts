// Fichier : src/games/atomik-k-fard-e/__test__/AtomikKFardETypes.test.ts
import { describe, it, expect } from 'vitest';
import {
    CellOwner,
    AtomikCard,
    GridCell,
    AtomikKFardEGameOptions,
    ConquestRoundResult,
    AtomikKFardEGameRoom,
    PlayerAction
} from '../../games/atomikkfar/Atomik-K-FarTypes';

describe('Atomik-K-Fard-E Types & Contracts', () => {

    // ==========================================
    // 1. TESTS RUNTIME (Énumérations réelles)
    // ==========================================
    describe('1. Tests d\'exécution (Runtime)', () => {
        it('🟢 doit exposer les bonnes valeurs pour l\'enum CellOwner', () => {
            expect(CellOwner.None).toBe('none');
            expect(CellOwner.Player1).toBe('player1');
            expect(CellOwner.Player2).toBe('player2');
            expect(CellOwner.Tie).toBe('tie');
            expect(CellOwner.Special).toBe('special');
        });
    });

    // ==========================================
    // 2. CONTRATS DE TYPES STATIQUES (Type Assertions)
    // ==========================================
    describe('2. Contrats de Types Statiques (Compilation Check)', () => {
        
        it('🟢 TYPE CHECK: AtomikCard doit respecter les types de cartes autorisés', () => {
            const card: AtomikCard = {
                id: 'card_123',
                type: 'Bombe H'
            };
            expect(card.type).toBe('Bombe H');
        });

        it('🟢 TYPE CHECK: GridCell doit accepter une carte et un propriétaire', () => {
            const cell: GridCell = {
                card: { id: 'c1', type: 'Cafard(e)' },
                owner: CellOwner.Player1,
                color: '#FF0000',
                isPermanentlyContested: false,
                conquerableBy: 'Pierre',
                isRadioactive: true,
                isNest: false
            };
            expect(cell.owner).toBe(CellOwner.Player1);
            expect(cell.isRadioactive).toBe(true);
        });

        it('🟢 TYPE CHECK: PlayerAction doit valider le format strict de l\'action playCard', () => {
            const action: PlayerAction = {
                type: 'playCard',
                payload: { cardId: 'c1', r: 2, c: 3 }
            };
            expect(action.type).toBe('playCard');
            expect(action.payload.r).toBe(2);
        });

        it('🟢 TYPE CHECK: AtomikKFardEGameOptions doit accepter les littéraux précis', () => {
            const options: AtomikKFardEGameOptions = {
                nbPlayer: 'duo',
                mode: 'Stratege',
                option: 'Sonic',
                teamMode: 'Defined',
                gameStyle: 'Conquête',
                timePerRound: 30,
                maxRounds: 5,
                scoreToWin: 3
            };
            expect(options.nbPlayer).toBe('duo');
            expect(options.gameStyle).toBe('Conquête');
        });

        it('🟢 TYPE CHECK: ConquestRoundResult doit englober tous les résultats complexes d\'un round', () => {
            const roundResult: ConquestRoundResult = {
                player1ControlledCells: 5,
                player2ControlledCells: 3,
                player1TotalScore: 10,
                player2TotalScore: 5,
                roundWinner: CellOwner.Player1,
                finalBoardState: [], // Mocker une AtomikGrid vide suffit pour le typage
                cardsToStealFromPlayer2: [],
                cardsToStealFromPlayer1: [],
                cardsToLoseForTie: [],
                bombPropagationOrigin: { r: 1, c: 1 },
                cafardBombPlayer1PropagationOrigin: null,
                cafardBombPlayer2PropagationOrigin: null
            };
            expect(roundResult.roundWinner).toBe(CellOwner.Player1);
            expect(roundResult.player1ControlledCells).toBe(5);
        });

        it('🟢 TYPE CHECK: AtomikKFardEGameRoom doit intégrer parfaitement toutes les sous-interfaces héritées et locales', () => {
            // L'assignation complète sans erreur de compilation EST le test.
           const room: AtomikKFardEGameRoom = {
                gameType: 'AtomikKFardE',
                id: 'room_atomik_1',
                ownerId: 'player_1',
                name: 'Salle Atomique',
                players: [],
                state: 'waitingForPlayers',
                winnerId: null,
                currentRound: 1,
                maxRounds: 5,
                currentPlayerTurn: 'player_1',
                roundTimerInterval: null,
                timePerRound: 30,
                currentRoundTimer: null,
                currentRoundTimeLeft: 30,
                maxPlayers: 2,
                gameOptions: {
                    nbPlayer: 'duo',
                    mode: 'Random',
                    option: 'Megaman',
                    teamMode: 'Blind',
                    gameStyle: 'Classique',
                    timePerRound: 30,
                    maxRounds: 5,
                    scoreToWin: 3
                },
                deck: [],
                discardPile: [],
                grid: [],
                currentBoardState: [], // 🚀 Ajouté (requis par AtomikKFardERoomToSend)
                player1Hand: [],       // 🚀 Ajouté (requis par AtomikKFardERoomToSend)
                player2Hand: [],       // 🚀 Ajouté (requis par AtomikKFardERoomToSend)
                playerGrids: {},
                scores: { 'player_1': 0, 'player_2': 0 },
                team1Players: ['player_1'],
                team2Players: ['player_2'],
                team1Score: 0,
                team2Score: 0,
                team1ControlledCellsTotal: 0,
                team2ControlledCellsTotal: 0,
                roundResults: [],
                playerStates: {},
                teams: { player1: [], player2: [] },
                bombPropagationOrigin: null,
                cafardBombPlayer1PropagationOrigin: null,
                cafardBombPlayer2PropagationOrigin: null,
                playerDisconnectTimers: new Map(),
                gameHistory: [],
                round: 1 
            };
            
            expect(room.gameType).toBe('AtomikKFardE');
            expect(room.state).toBe('waitingForPlayers');
            expect(room.gameOptions.nbPlayer).toBe('duo');
            expect(room.teams).toBeDefined();
        });
    });
});