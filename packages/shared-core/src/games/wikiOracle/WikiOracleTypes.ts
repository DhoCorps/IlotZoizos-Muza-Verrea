import { PlayerInRoom } from '../../types/shared.types';
import { Socket } from 'socket.io-client';

export type WikiOracleChoicesMode = '0' | '2' | '4' | '8' | ''; // 0 = Saisie libre, 2/4/8 = QCM
export type WikiOracleTheme = 'history' | 'science' | 'cinema' | 'geography' | 'random' | '';

export interface WikiOracleArticle {
    title: string;
    extract: string;
    description?: string;
    thumbnail?: { source: string };
    content_urls?: { desktop?: { page?: string } };
}

export interface QuizQuestion {
    questionTitle: string; // Le titre masqué ou l'article cible
    correctAnswer: string;
    options: string[];
    hints: string[]; // [Indice 0 (immédiat), Indice 1 (à 10s), Indice 2 (à 20s)...]
    imageUrl?: string;
    wikiUrl?: string;
}

export interface WikiOraclePlayer extends PlayerInRoom {
    currentHintLevel?: number;
}

export interface WikiOracleGameRoom {
    id: string;
    name: string;
    players: WikiOraclePlayer[];
    state: 'waiting' | 'playing' | 'gameOver';
    winnerId: string | null;
    round: number;
    gameType: 'WikiOracle';
    maxPlayers: number;
    scores: Record<string, number>;
    choicesMode: WikiOracleChoicesMode;
    theme: WikiOracleTheme;
    currentRoundTimeLeft: number;
    roundTimerInterval: NodeJS.Timeout | null;
    hintRevealInterval: NodeJS.Timeout | null;
    currentQuestion: QuizQuestion | null;
    currentHintLevel: number;
    playersAnsweredThisRound: Set<string>;
    correctAnswerGivenThisRound: boolean;
}