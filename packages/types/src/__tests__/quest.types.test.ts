import { describe, it, expect } from 'vitest';
import { JobQuestSchema } from '../core/quest.types';

describe('JobQuest - Validation Zod des Appels à Candidatures', () => {
  const validQuest = {
    uid: 'quest-001',
    projectUid: 'project-ilot-01',
    title: 'Recherche Paladin Fullstack',
    slug: 'recherche-paladin-fullstack', // 🪡
    description: 'Sceller la base Neo4j et stabiliser l\'interface.',
    requiredSkills: ['Next.js', 'Neo4j', 'TypeScript'],
    rewardLore: 'Part d\'artefacts et aura lumineuse',
    status: 'ACTIVE'
  };

  it('🟢 doit valider une quête de recrutement valide avec son slug', () => {
    const result = JobQuestSchema.safeParse(validQuest);
    expect(result.success).toBe(true);
  });

  it('🐣 doit appliquer le statut ACTIVE par défaut', () => {
    const minimal = {
      uid: 'quest-002',
      projectUid: 'project-02',
      title: 'Chasse aux Bugs Cyberpunk',
      slug: 'chasse-aux-bugs-cyberpunk', // 🪡
      description: 'Éliminer les anomalies dans Blade Runner OS.',
      requiredSkills: ['C++']
    };
    const parsed = JobQuestSchema.parse(minimal);
    expect(parsed.status).toBe('ACTIVE');
    expect(parsed.slug).toBe('chasse-aux-bugs-cyberpunk');
  });
});