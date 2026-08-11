// packages/shared-core/src/registry/__tests__/attachment.registry.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { attachmentRegistry } from '../../registry/attachment.registry';

describe('AttachmentRegistry - Le Registre Universel des Attachements', () => {
  
  beforeEach(() => {
    // Nettoyage ou réinitialisation si le registre le permet, 
    // ou utilisation de sources uniques par test pour éviter les interférences.
  });

  it('🟢 doit enregistrer, vérifier et résoudre un attachement par slug avec succès', async () => {
    const sourceKey = 'LETRIN_TEST';
    
    attachmentRegistry.register(sourceKey, async (slug) => ({
      sourceType: sourceKey,
      entitySlug: slug,
      title: `Police ${slug}`,
      targetRoute: `/letrin/fonts/${slug}`
    }));

    expect(attachmentRegistry.has(sourceKey)).toBe(true);
    expect(attachmentRegistry.getRegisteredSources()).toContain(sourceKey);

    const result = await attachmentRegistry.resolve(sourceKey, 'police-cyber-slug');

    expect(result).toEqual({
      sourceType: sourceKey,
      entitySlug: 'police-cyber-slug',
      title: 'Police police-cyber-slug',
      targetRoute: '/letrin/fonts/police-cyber-slug'
    });
  });

  it('🔴 doit lever une erreur si la source n’est pas enregistrée', async () => {
    const unknownKey = 'UNKNOWN_SOURCE_XYZ';
    expect(attachmentRegistry.has(unknownKey)).toBe(false);
    
    await expect(
      attachmentRegistry.resolve(unknownKey, 'item-999')
    ).rejects.toThrow();
  });

  it('🔴 doit lever une erreur si l’entité est introuvable par son résolveur (null retourné)', async () => {
    const shopKey = 'SHOP_TEST_NULL';
    attachmentRegistry.register(shopKey, async () => null as any);

    await expect(
      attachmentRegistry.resolve(shopKey, 'produit-inexistant')
    ).rejects.toThrow();
  });
});