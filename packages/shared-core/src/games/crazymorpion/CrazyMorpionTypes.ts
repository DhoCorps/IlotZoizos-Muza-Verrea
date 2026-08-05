// src/games/crazymorpion/CrazyMorpionTypes.ts
// Ce fichier contient les définitions de types spécifiques au jeu CrazyMorpion.

// Importe les types partagés depuis shared.ts. Ceux-ci sont la source unique de vérité pour les types client.
import {
    PlayerInRoom,
    CrazyMorpionRoomToSend,
    CrazyMorpionMakeMoveRequest, // Importe MakeMoveRequest générique de shared.ts
} from '../../types/shared.types';
import { Socket } from 'socket.io-client';


// --- Symboles et Grille du jeu CrazyMorpion ---
export type CrazyMorpionSymbol = string;

export const CRAZYMORPION_SYMBOL_EMPTY: CrazyMorpionSymbol = '';
export const CRAZYMORPION_SYMBOL_PLUS: CrazyMorpionSymbol = '+';
export const CRAZYMORPION_SYMBOL_MINUS: CrazyMorpionSymbol = '-';
export const CRAZYMORPION_SYMBOL_STAR: CrazyMorpionSymbol = '*';
export const CRAZYMORPION_SYMBOL_EQUAL: CrazyMorpionSymbol = '=';

export type CrazyMorpionGrid = string[][] | undefined;


// --- Interfaces Côté CLIENT (Props du composant) ---

/**
 * @interface CrazyMorpionClientProps
 * Représente les propriétés transmises au composant client CrazyMorpion.
 */
export interface CrazyMorpionClientProps {
    socket: Socket;
    roomId: string;
    username: string;
}


// --- Interfaces Côté SERVEUR (pour le Manager de jeu) ---

/**
 * @interface CrazyMorpionPlayer
 * Représente un joueur CrazyMorpion côté serveur.
 * Pour le serveur, le `symbol` est obligatoire une fois assigné.
 */
export interface CrazyMorpionPlayer extends PlayerInRoom {
    symbol: CrazyMorpionSymbol; // Le symbole est obligatoire pour un joueur CrazyMorpion sur le serveur
}

/**
 * @interface CrazyMorpionGameRoom
 * Représente la structure complète d'un salon de jeu CrazyMorpion côté serveur.
 * Contient toutes les informations nécessaires à la logique du jeu.
 */
export interface CrazyMorpionGameRoom {
    id: string;
    name: string;
    players: CrazyMorpionPlayer[]; // Joueurs côté serveur avec symbole obligatoire
    state: 'waiting' | 'playing' | 'gameOver';
    grid: CrazyMorpionGrid;
    currentTurnPlayerId: string | null;
    winnerId: string | null;
    winningCells: { x: number; y: number; symbol: CrazyMorpionSymbol }[] | null;
    round: number;
    gameType: 'CrazyMorpion'; // Discriminant
    maxPlayers: number;
    scores: Record<string, number>;
    turnPassTimer?: number;
    playerDisconnectTimers: Map<string, NodeJS.Timeout>;
}


// --- Interfaces pour les événements Socket.IO spécifiques à CrazyMorpion (Réponses Serveur vers Client) ---

export type CrazyMorpionInitialGameData = CrazyMorpionRoomToSend;
export type CrazyMorpionGameBoardUpdateData = CrazyMorpionRoomToSend;
export type CrazyMorpionGameOverData = CrazyMorpionRoomToSend;
export type CrazyMorpionRestartGameData = CrazyMorpionRoomToSend;