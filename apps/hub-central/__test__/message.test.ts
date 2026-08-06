// apps/hub-central/__test__/api/messages.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST, GET } from '../app/api/messages/route';
import { getServerSession } from 'next-auth/next';
import { NextRequest } from 'next/server';
import { MessageModel } from '@ilot/infrastructure';
import { attachmentRegistry } from '@ilot/shared-core';

vi.mock('next-auth/next', () => ({ getServerSession: vi.fn() }));
vi.mock('@ilot/infrastructure', () => ({
  connectToDatabase: vi.fn().mockResolvedValue(true),
  MessageModel: {
    find: vi.fn(),
    create: vi.fn()
  }
}));

vi.spyOn(attachmentRegistry, 'resolve').mockImplementation(async (sourceType, entitySlug) => ({
  sourceType,
  entitySlug,
  title: `Création Test ${entitySlug}`,
  targetRoute: `/test/${entitySlug}`
}));

describe('API Messages - Messagerie Universelle par Slugs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('🔴 doit rejeter l’envoi si l’oiseau n’est pas connecté (401)', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(null);
    const req = new NextRequest('http://localhost/api/messages', { method: 'POST', body: JSON.stringify({}) });
    
    const res = await POST(req as any);
    expect(res.status).toBe(401);
  });

  it('🔴 doit rejeter un message entièrement vide (400)', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({ user: { slug: 'bird-test-slug' } } as any);
    
    const payload = {
      conversationSlug: 'salon-1-slug',
      content: '   ',
      rawAttachments: []
    };

    const req = new NextRequest('http://localhost/api/messages', { 
      method: 'POST', 
      body: JSON.stringify(payload) 
    });

    const res = await POST(req as any);
    expect(res.status).toBe(400);
  });

  it('🟢 doit créer un message par slug avec succès (201)', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({ user: { slug: 'bird-test-slug' } } as any);
    
    const mockCreatedMessage = {
      slug: 'msg_mock_1',
      conversationSlug: 'salon-1-slug',
      senderSlug: 'bird-test-slug',
      content: 'Regardez ceci !',
      attachments: [{ sourceType: 'LETRIN', entitySlug: 'font-1-slug', title: 'Création Test font-1-slug', targetRoute: '/test/font-1-slug' }]
    };

    vi.mocked(MessageModel.create).mockResolvedValueOnce(mockCreatedMessage as any);

    const payload = {
      conversationSlug: 'salon-1-slug',
      content: 'Regardez ceci !',
      rawAttachments: [{ sourceType: 'LETRIN', entitySlug: 'font-1-slug' }]
    };

    const req = new NextRequest('http://localhost/api/messages', { 
      method: 'POST', 
      body: JSON.stringify(payload) 
    });

    const res = await POST(req as any);
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(data.success).toBe(true);
    expect(data.message.conversationSlug).toBe('salon-1-slug');
    expect(data.message.attachments[0].entitySlug).toBe('font-1-slug');
  });

  it('🟢 doit récupérer l’historique par conversationSlug (GET)', async () => {
    const mockMessages = [{ slug: 'msg_1', content: 'Bonjour par slug' }];
    const mockQuery = {
      sort: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValueOnce(mockMessages)
    };
    vi.mocked(MessageModel.find).mockReturnValueOnce(mockQuery as any);

    const req = new NextRequest('http://localhost/api/messages?conversationSlug=salon-1-slug&limit=10', { method: 'GET' });
    const res = await GET(req as any);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toHaveLength(1);
    expect(MessageModel.find).toHaveBeenCalledWith({ conversationSlug: 'salon-1-slug' });
  });

  it('🔴 doit rejeter la récupération GET si le conversationSlug est manquant (400)', async () => {
    const req = new NextRequest('http://localhost/api/messages', { method: 'GET' });
    const res = await GET(req as any);

    expect(res.status).toBe(400);
  });
});