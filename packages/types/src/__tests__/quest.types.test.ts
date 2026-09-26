// Fichier : packages/shared-core/src/__tests__/quest.types.test.ts
import { describe, it, expect } from 'vitest';
import { JobQuestSchema } from '../core/quest.types';

describe('JobQuest - Validation Zod des Appels à Candidatures', () => {
  const validQuest = {
    uid: 'quest-001',
    projectUid: 'project-ilot-01',
    title: 'Recherche Paladin Fullstack',
    slug: 'recherche-paladin-fullstack', 
    description: 'Sceller la base Neo4j et stabiliser l\'interface.',
    workArrangement: 'FULL_REMOTE',
    contractType: 'FREELANCE',
    experienceLevel: 'MASTER',
    minBudgetCents: 50000, // 🆕 500€ / jour
    maxBudgetCents: 65000, // 650€ / jour
    budgetType: 'DAILY_RATE', // 🆕
    requiredSkills: ['Next.js', 'Neo4j', 'TypeScript'],
    bonusSkills: ['Zod', 'GraphQL'], // 🆕
    rewardLore: 'Part d\'artefacts et aura lumineuse',
    questDifficulty: 'NIGHTMARE',
    dangerLevel: 85, // Mission critique !
    perks: ['Accès au canal secret', 'Potion d\'endurance infinie (Café)'],
    status: 'ACTIVE'
  };

  it('🟢 doit valider une quête de recrutement complète, sérieuse et ludique', () => {
    const result = JobQuestSchema.safeParse(validQuest);
    expect(result.success).toBe(true);
  });

  it('🐣 doit appliquer les valeurs par défaut (FULL_REMOTE, NORMAL, 10 danger, DAILY_RATE...)', () => {
    const minimal = {
      uid: 'quest-002',
      projectUid: 'project-02',
      title: 'Chasse aux Bugs Cyberpunk',
      slug: 'chasse-aux-bugs-cyberpunk',
      description: 'Éliminer les anomalies dans Blade Runner OS.',
      requiredSkills: ['C++']
    };
    
    const parsed = JobQuestSchema.parse(minimal);
    
    expect(parsed.status).toBe('ACTIVE');
    expect(parsed.workArrangement).toBe('FULL_REMOTE'); // Par défaut
    expect(parsed.contractType).toBe('FREELANCE'); // Par défaut
    expect(parsed.experienceLevel).toBe('CONFIRMED'); // Par défaut
    expect(parsed.budgetType).toBe('DAILY_RATE'); // 🆕 Par défaut
    expect(parsed.bonusSkills).toEqual([]); // 🆕 Par défaut
    expect(parsed.questDifficulty).toBe('NORMAL');
    expect(parsed.dangerLevel).toBe(10); // Chill par défaut
    expect(parsed.perks).toEqual([]);
    expect(parsed.updatedAt).toBeInstanceOf(Date); // 🆕 Par défaut
  });

  it('🔴 doit rejeter une quête avec un budget de matchmaking négatif', () => {
    const badQuest = { ...validQuest, maxBudgetCents: -5000 };
    const result = JobQuestSchema.safeParse(badQuest);
    expect(result.success).toBe(false);
  });

  it('🔴 doit rejeter une quête dont le budget minimum est supérieur au maximum', () => {
    // 🆕 Test de notre .refine() croisé
    const illogicalBudgetQuest = { ...validQuest, minBudgetCents: 80000, maxBudgetCents: 65000 };
    const result = JobQuestSchema.safeParse(illogicalBudgetQuest);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain('Hérésie mathématique');
    }
  });

  it('🔴 doit rejeter une modalité de travail inconnue', () => {
    const badQuest = { ...validQuest, workArrangement: 'TELEPORTATION' };
    const result = JobQuestSchema.safeParse(badQuest);
    expect(result.success).toBe(false);
  });
  
  it('🔴 doit rejeter une jauge de danger supérieure à 100', () => {
    const badQuest = { ...validQuest, dangerLevel: 150 };
    const result = JobQuestSchema.safeParse(badQuest);
    expect(result.success).toBe(false);
  });
});