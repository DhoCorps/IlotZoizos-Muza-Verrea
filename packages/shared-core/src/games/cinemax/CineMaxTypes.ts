// packages/shared-core/src/games/cinemax/CineMaxTypes.ts
import { PlayerInRoom, CineMaxRoomToSend } from '../../types/shared.types';

// Les limites strictes de notre plateau (adapté à Renewall)
export type CineMaxNbPlayer = 'solo' | 'duo' | 'trio' | 'quad';

// Les niveaux de difficulté (Risk/Reward)
export type CineMaxDifficulty = 2 | 4 | 8 | 'TEXT';
export type CineMaxQuestionType = 'ACTOR_FACE' | 'DIRECTOR_FACE' | 'QUOTE' | 'CHARACTER_NAME';
export type CineMaxDifficultyRule = 'PLAYER_CHOICE' | 'SERVER_CHAOS';

export interface CineMaxQuestion {
    id: string;
    type: CineMaxQuestionType;
    difficulty: CineMaxDifficulty;
    questionText: string;
    imageUrl?: string; // Photo de l'acteur/réalisateur depuis TMDB
    options: string[]; // Tableau de propositions (vide si 'TEXT')
    correctAnswer: string;
}

export interface CineMaxPlayer extends PlayerInRoom {
    gameType: 'CineMax';
    score: number;
    errorCount: number; // Suivi des erreurs pour la pénalité progressive du buzzer
    isBuzzerLocked: boolean; // Statut de blocage si trop d'erreurs
    currentQuestion: CineMaxQuestion | null; // La question actuelle du joueur
    pendingDifficultyChoice: boolean; // Vrai si le joueur doit choisir sa difficulté
}

export interface CineMaxGameOptions {
    nbPlayer: CineMaxNbPlayer;
    timePerRound: number; // Temps maximum pour deviner le film
    scoreToWin: number; // Score cible pour gagner la partie
    difficultyRule: CineMaxDifficultyRule;
}

export interface CineMaxGameRoom extends CineMaxRoomToSend {
    gameType: 'CineMax';
    players: CineMaxPlayer[];
    gameOptions: CineMaxGameOptions;
    
    // --- L'Obscurité de la Salle (La mécanique coopérative/compétitive) ---
    targetMovieId: string | null;
    targetMovieTitle: string | null;
    targetMoviePoster: string | null; // L'URL de l'affiche TMDB
    pelliculeBlur: number; // Commence à 100%, descend vers 0%
    
    // --- État du Round ---
    roundTimerInterval: NodeJS.Timeout | null;
    currentRoundTimeLeft: number;
    buzzerWinnerId: string | null; // L'UID de celui qui a trouvé le film
}