import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '../../app/api/messages/route';
import { MessageModel, OiseauModel } from '@ilot/infrastructure';
import { SendMessageBodySchema } from '@ilot/types';

// Mock global de l'infrastructure
vi.mock('@ilot/infrastructure', () => ({
    MessageModel: {
        create: vi.fn(),
        find: vi.fn().mockReturnValue({
            sort: vi.fn().mockReturnValue({
                limit: vi.fn().mockReturnValue({
                    lean: vi.fn().mockResolvedValue([]),
                }),
            }),
        }),
    },
    OiseauModel: {
        findOne: vi.fn().mockReturnValue({
            lean: vi.fn().mockResolvedValue(null),
        }),
    },
}));

// Mock du registre d'attachements
vi.mock('@ilot/shared-core', () => ({
    attachmentRegistry: {
        resolve: vi.fn().mockResolvedValue({ type: 'mock', url: 'mock' })
    }
}));

// Mock du validateur Zod
vi.mock('@ilot/types', () => ({
    SendMessageBodySchema: {
        safeParse: vi.fn(),
    }
}));

// Mock des gardiens d'API (`withAura`)
let mockCurrentUser = { uid: 'bird_clean_1', slug: 'bird_clean_1', capabilities: ['*'] };
vi.mock('@/lib/api-guards', () => ({
    withAura: (handler: any) => {
        return async (req: Request, context: any) => {
            return await handler(req, context, mockCurrentUser);
        };
    },
    withOptionalAura: (handler: any) => handler,
}));

vi.mock('next/cache', () => ({
    revalidateTag: vi.fn(),
    unstable_cache: (fn: any) => fn,
}));

describe('POST /api/messages (Douane Vibratoire de la Messagerie)', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        delete (global as any).__mockUser;
        mockCurrentUser = { uid: 'bird_clean_1', slug: 'bird_clean_1', capabilities: ['*'] };
    });

    it('🔴 doit rejeter avec une erreur 403 si l oiseau est classé INDESIRABLE ou banni', async () => {
        vi.mocked(OiseauModel.findOne).mockReturnValueOnce({
            lean: vi.fn().mockResolvedValueOnce({
                uid: 'bird_clean_1',
                profileStatus: 'INDESIRABLE',
                isBanned: false,
            })
        } as any);

        vi.mocked(SendMessageBodySchema.safeParse).mockReturnValueOnce({
            success: true,
            data: { conversationSlug: 'general', content: 'Message toxique', rawAttachments: [], replyToSlug: null }
        } as any);

        const req = new Request('http://localhost/api/messages', {
            method: 'POST',
            body: JSON.stringify({ conversationSlug: 'general', content: 'Message toxique' }),
            headers: { 'Content-Type': 'application/json' }
        }) as unknown as import('next/server').NextRequest;

        const response = await POST(req, { params: {} } as any);
        const json = await response.json();

        expect(response.status).toBe(403);
        expect(json.error).toContain('Souveraineté restreinte');
        expect(MessageModel.create).not.toHaveBeenCalled();
    });

    it('🟢 doit autoriser la propagation du message si l oiseau est respectueux ou neutre', async () => {
        vi.mocked(OiseauModel.findOne).mockReturnValueOnce({
            lean: vi.fn().mockResolvedValueOnce({
                uid: 'bird_clean_1',
                profileStatus: 'RESPECTABLE',
                isBanned: false,
            })
        } as any);

        vi.mocked(SendMessageBodySchema.safeParse).mockReturnValueOnce({
            success: true,
            data: { conversationSlug: 'general', content: 'Chant synaptique de test', rawAttachments: [], replyToSlug: null }
        } as any);

        vi.mocked(MessageModel.create).mockResolvedValueOnce({
            slug: 'msg_123',
            content: 'Chant synaptique de test',
            conversationSlug: 'general'
        } as any);

        const req = new Request('http://localhost/api/messages', {
            method: 'POST',
            body: JSON.stringify({ conversationSlug: 'general', content: 'Chant synaptique de test' }),
            headers: { 'Content-Type': 'application/json' }
        }) as unknown as import('next/server').NextRequest;

        const response = await POST(req, { params: {} } as any);
        const json = await response.json();

        expect(response.status).toBe(201);
        expect(json.success).toBe(true);
        expect(json.message).toHaveProperty('slug', 'msg_123');
        expect(MessageModel.create).toHaveBeenCalledTimes(1);
    });
});