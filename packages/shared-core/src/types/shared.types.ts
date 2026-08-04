// packages/shared-core/src/types/shared.ts
import { CrazyMorpionSymbol, CrazyMorpionGrid } from '../games/crazymorpion/CrazyMorpionTypes';
import {
    KoOonTreezNbPlayer,
    KoOonTreezMode,
    KoOonTreezOption,
    KoOonTreezLevel,
    KoOonTreezSoloMode,
    CurrentFlag
} from '../games/kooontreez/KoOonTreeZTypes';
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

export type PlayerStatus = 'connected' | 'disconnected' | 'disconnected_temp' | 'waiting' | 'playing' | 'gameOver' | 'waitingForPlayers' | 'readyToStart' | 'inGame' | 'empty' | 'paused';

export interface ChatMessage {
    id: string;
    roomId: string;
    senderId: string;
    senderUsername: string;
    text: string;
    timestamp: number;
}

export type GameType = 'CrazyMorpion' | 'KoOonTreeZ' | 'AtomikKFardE';

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

export interface BaseRoomData {
    id: string;
    name: string;
    players: PlayerInRoom[];
    state: PlayerStatus;
    winnerId: string | null;
    round: number;
    chatMessages: ChatMessage[];
    gameType: GameType;
    maxPlayers: number;
    scores: { [playerId: string]: number };
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

export type RoomToSend = CrazyMorpionRoomToSend | KoOonTreeZRoomToSend | AtomikKFardERoomToSend;
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
    scores: { [playerId: string]: number };
    state: PlayerStatus;
    winnerId: string | null;
    round: number;
    chatMessages: ChatMessage[];
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

export type ClientGlobalState = CrazyMorpionGameClientState | KoOonTreeZClientState | AtomikKFardEClientState;

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
    action: any;
}

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
}

export interface JoinRoomRequest {
    roomId: string;
    username: string;
}