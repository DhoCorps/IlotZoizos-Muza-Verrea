// apps/hub-central/app/api/messages/unread/route.ts
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../../lib/auth";
import { connectToDatabase, MessageModel } from '@ilot/infrastructure';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userSlug = (session?.user as any)?.slug || (session?.user as any)?.uid;
    if (!userSlug) {
      return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
    }

    await connectToDatabase();

    // Compte les messages écrits par d'autres que l'utilisateur et qu'il n'a pas encore lus
    const unreadCount = await MessageModel.countDocuments({
      senderSlug: { $ne: userSlug },
      "readBy.userSlug": { $ne: userSlug }
    });

    return NextResponse.json({ success: true, unreadCount }, { status: 200 });

  } catch (error: any) {
    console.error("🌊 [UNREAD COUNT ERROR] :", error);
    return NextResponse.json({ error: "Erreur de comptage des murmures." }, { status: 500 });
  }
}