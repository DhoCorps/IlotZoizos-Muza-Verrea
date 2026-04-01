import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PUT, DELETE } from '../../app/api/users/[userId]/route';
import { UserModel, getNeo4jSession } from "@ilot/infrastructure";

vi.mock("@ilot/infrastructure", () => ({
  connectToDatabase: vi.fn(),
  UserModel: {
    findOneAndUpdate: vi.fn(),
    findOneAndDelete: vi.fn(),
  },
  getNeo4jSession: vi.fn().mockReturnValue({
    run: vi.fn(),
    close: vi.fn(),
  }),
}));

describe('Cycle de Vie de l’Oiseau (CRUD)', () => {
  const mockUid = 'bird-999';

  it('doit muter la signature de l’oiseau (PUT)', async () => {
    const updateData = { signature: '>:)>>' };
      (UserModel.findOneAndUpdate as any).mockReturnValue({
      select: vi.fn().mockResolvedValue({ uid: mockUid, signature: '>:)>>' })
      });
    const req = new Request(`http://l/api/users/${mockUid}`, {
      method: 'PUT',
      body: JSON.stringify(updateData),
    });

    const res = await PUT(req, { params: { userId: mockUid } });
    const data = await res.json();

    expect(UserModel.findOneAndUpdate).toHaveBeenCalledWith(
      { uid: mockUid },
      { $set: updateData },
      expect.anything()
    );
    expect(data.signature).toBe('>:)>>');
  });

  it('doit effacer l’oiseau de la Silice et du Graphe (DELETE)', async () => {
    const session = getNeo4jSession();
    (UserModel.findOneAndDelete as any).mockResolvedValue({ uid: mockUid });

    const res = await DELETE(new Request('http://l'), { params: { userId: mockUid } });
    
    // Vérification MongoDB
    expect(UserModel.findOneAndDelete).toHaveBeenCalledWith({ uid: mockUid });
    // Vérification Neo4j (DETACH DELETE)
    expect(session.run).toHaveBeenCalledWith(
      expect.stringContaining('DETACH DELETE u'),
      { uid: mockUid }
    );
    const data = await res.json();
      expect(data.message).toMatch(/quitté le Nexus/);
  });
});