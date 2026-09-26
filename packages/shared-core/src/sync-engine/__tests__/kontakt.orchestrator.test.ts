import { describe, it, expect, vi, beforeEach } from 'vitest';
import { KontaktOrchestrator } from '../kontakt.orchestrator';
import { TransactionManager } from '../transactionManager';
import { IlotError } from '../../errors/ilot.errors';
import { ActionSignature } from '@ilot/types';
import * as orchestratorEngine from '../../utils/orchestrator.engine';
import type { ClientSession } from 'mongoose';
import type { Transaction } from 'neo4j-driver';

// 🚀 Utilisation de vi.hoisted pour survivre au hissage de Vitest
const { mockFosterNotification } = vi.hoisted(() => {
  return {
    mockFosterNotification: vi.fn().mockResolvedValue({ success: true })
  };
});

// 🛡️ Mock unifié et sécurisé de l'infrastructure
vi.mock('@ilot/infrastructure', async (importOriginal) => {
  const actual = await importOriginal() as Record<string, unknown>;
  return {
    ...actual,
    OiseauModel: {},
  };
});

// Mock complet du moteur d'orchestration
vi.mock('../../utils/orchestrator.engine', () => ({
  safeSyncUniversalInteraction: vi.fn(async () => {}),
  resolveCanonicalUid: vi.fn(async (_model, identifier: string) => `resolved_${identifier}`)
}));

// Mock du NotificationOrchestrator
vi.mock('../notification.orchestrator', () => ({
  NotificationOrchestrator: vi.fn().mockImplementation(() => ({
    fosterNotification: mockFosterNotification
  }))
}));

vi.mock('../transactionManager', () => ({
  TransactionManager: {
    execute: vi.fn(async (_name: string, cb: (mongoSession: ClientSession, neo4jTx: Transaction) => Promise<unknown>) => 
      cb({} as ClientSession, { run: vi.fn().mockResolvedValue({ records: [{ get: () => ({}) }] }) } as unknown as Transaction)
    ),
  },
}));

describe('KontaktOrchestrator - Réseau RH, Swipes & Matchmaking Avancé', () => {
  let orchestrator: KontaktOrchestrator;
  const validSignature: ActionSignature = { actorUid: 'bird_alpha', capabilities: [] };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // 🛡️ Ré-affirmation du comportement pour pallier au "mockReset" global éventuel de Vitest
    mockFosterNotification.mockClear();
    mockFosterNotification.mockResolvedValue({ success: true });

    const injectedNotificationOrchestrator = {
      fosterNotification: mockFosterNotification
    } as any;

    orchestrator = new KontaktOrchestrator(injectedNotificationOrchestrator);
  });

  describe('registerSwipe', () => {
    it('🟢 doit enregistrer un swipe LIKE, détecter un match, propager l\'interaction et envoyer 2 notifications', async () => {
      const mockNeo4jTx = {
        run: vi.fn()
          .mockResolvedValueOnce({ records: [{ get: () => ({}) }] }) // Détecte un match
          .mockResolvedValueOnce({ records: [] }) // Insère le swipe
      };
      vi.mocked(TransactionManager.execute).mockImplementationOnce(async (_name: string, cb: (mongoSession: ClientSession, neo4jTx: Transaction) => Promise<unknown>) => {
        return await cb({} as ClientSession, mockNeo4jTx as unknown as Transaction);
      });

      const res = await orchestrator.registerSwipe(
        { swiperUid: 'bird_alpha_slug', targetUid: 'bird_beta_slug', action: 'LIKE' },
        validSignature
      );

      expect(res.success).toBe(true);
      expect(res.match).toBe(true);
      expect(TransactionManager.execute).toHaveBeenCalledTimes(1);

      expect(orchestratorEngine.safeSyncUniversalInteraction).toHaveBeenCalledTimes(1);
      
      // Vérification des notifications de Match (une pour chaque oiseau)
      expect(mockFosterNotification).toHaveBeenCalledTimes(2);
      expect(mockFosterNotification).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'KONTAKT_MATCH' }),
        expect.anything()
      );
    });

    it('🟡 doit appeler safeSyncUniversalInteraction lors d\'un swipe PASS sans envoyer de notification', async () => {
      const mockNeo4jTx = {
        run: vi.fn()
          .mockResolvedValueOnce({ records: [] })
          .mockResolvedValueOnce({ records: [] })
      };
      vi.mocked(TransactionManager.execute).mockImplementationOnce(async (_name: string, cb: (mongoSession: ClientSession, neo4jTx: Transaction) => Promise<unknown>) => {
        return await cb({} as ClientSession, mockNeo4jTx as unknown as Transaction);
      });

      const res = await orchestrator.registerSwipe(
        { swiperUid: 'bird_alpha_slug', targetUid: 'bird_beta_slug', action: 'PASS' },
        validSignature
      );

      expect(res.success).toBe(true);
      expect(orchestratorEngine.safeSyncUniversalInteraction).toHaveBeenCalledTimes(1);
      expect(mockFosterNotification).toHaveBeenCalledTimes(0); // Pas de notif sur un PASS
    });
  });

  describe('endorseSkill (Sceau de Confiance)', () => {
    it('🔴 doit rejeter (400) si l\'oiseau tente de s\'auto-attribuer un Sceau', async () => {
      await expect(
        orchestrator.endorseSkill(
          { targetUid: 'bird_alpha', skillName: 'REACT' },
          { actorUid: 'bird_alpha', capabilities: [] }
        )
      ).rejects.toThrow(IlotError);
    });

    it('🟢 doit apposer le Sceau de Confiance, propager l\'interaction et notifier la cible', async () => {
      const res = await orchestrator.endorseSkill(
        { targetUid: 'target_slug', skillName: 'NEO4J', comment: 'Excellent modélisateur' },
        validSignature
      );

      expect(res.success).toBe(true);
      expect(mockFosterNotification).toHaveBeenCalledTimes(1);
      expect(mockFosterNotification).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'SKILL_ENDORSED' }),
        validSignature
      );
    });
  });

  describe('registerEndorsement (VOUCHES_FOR)', () => {
    it('🔴 doit rejeter (400) si l\'oiseau s\'auto-recommande', async () => {
      await expect(
        orchestrator.registerEndorsement(
          { targetUid: 'bird_alpha', skill: 'TYPESCRIPT' },
          { actorUid: 'bird_alpha', capabilities: [] }
        )
      ).rejects.toThrow(IlotError);
    });

    it('🟢 doit apposer la relation VOUCHES_FOR, propager l\'interaction et notifier la cible', async () => {
      const res = await orchestrator.registerEndorsement(
        { targetUid: 'target_slug', skill: 'TYPESCRIPT', comment: 'Expertise solide' },
        validSignature
      );

      expect(res.success).toBe(true);
      expect(mockFosterNotification).toHaveBeenCalledTimes(1);
      expect(mockFosterNotification).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'VOUCH_RECEIVED' }),
        validSignature
      );
    });
  });

  describe('leaveReview (Avis Post-Collaboration)', () => {
    it('🔴 doit rejeter (403) si aucune relation :HIRED n\'est trouvée dans le Graphe', async () => {
      const mockNeo4jTx = {
        run: vi.fn().mockResolvedValueOnce({ records: [] }) // 0 record -> pas de relation HIRED
      };
      vi.mocked(TransactionManager.execute).mockImplementationOnce(async (_name, cb) => {
        return await cb({} as ClientSession, mockNeo4jTx as unknown as Transaction);
      });

      await expect(
        orchestrator.leaveReview(
          { targetUid: 'target_slug', rating: 5, comment: 'Super mission' },
          validSignature
        )
      ).rejects.toThrow(IlotError);
    });

    it('🟢 doit enregistrer l\'avis si :HIRED est présente et notifier l\'évalué', async () => {
      const mockNeo4jTx = {
        run: vi.fn()
          .mockResolvedValueOnce({ records: [{}] }) // Trouve le lien HIRED
          .mockResolvedValueOnce({ records: [{}] }) // Crée l'avis
      };
      vi.mocked(TransactionManager.execute).mockImplementationOnce(async (_name, cb) => {
        return await cb({} as ClientSession, mockNeo4jTx as unknown as Transaction);
      });

      const res = await orchestrator.leaveReview(
        { targetUid: 'target_slug', rating: 5, comment: 'Super mission' },
        validSignature
      );

      expect(res.success).toBe(true);
      expect(mockFosterNotification).toHaveBeenCalledTimes(1);
      expect(mockFosterNotification).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'REVIEW_RECEIVED' }),
        validSignature
      );
    });
  });

  describe('requestIntroduction (La Passerelle)', () => {
    it('🟢 doit enregistrer une demande, propager l\'interaction universelle et notifier l\'intermédiaire', async () => {
      const res = await orchestrator.requestIntroduction(
        { intermediaryUid: 'inter_slug', targetUid: 'target_slug', message: 'Hello!' },
        validSignature
      );

      expect(res.success).toBe(true);
      expect(mockFosterNotification).toHaveBeenCalledTimes(1);
      expect(mockFosterNotification).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'INTRO_REQUESTED' }),
        validSignature
      );
    });
  });

  describe('matchmakingEngine (Règles SSOT : Télétravail, Statut, Budget, Expérience, Skills & TAGS SEO)', () => {
    it('🟢 doit flagger FAVORABLE_MATCH avec un score de 100 si toutes les conditions CV et Quête sont réunies', async () => {
      const res = await orchestrator.matchmakingEngine({
        questMaxBudgetCents: 50000,
        profileHourlyRateCents: 45000, // Budget OK
        questWorkArrangement: 'FULL_REMOTE',
        profileRemotePreference: 'FULL_REMOTE', // Geo OK
        questContractType: 'FREELANCE',
        profileProfessionalStatus: 'FREELANCE', // Statut OK
        questExperienceLevel: 'MID',
        profileExperienceLevel: 'SENIOR', // Exp OK (supérieur)
        questRequiredSkills: ['React', 'Node'],
        profileSkills: ['React', 'Node', 'TypeScript'] // Skills OK (100%)
      });
      expect(res.isFavorable).toBe(true);
      expect(res.matchFlag).toBe('FAVORABLE_MATCH');
      expect(res.compatibilityScore).toBe(100);
    });

    it('🟢 doit flagger FAVORABLE_MATCH avec un score boosté par les tags SEO communs', async () => {
      const res = await orchestrator.matchmakingEngine({
        questMaxBudgetCents: 50000,
        profileHourlyRateCents: 45000,
        questWorkArrangement: 'FULL_REMOTE',
        profileRemotePreference: 'FULL_REMOTE',
        questContractType: 'FREELANCE',
        profileProfessionalStatus: 'FREELANCE',
        questExperienceLevel: 'MID',
        profileExperienceLevel: 'SENIOR',
        questRequiredSkills: ['React', 'Node'], // 2 requises
        profileSkills: ['React'], // 1/2 = 50% de match de base
        questTags: ['seo', 'startup', 'crypto'],
        profileTags: ['startup', 'crypto'] // 2 tags en commun (+10 points bonus)
      });
      
      expect(res.isFavorable).toBe(true);
      expect(res.matchFlag).toBe('FAVORABLE_MATCH');
      // Score de base : 50%. Bonus tags : +10%. Total attendu : 60
      expect(res.compatibilityScore).toBe(60);
    });

    it('🟢 doit plafonner le score de compatibilité à 100% même avec un gros bonus de tags', async () => {
      const res = await orchestrator.matchmakingEngine({
        questMaxBudgetCents: 50000,
        profileHourlyRateCents: 45000,
        questWorkArrangement: 'FULL_REMOTE',
        profileRemotePreference: 'FULL_REMOTE',
        questContractType: 'FREELANCE',
        profileProfessionalStatus: 'FREELANCE',
        questRequiredSkills: ['React'],
        profileSkills: ['React'], // 100% de match de base
        questTags: ['a', 'b', 'c', 'd', 'e'],
        profileTags: ['a', 'b', 'c', 'd', 'e'] // Bonus maximal (+20)
      });
      
      expect(res.isFavorable).toBe(true);
      expect(res.compatibilityScore).toBe(100); // Ne dépasse pas 100
    });

    it('🔴 doit flagger INSUFFICIENT_EXPERIENCE si l\'Oiseau a un niveau trop bas (RPG logic)', async () => {
      const res = await orchestrator.matchmakingEngine({
        questMaxBudgetCents: 50000,
        profileHourlyRateCents: 40000,
        questWorkArrangement: 'FULL_REMOTE',
        profileRemotePreference: 'FULL_REMOTE',
        questContractType: 'FREELANCE',
        profileProfessionalStatus: 'FREELANCE',
        questExperienceLevel: 'SENIOR', // Exige un senior
        profileExperienceLevel: 'JUNIOR' // Profil Junior
      });
      expect(res.isFavorable).toBe(false);
      expect(res.matchFlag).toBe('INSUFFICIENT_EXPERIENCE');
    });

    it('🔴 doit flagger SKILLS_MISMATCH si l\'Oiseau manque de plus de la moitié des prérequis', async () => {
      const res = await orchestrator.matchmakingEngine({
        questMaxBudgetCents: 50000,
        profileHourlyRateCents: 40000,
        questWorkArrangement: 'FULL_REMOTE',
        profileRemotePreference: 'FULL_REMOTE',
        questContractType: 'FREELANCE',
        profileProfessionalStatus: 'FREELANCE',
        questExperienceLevel: 'MID',
        profileExperienceLevel: 'MID',
        questRequiredSkills: ['React', 'Node', 'Neo4j', 'GraphQL'],
        profileSkills: ['React'] // Il ne matche que 1/4 (25%)
      });
      expect(res.isFavorable).toBe(false);
      expect(res.matchFlag).toBe('SKILLS_MISMATCH');
      expect(res.compatibilityScore).toBe(25);
    });

    it('🟢 doit accepter avec un score partiel (ex: 67%) si l\'Oiseau possède une majorité des skills', async () => {
      const res = await orchestrator.matchmakingEngine({
        questMaxBudgetCents: 50000,
        profileHourlyRateCents: 40000,
        questWorkArrangement: 'FULL_REMOTE',
        profileRemotePreference: 'FULL_REMOTE',
        questContractType: 'FREELANCE',
        profileProfessionalStatus: 'FREELANCE',
        questExperienceLevel: 'MID',
        profileExperienceLevel: 'MID',
        questRequiredSkills: ['React', 'Node', 'Neo4j'], // 3 requises
        profileSkills: ['React', 'Node', 'MongoDB'] // Il en a 2/3 (66.6%)
      });
      expect(res.isFavorable).toBe(true);
      expect(res.matchFlag).toBe('FAVORABLE_MATCH');
      expect(res.compatibilityScore).toBe(67); // Math.round(66.66...)
    });

    it('🔴 doit flagger INCOMPATIBLE_WORK_ARRANGEMENT si le recruteur exige du présentiel et l\'Oiseau du full remote', async () => {
      const res = await orchestrator.matchmakingEngine({
        questMaxBudgetCents: 50000,
        profileHourlyRateCents: 40000, 
        questWorkArrangement: 'ON_SITE', // Mission sur site
        profileRemotePreference: 'FULL_REMOTE', // L'oiseau refuse de se déplacer
        questContractType: 'FREELANCE',
        profileProfessionalStatus: 'FREELANCE'
      });
      expect(res.isFavorable).toBe(false);
      expect(res.matchFlag).toBe('INCOMPATIBLE_WORK_ARRANGEMENT');
    });

    it('🔴 doit flagger INCOMPATIBLE_CONTRACT_TYPE si un freelance refuse un CDI', async () => {
      const res = await orchestrator.matchmakingEngine({
        questMaxBudgetCents: 50000,
        profileHourlyRateCents: 40000,
        questWorkArrangement: 'FULL_REMOTE',
        profileRemotePreference: 'FULL_REMOTE',
        questContractType: 'CDI', // Contrat Salarié
        profileProfessionalStatus: 'FREELANCE' // Profil Indépendant pur
      });
      expect(res.isFavorable).toBe(false);
      expect(res.matchFlag).toBe('INCOMPATIBLE_CONTRACT_TYPE');
    });

    it('🔴 doit flagger OUT_OF_BUDGET si le TJM de l\'Oiseau dépasse le budget de la mission', async () => {
      const res = await orchestrator.matchmakingEngine({
        questMaxBudgetCents: 40000,
        profileHourlyRateCents: 60000, // Trop cher
        questWorkArrangement: 'FULL_REMOTE',
        profileRemotePreference: 'FULL_REMOTE',
        questContractType: 'FREELANCE',
        profileProfessionalStatus: 'FREELANCE'
      });
      expect(res.isFavorable).toBe(false);
      expect(res.matchFlag).toBe('OUT_OF_BUDGET');
    });

    it('🟡 doit retourner MISSING_DATA s\'il manque un champ vital (Budget ou Télétravail)', async () => {
      const res1 = await orchestrator.matchmakingEngine({
        questMaxBudgetCents: 50000,
        profileHourlyRateCents: 40000,
        // Manque le télétravail et les statuts
      });
      
      const res2 = await orchestrator.matchmakingEngine({}); // Objet totalement vide
      
      expect(res1.isFavorable).toBe(false);
      expect(res1.matchFlag).toBe('MISSING_DATA');
      expect(res2.isFavorable).toBe(false);
      expect(res2.matchFlag).toBe('MISSING_DATA');
    });
  });
});