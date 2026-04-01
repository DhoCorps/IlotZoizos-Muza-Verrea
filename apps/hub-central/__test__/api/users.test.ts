import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '../../app/api/users/route';
import { UserModel } from "@ilot/infrastructure";
import { NextResponse } from 'next/server';

// 1. On définit l'objet qui représente la requête Mongoose (le Query)
const mockQuery = {
  select: vi.fn().mockReturnThis(),
  sort: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  lean: vi.fn(), // C'est ici que réside la réponse finale
};

// 2. On configure le mock du modèle pour renvoyer cet objet
vi.mock("@ilot/infrastructure", () => ({
  connectToDatabase: vi.fn(),
  UserModel: {
    find: vi.fn(() => mockQuery), // .find() renvoie maintenant notre objet Query
  },
}));

describe('API Users - Recensement', () => {
  it('doit filtrer les oiseaux par grade', async () => {
    const mockUsers = [{ username: 'OiseauDeFer', role: 'BATISSEUR' }];
    
    // 3. On définit la valeur de retour sur la fin de la chaîne (lean)
    (mockQuery.lean as any).mockResolvedValue(mockUsers);

    const req = new Request('http://localhost:3000/api/users?role=BATISSEUR');
    const response = await GET(req);
    const data = await response.json();

    // Vérification de l'appel initial
    expect(UserModel.find).toHaveBeenCalled();
    expect(data[0].username).toBe('OiseauDeFer');
  });
});