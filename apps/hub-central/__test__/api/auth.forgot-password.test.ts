import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '../../app/api/auth/forgot-password/route';

// Mock de Mongoose et Resend
const mockSave = vi.fn().mockResolvedValue(true);
const mockFindOne = vi.fn();

vi.mock('@ilot/infrastructure', () => ({
  connectToDatabase: vi.fn().mockResolvedValue(true),
  OiseauModel: {
    findOne: (...args: any[]) => mockFindOne(...args)
  }
}));

vi.mock('resend', () => ({
  Resend: vi.fn().mockImplementation(() => ({
    emails: {
      send: vi.fn().mockResolvedValue({ data: { id: 'email-mock-id' }, error: null })
    }
  }))
}));

describe('API Auth - Mot de Passe Oublié (POST /api/auth/forgot-password)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.RESEND_API_KEY = 're_test_key_123';
  });

  it('✅ doit envoyer un email de réinitialisation si l’Oiseau existe', async () => {
    mockFindOne.mockResolvedValueOnce({
      email: 'perdu@ilot.com',
      save: mockSave
    });

    const req = new Request('http://localhost:3000/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'perdu@ilot.com' })
    });

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(mockSave).toHaveBeenCalled();
  });

  it('🛡️ doit répondre un succès neutre même si l’Oiseau n’existe pas (Sécurité anti-énumération)', async () => {
    mockFindOne.mockResolvedValueOnce(null); // Aucun utilisateur trouvé

    const req = new Request('http://localhost:3000/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'inconnu@ilot.com' })
    });

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(mockSave).not.toHaveBeenCalled();
  });

  it('❌ doit rejeter un format d’email invalide via Zod', async () => {
    const req = new Request('http://localhost:3000/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'ce-n-est-pas-un-email' })
    });

    const response = await POST(req);
    expect(response.status).toBe(400);
  });
});