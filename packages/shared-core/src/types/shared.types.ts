import { IUniversalAttachment, AttachmentSourceType } from '../../../types/src/models/message.types';
import { IlotError } from '../errors/ilot.errors';
import { CrazyMorpionSymbol, CrazyMorpionGrid } from '../games/crazymorpion/CrazyMorpionTypes';

import type { 
    CrazyMorpionGameRoom,  
    AtomikKFardEGameRoom, 
    CineMaxGameRoom, 
    SoonArtGameRoom, 
    GalakTKGameRoom, 
    PlumZeeGameRoom, 
    } from '../../../shared-core';

import type {
    KoOonTreezNbPlayer,
    KoOonTreezMode,
    KoOonTreezOption,
    KoOonTreezLevel,
    KoOonTreezSoloMode,
    KoOonTreeZGameRoom,
    KoOonTreeZPlayer,
    CurrentFlag
} from '../games/kooontreez/KoOonTreeZTypes';

export type {
    KoOonTreezNbPlayer,
    KoOonTreezMode,
    KoOonTreezOption,
    KoOonTreezLevel,
    KoOonTreezSoloMode,
    KoOonTreeZGameRoom,
    KoOonTreeZPlayer,
    CurrentFlag
};

import {
    AtomikDeck,
    AtomikKFardENbPlayer,
    AtomikKFardEMode,
    AtomikKFardEOption,
    AtomikKFardETeamMode,
    AtomikKFardEStyle,
    AtomikTimePerRound,
    ConquestRoundResult,
    CellCoordinates,
    AtomikGrid,
    PlayerState
} from '../games/atomikkfar/Atomik-K-FarTypes';
// 🎬 Import des types CineMax
import {
    CineMaxDifficulty,
    CineMaxDifficultyRule,
    CineMaxQuestion,
    CineMaxGameOptions
} from '../games/cinemax/CineMaxTypes';
// 🎨 Import des types Soon'Art
import {
    Point,
    CircleSelection,
    Treasure,
    PlayerGuess,
    SoonArtGameStatus,
    SoonArtGameOptions
} from '../games/soonart/SoonArtTypes';
// 🚀 Import des types Galak-T-K
import {
    GalakTKPoint,
    GalakTKGameOptions,
    GalakTKPlayerCellMark,
    CellMarkStatus
} from '../games/galak-t-k/GalakTKTypes';
// 🎲 Import des types Plum'Zee
import {
    PlumZeeDie,
    PlumZeePlayerScoreSheet,
    PlumZeeGameOptions,
    PlumZeeCombinationKey
} from '../games/plumzee/PlumZeeTypes';
// 🔮 Import et re-export des types WikiOracle
import type {
    WikiOracleChoicesMode,
    WikiOracleTheme,
    QuizQuestion as WikiQuizQuestion,
    WikiOraclePlayer,
    WikiOracleGameRoom,
    WikiOracleArticle
} from '../games/wikiOracle/WikiOracleTypes';

export type {
    WikiOracleChoicesMode,
    WikiOracleTheme,
    WikiQuizQuestion,
    WikiOraclePlayer,
    WikiOracleGameRoom,
    WikiOracleArticle
};

export type PlayerStatus = 'connected' | 'disconnected' | 'disconnected_temp' | 'waiting' | 'playing' | 'gameOver' | 'waitingForPlayers' | 'readyToStart' | 'inGame' | 'empty' | 'paused' | 'scanning' | 'marking';

// 🎬🎨🚀🎲🔮 Ajout de WikiOracle aux GameTypes
export type GameType = 'CrazyMorpion' | 'KoOonTreeZ' | 'AtomikKFardE' | 'CineMax' | 'SoonArt' | 'GalakTK' | 'PlumZee' | 'WikiOracle';

export type AtomikKFardEActionType = 
    | 'PLACE_CARD'       // Poser une carte sur une case de la grille
    | 'VALIDATE_TURN'    // Valider son tour de placement
    | 'SURRENDER'        // Abandonner la partie
    | 'SPECIAL_ACTION';  // Si tu as des actions spéciales liées aux bombes ou cafards

export type AnyGameRoom = 
    | CrazyMorpionGameRoom 
    | KoOonTreeZGameRoom 
    | AtomikKFardEGameRoom 
    | CineMaxGameRoom 
    | SoonArtGameRoom 
    | GalakTKGameRoom 
    | PlumZeeGameRoom 
    | WikiOracleGameRoom;


type AttachmentResolver = (entityUid: string) => Promise<IUniversalAttachment | null>;

export interface BasePlayer {
    id: string;
    username: string;
    score: number;
    isReady: boolean;
}

export interface Player extends BasePlayer {
    socketId: string;
    gameType?: GameType;
    status: string;
}

export interface PlayerInRoom extends BasePlayer {
    roomId: string | null;
    socketId: string | null; 
    status: PlayerStatus;
    isConnected?: boolean;
    symbol?: string | null;
    deck?: AtomikDeck;
    hand?: AtomikDeck;
}

export type CrazyMorpionPlayerClient = PlayerInRoom & { symbol: string | null };
export type KoOonTreeZPlayerClient = PlayerInRoom;
export type AtomikKFardEPlayerClient = PlayerInRoom & { deck: AtomikDeck; hand: AtomikDeck; handSize?: number };
export type WikiOraclePlayerClient = PlayerInRoom & { currentHintLevel: number };

// 🎬 Interface Client pour le joueur CineMax
export type CineMaxPlayerClient = PlayerInRoom & {
    errorCount: number;
    isBuzzerLocked: boolean;
    currentQuestion: CineMaxQuestion | null;
    pendingDifficultyChoice: boolean;
};

// 🎨 Interface Client pour le joueur Soon'Art
export type SoonArtPlayerClient = PlayerInRoom & {
    circlesUsed: number;
    guesses: PlayerGuess[];
};

// 🚀 Interface Client pour le joueur Galak-T-K
export type GalakTKPlayerClient = PlayerInRoom & {
    starsFoundCount: number;
    turnsTaken: number;
    markedCells: GalakTKPlayerCellMark[];
    foundStarPositions: GalakTKPoint[];
};

// 🎲 Interface Client pour le joueur Plum'Zee
export type PlumZeePlayerClient = PlayerInRoom & {
    scoreSheet: PlumZeePlayerScoreSheet;
    rollsLeft: number;
    hasFinished: boolean;
};

export interface BaseRoomData {
    id: string;
    name: string;
    gameType: GameType;
    state: 'waiting' | 'playing' | 'gameOver' | 'paused' | 'waitingForPlayers' | 'readyToStart' | 'inGame' | 'empty';
    winnerId?: string | null;
    round: number;
    maxPlayers: number;
    scores: Record<string, number>;
    // Index signature pour accepter les propriétés spécifiques de chaque jeu (grid, theme, etc.) sans lever d'erreur TS
    [key: string]: any;

}

export interface CrazyMorpionRoomToSend extends BaseRoomData {
    gameType: 'CrazyMorpion';
    players: CrazyMorpionPlayerClient[];
    grid?: CrazyMorpionGrid;
    winningCells?: { x: number; y: number; symbol: CrazyMorpionSymbol }[] | null;
    currentTurnPlayerId?: string | null;
    symbol?: CrazyMorpionSymbol | null;
    lastPlacedSymbol?: CrazyMorpionSymbol | null;
    currentFlag?: null;
}

export interface KoOonTreeZRoomToSend extends BaseRoomData {
    gameType: 'KoOonTreeZ';
    players: KoOonTreeZPlayerClient[];
    kooonTreezNbPlayer?: KoOonTreezNbPlayer;
    kooonTreezMode?: KoOonTreezMode;
    kooonTreezOption?: KoOonTreezOption;
    kooonTreezLevel?: KoOonTreezLevel;
    kooonTreezSoloMode?: KoOonTreezSoloMode;
    currentRoundTimeLeft?: number;
    totalFlagsRecognized?: number;
    targetFlagsCount?: number | 'abandon';
    currentFlag?: CurrentFlag | null;
}

export interface AtomikKFardEGameOptions {
    nbPlayer: AtomikKFardENbPlayer;
    mode: AtomikKFardEMode;
    option: AtomikKFardEOption;
    gameStyle: AtomikKFardEStyle;
    maxRounds: number;
    timePerRound: number;
    scoreToWin: number;
    teamMode: AtomikKFardETeamMode;
}

export interface AtomikKFardERoomToSend extends BaseRoomData {
    gameType: 'AtomikKFardE';
    players: AtomikKFardEPlayerClient[];
    ownerId: string;
    currentRound: number;
    maxRounds: number;
    currentPlayerTurn: string;
    roundTimerInterval: NodeJS.Timeout | null;
    timePerRound: number;
    currentRoundTimer: NodeJS.Timeout | null;
    currentRoundTimeLeft: number;
    gameOptions: AtomikKFardEGameOptions;
    deck: AtomikDeck;
    discardPile: AtomikDeck;
    grid: AtomikGrid;
    currentBoardState: AtomikGrid;
    playerGrids: Record<string, AtomikGrid>;
    player1Hand: AtomikDeck;
    player2Hand: AtomikDeck;
    team1Players: string[];
    team2Players: string[];
    team1Score: number;
    team2Score: number;
    team1ControlledCellsTotal: number;
    team2ControlledCellsTotal: number;
    roundResults: ConquestRoundResult[];
    playerStates: Record<string, PlayerState>;
    teams: {
        player1: string[];
        player2: string[];
    };
    bombPropagationOrigin: CellCoordinates | null;
    cafardBombPlayer1PropagationOrigin: CellCoordinates | null;
    cafardBombPlayer2PropagationOrigin: CellCoordinates | null;
    turnPassTimer?: NodeJS.Timeout | null;
    playerDisconnectTimers: Map<string, NodeJS.Timeout>;
    gameHistory: string[];
}

// 🎬 Salle de jeu formatée pour l'envoi au client CineMax
export interface CineMaxRoomToSend extends BaseRoomData {
    gameType: 'CineMax';
    players: CineMaxPlayerClient[];
    gameOptions: CineMaxGameOptions;
    targetMovieId: string | null;
    targetMovieTitle: string | null;
    targetMoviePoster: string | null;
    pelliculeBlur: number;
    roundTimerInterval: NodeJS.Timeout | null;
    currentRoundTimeLeft: number;
    buzzerWinnerId: string | null;
}

// 🎨 Salle de jeu formatée pour l'envoi au client Soon'Art
export interface SoonArtRoomToSend extends BaseRoomData {
    gameType: 'SoonArt';
    players: SoonArtPlayerClient[];
    gameOptions: SoonArtGameOptions;
    circles: CircleSelection[];
    treasures: Treasure[];
    treasuresCount: number;
    scanTimeLeft: number;
    markTimeLeft: number;
}

// 🚀 Salle de jeu formatée pour l'envoi au client Galak-T-K
export interface GalakTKRoomToSend extends BaseRoomData {
    gameType: 'GalakTK';
    players: GalakTKPlayerClient[];
    gameOptions: GalakTKGameOptions;
    stars: GalakTKPoint[];
    currentTurnPlayerId: string | null;
}

// 🎲 Salle de jeu formatée pour l'envoi au client Plum'Zee
export interface PlumZeeRoomToSend extends BaseRoomData {
    gameType: 'PlumZee';
    players: PlumZeePlayerClient[];
    gameOptions: PlumZeeGameOptions;
    currentDice: PlumZeeDie[];
    currentTurnPlayerId: string | null;
    currentRound: number;
}

export interface WikiOracleRoomToSend extends BaseRoomData {
    gameType: 'WikiOracle';
    players: WikiOraclePlayerClient[];
    choicesMode?: WikiOracleChoicesMode;
    theme?: WikiOracleTheme;
    currentRoundTimeLeft?: number;
    currentQuestion?: WikiQuizQuestion | null;
}

// 🎬🎨🚀🎲 Ajout à l'Union des Rooms
export type RoomToSend = CrazyMorpionRoomToSend | KoOonTreeZRoomToSend | AtomikKFardERoomToSend | CineMaxRoomToSend | SoonArtRoomToSend | GalakTKRoomToSend | PlumZeeRoomToSend | WikiOracleRoomToSend;
export type InitialGameData = RoomToSend;
export type GameBoardUpdateData = RoomToSend;
export type GameOverData = RoomToSend;
export type RestartGameData = RoomToSend;

export interface PlayerBaseClientState {
    id?: string | null;
    socketId?: string;
    username: string;
    roomId: string;
    roomName: string | null;
    players: PlayerInRoom[];
    score: number;
    scores: Record<string, number>;
    state: PlayerStatus;
    winnerId: string | null;
    round: number;
    gameType: GameType;
    currentRooms?: RoomToSend[];
}

export interface CrazyMorpionGameClientState extends PlayerBaseClientState {
    gameType: 'CrazyMorpion';
    players: CrazyMorpionPlayerClient[];
    grid: CrazyMorpionGrid;
    currentTurnPlayerId: string | null;
    symbol: CrazyMorpionSymbol | null;
    winningCells: { x: number; y: number; symbol: CrazyMorpionSymbol }[] | null;
    lastPlacedSymbol: CrazyMorpionSymbol | null;
    currentFlag: string | null;
}

export interface KoOonTreeZClientState extends PlayerBaseClientState {
    gameType: 'KoOonTreeZ';
    players: KoOonTreeZPlayerClient[];
    kooonTreezNbPlayer?: KoOonTreezNbPlayer;
    kooonTreezMode?: KoOonTreezMode;
    kooonTreezOption?: KoOonTreezOption;
    kooonTreezSoloMode?: KoOonTreezSoloMode;
    kooonTreezLevel?: KoOonTreezLevel;
    currentRoundTimeLeft?: number;
    totalFlagsRecognized?: number;
    targetFlagsCount?: number | 'abandon';
    currentFlag?: CurrentFlag | null;
}

export interface AtomikKFardEClientState extends PlayerBaseClientState {
    gameType: 'AtomikKFardE';
    players: AtomikKFardEPlayerClient[];
    gameOptions: AtomikKFardEGameOptions;
    grid: AtomikGrid;
    currentRound: number;
    currentPlayerTurn: string;
    currentRoundTimeLeft: number;
    roundResults: ConquestRoundResult[];
    playerStates: Record<string, PlayerState> | null;
}

// 🎬 État Client Global pour CineMax
export interface CineMaxClientState extends PlayerBaseClientState {
    gameType: 'CineMax';
    players: CineMaxPlayerClient[];
    gameOptions: CineMaxGameOptions;
    targetMovieTitle: string | null;
    targetMoviePoster: string | null;
    pelliculeBlur: number;
    currentRoundTimeLeft: number;
    buzzerWinnerId: string | null;
}

// 🎨 État Client Global pour Soon'Art
export interface SoonArtClientState extends PlayerBaseClientState {
    gameType: 'SoonArt';
    players: SoonArtPlayerClient[];
    gameOptions: SoonArtGameOptions;
    circles: CircleSelection[];
    scanTimeLeft: number;
    markTimeLeft: number;
}

// 🚀 État Client Global pour Galak-T-K
export interface GalakTKClientState extends PlayerBaseClientState {
    gameType: 'GalakTK';
    players: GalakTKPlayerClient[];
    gameOptions: GalakTKGameOptions;
    currentTurnPlayerId: string | null;
}

// 🎲 État Client Global pour Plum'Zee
export interface PlumZeeClientState extends PlayerBaseClientState {
    gameType: 'PlumZee';
    players: PlumZeePlayerClient[];
    gameOptions: PlumZeeGameOptions;
    currentDice: PlumZeeDie[];
    currentTurnPlayerId: string | null;
}

export interface WikiOracleClientState extends PlayerBaseClientState {
    gameType: 'WikiOracle';
    players: WikiOraclePlayerClient[];
    choicesMode?: WikiOracleChoicesMode;
    theme?: WikiOracleTheme;
    currentRoundTimeLeft?: number;
    currentQuestion?: WikiQuizQuestion | null;
}

// 🎬🎨🚀🎲 Ajout à l'Union des États Clients Globaux
export type ClientGlobalState = CrazyMorpionGameClientState | KoOonTreeZClientState | AtomikKFardEClientState | CineMaxClientState | SoonArtClientState | GalakTKClientState | PlumZeeClientState | WikiOracleClientState;

export interface BaseMakeMoveRequest {
    roomId: string;
    playerId: string;
    gameType: GameType;
}

export interface CrazyMorpionMakeMoveRequest extends BaseMakeMoveRequest {
    gameType: 'CrazyMorpion';
    x: number;
    y: number;
    chosenSymbol?: CrazyMorpionSymbol;
}

export interface KoOonTreeZMakeMoveRequest extends BaseMakeMoveRequest {
    gameType: 'KoOonTreeZ';
    answer: string;
}

export interface AtomikKFardEMakeMoveRequest extends BaseMakeMoveRequest {
    gameType: 'AtomikKFardE';
    deck: AtomikDeck;
    action: AtomikKFardEActionType;
    payload?: {
        row?: number;
        col?: number;
        cardId?: string;
    }
}

// 🎬 Requête de jeu pour CineMax
export interface CineMaxMakeMoveRequest extends BaseMakeMoveRequest {
    gameType: 'CineMax';
    action: 'SOLVE_QUESTION' | 'HIT_BUZZER' | 'SELECT_DIFFICULTY';
    payload?: {
        answer?: string;
        difficulty?: CineMaxDifficulty;
        movieTitle?: string; // <-- Ajouté pour corriger l'erreur du buzzer
    };
}

// 🎨 Requête de jeu pour Soon'Art
export interface SoonArtMakeMoveRequest extends BaseMakeMoveRequest {
    gameType: 'SoonArt';
    action: 'DRAW_CIRCLE' | 'PLACE_GUESS';
    payload: {
        center?: Point;
        radius?: number;
        position?: Point;
    };
}

// 🚀 Requête de jeu pour Galak-T-K
export interface GalakTKMakeMoveRequest extends BaseMakeMoveRequest {
    gameType: 'GalakTK';
    action: 'CLICK_CELL' | 'MARK_CELL';
    payload: {
        position: GalakTKPoint;
        markStatus?: CellMarkStatus;
    };
}

// 🎲 Requête de jeu pour Plum'Zee
export interface PlumZeeMakeMoveRequest extends BaseMakeMoveRequest {
    gameType: 'PlumZee';
    action: 'ROLL_DICE' | 'TOGGLE_LOCK' | 'SCORE_COMBINATION';
    payload: {
        dieIndex?: number;
        combinationKey?: PlumZeeCombinationKey;
    };
}

export interface WikiOracleMakeMoveRequest extends BaseMakeMoveRequest {
    gameType: 'WikiOracle';
    answer: string;
}

// 🎬🎨🚀🎲 Mise à jour des options de création de salon pour inclure Plum'Zee et WikiOracle
export interface CreateRoomRequest {
    username: string;
    gameType: GameType;
    roomName: string;
    kooonTreezNbPlayer?: KoOonTreezNbPlayer;
    kooonTreezSoloMode?: KoOonTreezSoloMode;
    kooonTreezMode?: KoOonTreezMode;
    kooonTreezOption?: KoOonTreezOption;
    kooonTreezLevel?: KoOonTreezLevel;
    atomikKfardeNbPlayer?: AtomikKFardENbPlayer;
    atomikKfardeMode?: AtomikKFardEMode;
    atomikKfardeOption?: AtomikKFardEOption;
    atomikKfardeTeamMode?: AtomikKFardETeamMode;
    atomikKfardeGameStyle?: AtomikKFardEStyle;
    atomikKfardeTimePerRound?: AtomikTimePerRound;
    cineMaxDifficultyRule?: CineMaxDifficultyRule;
    cineMaxTimePerRound?: number;
    cineMaxScoreToWin?: number;
    soonArtTotalTreasures?: number;
    soonArtMaxCircles?: number;
    soonArtMapWidth?: number;
    soonArtMapHeight?: number;
    galakTKGridWidth?: number;
    galakTKGridHeight?: number;
    galakTKTotalStars?: number;
    galakTKMode?: 'global' | 'local';
    plumZeeMaxRounds?: number;
    plumZeeTurnTimeLimit?: number;
    choicesMode?: WikiOracleChoicesMode;
    theme?: WikiOracleTheme;
}

export interface JoinRoomRequest {
    roomId: string;
    username: string;
}

class AttachmentRegistry {
  private resolvers = new Map<AttachmentSourceType, AttachmentResolver>();

  /**
   * Enregistre un module pour qu'il devienne attachable dans les messages
   */
  public register(sourceType: AttachmentSourceType, resolver: AttachmentResolver) {
    this.resolvers.set(sourceType, resolver);
  }

  /**
   * Résout et récupère les métadonnées universelles d'une entité à partir de son UID
   */
  public async resolve(sourceType: AttachmentSourceType, entityUid: string): Promise<IUniversalAttachment> {
    const resolver = this.resolvers.get(sourceType);
    if (!resolver) {
      throw new IlotError(`Aucun résolveur enregistré pour la source d'attachement : ${sourceType}`, "NOT_FOUND", 404);
    }
    
    const attachment = await resolver(entityUid);
    if (!attachment) {
      throw new IlotError(`L'entité ${entityUid} de type ${sourceType} est introuvable.`, "NOT_FOUND", 404);
    }
    
    return attachment;
  }
}

export const attachmentRegistry = new AttachmentRegistry();