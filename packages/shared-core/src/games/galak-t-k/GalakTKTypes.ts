// packages/shared-core/src/games/galaktk/GalakTKTypes.ts

export type GalakTKGridSize = 'small' | 'medium' | 'large'; // Ex: 6x6, 8x8, 10x10
export type GalakTKMode = 'global' | 'local'; // Axes globaux ou voisinage restreint

export interface GalakTKPoint {
    x: number;
    y: number;
}

export interface GalakTKGameOptions {
    gridWidth: number;
    gridHeight: number;
    totalStars: number;
    mode: GalakTKMode;
    gridSize: GalakTKGridSize;
}

export type CellMarkStatus = 'empty' | 'star' | 'unknown';

export interface GalakTKPlayerCellMark {
    x: number;
    y: number;
    status: CellMarkStatus;
}

export interface GalakTKPlayer {
    id: string;
    socketId: string;
    username: string;
    roomId: string;
    status: 'connected' | 'disconnected';
    isReady: boolean;
    score: number;
    starsFoundCount: number;
    turnsTaken: number;
    startTime: number;
    totalTimeMs: number;
    markedCells: GalakTKPlayerCellMark[]; // Mémorisation personnelle du joueur (clic droit)
    foundStarPositions: GalakTKPoint[];   // Étoiles découvertes par CE joueur en secret
}

export interface GalakTKGameRoom {
    id: string;
    name: string;
    gameType: 'GalakTK';
    players: GalakTKPlayer[];
    state: 'waiting' | 'playing' | 'gameOver' | 'paused';
    winnerId: string | null;
    maxPlayers: number;
    gameOptions: GalakTKGameOptions;
    stars: GalakTKPoint[];              // Positions secrètes des étoiles sur la grille
    currentTurnPlayerId: string | null;
    roundStartTime: number;
    round: number; 
    scores?: Record<string, number>;
}

export interface GalakTKMoveResult {
    type: 'STAR_FOUND' | 'AXIS_COUNT';
    position: { x: number; y: number };
    count?: number; // Optionnel car présent uniquement pour AXIS_COUNT
}

