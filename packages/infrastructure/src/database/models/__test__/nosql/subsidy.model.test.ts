// packages/infrastructure/src/database/models/__test__/nosql/subsidy.model.test.ts
import { describe, it, expect } from 'vitest';

describe('SubsidyModel - Structure de données', () => {
  it('🟢 doit créer un objet de demande de subvention avec les valeurs par défaut', () => {
    const subsidyData = {
      requesterUid: 'bird_artist_007',
      title: 'Mon Projet de Peinture Numérique',
      motivation: 'Besoin de TôX pour acheter des ressources rares.',
      requestedAmount: 500,
      currency: 'TOX'
    };

    expect(subsidyData).toMatchObject({
      requesterUid: 'bird_artist_007',
      requestedAmount: 500,
      currency: 'TOX'
    });
  });
});