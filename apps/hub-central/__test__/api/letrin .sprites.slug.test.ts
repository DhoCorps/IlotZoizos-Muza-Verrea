import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, PUT, DELETE } from '../../app/api/letrin/sprites/[slug]/route';
import { getServerSession } from 'next-auth/next';

vi.mock('next-auth/next', () => ({ getServerSession: vi.fn() }));

const mockFindOneLean = vi.fn();
const mockFindOneAndUpdateLean = vi.fn();
const mockFindOneAndDelete = vi.fn();

vi.mock('@ilot/infrastructure', () => ({
  connectToDatabase: vi.fn().mockResolvedValue(true),
  LetterSpriteModel: {
    findOne: vi.fn().mockImplementation(() => ({ lean: mockFindOneLean })),
    findOneAndUpdate: vi.fn().mockImplementation(() => ({ lean: mockFindOneAndUpdateLean })),
    findOneAndDelete: (...args: any[]) => mockFindOneAndDelete(...args)
  }
}));

describe('API Letr\'In - Sprites par Slug (GET / PUT / DELETE)', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('✅ GET : doit trouver la police par slug (200)', async () => {
    mockFindOneLean.mockResolvedValueOnce({ slug: 'matrix-font' });
    const req = new Request('http://localhost/api');
    const res = await GET(req, { params: Promise.resolve({ slug: 'matrix-font' }) });
    expect(res.status).toBe(200);
  });

  it('✅ PUT : doit mettre à jour la police (200)', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({ user: { uid: 'bird_1' } } as any);
    mockFindOneAndUpdateLean.mockResolvedValueOnce({ slug: 'matrix-font', updated: true });
    
    const req = new Request('http://localhost/api', { method: 'PUT', body: JSON.stringify({}) });
    const res = await PUT(req, { params: Promise.resolve({ slug: 'matrix-font' }) });
    expect(res.status).toBe(200);
  });

  it('✅ DELETE : doit dissoudre la police (200)', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({ user: { uid: 'bird_1' } } as any);
    mockFindOneAndDelete.mockResolvedValueOnce(true);
    
    const req = new Request('http://localhost/api', { method: 'DELETE' });
    const res = await DELETE(req, { params: Promise.resolve({ slug: 'matrix-font' }) });
    expect(res.status).toBe(200);
  });
});