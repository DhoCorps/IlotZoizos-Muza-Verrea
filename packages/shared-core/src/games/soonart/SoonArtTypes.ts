// packages/shared-core/src/games/soonart/SoonArtTypes.ts
import { PlayerInRoom, SoonArtRoomToSend } from '../../types/shared.types';

export interface Point {
    x: number;
    y: number;
}

export interface CircleSelection {
    id: string;
    playerId: string;
    center: Point;
    radius: number;
    treasureCount: number; // Nombre de trésors détectés dans ce cercle
    colorScheme: string;   // Couleur dynamique selon la densité
}

export interface Treasure {
    id: string;
    position: Point;
    isDiscovered: boolean;
}

export interface PlayerGuess {
    id: string;
    playerId: string;
    position: Point; // L'endroit où le joueur a planté son drapeau/marqueur
    matchedTreasureId?: string | null;
    accuracyScore: number; // Points attribués selon la précision
}

export type SoonArtGameStatus = 'waiting' | 'scanning' | 'marking' | 'gameOver';

export interface SoonArtGameOptions {
    mapWidth: number;   // ex: 1000px
    mapHeight: number;  // ex: 1000px
    totalTreasures: number; // ex: 5 trésors cachés
    maxCircles: number;     // Limite de cercles pour corser le jeu
}

export interface SoonArtPlayer extends PlayerInRoom {
    gameType: 'SoonArt';
    score: number;
    circlesUsed: number;
    guesses: PlayerGuess[];
}

export interface SoonArtGameRoom extends SoonArtRoomToSend {
    gameType: 'SoonArt';
    players: SoonArtPlayer[];
    gameOptions: SoonArtGameOptions;
    treasures: Treasure[];
    circles: CircleSelection[];
    scanTimeLeft: number; // Temps pour tracer les cercles
    markTimeLeft: number; // Temps pour placer les repères de trésors
}