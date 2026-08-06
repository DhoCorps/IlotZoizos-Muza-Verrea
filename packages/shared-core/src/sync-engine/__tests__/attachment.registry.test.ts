// packages/shared-core/src/registry/__tests__/attachment.registry.test.ts
import { describe, it, expect } from 'vitest';
import { attachmentRegistry } from '../../registry/attachment.registry';

describe('AttachmentRegistry - Le Registre Universel des Attachements (Enrichi)', () => {
  
  it('🟢 doit enregistrer, vérifier et résoudre un attachement par slug avec succès', async () => {
    attachmentRegistry.register('LETRIN', async (slug) => ({
      sourceType: 'LETRIN',
      entitySlug: slug,
      title: `Police ${slug}`,
      targetRoute: `/letrin/fonts/${slug}`
    }));

    expect(attachmentRegistry.has('LETRIN')).toBe(true);
    expect(attachmentRegistry.getRegisteredSources()).toContain('LETRIN');

    const result = await attachmentRegistry.resolve('LETRIN', 'police-cyber-slug');

    expect(result).toEqual({
      sourceType: 'LETRIN',
      entitySlug: 'police-cyber-slug',
      title: 'Police police-cyber-slug',
      targetRoute: '/letrin/fonts/police-cyber-slug'
    });
  });

  it('🔴 doit lever une erreur si la source n’est pas enregistrée', async () => {
    expect(attachmentRegistry.has('UNKNOWN_SOURCE')).toBe(false);
    
    await expect(
      attachmentRegistry.resolve('UNKNOWN_SOURCE', 'item-999')
    ).rejects.toThrow();
  });

  it('🔴 doit lever une erreur si l’entité est introuvable par son résolveur', async () => {
    attachmentRegistry.register('SHOP', async () => null);

    await expect(
      attachmentRegistry.resolve('SHOP', 'produit-inexistant')
    ).rejects.toThrow();
  });
});