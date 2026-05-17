// apps/hub-central/types/auth.types.ts (Version Purifiée)
import { IOiseau } from './user.types';

export interface AuthSession {
  user: IOiseau; // Contient déjà pseudo, frequenceHEX, aura, etc.
  
  // On extrait les capacités au premier niveau pour un accès rapide 
  // par le composant <RequireCapability />
  capabilities: string[]; 
  
  accessToken?: string;
  expires: string;
}