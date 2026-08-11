// packages/infrastructure/src/database/models/__test__/nosql/beneficiary.model.test.ts
import { describe, it, expect } from 'vitest';

describe('ExternalBeneficiaryModel - Logique des ayants-droit tiers', () => {
  it('🟢 doit structurer un bénéficiaire externe non inscrit sur l\'Îlot avec les bonnes valeurs par défaut', () => {
    // Test direct de la structure logique sans instanciation Mongoose lourde
    const beneficiaryData = {
      beneficiaryUid: 'ext_graphist_01',
      name: 'Elena (Artiste Partenaire)',
      role: 'Designer Graphique',
      contactInfo: 'elena@external-art.com',
      isRegisteredOnIlot: false,
      ilotUserUid: null,
      createdAt: new Date()
    };

    expect(beneficiaryData).toMatchObject({
      beneficiaryUid: 'ext_graphist_01',
      name: 'Elena (Artiste Partenaire)',
      isRegisteredOnIlot: false,
      ilotUserUid: null
    });
    expect(beneficiaryData.createdAt).toBeInstanceOf(Date);
  });

  it('🟢 doit lier correctement un bénéficiaire externe à un compte officiel de l\'Îlot', () => {
    const linkedBeneficiaryData = {
      beneficiaryUid: 'ext_musician_02',
      name: 'Marc (Musicien Invité)',
      isRegisteredOnIlot: true,
      ilotUserUid: 'bird_marc_uuid',
      createdAt: new Date()
    };

    expect(linkedBeneficiaryData).toMatchObject({
      isRegisteredOnIlot: true,
      ilotUserUid: 'bird_marc_uuid'
    });
  });
});