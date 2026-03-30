/**
 * 🛡️ MODÉRATION & BIEN-ÊTRE MENTAL
 * Définitions strictes pour la gestion des conflits et la protection du Nexus.
 */

export type ModerationSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type ModerationAction = 'WARN' | 'EXILE' | 'BURN' | 'SUPPORT_TICKET';

export interface ModerationRequest {
  targetId: string;
  targetType: 'USER' | 'FRAGMENT' | 'PROJECT';
  reason: string;
  severity: ModerationSeverity;
  reportedBy?: string; // L'ID de l'oiseau qui donne l'alerte
  context?: Record<string, any>; // Données collectives additionnelles (ex: historique)
}

export interface ModerationResponse {
  success: boolean;
  actionTaken?: ModerationAction | 'PENDING';
  ticketId?: string;
  message: string;
  timestamp?: string; // Format ISO pour éviter les conflits de sérialisation
  flagged?: boolean;
  
}