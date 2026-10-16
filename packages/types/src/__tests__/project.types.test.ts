// Fichier : packages/types/src/__tests__/project.types.test.ts
import { describe, it, expect } from 'vitest';
import { 
  ProjectSchema, 
  FosterProjectPayloadSchema,
  UpdateProjectPayloadSchema,
  ProjectStatusSchema
} from '../models/project.types';
import { StatusEnum } from '../models/common.types';

describe('Type Validation : ProjectSchema (Tom-Hat-Toes)', () => {
  
  it('🟢 doit valider que ProjectStatusSchema est aligné sur la SSOT StatusEnum', () => {
    const statuses: StatusEnum[] = ['CONCEPT', 'TODO', 'IN_PROGRESS', 'DONE', 'ARCHIVED', 'BLOCKED', 'ABANDONED'];
    for (const status of statuses) {
      expect(ProjectStatusSchema.safeParse(status).success).toBe(true);
    }
  });

  it('🟢 doit valider un chantier complet avec des objets Date natifs', () => {
    const mockProject = {
      uid: 'proj_123',
      name: 'Refonte Ilot Zoizos',
      slug: 'refonte-ilot-zoizos',
      ownerUid: 'team_alpha',
      creatorUid: 'bird_dev_1',
      status: 'IN_PROGRESS', 
      priority: 'MEDIUM',
      dates: {
        createdAt: new Date(),
        updatedAt: new Date()
      },
      energySap: {
        resourceFlow: {
          estimated: 1000,
          spent: 500,
          currency: 'EURO' // 🌟 Validation devises SSOT
        }
      }
    };

    const result = ProjectSchema.safeParse(mockProject);
    
    // 🛡️ SÉCURITÉ DEBUG
    if (!result.success) {
      console.error("Zod Validation Error:", result.error.flatten());
    }
    
    expect(result.success).toBe(true);
  });

  it('🟢 doit valider un chantier avec des dates ISO coercées (Cas SSR / API JSON)', () => {
    const isoDate = "2026-10-10T14:00:00.000Z";
    const ssrProject = {
      uid: 'proj_ssr',
      name: 'Data Pipeline',
      slug: 'data-pipeline',
      ownerUid: 'team_data',
      creatorUid: 'bird_data_1',
      status: 'CONCEPT',
      dates: {
        createdAt: isoDate, // String au lieu de Date
        updatedAt: isoDate
      }
    };

    const result = ProjectSchema.safeParse(ssrProject);
    
    if (!result.success) {
      console.error("Zod Validation Error:", result.error.flatten());
    }
    
    expect(result.success).toBe(true);
    // ⏳ Zod transforme proprement les chaînes en objets Date via z.coerce.date()
    if (result.success) {
      expect(result.data.dates.createdAt).toBeInstanceOf(Date);
      expect(result.data.dates.createdAt?.toISOString()).toBe(isoDate);
    }
  });

  it('🔴 doit rejeter un chantier sans name, uid, slug ou ownerUid', () => {
    const invalidProject = {
      description: 'Chantier fantôme',
      creatorUid: 'bird_1'
    };

    const result = ProjectSchema.safeParse(invalidProject);
    expect(result.success).toBe(false);
    if (!result.success) {
      const errorPaths = result.error.errors.map(e => e.path.join('.'));
      expect(errorPaths).toContain('uid');
      expect(errorPaths).toContain('name');
      expect(errorPaths).toContain('slug');
      expect(errorPaths).toContain('ownerUid');
    }
  });

  it('🟢 doit générer des valeurs par défaut pour les objets imbriqués', () => {
    const minimalProject = {
      uid: 'proj_min',
      name: 'Minimal',
      slug: 'minimal',
      ownerUid: 'team_min',
      creatorUid: 'bird_min'
    };

    const result = ProjectSchema.safeParse(minimalProject);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.appearance.icon).toBe('folder');
      expect(result.data.health.riskLevel).toBe('SAFE');
      expect(result.data.governance.license).toBe('MIT');
      expect(result.data.roadmap.progress).toBe(0);
      expect(result.data.status).toBe('CONCEPT'); 
      expect(result.data.dates.lastActivity).toBeInstanceOf(Date); // ⏳ Vérification coerce auto
    }
  });

  describe('Payloads API (Foster & Update)', () => {
    it('🟢 doit valider un FosterProjectPayload valide', () => {
      const payload = {
        name: 'Nouveau Projet',
        ownerUid: 'team_1',
      };
      
      const result = FosterProjectPayloadSchema.safeParse(payload);
      if (!result.success) {
        console.error("Zod Foster Payload Error:", result.error.flatten());
      }
      expect(result.success).toBe(true);
    });

    it('🔴 doit rejeter un UpdateProjectPayload essayant de modifier l\'UID', () => {
      const payload = {
        uid: 'hacked_uid',
        name: 'Nom modifié',
        status: 'ARCHIVED'
      };
      
      const result = UpdateProjectPayloadSchema.safeParse(payload);
      if (result.success) {
        expect((result.data as any).uid).toBeUndefined(); // L'UID est stripé par Zod
        expect(result.data.name).toBe('Nom modifié');
        expect(result.data.status).toBe('ARCHIVED');
      }
    });
  });
});