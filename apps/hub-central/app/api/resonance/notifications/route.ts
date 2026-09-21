export const dynamic = 'force-dynamic';

import { NextResponse, NextRequest } from 'next/server';
import { withAura, OiseauUser, ApiContext, handleRouteError } from '@/lib/api-guards';
import { NotificationModel, getNeo4jSession } from '@ilot/infrastructure';
import { NotificationOrchestrator } from '@ilot/shared-core';
import { revalidateTag } from 'next/cache';
import { z } from 'zod';

// ==========================================
// 🛡️ SCHÉMAS ZOD (Validation stricte)
// ==========================================
const PutNotificationSchema = z.object({
  action: z.enum(['MARK_READ', 'UPDATE_DIGEST'], { message: "Action inconnue dans la Canopée." }),
  notificationUids: z.array(z.string()).optional(),
  targetUid: z.string().optional(),
  mode: z.enum(['REALTIME', 'DIGEST', 'ZEN']).optional(),
  digestHour: z.number().int().min(0).max(23).optional(),
}).refine(data => {
  if (data.action === 'MARK_READ' && (!data.notificationUids || data.notificationUids.length === 0)) return false;
  if (data.action === 'UPDATE_DIGEST' && (!data.targetUid || !data.mode)) return false;
  return true;
}, {
  message: "Paramètres discordants selon l'action demandée.",
});

// ==========================================
// 🌊 FONCTION DE CASCADE DES TAGS (CACHE)
// ==========================================
function revalidateNotificationCascades(userUid: string): void {
  revalidateTag('notifications');
  revalidateTag(`notifications-${userUid}`);
}

// ==========================================
// 📡 GET : Récupérer les alertes et les digests
// ==========================================
export const GET = withAura(async (_req: NextRequest, _context: ApiContext, currentUser: OiseauUser) => {
  try {
    const userUid = currentUser.uid;
    const now = new Date();

    // La Canopée Tampon : On ne récupère que les alertes directes ou celles dont l'heure du Digest est atteinte
    const notifications = await NotificationModel.find({
      recipientUid: userUid,
      $or: [
        { scheduledFor: null },
        { scheduledFor: { $lte: now } }
      ]
    })
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();

    // Sépare les non-lues pour un compteur rapide côté front
    const unreadCount = notifications.filter((n: any) => !n.isRead).length;

    return NextResponse.json({
      success: true,
      unreadCount,
      data: notifications
    }, { status: 200 });

  } catch (error: unknown) {
    return handleRouteError(error, "NOTIFICATIONS GET FATAL ERROR");
  }
});

// ==========================================
// 📡 PUT : Apaiser les échos (Mark Read) ou Configurer le Digest
// ==========================================
export const PUT = withAura(async (req: NextRequest, _context: ApiContext, currentUser: OiseauUser) => {
  try {
    let rawBody: unknown;
    try {
      rawBody = await req.json();
    } catch {
      return NextResponse.json({ success: false, error: "L'onde est muette : Corps de requête illisible." }, { status: 400 });
    }

    // 1. Blindage via Zod
    const validation = PutNotificationSchema.safeParse(rawBody);
    if (!validation.success) {
      return NextResponse.json({
        success: false,
        error: "Paramètres de notification invalides.",
        details: validation.error.flatten()
      }, { status: 400 });
    }

    const { action, notificationUids, targetUid, mode, digestHour } = validation.data;
    const userUid = currentUser.uid;

    // 2. ACTION : APAISER LES ÉCHOS
    if (action === 'MARK_READ') {
      const orchestrator = new NotificationOrchestrator();
      const signature = { actorUid: userUid, capabilities: currentUser.capabilities || [] };
      
      const result = await orchestrator.markAsRead(notificationUids!, signature);
      
      revalidateNotificationCascades(userUid);
      return NextResponse.json({
        success: true,
        message: "Les échos ont été apaisés.",
        modifiedCount: result.modifiedCount
      }, { status: 200 });
    } 
    
    // 3. ACTION : CONFIGURER LE DIGEST DANS LE GRAPHE
    if (action === 'UPDATE_DIGEST') {
      const session = getNeo4jSession();
      try {
        const cypher = `
          MATCH (u:User { uid: $userUid })-[r:FOLLOWS]->(t { uid: $targetUid })
          SET r.mode = $mode, r.digestHour = $digestHour
          RETURN r
        `;
        const result = await session.run(cypher, {
          userUid,
          targetUid,
          mode,
          digestHour: digestHour || 20 // Par défaut 20h
        });

        if (result.records.length === 0) {
          return NextResponse.json({ success: false, error: "Impossible de configurer le Digest : lien d'abonnement introuvable." }, { status: 404 });
        }

        revalidateNotificationCascades(userUid);
        return NextResponse.json({
          success: true,
          message: "Le rythme de la Canopée a été ajusté pour cet Oiseau."
        }, { status: 200 });
      } finally {
        await session.close();
      }
    }

    return NextResponse.json({ success: false, error: "Action non gérée." }, { status: 400 });

  } catch (error: unknown) {
    return handleRouteError(error, "NOTIFICATIONS PUT FATAL ERROR");
  }
});