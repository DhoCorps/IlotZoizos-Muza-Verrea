import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, POST } from '../../app/api/projects/route';
import { getServerSession } from 'next-auth/next';

vi.mock('next-auth/next', () => ({ getServerSession: vi.fn() }));

const mockRun = vi.fn();
const mockClose = vi.fn();
vi.mock('@ilot/infrastructure', () => ({
  connectToDatabase: vi.fn().mockResolvedValue(true),
  getNeo4jSession: vi.fn().mockImplementation(() => ({
    run: mockRun,
    close: mockClose
  })),
  ProjectModel: {
    find: vi.fn().mockImplementation(() => ({
      select: vi.fn().mockImplementation(() => ({
        sort: vi.fn().mockImplementation(() => ({
          limit: vi.fn().mockImplementation(() => ({
            lean: vi.fn().mockResolvedValue([{ uid: 'proj_1', name: 'Mon Chantier' }])
          }))
        }))
      }))
    }))
  }
}));

const mockFosterProject = vi.fn();
vi.mock('@ilot/shared-core', () => ({
  ProjectOrchestrator: vi.fn().mockImplementation(() => ({
    fosterProject: mockFosterProject
  }))
}));

describe('API Projects - Collection (/api/projects)', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('🟢 GET : doit lister les chantiers publics ou accessibles', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({ user: { uid: 'bird_1' } } as any);
    mockRun.mockResolvedValueOnce({ records: [{ get: () => 'proj_1' }] });
    
    const req = new Request('http://localhost/api/projects');
    const res = await GET(req);
    const data = await res.json();
    
    expect(res.status).toBe(200);
    expect(data[0].name).toBe('Mon Chantier');
    expect(mockRun).toHaveBeenCalled();
  });

  it('🔴 POST : doit rejeter si capacités insuffisantes (403)', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({ user: { uid: 'bird_1', capabilities: [] } } as any);
    
    const req = new Request('http://localhost/api/projects', { method: 'POST', body: JSON.stringify({}) });
    const res = await POST(req);
    expect(res.status).toBe(403);
  });

  it('🟢 POST : doit fonder le chantier avec succès (201)', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({ user: { uid: 'bird_1', capabilities: ['*'] } } as any);
    mockFosterProject.mockResolvedValueOnce({ uid: 'proj_new', name: 'New' });
    
    const req = new Request('http://localhost/api/projects', { method: 'POST', body: JSON.stringify({ name: 'New' }) });
    const res = await POST(req);
    const data = await res.json();
    
    expect(res.status).toBe(201);
    expect(data.name).toBe('New');
  });
});