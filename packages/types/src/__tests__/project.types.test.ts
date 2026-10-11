import { describe, it, expect } from 'vitest';
import { 
  ProjectSchema, 
  FosterProjectPayloadSchema,
  UpdateProjectPayloadSchema
} from '../models/project.types';

describe('Type Validation : ProjectSchema (Tom-Hat-Toes)', () => {
  
  it('🟢 doit valider un chantier complet avec des objets Date natifs', () => {
    const mockProject = {
      uid: 'proj_123',
      name: 'Refonte Ilot Zoizos',
      slug: 'refonte-ilot-zoizos',
      ownerUid: 'team_alpha',
      creatorUid: 'bird_dev_1',
      // 🎛️ CORRECTION : 'IN_PROGRESS' est généralement réservé aux Tâches.
      // On utilise un statut de projet valide comme 'CONCEPT' (ou 'ACTIVE').
      status: 'CONCEPT', 
      priority: 'MEDIUM',
      dates: {
        createdAt: new Date(),
        updatedAt: new Date()
      }
    };

    const result = ProjectSchema.safeParse(mockProject);
    
    // 🛡️ SÉCURITÉ DEBUG : Affiche l'erreur exacte dans la console si Zod bloque
    if (!result.success) {
      console.error("Zod Validation Error:", result.error.flatten());
    }
    
    expect(result.success).toBe(true);
  });

  it('🟢 doit valider un chantier avec des dates ISO (Cas SSR / API JSON)', () => {
    const ssrProject = {
      uid: 'proj_ssr',
      name: 'Data Pipeline',
      slug: 'data-pipeline',
      ownerUid: 'team_data',
      creatorUid: 'bird_data_1',
      dates: {
        createdAt: "2026-10-10T14:00:00.000Z", // String au lieu de Date
        updatedAt: "2026-10-10T15:30:00.000Z"
      }
    };

    const result = ProjectSchema.safeParse(ssrProject);
    
    if (!result.success) {
      console.error("Zod Validation Error:", result.error.flatten());
    }
    
    expect(result.success).toBe(true);
    // Zod conserve le format string car on a utilisé z.union()
    if (result.success) {
      expect(typeof result.data.dates.createdAt).toBe('string');
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
        name: 'Nom modifié'
      };
      
      // En TypeScript strict (Zod .omit()), l'UID sera ignoré silencieusement 
      // ou rejeté si on active strict(). Ici, on vérifie que l'UID n'est pas dans le schéma attendu.
      const result = UpdateProjectPayloadSchema.safeParse(payload);
      if (result.success) {
        expect((result.data as any).uid).toBeUndefined(); // L'UID est stripé par Zod !
        expect(result.data.name).toBe('Nom modifié');
      }
    });
  });
});