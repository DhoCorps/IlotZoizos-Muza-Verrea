// Fichier : packages/infrastructure/src/database/models/nosql/__tests__/user.model.test.ts
import { describe, it, expect } from 'vitest';
import { OiseauModel } from '../../nosql/user.model';

describe('Oiseau Model Test (La Silice Canonique)', () => {
  it('should create an oiseau with default values, clear karma, active ghost mode for #2F4F4F, and default moderation status', async () => {
    const oiseauData = {
      pseudo: 'OiseauLibreTest',
      email: 'libre@ilot.test',
      frequenceHEX: '#2F4F4F'
    };

    const oiseau = new OiseauModel(oiseauData);

    // Vérifications avant la sauvegarde (middleware pre-save)
    expect(oiseau.uid).toBeDefined();
    expect(oiseau.karmaStatus).toBe('clear');
    expect(oiseau.accountStatus).toBe('ACTIVE');
    expect(oiseau.gracesUsed).toBe(0);
    expect(oiseau.strikes).toBe(0);
    expect(oiseau.isBanned).toBe(false);
    expect(oiseau.profileStatus).toBe('RESPECTABLE');
    
    // Le pre-save hook active le mode fantôme pour #2F4F4F
    if (oiseau.frequenceHEX.toUpperCase() === '#2F4F4F') {
      oiseau.isGhostMode = true;
    }
    expect(oiseau.isGhostMode).toBe(true);
  });

  it('should enforce the maximum limit of 3 graces used', async () => {
    const invalidOiseauData = {
      pseudo: 'RebelleSansGrace',
      email: 'rebelle@ilot.test',
      gracesUsed: 4 // Dépasse la limite autorisée de 3
    };

    const oiseau = new OiseauModel(invalidOiseauData);
    
    let validationError: { errors?: { gracesUsed?: unknown } } | undefined;
    try {
      await oiseau.validate();
    } catch (err: unknown) {
      validationError = err as { errors?: { gracesUsed?: unknown } };
    }

    expect(validationError).toBeDefined();
    expect(validationError?.errors?.gracesUsed).toBeDefined();
  });

  it('should initialize a complete cvProfile with RPG defaults and SSOT structures', () => {
    const oiseauData = {
      pseudo: 'WorkerBird',
      email: 'work@ilot.test',
      cvProfile: {
        catchphrase: 'Prêt à forger le code',
        freelanceDailyRateCents: 50000,
        kryptonite: 'Les réunions de 2h qui auraient pu être un email.'
      }
    };

    const oiseau = new OiseauModel(oiseauData);

    expect(oiseau.cvProfile).toBeDefined();
    expect(oiseau.cvProfile?.catchphrase).toBe('Prêt à forger le code');
    expect(oiseau.cvProfile?.professionalStatus).toBe('EMPLOYEE'); // Défaut
    expect(oiseau.cvProfile?.remotePreference).toBe('FLEXIBLE'); // Défaut
    expect(oiseau.cvProfile?.freelanceDailyRateCents).toBe(50000);
    expect(oiseau.cvProfile?.isRateNegotiable).toBe(false); // Défaut
    
    // Vérification des "Flavors" RPG de l'Îlot
    expect(oiseau.cvProfile?.workSoundtrack).toBe('LOFI');
    expect(oiseau.cvProfile?.alignment).toBe('TRUE_NEUTRAL');
    expect(oiseau.cvProfile?.kryptonite).toBe('Les réunions de 2h qui auraient pu être un email.');

    // Vérification de la préparation des tableaux SSOT
    expect(oiseau.cvProfile?.experiences).toBeDefined();
    expect(oiseau.cvProfile?.experiences.length).toBe(0);
    expect(oiseau.cvProfile?.educations).toBeDefined();
    expect(oiseau.cvProfile?.educations.length).toBe(0);
    expect(oiseau.cvProfile?.languages).toBeDefined();
    expect(oiseau.cvProfile?.languages.length).toBe(0);
  });
});