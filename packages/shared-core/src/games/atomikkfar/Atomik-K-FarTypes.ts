// src/games/atomik-k-fard-e/AtomikKFardETypes.ts
import {
    PlayerInRoom,
    ChatMessage,
} from '../../types/shared.types';

export enum CellOwner {
    None = 'none',
    Player1 = 'player1',
    Player2 = 'player2',
    Tie = 'tie',
    Special = 'special'
}

export interface GridCell {
    card: AtomikCard | null;
    owner: CellOwner;
    color: string;
    isPermanentlyContested: boolean;
    conquerableBy?: AtomikCardType;
    isRadioactive: boolean;
    isNest: boolean;
}

export type AtomikCardType = 'Cafard(e)' | 'Pierre' | 'Feuille' | 'Ciseaux' | 'Bombe H';
export type AtomikDeck = AtomikCard[];
export type AtomikGrid = GridCell[][];

export interface AtomikCard {
    id: string;
    type: AtomikCardType;
}

export type AtomikKFardEStyle = 'Classique' | 'Conquête';
export type AtomikKFardENbPlayer = 'duo' | '2vs2' ;
export type AtomikKFardEMode = 'Stratege' |'Personnal' | 'Random' |'Choisir un Mode de Jeu';
export type AtomikKFardEOption = 'Sonic' | 'Alex Kid' | 'Megaman' | 'Lara Croft' | 'Géralt de Riv' | 'Choisir une Option de Jeu' ;
export type AtomikKFardENbRound = 5 | 10 | 15 | 20 | 25;
export type AtomikKFardETeamMode = 'Defined' | 'Random' | 'Blind' ;
export type AtomikTimePerRound = 15 | 30 | 45 | 60;

export interface PlayerState {
    hasPlayedThisRound: boolean;
    playedCard: AtomikCard | null;
    playedCoordinates: CellCoordinates | null;
    submittedGrid: AtomikGrid;
    hasSubmitted: boolean;
}

export interface AtomikKFardEPlayer extends PlayerInRoom {
    gameType: 'AtomikKFardE';
}

export interface DuelOutcome {
    playerHasWon: boolean;
    ennemyHasWon: boolean;
    player1ScoreChange: number;
    player2ScoreChange: number;
}

export interface PlayerAction {
    type: 'playCard';
    payload: {
        cardId: string;
        r: number;
        c: number;
    };
}

export type CellCoordinates = { r: number; c: number; };

export interface ConquestRoundResult {
    player1ControlledCells: number;
    player2ControlledCells: number;
    player1TotalScore: number;
    player2TotalScore: number;
    roundWinner: CellOwner.Player1 | CellOwner.Player2 | CellOwner.Tie;
    finalBoardState: AtomikGrid;
    cardsToStealFromPlayer2: AtomikDeck;
    cardsToStealFromPlayer1: AtomikDeck;
    cardsToLoseForTie: AtomikDeck;
    bombPropagationOrigin: CellCoordinates | null;
    cafardBombPlayer1PropagationOrigin: CellCoordinates | null;
    cafardBombPlayer2PropagationOrigin: CellCoordinates | null;
}

export interface AtomikKFardEGameRoom {
    gameType: 'AtomikKFardE';
    id: string;
    ownerId: string;
    name: string;
    players: AtomikKFardEPlayer[]; 
    state: 'waitingForPlayers' | 'readyToStart' | 'inGame' | 'gameOver' | 'empty' | 'paused';
    winnerId: string | null;
    currentRound: number;
    maxRounds: number;
    currentPlayerTurn: string;
    roundTimerInterval: NodeJS.Timeout | null;
    timePerRound: number;
    currentRoundTimer: NodeJS.Timeout | null;
    currentRoundTimeLeft: number;
    maxPlayers: number;
    gameOptions: {
        nbPlayer: AtomikKFardENbPlayer;
        mode: AtomikKFardEMode;
        option: AtomikKFardEOption;
        teamMode: AtomikKFardETeamMode;
        gameStyle: AtomikKFardEStyle;
        timePerRound: number;
        maxRounds: number;
        scoreToWin: number;
    };
    deck: AtomikDeck;
    discardPile: AtomikDeck;
    grid: AtomikGrid;
    playerGrids: Record<string, AtomikGrid>;
    scores: Record<string, number>;
    team1Players: string[];
    team2Players: string[];
    team1Score: number;
    team2Score: number;
    team1ControlledCellsTotal: number;
    team2ControlledCellsTotal: number;
    roundResults: ConquestRoundResult[];
    playerStates: Record<string, PlayerState>;
    teams: {
        player1: string[],
        player2: string[]
    };
    bombPropagationOrigin: CellCoordinates | null;
    cafardBombPlayer1PropagationOrigin: CellCoordinates | null;
    cafardBombPlayer2PropagationOrigin: CellCoordinates | null;
    chatMessages: ChatMessage[];
    turnPassTimer?: NodeJS.Timeout | null;
    playerDisconnectTimers: Map<string, NodeJS.Timeout>;
    gameHistory: string[];
    connectedPlayersCount?: number;
}

export type AtomikKFardEInitialGameData = import('../../types/shared.types').AtomikKFardERoomToSend;
export type AtomikKFardEGameBoardUpdateData = import('../../types/shared.types').AtomikKFardERoomToSend;
export type AtomikKFardEGameOverData = import('../../types/shared.types').AtomikKFardERoomToSend;
export type AtomikKFardERestartGameData = import('../../types/shared.types').AtomikKFardERoomToSend;