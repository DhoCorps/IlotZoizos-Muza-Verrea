import { describe, it, expect } from 'vitest';
import { KontaktProfileSchema } from '../core/kontakt.types';

describe('KontaktProfile - Validation Zod des Profils Hybrides', () => {
  const validProfile = {
    uid: 'kontakt-001',
    userUid: 'bird-alpha',
    professionalTitle: 'Mage Fullstack Next.js',
    slug: 'mage-fullstack-next-js', // 🪡
    seniorityYears: 5,
    skills: ['TypeScript', 'MongoDB', 'Neo4j'],
    availabilityStatus: 'OPEN_TO_WORK',
    archetypeClass: 'Mage de Silice',
    alignment: 'CHAOTIC_GOOD',
    attributes: {
      force: 12,
      agilite: 15,
      intelligence: 18,
      charisme: 14,
      empathieVoightKampff: 85
    },
    specialArtifacts: ['Clavier mécanique de l\'Ombre'],
    biographyLore: 'Ancien vagabond du code, capable de plier la Silice à volonté.'
  };

  it('🟢 doit valider un profil Kontakt complet et hybride', () => {
    const result = KontaktProfileSchema.safeParse(validProfile);
    expect(result.success).toBe(true);
  });

  it('🔴 doit rejeter un profil avec un intitulé de poste trop court', () => {
    const invalidProfile = { ...validProfile, professionalTitle: 'De' };
    const result = KontaktProfileSchema.safeParse(invalidProfile);
    expect(result.success).toBe(false);
  });

  it('🐣 doit appliquer les valeurs par défaut (alignment, attributs à 10)', () => {
    const minimal = {
      uid: 'kontakt-002',
      userUid: 'bird-beta',
      professionalTitle: 'Architecte Réplicant',
      slug: 'architecte-replicant', // 🪡
      archetypeClass: 'Chasseur de Bugs'
    };
    const parsed = KontaktProfileSchema.parse(minimal);
    expect(parsed.alignment).toBe('TRUE_NEUTRAL');
    expect(parsed.attributes.force).toBe(10);
    expect(parsed.availabilityStatus).toBe('OPEN_TO_WORK');
  });
});