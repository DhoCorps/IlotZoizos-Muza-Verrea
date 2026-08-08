// packages/shared-core/src/games/plumzee/PlumZeeTypes.ts

export type PlumZeeSymbolValue = 1 | 2 | 3 | 4 | 5 | 6;
export type GameRoomState = 'waiting' | 'playing' | 'gameOver';

export interface PlumZeeSymbolMeta {
    id: PlumZeeSymbolValue;
    name: string;
    icon: string;
    color: string;
}

export type PlumZeeCombinationKey = 
    | 'FEATHER'    
    | 'SAP'        
    | 'SEED'       
    | 'STAR'       
    | 'SPARK'      
    | 'BIRD'       
    | 'BRELAN'     
    | 'CARRE'      
    | 'NID_DOUILLET' 
    | 'PETITE_MIGRATION' 
    | 'GRANDE_MIGRATION' 
    | 'PLUMZEE'    
    | 'VENT_LIBRE'; 

export interface PlumZeeDie {
    id: number;
    value: PlumZeeSymbolValue;
    isLocked: boolean;
}

export interface PlumZeePlayerScoreSheet {
    [key: string]: number | null;
}

export interface PlumZeePlayer {
    id: string;
    socketId: string;
    username: string;
    roomId: string;
    status: 'connected' | 'disconnected';
    isReady: boolean;
    scoreSheet: PlumZeePlayerScoreSheet;
    score: number;        // 👈 Ajouté pour correspondre à PlayerInRoom
    totalScore: number;   // Gardé pour la logique interne si besoin
    rollsLeft: number;
    hasFinished: boolean;
}

export interface PlumZeeGameOptions {
    maxRounds: number;
    turnTimeLimitSec: number;
}

export interface PlumZeeGameRoom {
    id: string;
    name: string;
    gameType: 'PlumZee';
    players: PlumZeePlayer[];
    state: 'waiting' | 'playing' | 'gameOver' | 'paused';
    winnerId: string | null;
    maxPlayers: number;
    gameOptions: PlumZeeGameOptions;
    currentTurnPlayerId: string | null;
    currentRound: number;
    round: number; // Requis par BaseRoomData
    scores: Record<string, number>; // Requis par BaseRoomData
    currentDice: PlumZeeDie[];
    roundStartTime: number;
}