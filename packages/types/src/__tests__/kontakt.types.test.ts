import { describe, it, expect } from 'vitest';
import { KontaktProfileSchema, JobQuestSchema } from '../core/kontakt.types';

describe('KontaktProfile - Validation Zod des Profils Hybrides & Squelette Mutualisé', () => {
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
    biographyLore: 'Ancien vagabond du code, capable de plier la Silice à volonté.',
    portfolioItems: [
      { type: 'GITHUB_REPO', url: 'https://github.com/ilot/zoizos', title: 'Repo Principal', tags: ['ts', 'nextjs'] }
    ],
    pricing: {
      hourlyRateCents: 5000,
      missionRateCents: 40000,
      currency: 'EUR'
    },
    reviews: [
      { authorUid: 'bird-beta', rating: 5, comment: 'Un mage hors pair !', isVerifiedHire: true }
    ],
    tags: ['mage', 'fullstack', 'silice'],
    seo: {
      metaTitle: 'Mage Fullstack Next.js | Kontakt Îlot',
      metaDescription: 'Profil de mage spécialisé Silice et Neo4j.'
    }
  };

  it('🟢 doit valider un profil Kontakt complet avec son squelette SEO, tags et settings', () => {
    const result = KontaktProfileSchema.safeParse(validProfile);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.portfolioItems.length).toBe(1);
      expect(result.data.pricing?.hourlyRateCents).toBe(5000);
      expect(result.data.reviews[0].rating).toBe(5);
      expect(result.data.tags).toContain('silice');
      expect(result.data.seo.metaTitle).toBeDefined();
      expect(result.data.settings.allowDirectContact).toBe(true);
    }
  });

  it('🔴 doit rejeter un profil avec un intitulé de poste trop court', () => {
    const invalidProfile = { ...validProfile, professionalTitle: 'De' };
    const result = KontaktProfileSchema.safeParse(invalidProfile);
    expect(result.success).toBe(false);
  });

  it('🐣 doit appliquer les valeurs par défaut (alignment, attributs à 10, seo vide, tags vides)', () => {
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
    expect(parsed.portfolioItems).toEqual([]);
    expect(parsed.reviews).toEqual([]);
    expect(parsed.tags).toEqual([]);
    expect(parsed.seo).toBeDefined();
  });

  it('🟢 doit valider une JobQuest riche avec informations entreprise, prérequis et avantages', () => {
    const validQuest = {
      uid: 'quest-01',
      title: 'Quête de la Canopée',
      slug: 'quete-de-la-canopee',
      description: 'Refondre le routeur Neo4j',
      company: {
        name: 'Guilde des Zoizos',
        description: 'Une guilde experte en technologies web MERN et bases de données graphes.',
        websiteUrl: 'https://ilotzoizos.com'
      },
      requirements: ['TypeScript', 'Cypher', 'Magie de l\'esprit'],
      responsibilities: ['Synchroniser MongoDB et Neo4j', 'Traquer les bugs temporels'],
      employmentType: 'FREELANCE',
      experienceLevel: 'SENIOR',
      location: 'Hybride - Forêt / Remote',
      perks: ['Potion de caféine infinie', 'Abonnement transport'],
      budgetConstraint: {
        minBudgetCents: 10000,
        maxBudgetCents: 50000
      },
      tags: ['neo4j', 'backend'],
      seo: {
        metaTitle: 'Quête Canopée | Kontakt'
      }
    };
    
    const result = JobQuestSchema.safeParse(validQuest);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.company?.name).toBe('Guilde des Zoizos');
      expect(result.data.requirements.length).toBe(3);
      expect(result.data.employmentType).toBe('FREELANCE');
      expect(result.data.experienceLevel).toBe('SENIOR');
      expect(result.data.budgetConstraint?.maxBudgetCents).toBe(50000);
      expect(result.data.tags).toContain('neo4j');
      expect(result.data.settings.allowApplications).toBe(true);
    }
  });

  it('🐣 doit accepter une JobQuest minimale et appliquer les valeurs par défaut de recrutement', () => {
    const minimalQuest = {
      uid: 'quest-02',
      title: 'Petite réparation',
      slug: 'petite-reparation',
      description: 'Fix rapide sur le front-end.'
    };
    
    const result = JobQuestSchema.parse(minimalQuest);
    expect(result.employmentType).toBe('FULL_TIME'); // valeur par défaut
    expect(result.experienceLevel).toBe('MID'); // valeur par défaut
    expect(result.location).toBe('Remote'); // valeur par défaut
    expect(result.requirements).toEqual([]);
    expect(result.responsibilities).toEqual([]);
    expect(result.perks).toEqual([]);
    expect(result.status).toBe('ACTIVE');
  });
});