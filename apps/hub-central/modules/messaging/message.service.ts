// apps/hub-central/modules/messaging/message.service.ts
import { MessageModel, IMessageDocument } from '@ilot/infrastructure';
import { IUniversalAttachment } from '@ilot/types';
import { randomUUID } from 'crypto';

export interface SendMessageParams {
  conversationSlug: string;
  senderSlug: string;
  content: string;
  attachments?: IUniversalAttachment[];
  replyToSlug?: string;
}

export interface SendSystemNewsletterParams {
  targetAudience: string;
  subject: string;
  content: string;
  statsSnapshot: Record<string, any>;
}

export class MessageService {
  /**
   * ✉️ Envoie un message classique entre deux oiseaux au sein d'une conversation
   */
  public static async sendMessage(params: SendMessageParams): Promise<IMessageDocument> {
    const { conversationSlug, senderSlug, content, attachments = [], replyToSlug = '' } = params;
    const slug = `msg_${Date.now()}_${randomUUID().slice(0, 6)}`;
    
    const message = new MessageModel({
      slug,
      conversationSlug,
      senderSlug,
      content,
      attachments,
      replyToSlug,
      isEdited: false,
      reactions: [],
      readBy: [{ userSlug: senderSlug, readAt: new Date() }],
      isSystemBroadcast: false
    });

    await message.save();
    return message;
  }

  /**
   * 🗞️ Diffuse la "Newsletter de la Canopée" (Bilan mensuel Kompta & Trophées Renewall)
   */
  public static async sendSystemNewsletter(params: SendSystemNewsletterParams): Promise<IMessageDocument> {
    const { targetAudience, subject, content, statsSnapshot } = params;
    const slug = `broadcast_${Date.now()}_${randomUUID().slice(0, 6)}`;
    const conversationSlug = 'canopy-newsletter';

    const broadcastMessage = new MessageModel({
      slug,
      conversationSlug,
      senderSlug: 'SYSTEM_CANOPY_ROOT',
      content: `### ${subject}\n\n${content}`,
      attachments: [],
      isEdited: false,
      reactions: [],
      readBy: [],
      isSystemBroadcast: true,
      metadata: {
        targetAudience,
        statsSnapshot,
        broadcastedAt: new Date()
      }
    });

    await broadcastMessage.save();
    console.log(`[MessageService] 🗞️ Newsletter de la Canopée diffusée avec succès sous le slug [${slug}]`);
    
    return broadcastMessage;
  }
}