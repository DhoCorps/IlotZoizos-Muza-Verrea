export const dynamic = 'force-dynamic';

import { NextResponse, NextRequest } from 'next/server';
import { withAura, OiseauUser, ApiContext, handleRouteError } from '@/lib/api-guards';
import { NotificationOrchestrator } from '@ilot/shared-core';
import { ActionSignature } from '@ilot/types';
import { z } from 'zod';

// ==========================================
// SCHÉMA ZOD : Validation du contrat de murmure
// ==========================================
const WhisperSchema = z.object({
  targetUids: z.array(z.string()).min(1, "Au moins une cible (targetUid) est requise."),
  artifactUrl: z.string().min(1, "L'URL ou la référence de l'artefact est requise."),
  message: z.string().optional(),
});

// ==========================================
// POST : Partager / Murmurer (Strictement Privé / Aura)
// ==========================================
export const POST = withAura(async (req: NextRequest, _context: ApiContext, currentUser: OiseauUser) => {
  try {
    let rawBody: unknown;
    try {
      rawBody = await req.json();
    } catch {
      return NextResponse.json({ success: false, error: "Corps de requête illisible ou malformé." }, { status: 400 });
    }

    // Validation stricte du contrat souverain via Zod
    const validation = WhisperSchema.safeParse(rawBody);
    if (!validation.success) {
      const errorMessage = validation.error.issues.map(e => e.message).join(', ');
      return NextResponse.json({ success: false, error: `Contrat souverain invalide : ${errorMessage}` }, { status: 400 });
    }

    const { targetUids, artifactUrl, message } = validation.data;
    const senderUid = currentUser.uid;

    const notificationOrchestrator = new NotificationOrchestrator();
    
    // Signature de l'action requise par l'orchestrateur de notifications
    const signature: ActionSignature = {
      actorUid: senderUid,
      capabilities: currentUser.capabilities || []
    };

    // Diffusion du murmure respectant l'interface FosterNotificationPayload
    const results = await Promise.all(
      targetUids.map(async (targetUid) => {
        return await notificationOrchestrator.fosterNotification({
          recipientUid: targetUid,
          senderUid,
          category: 'SOCIAL',
          type: 'WHISPER',
          payload: {
            message: message ? `${message} - ${artifactUrl}` : `Un murmure vous a été transmis : ${artifactUrl}`,
            targetUrl: artifactUrl
          }
        }, signature);
      })
    );

    return NextResponse.json({
      success: true,
      message: "Murmures transmis avec succès dans les réseaux de la Canopée.",
      data: { sentCount: results.length }
    }, { status: 200 });

  } catch (error: unknown) {
    return handleRouteError(error, "Erreur interne lors de la transmission du murmure.");
  }
});