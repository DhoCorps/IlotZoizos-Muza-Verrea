// packages/shared-core/src/registry/attachment.registry.ts
import { IUniversalAttachment, AttachmentSourceType } from '@ilot/types';
import { IlotError } from '../errors/ilot.errors';

type AttachmentResolver = (entitySlug: string) => Promise<IUniversalAttachment | null>;

class AttachmentRegistry {
  private resolvers = new Map<AttachmentSourceType, AttachmentResolver>();

  /**
   * Enregistre un module pour qu'il devienne attachable dans les messages
   */
  public register(sourceType: AttachmentSourceType, resolver: AttachmentResolver) {
    this.resolvers.set(sourceType, resolver);
  }

  /**
   * Vérifie si une source est enregistrée
   */
  public has(sourceType: AttachmentSourceType): boolean {
    return this.resolvers.has(sourceType);
  }

  /**
   * Retourne la liste de toutes les sources actuellement enregistrées 
   * (Utile pour générer dynamiquement l'interface du sélecteur de pièces jointes)
   */
  public getRegisteredSources(): AttachmentSourceType[] {
    return Array.from(this.resolvers.keys());
  }

  /**
   * Résout et récupère les métadonnées universelles d'une entité à partir de son slug
   */
  public async resolve(sourceType: AttachmentSourceType, entitySlug: string): Promise<IUniversalAttachment> {
    const resolver = this.resolvers.get(sourceType);
    if (!resolver) {
      throw new IlotError(`Aucun résolveur enregistré pour la source d'attachement : ${sourceType}`, "NOT_FOUND", 404);
    }
    
    const attachment = await resolver(entitySlug);
    if (!attachment) {
      throw new IlotError(`L'entité ${entitySlug} de type ${sourceType} est introuvable.`, "NOT_FOUND", 404);
    }
    
    return attachment;
  }
}

export const attachmentRegistry = new AttachmentRegistry();