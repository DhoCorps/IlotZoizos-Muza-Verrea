// apps/hub-central/__test__/api/users.slug.resonance.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '../../app/api/users/[slug]/resonance/route';
import { getServerSession } from 'next-auth/next';

// ==========================================
// MOCKS DU SANCTUAIRE (Gérés via vi.hoisted)
// ==========================================
const { mockConnectToDatabase, mockProcessUserTaskResonance, mockWeaveResonance, mockSeverResonance, mockFindOne, mockUpdateOne } = vi.hoisted(() => ({
  mockConnectToDatabase: vi.fn().mockResolvedValue(true),
  mockProcessUserTaskResonance: vi.fn(),
  mockWeaveResonance: vi.fn(),
  mockSeverResonance: vi.fn(),
  mockFindOne: vi.fn(),
  mockUpdateOne: vi.fn()
}));

vi.mock('next-auth/next', () => ({
  getServerSession: vi.fn()
}));

// 🪡 SUTURE : Modèles et Base
vi.mock('@ilot/infrastructure', () => ({
  connectToDatabase: mockConnectToDatabase,
  OiseauModel: {
    findOne: vi.fn().mockImplementation(() => ({
      lean: mockFindOne
    })),
    updateOne: mockUpdateOne
  }
}));

// 🪡 SUTURE : Orchestrateurs partagés (ResonanceOrchestrator est statique)
vi.mock('@ilot/shared-core', () => ({
  TaskResonanceOrchestrator: vi.fn().mockImplementation(() => ({
    processUserTaskResonance: mockProcessUserTaskResonance
  })),
  ResonanceOrchestrator: {
    weaveResonance: mockWeaveResonance,
    severResonance: mockSeverResonance
  }
}));

describe('API Users - Résonance par Slug (POST /api/users/[slug]/resonance)', () => {
  const mockParams = { params: Promise.resolve({ slug: 'bird_slug_1' }) };

  beforeEach(() => {
    vi.clearAllMocks();
    mockConnectToDatabase.mockResolvedValue(true);
    mockFindOne.mockResolvedValue({ uid: 'bird_target_uid', slug: 'bird_slug_1' });
    mockUpdateOne.mockResolvedValue(true);
  });

  // ==========================================
  // TESTS HISTORIQUES (CALCUL DE TÂCHES)
  // ==========================================
  describe('Contrôles et Tolérance aux failles (POST - Calcul Historique)', () => {
    
    it('🔴 doit rejeter si l’Oiseau n’est pas connecté (401)', async () => {
      vi.mocked(getServerSession).mockResolvedValue(null);

      const req = new Request('http://localhost/api', { method: 'POST' });
      // Mock d'une requête sans body pour déclencher le flux historique
      req.text = async () => "";

      const res = await POST(req as any, mockParams);
      const data = await res.json();

      expect(res.status).toBe(401);
      expect(data.error).toContain('non identifié');
    });

    it('🔥 doit gérer une rupture de la Silice avec élégance (500)', async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { uid: 'bird_1', capabilities: [] }
      } as any);
      
      mockConnectToDatabase.mockRejectedValueOnce(new Error("Silice brisée"));

      const req = new Request('http://localhost/api', { method: 'POST' });
      req.text = async () => "";
      const res = await POST(req as any, mockParams);
      const data = await res.json();

      expect(res.status).toBe(500);
      expect(data.error).toContain('injoignable');
    });

    it('🔥 doit gérer un rejet fonctionnel de l’orchestrateur de Tâches (400)', async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { uid: 'bird_1', capabilities: [] }
      } as any);

      mockProcessUserTaskResonance.mockRejectedValueOnce({ status: 400, message: "Conflit vibratoire" });

      const req = new Request('http://localhost/api', { method: 'POST' });
      req.text = async () => "";
      const res = await POST(req as any, mockParams);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toContain('Conflit vibratoire');
    });

    it('🟢 doit calculer et renvoyer la résonance des tâches avec succès (200)', async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { uid: 'bird_1', capabilities: ['MEMBER'] }
      } as any);

      mockProcessUserTaskResonance.mockResolvedValueOnce({
        success: true,
        resonanceScore: 85,
        activeNodes: 12,
        echoes: []
      });

      const req = new Request('http://localhost/api', { method: 'POST' });
      req.text = async () => "";
      const res = await POST(req as any, mockParams);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.resonanceScore).toBe(85);
      
      expect(mockProcessUserTaskResonance).toHaveBeenCalledWith('bird_slug_1', {
        actorUid: 'bird_1',
        capabilities: ['MEMBER']
      });
    });
  });

  // ==========================================
  // NOUVEAUX TESTS (ABONNEMENT GRANULAIRE)
  // ==========================================
  describe('Tissage et Rupture (WEAVE / SEVER - Abonnement)', () => {
    
    it('🔴 doit rejeter une tentative de s\'abonner à soi-même (400)', async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { uid: 'bird_slug_1', capabilities: [] }
      } as any);

      const req = new Request('http://localhost/api', { method: 'POST' });
      req.text = async () => JSON.stringify({ action: 'WEAVE', type: 'FOLLOWS_GLOBAL' });

      const res = await POST(req as any, mockParams);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toContain('soi-même');
    });

    it('🟢 doit tisser un abonnement global et incrémenter les compteurs (200)', async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { uid: 'bird_source', capabilities: [] }
      } as any);

      mockWeaveResonance.mockResolvedValueOnce(true); // isHarmonic = true

      const req = new Request('http://localhost/api', { method: 'POST' });
      req.text = async () => JSON.stringify({ action: 'WEAVE', type: 'FOLLOWS_GLOBAL' });

      const res = await POST(req as any, mockParams);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.isHarmonic).toBe(true);
      expect(mockWeaveResonance).toHaveBeenCalledWith({
        sourceUid: 'bird_source',
        targetUid: 'bird_target_uid',
        type: 'FOLLOWS_GLOBAL',
        entityId: undefined
      });
      expect(mockUpdateOne).toHaveBeenCalledTimes(2); // Compteurs
    });

    it('🟢 doit rompre un abonnement granulaire sans toucher aux compteurs (200)', async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { uid: 'bird_source', capabilities: [] }
      } as any);

      mockSeverResonance.mockResolvedValueOnce(undefined);

      const req = new Request('http://localhost/api', { method: 'POST' });
      req.text = async () => JSON.stringify({ action: 'SEVER', type: 'FOLLOWS_SPECIFIC', entityId: 'project_123' });

      const res = await POST(req as any, mockParams);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockSeverResonance).toHaveBeenCalledWith({
        sourceUid: 'bird_source',
        targetUid: 'bird_target_uid',
        type: 'FOLLOWS_SPECIFIC',
        entityId: 'project_123'
      });
      // FOLLOWS_SPECIFIC ne modifie pas les followers globaux
      expect(mockUpdateOne).not.toHaveBeenCalled(); 
    });

  });
});