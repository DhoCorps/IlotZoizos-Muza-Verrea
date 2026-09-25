// Fichier : packages/infrastructure/src/database/models/nosql/__tests__/user.model.neo.test.ts
import { describe, it, expect } from 'vitest';
import { UserModelNeo } from '../../nosql/user.neo.model';

describe('UserModelNeo Test (Le Pont vers Neo4j)', () => {
  it('should instantiate with specific ecological frequency, signature, and RPG stats', () => {
    const neoUser = new UserModelNeo({
      pseudo: 'NeoBird',
      email: 'neo@ilot.test'
    });

    expect(neoUser.uid).toBeDefined();
    expect(neoUser.pseudo).toBe('NeoBird');
    
    // Vérification des constantes identitaires de l'Îlot
    expect(neoUser.frequenceHEX).toBe('#8b9dc3'); // Gris bleuté écologique
    expect(neoUser.signature).toBe('<(:<');
    
    // Vérification de l'état RPG de base
    expect(neoUser.status).toBe('pending');
    expect(neoUser.level).toBe(1);
    expect(neoUser.xp).toBe(0);
    expect(neoUser.mood).toBe('😐');
  });

  it('should initialize empty arrays for capabilities and maintain Ilot specific modules', () => {
    const neoUser = new UserModelNeo({
      pseudo: 'ModuleBird',
      email: 'module@ilot.test'
    });

    // Capacités (Aura pour le matchmaking)
    expect(neoUser.capabilities).toEqual([]);

    // Vérification des modules conservés pour le pont (Plus aucune erreur TypeScript ici !)
    expect(neoUser.moderation?.reportCount).toBe(0);
    expect(neoUser.moderation?.isFlagged).toBe(false);
    expect(neoUser.collectiveData?.contributionScore).toBe(0);
    expect(neoUser.wellbeing?.mentalLoadScore).toBe(0);
  });

  it('should initialize the minimal cvProfile for matchmaking', () => {
    const neoUser = new UserModelNeo({
      pseudo: 'MatchBird',
      email: 'match@ilot.test',
      cvProfile: {
        freelanceDailyRateCents: 60000,
        professionalStatus: 'FREELANCE',
        remotePreference: 'FULL_REMOTE'
      }
    });

    expect(neoUser.cvProfile).toBeDefined();
    expect(neoUser.cvProfile?.professionalStatus).toBe('FREELANCE');
    expect(neoUser.cvProfile?.remotePreference).toBe('FULL_REMOTE');
    expect(neoUser.cvProfile?.freelanceDailyRateCents).toBe(60000);
  });

  it('should apply fallback defaults to cvProfile when partial data is provided', () => {
    const neoUser = new UserModelNeo({
      pseudo: 'PartialBird',
      email: 'partial@ilot.test',
      cvProfile: {}
    });

    expect(neoUser.cvProfile?.professionalStatus).toBe('EMPLOYEE');
    expect(neoUser.cvProfile?.remotePreference).toBe('FLEXIBLE');
    expect(neoUser.cvProfile?.freelanceDailyRateCents).toBeUndefined();
  });
});