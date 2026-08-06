import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, POST } from '../../app/api/kontakt/templates/route';
import { getServerSession } from 'next-auth/next';

vi.mock('next-auth/next', () => ({
  getServerSession: vi.fn()
}));

const mockLean = vi.fn();
const mockFind = vi.fn().mockImplementation(() => ({
  sort: () => ({
    lean: mockLean
  })
}));
const mockCreate = vi.fn();

vi.mock('@ilot/infrastructure', () => ({
  connectToDatabase: vi.fn().mockResolvedValue(true),
  CVTemplateModel: {
    find: (...args: any[]) => mockFind(...args),
    create: (...args: any[]) => mockCreate(...args)
  }
}));

describe('API Kontakt - Templates CV (GET / POST /api/kontakt/templates)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('✅ GET : doit lister les modèles de CV', async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);
    mockLean.mockResolvedValueOnce([{ uid: 'tmpl_1', title: 'Parchemin Cyber' }]);

    const req = new Request('http://localhost:3000/api/kontakt/templates');
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.length).toBe(1);
    expect(data.data[0].title).toBe('Parchemin Cyber');
  });

  it('❌ POST : doit rejeter si l’oiseau n’est pas connecté (401)', async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);

    const req = new Request('http://localhost:3000/api/kontakt/templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Nouveau Modèle' })
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it('✅ POST : doit créer un modèle de CV avec succès (201)', async () => {
    // 🪡 On définit explicitement une session valide pour ce test précis
    vi.mocked(getServerSession).mockResolvedValue({
      user: { uid: 'bird_designer', name: 'Scribe' }
    } as any);

    mockCreate.mockResolvedValueOnce({
      uid: 'tmpl_new',
      title: 'Nouveau Modèle',
      authorUid: 'bird_designer',
      blocks: []
    });

    const req = new Request('http://localhost:3000/api/kontakt/templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Nouveau Modèle', blocks: [] })
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(data.success).toBe(true);
    expect(data.data.title).toBe('Nouveau Modèle');
    expect(mockCreate).toHaveBeenCalled();
  });
});