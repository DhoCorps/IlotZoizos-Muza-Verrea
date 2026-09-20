import { describe, it, expect } from 'vitest';
import { ShareEventModel } from '../../nosql/propagation.model';

describe('ShareEvent Model (Mongoose) - Propagation Organique', () => {
    
  it('🟢 doit valider un partage GLOBAL avec les valeurs par défaut', () => {
    const validGlobalData = {
      sourceUid: 'oiseau_source_123',
      artifactUid: 'oeuvre_art_456',
      artifactType: 'BLOG',
    };

    const shareEvent = new ShareEventModel(validGlobalData);
    const error = shareEvent.validateSync();

    expect(error).toBeUndefined();
    expect(shareEvent.uid).toBeDefined(); // UID auto-généré
    expect(shareEvent.scope).toBe('GLOBAL');
    expect(shareEvent.receiverUids).toEqual([]); // Tableau vide par défaut
    expect(shareEvent.metrics.merciCount).toBe(0);
    expect(shareEvent.metrics.returnRatio).toBe(0);
  });

  it('🟢 doit valider un partage TARGETED si des destinataires sont fournis', () => {
    const validTargetedData = {
      sourceUid: 'oiseau_source_123',
      artifactUid: 'oeuvre_art_456',
      artifactType: 'LYRIKA',
      scope: 'TARGETED',
      receiverUids: ['contact_1', 'contact_2'],
      customMessage: 'Regarde cette pépite !'
    };

    const shareEvent = new ShareEventModel(validTargetedData);
    const error = shareEvent.validateSync();

    expect(error).toBeUndefined();
    expect(shareEvent.receiverUids).toHaveLength(2);
    expect(shareEvent.customMessage).toBe('Regarde cette pépite !');
  });

  it('🔴 doit rejeter un partage TARGETED s\'il n\'y a aucun destinataire (Validation Pre-Save)', () => {
    const invalidTargetedData = {
      sourceUid: 'oiseau_source_123',
      artifactUid: 'oeuvre_art_456',
      artifactType: 'POETRIK',
      scope: 'TARGETED',
      receiverUids: [] // Interdit par le pre('validate')
    };

    const shareEvent = new ShareEventModel(invalidTargetedData);
    const error = shareEvent.validateSync();

    expect(error).toBeDefined();
    expect(error?.errors['receiverUids']).toBeDefined();
    expect(error?.errors['receiverUids'].message).toContain('exige des destinataires');
  });

  it('🔴 doit rejeter un partage GLOBAL si des destinataires sont insérés (Validation Pre-Save)', () => {
    const invalidGlobalData = {
      sourceUid: 'oiseau_source_123',
      artifactUid: 'oeuvre_art_456',
      artifactType: 'PROJECT',
      scope: 'GLOBAL',
      receiverUids: ['contact_1'] // Interdit pour une portée globale
    };

    const shareEvent = new ShareEventModel(invalidGlobalData);
    const error = shareEvent.validateSync();

    expect(error).toBeDefined();
    expect(error?.errors['receiverUids']).toBeDefined();
    expect(error?.errors['receiverUids'].message).toContain('aucun destinataire');
  });

  it('🔴 doit rejeter un événement si les champs obligatoires manquent', () => {
    const incompleteData = {
      artifactType: 'BLOG',
    };

    const shareEvent = new ShareEventModel(incompleteData);
    const error = shareEvent.validateSync();

    expect(error).toBeDefined();
    expect(error?.errors['sourceUid']).toBeDefined();
    expect(error?.errors['artifactUid']).toBeDefined();
  });

  it('🔴 doit rejeter un événement si le type d\'artefact est invalide', () => {
    const invalidTypeData = {
      sourceUid: 'oiseau_source_123',
      artifactUid: 'oeuvre_art_456',
      artifactType: 'TYPE_INCONNU',
    };

    const shareEvent = new ShareEventModel(invalidTypeData);
    const error = shareEvent.validateSync();

    expect(error).toBeDefined();
    expect(error?.errors['artifactType']).toBeDefined();
  });
});