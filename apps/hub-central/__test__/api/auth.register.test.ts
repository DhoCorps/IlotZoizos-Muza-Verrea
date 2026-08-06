import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '../../app/api/auth/register/route';

// Mock des dépendances d'infrastructure et du shared-core
vi.mock('@ilot/infrastructure', () => ({
  connectToDatabase: vi.fn().mockResolvedValue(true),
}));

vi.mock('@ilot/shared-core', () => ({
  OiseauOrchestrator: vi.fn().mockImplementation(() => ({
    fosterOiseau: vi.fn().mockImplementation(async (data) => {
      if (data.email === 'deja.pris@ilot.com') {
        const err: any = new Error('Cet oiseau résonne déjà sur l\'Îlot.');
        err.statusCode = 409;
        throw err;
      }
      return {
        mongo: {
          uid: 'oiseau-uid-123',
          pseudo: data.pseudo,
          frequenceHEX: data.frequenceHEX,
        }
      };
    })
  }))
}));

describe('API Auth - Inscription (POST /api/auth/register)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('✅ doit réussir à faire éclore un nouvel Oiseau avec des données valides', async () => {
    const req = new Request('http://localhost:3000/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'nouvel.oiseau@ilot.com',
        password: 'secretPassword123',
        pseudo: 'ChanteurLibre',
        frequenceHEX: '#38BDF8'
      })
    });

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.message).toBe("L'oiseau a rejoint l'Îlot !");
    expect(data.oiseau.uid).toBe('oiseau-uid-123');
    expect(data.oiseau.pseudo).toBe('ChanteurLibre');
  });

  it('❌ doit rejeter l’onde si des informations requises sont manquantes', async () => {
    const req = new Request('http://localhost:3000/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'incomplet@ilot.com'
        // Mot de passe et pseudo absents
      })
    });

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.message).toContain('incomplète');
  });

  it('❌ doit rejeter l’inscription si l’email est déjà pris (Conflit)', async () => {
    const req = new Request('http://localhost:3000/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'deja.pris@ilot.com',
        password: 'password123',
        pseudo: 'VieuxHibou'
      })
    });

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(409);
    expect(data.message).toContain('déjà');
  });
});