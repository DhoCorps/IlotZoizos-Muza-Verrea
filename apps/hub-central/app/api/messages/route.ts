export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { MessageModel, OiseauModel, findEntityBySlugOrUid } from '@ilot/infrastructure';
import { attachmentRegistry } from '@ilot/shared-core';
import { SendMessageBodySchema, SendMessageBody } from '@ilot/types';
import { randomUUID } from 'crypto';
import { revalidateTag } from 'next/cache';
import { withAura, withOptionalAura, OiseauUser, ApiContext, handleRouteError } from '@/lib/api-guards';
import { getCachedMessages } from '@/lib/cache/messages.cache';

interface OiseauProfileDocument {
  uid: string;
  slug?: string;
  isBanned?: boolean;
  profileStatus?: string;
  [key: string]: unknown;
}

// ==========================================
// GET : Écouter les messages d'un salon (Public / Optionnel Aura)
// ==========================================
export const GET = withOptionalAura(async (req: NextRequest, _context: ApiContext, _currentUser?: OiseauUser) => {
  try {
    const url = new URL(req.url);
    const conversationSlug = url.searchParams.get('conversationSlug');
    const limit = parseInt(url.searchParams.get('limit') || '30', 10);
    const before = url.searchParams.get('before');

    if (!conversationSlug) {
      return NextResponse.json({ error: "Slug de salon manquant." }, { status: 400 });
    }

    const messages = await getCachedMessages(conversationSlug, limit, before);
    return NextResponse.json(messages, { status: 200 });
  } catch (error: unknown) {
    return handleRouteError(error, 'MESSAGES GET ERROR');
  }
});

// ==========================================
// POST : Propager un message (Strictement Privé / Aura)
// ==========================================
export const POST = withAura(async (req: NextRequest, _context: ApiContext, currentUser: OiseauUser) => {
  try {
    const senderSlug = currentUser.slug || currentUser.uid;

    // 🛡️ Suture de Souveraineté : Utilisation du helper unifié pour attraper le profil même via un slug personnalisé
    const oiseauProfile = (await findEntityBySlugOrUid(OiseauModel, senderSlug)) as OiseauProfileDocument | null;
    
    if (oiseauProfile && (oiseauProfile.isBanned || oiseauProfile.profileStatus === 'INDESIRABLE')) {
      return NextResponse.json({ 
         error: "Souveraineté restreinte : Votre fréquence est jugée indésirable. Le salon vous est fermé." 
      }, { status: 403 });
    }

    let rawBody: unknown;
    try {
      rawBody = await req.json();
    } catch {
      return NextResponse.json({ error: "Le chant (requête) est illisible." }, { status: 400 });
    }

    const validation = SendMessageBodySchema.safeParse(rawBody);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Message malformé.", details: validation.error.flatten() }, 
        { status: 400 }
      );
    }

    const typedValidationData = validation.data as SendMessageBody & { rawAttachments?: Array<{ sourceType: string; entitySlug: string }> };
    const conversationSlug = typedValidationData.conversationSlug;
    const content = typedValidationData.content;
    const rawAttachments = typedValidationData.rawAttachments || [];
    const replyToSlug = typedValidationData.replyToSlug || null;

    if (!content.trim() && rawAttachments.length === 0) {
      return NextResponse.json({ error: "Un message ne peut pas être entièrement vide." }, { status: 400 });
    }

    const resolvedAttachments: unknown[] = [];
    for (const raw of rawAttachments) {
      try {
        const fullAttachment = await attachmentRegistry.resolve(raw.sourceType, raw.entitySlug);
        resolvedAttachments.push(fullAttachment);
      } catch (err: unknown) {
        console.warn(`  [ATTACHMENT WARNING] Impossible de résoudre ${raw.sourceType}:${raw.entitySlug}`, err);
      }
    }

    const newMessage = await MessageModel.create({
      slug: `msg_${randomUUID()}`,
      conversationSlug,
      senderSlug,
      content,
      attachments: resolvedAttachments,
      replyToSlug,
      isEdited: false,
      reactions: [],
      readBy: [{ userSlug: senderSlug, readAt: new Date() }]
    });

    // 💥 BOOM ! Invalidation chirurgicale du cache en cascade pour ce salon
    revalidateTag('messages');
    revalidateTag(`conversation-${conversationSlug}`);

    return NextResponse.json({
      success: true,
      message: newMessage
    }, { status: 201 });
  } catch (error: unknown) {
    return handleRouteError(error, 'MESSAGES POST ERROR');
  }
});