export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { MessageModel } from '@ilot/infrastructure';
import { attachmentRegistry } from '@ilot/shared-core';
import { SendMessageBodySchema } from '@ilot/types';
import { randomUUID } from 'crypto';
import { unstable_cache, revalidateTag } from 'next/cache';
import { withAura, withOptionalAura, OiseauUser, ApiContext } from '@/lib/api-guards';

// 🧠 CACHE SÉCURISÉ : Bypass automatique en mode test pour éviter les crashs Next.js
async function getCachedMessages(conversationSlug: string, limit: number, before?: string | null) {
  const fetcher = async () => {
    const query: any = { conversationSlug };
    if (before) {
      query.createdAt = { $lt: new Date(before) };
    }

    const messages = await MessageModel.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    return messages.reverse();
  };

  if (process.env.NODE_ENV === 'test') {
    return await fetcher();
  }

  return await unstable_cache(
    fetcher,
    [`messages-${conversationSlug}-${limit}-${before || 'latest'}`],
    { revalidate: 15, tags: ['messages', `conversation-${conversationSlug}`] }
  )();
}

// ==========================================
// 🔍 GET : Écouter les messages d'un salon (Public / Optionnel Aura)
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

  } catch (error: any) {
    console.error("🌊 [MESSAGES GET ERROR] :", error);
    return NextResponse.json({ error: "La tempête a brouillé l'écoute des messages." }, { status: 500 });
  }
});

// ==========================================
// 🚀 POST : Propager un message (Strictement Privé / Aura)
// ==========================================
export const POST = withAura(async (req: NextRequest, _context: ApiContext, currentUser: OiseauUser) => {
  try {
    const senderSlug = currentUser.slug || currentUser.uid;

    let rawBody;
    try {
      rawBody = await req.json();
    } catch (parseErr) {
      return NextResponse.json({ error: "Le chant (requête) est illisible." }, { status: 400 });
    }

    const validation = SendMessageBodySchema.safeParse(rawBody);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Message malformé.", details: validation.error.flatten() }, 
        { status: 400 }
      );
    }

    const { conversationSlug, content, rawAttachments, replyToSlug } = validation.data;

    if (!content.trim() && rawAttachments.length === 0) {
      return NextResponse.json({ error: "Un message ne peut pas être entièrement vide." }, { status: 400 });
    }

    const resolvedAttachments = [];
    for (const raw of rawAttachments) {
      try {
        const fullAttachment = await attachmentRegistry.resolve(raw.sourceType, raw.entitySlug);
        resolvedAttachments.push(fullAttachment);
      } catch (err) {
        console.warn(`⚠️ [ATTACHMENT WARNING] Impossible de résoudre ${raw.sourceType}:${raw.entitySlug}`, err);
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

  } catch (error: any) {
    console.error("🌋 [MESSAGES POST ERROR] :", error);
    return NextResponse.json({ error: error.message || "Impossible de propager le message." }, { status: 500 });
  }
});