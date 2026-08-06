import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, POST } from '../../app/api/letrin/fonts/route';
import { getServerSession } from 'next-auth/next';

vi.mock('next-auth/next', () => ({
  getServerSession: vi.fn()
}));

const mockLean = vi.fn();
const mockFind = vi.fn().mockImplementation(() => ({
  sort: () => ({ lean: mockLean })
}));
const mockCreate = vi.fn();

vi.mock('@ilot/infrastructure', () => ({
  connectToDatabase: vi.fn().mockResolvedValue(true),
  FontProject: {
    find: (...args: any[]) => mockFind(...args),
    create: (...args: any[]) => mockCreate(...args)
  }
}));

describe('API Letr\'In - Fonts Collection (GET / POST)', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('✅ GET : doit lister les projets Font', async () => {
    mockLean.mockResolvedValueOnce([{ id: 'font_1', name: 'Cyber' }]);
    const res = await GET();
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.data[0].name).toBe('Cyber');
  });

  it('❌ POST : doit rejeter si non connecté (401)', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(null);
    const req = new Request('http://localhost/api/letrin/fonts', { method: 'POST' });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it('✅ POST : doit créer un projet Font si connecté (201)', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({ user: { uid: 'bird_1' } } as any);
    mockCreate.mockResolvedValueOnce({ id: 'font_new', name: 'New Cyber' });
    const req = new Request('http://localhost/api/letrin/fonts', {
      method: 'POST', body: JSON.stringify({ name: 'New Cyber' })
    });
    const res = await POST(req);
    expect(res.status).toBe(201);
  });
});