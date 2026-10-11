import { describe, it, expect } from 'vitest';
import { 
  TeamSchema,
  FosterTeamPayloadSchema,
  UpdateTeamPayloadSchema
} from '../models/team.types';

describe('Type Validation : TeamSchema (Tom-Hat-Toes)', () => {
  
  it('🛡️ doit valider un nid complet avec membres et invitations', () => {
    const fullTeam = {
      uid: 'team_001',
      name: 'La Volière Sacrée',
      description: 'Le nid fondateur',
      ownerUid: 'bird_alpha',
      category: 'SOCIAL',
      frequency: '#8b9dc3',
      isPrivate: true,
      members: [
        {
          uid: 'bird_alpha',
          capabilities: ['team:manage', '*'],
          contributionPoints: 1500,
          joinedAt: new Date()
        }
      ],
      invitations: [
        {
          uid: 'inv_001',
          targetUid: 'bird_beta',
          inviterUid: 'bird_alpha',
          status: 'PENDING',
          capabilities: ['task:create'],
          invitedAt: new Date()
        }
      ],
      settings: {
        isGlobalReducedSpeed: true,
        allowSearch: false,
        defaultLocale: 'fr'
      },
      documents: []
    };

    const result = TeamSchema.safeParse(fullTeam);
    
    if (!result.success) {
      console.error("Zod Team Validation Error (Full):", result.error.flatten());
    }
    
    expect(result.success).toBe(true);
  });

  it('⚡ doit tolérer l\'absence des champs optionnels et générer les valeurs par défaut', () => {
    const minimalTeam = {
      uid: 'team_002',
      name: 'Nid Silencieux',
      ownerUid: 'bird_gamma'
    };

    const result = TeamSchema.safeParse(minimalTeam);
    
    if (!result.success) {
      console.error("Zod Team Validation Error (Minimal):", result.error.flatten());
    }
    
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.frequency).toBe('#8b9dc3');
      expect(result.data.isPrivate).toBe(true);
      expect(result.data.members).toEqual([]);
      expect(result.data.invitations).toEqual([]);
      expect(result.data.governance.votingSystem).toBe('DEMOCRATIC');
      expect(result.data.settings.isGlobalReducedSpeed).toBe(false);
    }
  });

  it('💥 doit rejeter un payload avec une fréquence HEX invalide', () => {
    const invalidHexTeam = {
      uid: 'team_003',
      name: 'Nid Corrompu',
      ownerUid: 'bird_delta',
      frequency: 'rouge' // Invalide (doit être #FFFFFF)
    };

    const result = TeamSchema.safeParse(invalidHexTeam);
    expect(result.success).toBe(false);
    if (!result.success) {
      const errorPaths = result.error.errors.map(e => e.path.join('.'));
      expect(errorPaths).toContain('frequency');
    }
  });

  describe('Payloads API (Foster & Update)', () => {
    it('🟢 doit valider un FosterTeamPayload valide', () => {
      const payload = {
        name: 'Nouveau Nid',
        ownerUid: 'bird_1',
        isPrivate: false,
        category: 'SOCIAL'
      };
      
      const result = FosterTeamPayloadSchema.safeParse(payload);
      if (!result.success) {
        console.error("Zod Team Foster Payload Error:", result.error.flatten());
      }
      expect(result.success).toBe(true);
    });

    it('🔴 doit rejeter un UpdateTeamPayload essayant de modifier l\'UID ou le ownerUid', () => {
      const payload = {
        uid: 'hacked_uid',
        ownerUid: 'hacked_owner',
        name: 'Nom modifié'
      };
      
      const result = UpdateTeamPayloadSchema.safeParse(payload);
      if (result.success) {
        expect((result.data as any).uid).toBeUndefined(); // Zod ignore l'UID
        expect((result.data as any).ownerUid).toBeUndefined(); // Zod ignore le ownerUid
        expect(result.data.name).toBe('Nom modifié');
      }
    });
  });
});