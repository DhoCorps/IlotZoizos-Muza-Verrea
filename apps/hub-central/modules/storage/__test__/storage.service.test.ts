// Exemple de test de suture pour ton générateur de clefs
import {describe, it, expect} from 'vitest';
import { storageService } from '../storage.service';

describe('StorageService - Alchimie des Clefs', () => {
  it('doit générer une clef structurée parfaitement pour un oiseau', () => {
    const key = storageService.generateStructuredKey({
      inceptId: 'tom-hat-toes',
      locale: 'fr',
      entityType: 'users',
      entityId: 'zoizo-123',
      imageType: 'avatarUrl',
      filename: 'mon portrait.png'
    });

    // On vérifie que la Silice a bien nettoyé le nom et respecté l'arborescence
    expect(key).toContain('inceptions/tom-hat-toes/fr/users/zoizo-123/avatarUrl_');
    expect(key).toContain('mon_portrait.png');
  });
});