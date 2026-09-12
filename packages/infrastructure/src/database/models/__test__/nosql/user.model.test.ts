import { describe, it, expect } from 'vitest';
import mongoose from 'mongoose';
import { OiseauModel } from '../../nosql/user.model'; // Ajuste le chemin relatif si besoin

describe('Modèle de la Silice : OiseauModel (Profil et Justice)', () => {

  it('🟢 doit forger un oiseau valide avec les valeurs et statuts par défaut', () => {
    const oiseau = new OiseauModel({
      pseudo: 'GenieMix',
      email: 'genie@ilot.fr',
      password: 'hashed_password_123'
    });

    const error = oiseau.validateSync();
    
    expect(error).toBeUndefined();
    expect(oiseau.uid).toBeDefined(); 
    expect(oiseau.frequenceHEX).toBe('#2F4F4F');
    
    // ⚖️ Vérification des champs de justice par défaut
    expect(oiseau.praisesCount).toBe(0);
    expect(oiseau.accountStatus).toBe('ACTIVE');
  });

  it('🔴 doit rejeter la création si les champs vitaux (pseudo, email) sont manquants', () => {
    const emptyOiseau = new OiseauModel({});
    const error = emptyOiseau.validateSync();

    expect(error).toBeDefined();
    expect(error?.errors['pseudo']).toBeDefined();
    expect(error?.errors['email']).toBeDefined();
  });

  it('🔴 doit rejeter un statut de compte non reconnu par le Tribunal de l\'Îlot (Enum invalide)', () => {
    const invalidStatusOiseau = new OiseauModel({
      pseudo: 'Rebelle',
      email: 'rebelle@ilot.fr',
      accountStatus: 'INVINCIBLE' // Statut illégal
    });

    const error = invalidStatusOiseau.validateSync();

    expect(error).toBeDefined();
    expect(error?.errors['accountStatus']).toBeDefined();
    expect(error?.errors['accountStatus'].message).toContain('is not a valid enum value');
  });

  it('🟢 doit accepter le statut UNDER_JUDGMENT et valider les éloges', () => {
    const judgedOiseau = new OiseauModel({
      pseudo: 'Accuse',
      email: 'accuse@ilot.fr',
      accountStatus: 'UNDER_JUDGMENT',
      praisesCount: 15
    });

    const error = judgedOiseau.validateSync();
    expect(error).toBeUndefined();
    expect(judgedOiseau.accountStatus).toBe('UNDER_JUDGMENT');
    expect(judgedOiseau.praisesCount).toBe(15);
  });

  it('🟢 doit basculer en mode fantôme (isGhostMode) si la fréquence HEX est #2F4F4F lors du hook pre-save', async () => {
    const ghostOiseau = new OiseauModel({
      pseudo: 'Spectre',
      email: 'spectre@ilot.fr',
      frequenceHEX: '#2F4F4F' // Déclencheur du mode fantôme
    });

    // Simule la sauvegarde pour activer le hook pre('save')
    await ghostOiseau.save({ validateBeforeSave: false }).catch(() => {});
    
    expect(ghostOiseau.isGhostMode).toBe(true);
  });
});