// apps/hub-central/__test__/api/tasks.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getServerSession } from "next-auth/next";
import { TaskOrchestrator } from '@ilot/shared-core/src/sync-engine/task.orchestrator';
import { ProjectModel } from '@ilot/infrastructure/src/database/models/nosql/project.model';
// 🪡 HARMONISATION DE L'AIGUILLAGE : On cible la route dynamique spécifique que tu m'as fournie
import { POST } from '../../app/api/tasks/[taskId]/route';
import { CAPABILITIES } from '@ilot/types';

// 🛡️ HOISTED MOCKS : Preparation du Graphe et de la Silice
const { mockNeo4jRunTask, mockFosterTask } = vi.hoisted(() => ({
  mockNeo4jRunTask: vi.fn(),
  // 🪡 SUTURE VITEST : Déclaration hoisted de la fonction de forge pour immuniser l'espionnage
  mockFosterTask: vi.fn().mockResolvedValue({ uid: 'task-999', status: 'success' })
}));

// Mock de la session NextAuth
vi.mock("next-auth/next", () => ({ 
  getServerSession: vi.fn() 
}));

// 🛡️ SUTURE : Mock de authOptions pour empecher les fuites au chargement de la route
vi.mock('../../lib/auth', () => ({
  authOptions: {}
}));

// Mock du Graphe (Neo4j)
vi.mock('@ilot/infrastructure/src/database/neo4j', () => ({
  getNeo4jSession: vi.fn().mockReturnValue({
    run: mockNeo4jRunTask,
    close: vi.fn().mockResolvedValue(undefined)
  })
}));

// Mock de la connexion Mongoose
vi.mock("@ilot/infrastructure", () => ({
  connectToDatabase: vi.fn().mockResolvedValue({}),
}));

// Mock du Modele Project (pour eviter le buffering timeout)
vi.mock('@ilot/infrastructure/src/database/models/nosql/project.model', () => ({
  ProjectModel: {
    findOne: vi.fn()
  }
}));

// 🛡️ SUTURE : Isolation complete du modele Task pour immuniser l'evaluation du module
vi.mock('@ilot/infrastructure/src/database/models/nosql/task.model', () => ({
  TaskModel: {
    find: vi.fn(),
    findOne: vi.fn(),
    create: vi.fn(),
    deleteMany: vi.fn()
  }
}));

// 🪡 SUTURE DU DEUXIÈME ARGUMENT : Mock avec intégration de notre fonction hoisted pour tuer le bogue du prototype
vi.mock("@ilot/shared-core/src/sync-engine/task.orchestrator", () => ({
  TaskOrchestrator: vi.fn().mockImplementation(() => ({
    fosterTask: mockFosterTask,
    updateTask: vi.fn(),
    disintegrateTask: vi.fn()
  }))
}));

describe("API Tasks - Route de Fondation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Simulation de l'Aura dans le Graphe
    mockNeo4jRunTask.mockResolvedValue({
      records: [{ get: () => [CAPABILITIES.TASK.CREATE] }]
    });

    // 🛡️ SUTURE : Simulation d'un Chantier trouve dans la Silice
    vi.mocked(ProjectModel.findOne).mockReturnValue({
      lean: vi.fn().mockResolvedValue({ 
        uid: 'proj-123', 
        ownerUid: 'bird-111' 
      })
    } as any);
  });

  it("✅ POST doit fonder un Atome (201) si l'Aura est alignee", async () => {
    // 🛡️ SUTURE : Simulation d'un Oiseau connecte avec son UID
    vi.mocked(getServerSession).mockResolvedValue({ 
      user: { 
        uid: 'bird-111',
        capabilities: [CAPABILITIES.TASK.CREATE]
      } 
    } as any);

    // 🪡 HARMONISATION DU PAYLOAD : On injecte le protocole Matrioshka 'CREATE_SUBTASK' lu par ton fichier route.ts
    const req = new Request('http://localhost/api/tasks/task-123', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        action: 'CREATE_SUBTASK',
        data: {
          projectUid: 'proj-123', 
          title: 'Suture de Paix'
        }
      })
    });

    // 🪡 HARMONISATION DE L'APPEL : Passage du contexte Next.js dynamique ({ params }) exigé par la signature
    const response = await POST(req, { params: { taskId: 'task-123' } });

    // 🏆 VERIFICATIONS
    expect(response.status).toBe(201);
    expect(mockFosterTask).toHaveBeenCalled();
  });
});