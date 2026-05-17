import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getServerSession } from "next-auth/next";
import { TeamOrchestrator } from "@ilot/shared-core/src/sync-engine/team.orchestrator"; 
import { CAPABILITIES } from '@ilot/types';
import { DELETE as deleteTeam } from '../../app/api/teams/[teamId]/route';

const { mockNeo4jRunTeam } = vi.hoisted(() => ({
  mockNeo4jRunTeam: vi.fn()
}));

vi.mock("next-auth/next", () => ({ getServerSession: vi.fn() }));

vi.mock('@ilot/infrastructure/src/database/neo4j', () => ({
  getNeo4jSession: vi.fn().mockReturnValue({
    run: mockNeo4jRunTeam,
    close: vi.fn().mockResolvedValue(undefined)
  })
}));

vi.mock("@ilot/shared-core/src/sync-engine/team.orchestrator");

describe('API Teams - Dissolution du Nid', () => {
  const mockBirdUid = 'bird-alpha-001';
  const teamUid = 'nest-404';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('✅ doit transmettre la dissolution à l\'Orchestrateur avec la Signature si autorisé', async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { uid: mockBirdUid } } as any);

    mockNeo4jRunTeam.mockResolvedValue({
      records: [{ get: () => [CAPABILITIES.TEAM.DELETE] }]
    });

    const dissolveTeamSpy = vi.spyOn(TeamOrchestrator.prototype, 'dissolveTeam')
      .mockResolvedValue({ success: true } as any);

    const req = new Request(`http://localhost/api/teams/${teamUid}`, { method: 'DELETE' });
    const response = await deleteTeam(req, { params: { teamId: teamUid } });
    
    expect(response.status).toBe(200);
    expect(dissolveTeamSpy).toHaveBeenCalledWith(
      teamUid, 
      expect.objectContaining({ actorUid: mockBirdUid }) 
    );
  });
});