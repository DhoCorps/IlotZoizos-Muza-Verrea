// packages/types/src/cryptoSeal.types.ts

export interface ICryptographicSeal {
  digitalSignature: string; // Le hash SHA-256 (ex: "8f43b...29a")
  timestampedAt: Date;      // La date exacte à la milliseconde près de l'ancrage
  copyrightClaimed: boolean; // Si l'oiseau a validé le sceau d'auteur
}