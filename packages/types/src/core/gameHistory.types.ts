// packages/shared-core/src/types/gameHistory.types.ts

export type SupportedGames = 'AtomikKFardE' | 'CrazyMorpion' | 'PlumZee' | 'SoonArt' | 'CineMax' | 'GalakTK';

export interface PlayerStats {
    uid: string;          // L'identifiant Neo4j/Mongo de l'Oiseau
    pseudo: string;
    score: number;
    isWinner: boolean;
    // Un champ flexible pour des stats spécifiques (ex: nb de bombes posées)
    specificStats?: Record<string, string | number | boolean>; 
}

export interface GameMatchLog {
    gameType: SupportedGames;
    roomId: string;       // L'ID du salon où s'est déroulée la partie
    startedAt: Date;
    endedAt: Date;
    durationSeconds: number; // Facile à requêter pour les temps de jeu totaux
    players: PlayerStats[];
    
    // Métadonnées globales de la partie (ex: taille de grille choisie, nb de rounds)
    matchMetadata?: Record<string, any>; 
}