/**
 * 📢 ILOT ERROR
 * La structure universelle des cris d'alerte sur l'Îlot.
 * Permet de porter un message, un code de lore et un statut HTTP.
 */
export class IlotError extends Error {
  public readonly code: string;
  public readonly status: number;

  constructor(
    message: string, 
    code: string = 'ENTROPIE_CRITIQUE', 
    status: number = 500
  ) {
    super(message);
    
    // On garde le nom de la classe pour le debugging
    this.name = 'IlotError';
    
    // Le code métier (ex: 'NOT_FOUND', 'FORBIDDEN', 'SYNC_FAIL')
    this.code = code;
    
    // Le statut HTTP pour ton API Next.js (ex: 404, 403, 500)
    this.status = status;

    // Nécessaire pour que instanceof fonctionne correctement en TypeScript
    Object.setPrototypeOf(this, IlotError.prototype);
  }
}