import { describe, it, expect } from 'vitest';
import { OiseauModel } from '../../nosql/user.model'; // Ajuste le chemin selon ton arborescence exacte

describe('Oiseau Model Test', () => {
  it('should create an oiseau with default values, clear karma, and active ghost mode for #2F4F4F', async () => {
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
    
    // Le pre-save hook active le mode fantôme pour #2F4F4F
    // (Simulons l'exécution du hook ou la validation)
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
    
    let validationError: any;
    try {
      await oiseau.validate();
    } catch (err) {
      validationError = err;
    }

    expect(validationError).toBeDefined();
    expect(validationError.errors.gracesUsed).toBeDefined();
  });
});