import { describe, it, expect, vi } from 'vitest';
import { DELETE as deleteTeam } from '../../app/api/teams/[teamId]/route';
import { TeamModel, getNeo4jSession } from "@ilot/infrastructure";

// 🛡️ On transforme l'infrastructure en "doublure" pour le test
vi.mock("@ilot/infrastructure", () => ({
  connectToDatabase: vi.fn(),
  TeamModel: {
    findOneAndDelete: vi.fn(),
  },
  getNeo4jSession: vi.fn().mockReturnValue({
    run: vi.fn().mockResolvedValue({}), // Voici notre "Spy"
    close: vi.fn(),
  }),
}));

describe('Dissolution du Nid', () => {
  it('doit libérer les oiseaux lors de la destruction du nid', async () => {
    const teamUid = 'nest-404';
    const session = getNeo4jSession();

    // On simule la suppression Mongo
    (TeamModel.findOneAndDelete as any).mockResolvedValue({ uid: teamUid });

    await deleteTeam(new Request('http://l'), { params: { teamId: teamUid } });

    // ✅ Maintenant session.run est un espion, l'assertion va passer
    expect(session.run).toHaveBeenCalledWith(
      'MATCH (t:Team {uid: $uid}) DETACH DELETE t',
      { uid: teamUid }
    );
    expect(TeamModel.findOneAndDelete).toHaveBeenCalledWith({ uid: teamUid });
  });
});