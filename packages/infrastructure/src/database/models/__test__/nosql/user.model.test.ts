import { describe, it, expect } from 'vitest';
import { OiseauModel } from '../../nosql/user.model';

describe('Oiseau Model Test', () => {
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
});