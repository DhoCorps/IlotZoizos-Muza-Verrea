import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '../../app/api/auth/reset-password/route';

const mockFindOneAndUpdate = vi.fn();

vi.mock('@ilot/infrastructure', () => ({
  connectToDatabase: vi.fn().mockResolvedValue(true),
  OiseauModel: {
    findOneAndUpdate: (...args: any[]) => mockFindOneAndUpdate(...args)
  }
}));

vi.mock('bcryptjs', () => ({
  default: {
    hash: vi.fn().mockResolvedValue('hashed_new_password_secure')
  }
}));

describe('API Auth - Réinitialisation du Mot de Passe (POST /api/auth/reset-password)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('✅ doit sceller un nouveau mot de passe si le token est valide', async () => {
    mockFindOneAndUpdate.mockResolvedValueOnce({
      email: 'oiseau@ilot.com'
    });

    const req = new Request('http://localhost:3000/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: 'valid_token_abc123',
        password: 'NewSecurePassword1!',
        confirmPassword: 'NewSecurePassword1!'
      })
    });

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(mockFindOneAndUpdate).toHaveBeenCalled();
  });

  it('❌ doit rejeter la réinitialisation si le token est expiré ou invalide', async () => {
    mockFindOneAndUpdate.mockResolvedValueOnce(null); // Aucun utilisateur trouvé avec ce token actif

    const req = new Request('http://localhost:3000/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: 'expired_token',
        password: 'NewSecurePassword1!',
        confirmPassword: 'NewSecurePassword1!'
      })
    });

    const response = await POST(req);
    expect(response.status).toBe(400);
  });
});