// apps/hub-central/app/api/messages/route.ts
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { connectToDatabase, MessageModel } from '@ilot/infrastructure';
import { attachmentRegistry } from '@ilot/shared-core';
import { SendMessageBodySchema } from '@ilot/types';
import { randomUUID } from 'crypto';

export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();
    
    const url = new URL(req.url);
    const conversationSlug = url.searchParams.get('conversationSlug');
    const limit = parseInt(url.searchParams.get('limit') || '30', 10);
    const before = url.searchParams.get('before');

    if (!conversationSlug) {
      return NextResponse.json({ error: "Slug de salon manquant." }, { status: 400 });
    }

    const query: any = { conversationSlug };
    if (before) {
      query.createdAt = { $lt: new Date(before) };
    }

    const messages = await MessageModel.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    return NextResponse.json(messages.reverse(), { status: 200 });

  } catch (error: any) {
    console.error("🌊 [MESSAGES GET ERROR] :", error);
    return NextResponse.json({ error: "La tempête a brouillé l'écoute des messages." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    let session;
    try {
      session = await getServerSession(authOptions);
    } catch (sessionErr) {
      console.error("🔥 [SESSION ERROR MESSAGES POST]", sessionErr);
      return NextResponse.json({ error: "Erreur de lecture d'Aura (session)." }, { status: 500 });
    }

    const senderSlug = (session?.user as any)?.slug || (session?.user as any)?.uid;
    if (!senderSlug) {
      return NextResponse.json({ error: "Oiseau non identifié dans la canopée." }, { status: 401 });
    }

    try {
      await connectToDatabase();
    } catch (dbErr) {
      console.error("❌ [DB ERROR MESSAGES POST]", dbErr);
      return NextResponse.json({ error: "La Silice est injoignable." }, { status: 500 });
    }

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

    return NextResponse.json({
      success: true,
      message: newMessage
    }, { status: 201 });

  } catch (error: any) {
    console.error("🌋 [MESSAGES POST ERROR] :", error);
    return NextResponse.json({ error: error.message || "Impossible de propager le message." }, { status: 500 });
  }
}