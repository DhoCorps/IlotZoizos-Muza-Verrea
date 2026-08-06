// packages/shared-core/src/games/kooontreez/KoOonTreeZTypes.ts
import { PlayerInRoom, KoOonTreeZRoomToSend } from '../../types/shared.types';
import { Socket } from 'socket.io-client';

// --- Interfaces Côté CLIENT (Props du composant) ---

/**
 * @interface KoOonTreeZClientProps
 * Représente les propriétés transmises au composant client KoOonTreeZ.
 */
export interface KoOonTreeZClientProps {
    socket: Socket;
    roomId: string;
    username: string;
}

// --- Types Spécifiques à KoOonTreeZ ---
export type KoOonTreezNbPlayer = 'solo' | 'duo' | 'trio' | 'quad' | 'battle-royale' | 'Choisir le Nombre de Joueur en Jeu' | '' ;
export type KoOonTreezMode = 'DvsP' | 'DvsC' | 'PvsC' | 'PvsD' | 'CvsD' | 'CvsP' | 'Choisir un Mode de Jeu' | '' ; 
export type KoOonTreezOption = 'Blitzkrieg' | 'Champ-De-Bataille' | 'Sur-Le-Front' | 'Campagne' | 'Guerre-Totale' | 'Choisir une Option de Jeu' | '';
export type KoOonTreezLevel = 'easy' |'average' | 'normal' | 'hard' | 'impossible' | 'Choisir un Niveau de Jeu' | '';
export type KoOonTreezSoloMode = 'training' | 'e-learning' | 'challenge' | 'Choisir un Mode de Jeu Solo' | '';

export interface CurrentFlag {
    id: string; 
    countryName: string; 
    countryCapital: string;
    imageUrl: string; 
    alt: string;
}

export interface FullCountryData {
  cca2: string;
  name: {
    common: string;
    official?: string;
  };
  capital?: string[];
  flags: {
    png?: string;
    svg?: string;
    alt?: string;
  };
  region?: string;
  population?: number;
  continents?: string[];
  currencies?: {
    [key: string]: {
      name: string;
      symbol?: string;
    };
  };
}

export interface QuizQuestion {
    question: string; 
    correctAnswer: string; 
    options: string[]; 
    currentFlag: CurrentFlag; 
    mode: KoOonTreezMode;
}

// --- Interfaces Côté SERVEUR (pour le Manager de jeu) ---
export interface KoOonTreeZPlayer extends PlayerInRoom {}

export interface KoOonTreeZGameRoom {
    id: string;
    name: string;
    players: KoOonTreeZPlayer[]; 
    state: 'waiting' | 'playing' | 'gameOver';
    winnerId: string | null;
    round: number;
    gameType: 'KoOonTreeZ'; 
    maxPlayers: number ;
    expectedAnswer: string | null;
    scores: Record<string, number>; 
    
    kooonTreezNbPlayer: KoOonTreezNbPlayer;
    kooonTreezMode: KoOonTreezMode;
    kooonTreezOption: KoOonTreezOption;
    kooonTreezLevel: KoOonTreezLevel;
    kooonTreezSoloMode?: KoOonTreezSoloMode; 
    currentRoundTimeLeft: number;
    roundTimerInterval: NodeJS.Timeout | null;
    playerDisconnectTimers: Map<string, NodeJS.Timeout>;
    totalFlagsRecognized: number;
    targetFlagsCount: number | 'abandon'; 
    currentFlag: CurrentFlag | null; 
    allCountries: FullCountryData[]; 
    usedCountryIds: Set<string>; 
    playersAnsweredThisRound: Set<string>;
    correctAnswerGivenThisRound: boolean;
    lastCorrectAnswererId: string | null;
}

export type KoOonTreeZInitialGameData = KoOonTreeZRoomToSend;
export type KoOonTreeZGameBoardUpdateData = KoOonTreeZRoomToSend;
export type KoOonTreeZGameOverData = KoOonTreeZRoomToSend;
export type KoOonTreeZRestartGameData = KoOonTreeZRoomToSend;