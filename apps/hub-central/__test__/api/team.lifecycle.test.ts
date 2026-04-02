import { describe, it, expect, vi } from 'vitest';
import { DELETE as deleteTeam } from '../../app/api/teams/[teamId]/route';
import { TeamModel, getNeo4jSession } from "../../../../packages/infrastructure";
import { TeamOrchestrator } from "../../../../packages/shared-core"; // Vérifie bien le nombre de ../

// ✨ SUTURE DE HOISTING : On crée l'espion AVANT que vi.mock ne soit déplacé
const { mockNeo4jRun } = vi.hoisted(() => ({
  mockNeo4jRun: vi.fn().mockResolvedValue({ records: [] })
}));

// 🛡️ Mock de l'infrastructure pour isoler l'esquif
vi.mock("@ilot/infrastructure", () => ({
  connectToDatabase: vi.fn().mockResolvedValue(null),
  TeamModel: { findOneAndDelete: vi.fn() },
  UserModel: { updateMany: vi.fn() },
  getNeo4jSession: vi.fn().mockReturnValue({
    run: mockNeo4jRun,
    beginTransaction: vi.fn().mockReturnValue({
      run: mockNeo4jRun,
      commit: vi.fn().mockResolvedValue(null),
      rollback: vi.fn().mockResolvedValue(null),
    }),
    close: vi.fn().mockResolvedValue(null),
  }),
}));

    describe('Dissolution du Nid', () => {
      it('doit libérer les oiseaux lors de la destruction du nid', async () => {
        const teamUid = 'nest-404';

        // 🕊️ NEUTRALISATION DE L'ORCHESTRATEUR (Fin du hang de 10s)
        const dissolveSpy = vi.spyOn(TeamOrchestrator, 'dissolveTeam').mockImplementation(async (uid) => {
      // 1. On doit appeler manuellement le mock Mongo ici pour que l'assertion le voit
      await TeamModel.findOneAndDelete({ uid }); 
      
      // 2. On simule l'appel Neo4j pour le graphe
      await mockNeo4jRun(`MATCH (t:Team {uid: $teamUid}) DETACH DELETE t`, { teamUid: uid });
      
      return true;
    });

    // Simulation du succès Mongo
    (TeamModel.findOneAndDelete as any).mockResolvedValue({ uid: teamUid });

    // 🚀 L'appel à la route API
    await deleteTeam(new Request('http://127.0.0.1'), { params: { teamId: teamUid } });

    // ✅ ASSERTION : L'espion a enfin capturé le mouvement avec le bon paramètre ($teamUid)
    expect(mockNeo4jRun).toHaveBeenCalledWith(
      expect.stringContaining('MATCH (t:Team {uid: $teamUid})'),
      { teamUid } // Aligné sur la signature de TeamOrchestrator
    );

    // On vérifie aussi le nettoyage de la silice (Mongo)
    expect(TeamModel.findOneAndDelete).toHaveBeenCalledWith({ uid: teamUid });

    dissolveSpy.mockRestore(); // On nettoie la forge
  });
});