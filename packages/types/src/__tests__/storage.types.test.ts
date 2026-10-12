// Fichier : packages/types/src/__tests__/storage.types.test.ts
import { describe, it, expect } from 'vitest';
import {
  StorageEntityType,
  StorageEntityTypeEnum,
  StructuredKeyOptions,
  StructuredKeyOptionsSchema
} from '../core/storage.types';

describe('Types & Schémas : Storage S3 / R2 (storage.types.ts)', () => {
  it('🟢 doit valider les 12 dossiers d’entités au pluriel minuscule sans altérer les clés R2', () => {
    const folders: StorageEntityType[] = [
      'users',
      'teams',
      'projects',
      'tasks',
      'sujets',
      'products',
      'stores',
      'templates',
      'fonts',
      'partitas',
      'messages',
      'barters'
    ];

    expect(folders).toHaveLength(12);
    for (const folder of folders) {
      expect(StorageEntityTypeEnum.safeParse(folder).success).toBe(true);
    }
  });

  it('🟢 doit valider une configuration complète de clé R2 (StructuredKeyOptions)', () => {
    const options: StructuredKeyOptions = {
      inceptId: 'hub-central',
      locale: 'fr',
      entityType: 'templates',
      entityId: 'tmpl_001',
      imageType: 'cv_template_preview',
      filename: 'parchemin.png'
    };

    const result = StructuredKeyOptionsSchema.safeParse(options);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.entityType).toBe('templates');
      expect(result.data.filename).toBe('parchemin.png');
    }
  });

  it('🔴 doit rejeter un dossier R2 non répertorié ou en majuscules', () => {
    expect(StorageEntityTypeEnum.safeParse('USERS').success).toBe(false);
    expect(StorageEntityTypeEnum.safeParse('unknown_bucket').success).toBe(false);
  });
});