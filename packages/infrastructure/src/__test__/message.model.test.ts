// packages/infrastructure/src/database/models/__tests__/message.model.test.ts
import { describe, it, expect } from 'vitest';
import { MessageModel } from '../database/models/nosql/message.model';

describe('MessageModel - Silice Schéma Validation (Slugs)', () => {
  
  it('🟢 doit instancier un modèle de message avec les slugs valides', () => {
    const messageData = {
      slug: 'msg-test-123',
      conversationSlug: 'salon-alpha-slug',
      senderSlug: 'bird-owner-slug',
      content: 'Voici une création partagée par slug !',
      attachments: [
        {
          sourceType: 'LETRIN',
          entitySlug: 'police-cyber-slug',
          title: 'Police Cyberpunk',
          targetRoute: '/letrin/fonts/police-cyber-slug'
        }
      ]
    };

    const message = new MessageModel(messageData);
    const validationError = message.validateSync();

    expect(validationError).toBeUndefined();
    expect(message.slug).toBe('msg-test-123');
    expect(message.conversationSlug).toBe('salon-alpha-slug');
    expect(message.attachments[0].entitySlug).toBe('police-cyber-slug');
  });

  it('🔴 doit rejeter un message sans slug ou conversationSlug', () => {
    const invalidMessage = new MessageModel({
      content: 'Message orphelin'
    });

    const validationError = invalidMessage.validateSync();
    expect(validationError).toBeDefined();
    expect(validationError?.errors['slug']).toBeDefined();
    expect(validationError?.errors['conversationSlug']).toBeDefined();
    expect(validationError?.errors['senderSlug']).toBeDefined();
  });
});