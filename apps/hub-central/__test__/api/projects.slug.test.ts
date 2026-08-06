import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, PUT, DELETE } from '../../app/api/projects/[slug]/route';
import { getServerSession } from 'next-auth/next';

vi.mock('next-auth/next', () => ({ getServerSession: vi.fn() }));

const mockRun = vi.fn().mockResolvedValue({ records: [{ get: () => [['project:update']] }] });
const mockClose = vi.fn();
const mockFindOneLean = vi.fn();

vi.mock('@ilot/infrastructure', () => ({
  connectToDatabase: vi.fn().mockResolvedValue(true),
  getNeo4jSession: vi.fn().mockImplementation(() => ({ run: mockRun, close: mockClose })),
  ProjectModel: {
    findOne: vi.fn().mockImplementation(() => ({
      select: vi.fn().mockImplementation(() => ({
        lean: mockFindOneLean
      })),
      lean: mockFindOneLean
    }))
  }
}));

const mockMutateProject = vi.fn();
const mockDissolveProject = vi.fn();
vi.mock('@ilot/shared-core', () => ({
  ProjectOrchestrator: vi.fn().mockImplementation(() => ({
    mutateProject: mockMutateProject,
    dissolveProject: mockDissolveProject
  }))
}));

describe('API Projects - Par ID (/api/projects/[projectId])', () => {
  const mockParams = { params: Promise.resolve({ projectId: 'proj_1' }) };

  beforeEach(() => { vi.clearAllMocks(); });

  it('🟢 GET : doit récupérer le chantier public (200)', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(null);
    mockFindOneLean.mockResolvedValueOnce({ uid: 'proj_1', visibility: 'PUBLIC' });
    
    const req = new Request('http://localhost/api');
    const res = await GET(req, mockParams);
    expect(res.status).toBe(200);
  });

  it('🔴 PUT : doit rejeter si l\'oiseau n\'est pas connecté (401)', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(null);
    
    const req = new Request('http://localhost/api', { method: 'PUT', body: JSON.stringify({}) });
    const res = await PUT(req, mockParams);
    expect(res.status).toBe(401);
  });

  it('🟢 PUT : doit muter le chantier avec succès (200)', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({ user: { uid: 'bird_1', capabilities: ['*'] } } as any);
    mockMutateProject.mockResolvedValueOnce({ uid: 'proj_1', name: 'Updated' });
    
    const req = new Request('http://localhost/api', { method: 'PUT', body: JSON.stringify({ name: 'Updated' }) });
    const res = await PUT(req, mockParams);
    expect(res.status).toBe(200);
  });

  it('🟢 DELETE : doit dissoudre le chantier avec succès (200)', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({ user: { uid: 'bird_1', capabilities: ['*'] } } as any);
    mockDissolveProject.mockResolvedValueOnce(true);
    
    const req = new Request('http://localhost/api', { method: 'DELETE' });
    const res = await DELETE(req, mockParams);
    expect(res.status).toBe(200);
  });
});