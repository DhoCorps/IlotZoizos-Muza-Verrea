// packages/types/src/__tests__/message.types.test.ts
import { describe, it, expect } from 'vitest';
import { 
  RawAttachmentPointerSchema, 
  UniversalAttachmentSchema, 
  SendMessageBodySchema 
} from '../models/message.types';

describe('Message Types & Zod Schemas - Validation par Slugs', () => {
  
  it('🟢 doit valider un pointeur d’attachement brut avec slug valide', () => {
    const validPointer = { sourceType: 'LETRIN', entitySlug: 'police-cyberpunk' };
    const result = RawAttachmentPointerSchema.safeParse(validPointer);
    
    expect(result.success).toBe(true);
  });

  it('🔴 doit rejeter un pointeur d’attachement brut sans slug', () => {
    const invalidPointer = { sourceType: 'LETRIN' };
    const result = RawAttachmentPointerSchema.safeParse(invalidPointer);
    
    expect(result.success).toBe(false);
  });

  it('🟢 doit valider un attachement universel résolu complet par slug', () => {
    const validResolved = {
      sourceType: 'SHOP',
      entitySlug: 't-shirt-collector-ilot',
      title: 'T-shirt Collector Îlot',
      subtitle: '42 ₳',
      thumbnailUrl: 'https://ilot.com/img/shirt.png',
      targetRoute: '/le-bordel-de-dho/marketPlace/t-shirt-collector-ilot'
    };
    const result = UniversalAttachmentSchema.safeParse(validResolved);
    
    expect(result.success).toBe(true);
  });

  it('🟢 doit valider le corps complet d’envoi d’un message basé sur les slugs', () => {
    const validPayload = {
      conversationSlug: 'salon-canopee-principale',
      content: 'Regardez cette police par slug !',
      rawAttachments: [
        { sourceType: 'LETRIN', entitySlug: 'police-cyberpunk' }
      ],
      replyToSlug: 'msg-precedent-slug'
    };
    const result = SendMessageBodySchema.safeParse(validPayload);
    
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.conversationSlug).toBe('salon-canopee-principale');
      expect(result.data.rawAttachments[0].entitySlug).toBe('police-cyberpunk');
      expect(result.data.replyToSlug).toBe('msg-precedent-slug');
    }
  });
});