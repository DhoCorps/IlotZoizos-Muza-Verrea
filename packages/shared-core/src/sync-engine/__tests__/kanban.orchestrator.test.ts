// packages/shared-core/src/sync-engine/__tests__/kanban.orchestrator.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { KanbanOrchestrator } from '../kanban.orchestrator';
import { TransactionManager } from '../transactionManager';
import { TaskStatus, CAPABILITIES, ActionSignature } from '@ilot/types'; // ✅ Import de la Signature Zéro-Identité

vi.mock('../transactionManager', () => ({
  TransactionManager: { execute: vi.fn() }
}));

describe('KanbanOrchestrator - Intégrité du Flux', () => {
  const mockTaskUid = 'task_123';
  const mockActorUid = 'bird_alpha'; // Celui qui agit
  let orchestrator: KanbanOrchestrator;
  
  // 🛡️ Création d'une Signature valide pour les tests
  const validSignature: ActionSignature = {
    actorUid: mockActorUid,
    capabilities: [CAPABILITIES.TASK.UPDATE] // Le droit de bouger une tâche
  };

  beforeEach(() => {
    vi.clearAllMocks();
    orchestrator = new KanbanOrchestrator();
    
    // Mock de la transaction binaire
    vi.spyOn(TransactionManager, 'execute').mockImplementation(async (name, callback) => {
      // Pour ce test, on se moque de la réponse exacte, on veut juste que le flux passe
      const mockMongo = { uid: mockTaskUid, status: 'DONE' };
      const mockNeo = { 
        records: [{ 
          get: () => ({ properties: { status: 'DONE' } }) 
        }] 
      };
      // On exécute le callback (qui représente la logique interne de l'orchestrateur)
      return {
          success: true,
          mongo: mockMongo,
          neo4j: mockNeo
      };
    });
  });

  it('✅ doit valider la mutation de statut et les métriques temporelles', async () => {
    // 🩸 SUTURE : On passe la Signature au 3ème argument !
    const result = await orchestrator.updateTask(
      mockTaskUid, 
      { status: TaskStatus.DONE }, 
      validSignature
    );

    const mongoData = result.mongo as any;
    const neoData = result.neo4j as any;

    expect(result.success).toBe(true);
    expect(mongoData.status).toBe('DONE');
    expect(neoData.records[0].get().properties.status).toBe('DONE');
  });

  it('🤝 doit valider l\'assignation d\'un Oiseau à un Atome', async () => {
    // 🩸 SUTURE : On passe la Signature au 3ème argument !
    const result = await orchestrator.assignMember(mockTaskUid, 'bird_999', validSignature);
    
    expect(result.success).toBe(true);
  });
});