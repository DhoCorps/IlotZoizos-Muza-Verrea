import { describe, it, expect } from 'vitest';
import mongoose from 'mongoose';
import { JudgmentModel } from '../../nosql/judment.model'; // Ajuste le chemin selon ton arborescence exacte

describe('Modèle de la Silice : JudgmentModel (Le Tribunal du KaÔdz)', () => {

  it('🟢 doit forger un litige valide avec les valeurs par défaut (Sablier initié)', () => {
    const judgment = new JudgmentModel({
      disputeUid: 'disp_test_123',
      accuserUid: 'bird_plaignant_1',
      accusedUid: 'bird_accuse_2',
      lastActorUid: 'bird_plaignant_1', // Le plaignant est le premier acteur
    });

    // On vérifie la validation synchrone du schéma Mongoose
    const error = judgment.validateSync();
    
    expect(error).toBeUndefined(); // Aucune erreur de schéma
    expect(judgment.status).toBe('PENDING'); // Statut par défaut
    expect(judgment.lastInteractionAt).toBeDefined(); // Le sablier est en route
    expect(judgment.messages.length).toBe(0); // Pas encore de mots échangés
  });

  it('🔴 doit rejeter la création si les clés de voûte (UIDs) sont manquantes', () => {
    const emptyJudgment = new JudgmentModel({});
    const error = emptyJudgment.validateSync();

    expect(error).toBeDefined();
    expect(error?.errors['disputeUid']).toBeDefined();
    expect(error?.errors['accuserUid']).toBeDefined();
    expect(error?.errors['accusedUid']).toBeDefined();
    expect(error?.errors['lastActorUid']).toBeDefined();
  });

  it('🔴 doit rejeter un statut de jugement non reconnu par la Loi de l\'Îlot', () => {
    const invalidStatusJudgment = new JudgmentModel({
      disputeUid: 'disp_test_456',
      accuserUid: 'bird_plaignant_1',
      accusedUid: 'bird_accuse_2',
      lastActorUid: 'bird_plaignant_1',
      status: 'SENTENCE_INVENTEE_PAR_LE_KAODZ' // Ce statut n'est pas dans l'Enum
    });

    const error = invalidStatusJudgment.validateSync();

    expect(error).toBeDefined();
    expect(error?.errors['status']).toBeDefined();
    expect(error?.errors['status'].message).toContain('is not a valid enum value');
  });

  it('🟢 doit accepter et structurer les messages de conciliation dans l\'historique', () => {
    const conciliationJudgment = new JudgmentModel({
      disputeUid: 'disp_test_789',
      accuserUid: 'bird_plaignant_1',
      accusedUid: 'bird_accuse_2',
      lastActorUid: 'bird_accuse_2',
      messages: [
        { senderUid: 'bird_plaignant_1', content: 'Tu as franchi la ligne !' },
        { senderUid: 'bird_accuse_2', content: 'C\'était une erreur de la matrice, pardonne-moi.' }
      ]
    });

    const error = conciliationJudgment.validateSync();

    expect(error).toBeUndefined();
    expect(conciliationJudgment.messages.length).toBe(2);
    expect(conciliationJudgment.messages[0].senderUid).toBe('bird_plaignant_1');
    expect(conciliationJudgment.messages[1].sentAt).toBeDefined(); // La date est auto-générée
  });
});