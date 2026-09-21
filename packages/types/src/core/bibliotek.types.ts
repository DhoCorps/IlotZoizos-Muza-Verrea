// ==========================================
// 📚 TYPES & SCHÉMAS : BIBLIOTEK, GACHA & BARTER
// ==========================================

// Listes riches préétablies (extensibles)
export type WritingTypeCode = 
  | 'roman' 
  | 'essai' 
  | 'biographie' 
  | 'autobiographie' 
  | 'poesie' 
  | 'theatre' 
  | 'nouvelle' 
  | 'conte' 
  | 'manifeste' 
  | 'journal-intime' 
  | 'correspondance' 
  | 'chronique' 
  | 'pamphlet' 
  | 'traite' 
  | 'livre-artiste' 
  | 'manuel' 
  | (string & {});

export type WritingStyleCode = 
  | 'philosophie' 
  | 'science-fiction' 
  | 'fantasy' 
  | 'aventure' 
  | 'policier-thriller' 
  | 'historique' 
  | 'poetique' 
  | 'cyberpunk' 
  | 'steampunk' 
  | 'spiritualite-mystique' 
  | 'ecologie-nature' 
  | 'politique' 
  | 'sociologie' 
  | 'drame' 
  | 'horreur-fantastique' 
  | 'experimental' 
  | 'satire' 
  | 'mythes-legendes' 
  | 'science-computing' 
  | (string & {});

// 💎 Niveaux de rareté pour le Gacha Littéraire
export type GachaTierCode = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'mythic';

// 🌐 Règles de droits issus du UniversalMediaSchema interfacées avec le Barter
export interface UniversalMediaRights {
  allowCommercial?: boolean;
  allowBarter?: boolean;        // Autorise le troc de chapitres ou d'ouvrages
  allowLending?: boolean;       // Autorise le prêt entre bibliothèques d'Oiseaux
  transferable?: boolean;
}

// 💰 Interface financière et d'échange de l'ouvrage (Gacha & Barter)
export interface LibraryBookEconomyMetadata {
  priceCents: number;           // Valeur nominale en centimes
  currency?: string;            // Ex: 'EUR', 'SILICE'
  rights: UniversalMediaRights;
  barterAllowed: boolean;       // Actif pour le module Barter
  gachaTier: GachaTierCode;     // Rareté dans le Gacha Littéraire
  isTradable: boolean;          // Éligible au marché secondaire de l'Îlot
}

// 📖 Structure complète d'un Ouvrage de la Bibliotek enrichie
export interface ILibraryBookMediaEntity {
  uid: string;
  title: string;
  slug: string;
  authorUid: string;
  authorSlug: string;
  writingType: WritingTypeCode;
  style: WritingStyleCode;
  fileUrl: string;
  coverUrl?: string | null;
  digitalSignature: string;     // Sceau SHA-256 d'antériorité
  timestampedAt: string | Date;
  economy: LibraryBookMetadata;
  createdAt: string | Date;
}

// Alias pour compatibilité avec le UniversalMediaSchema
export type LibraryBookMetadata = LibraryBookEconomyMetadata;