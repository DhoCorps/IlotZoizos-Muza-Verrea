export const dynamic = 'force-dynamic';

import { NextResponse, NextRequest } from 'next/server';
import { OiseauModel, ReportModel, findEntityBySlugOrUid } from '@ilot/infrastructure';
import { v4 as uuidv4 } from 'uuid';
import { revalidateTag } from 'next/cache';
import { withAura, OiseauUser, ApiContext, handleRouteError } from '@/lib/api-guards';
import { z } from 'zod';

// 🛡️ Schéma de validation Zod pour initier un signalement
const CreateReportSchema = z.object({
  targetIdentifier: z.string().min(1, "La cible est requise."),
  reason: z.string().min(1, "Le motif du signalement est requis.").max(1000, "Le motif est trop long (1000 caractères maximum)."),
});

interface IOiseauEntity {
  _id: unknown;
  uid?: string;
  slug?: string;
  [key: string]: unknown;
}

// ==========================================
// GET : Consulter ses signalements (Plaignant ou Accusé, ou Root)
// ==========================================
export const GET = withAura(async (req: NextRequest, _context: ApiContext, currentUser: OiseauUser) => {
  try {
    // 🔍 Résolution unifiée de l'Oiseau connecté
    const oiseau = (await findEntityBySlugOrUid(OiseauModel, currentUser.uid)) as IOiseauEntity | null;
    if (!oiseau) {
      return NextResponse.json({ error: "Oiseau introuvable dans la matrice." }, { status: 404 });
    }

    // L'Architecte voit tout, les oiseaux ne voient que leurs propres affaires
    const isAdmin = currentUser.capabilities?.includes('*');
    const query = isAdmin 
      ? {} 
      : { $or: [{ reporter: oiseau._id }, { reportedUser: oiseau._id }] };

    const reports = await ReportModel.find(query)
      .sort({ createdAt: -1 })
      .populate('reporter', 'uid pseudo avatarUrl')
      .populate('reportedUser', 'uid pseudo avatarUrl')
      .lean();

    return NextResponse.json({ success: true, data: reports }, { status: 200 });
  } catch (error: unknown) {
    return handleRouteError(error, 'REPORTS GET ERROR');
  }
});

// ==========================================
// POST : Initier un Signalement (Ouvre la Médiation)
// ==========================================
export const POST = withAura(async (req: NextRequest, _context: ApiContext, currentUser: OiseauUser) => {
  try {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Le chant est illisible : Corps de requête manquant." }, { status: 400 });
    }

    const validationResult = CreateReportSchema.safeParse(body);
    if (!validationResult.success) {
      const errorMessage = validationResult.error.issues.map(e => e.message).join(', ');
      return NextResponse.json({ error: `Paramètres incomplets ou invalides : ${errorMessage}` }, { status: 400 });
    }

    const validatedData = validationResult.data;

    // 🔍 1. Résolution stricte et unifiée de l'accusé
    const targetUser = (await findEntityBySlugOrUid(OiseauModel, validatedData.targetIdentifier)) as IOiseauEntity | null;
    if (!targetUser) {
      return NextResponse.json({ error: "L'Oiseau signalé est introuvable dans la Silice." }, { status: 404 });
    }

    // 🔍 2. Résolution unifiée du plaignant
    const reporter = (await findEntityBySlugOrUid(OiseauModel, currentUser.uid)) as IOiseauEntity | null;
    if (!reporter) {
      return NextResponse.json({ error: "Oiseau plaignant introuvable." }, { status: 404 });
    }

    // 3. Empêcher l'auto-signalement
    if (targetUser.uid === currentUser.uid) {
      return NextResponse.json({ error: "Souveraineté paradoxale : On ne peut pas se signaler soi-même." }, { status: 400 });
    }

    // 4. Forge du rapport dans la Silice (MongoDB)
    const reportUid = `report_${uuidv4()}`;
    const newReport = await ReportModel.create({
      uid: reportUid, 
      reporter: reporter._id,
      reportedUser: targetUser._id,
      reason: validatedData.reason,
      status: 'mediation', // Ouvre d'abord le sas de médiation avant le jugement !
      mediationLog: []
    });

    // 💥 Invalidation chirurgicale du cache en cascade
    revalidateTag('reports');
    revalidateTag(`user-reports-${currentUser.uid}`);
    if (targetUser.uid) {
      revalidateTag(`user-reports-${targetUser.uid}`);
    }

    return NextResponse.json({
      success: true,
      message: "Le signalement a été scellé. La phase de médiation est officiellement ouverte.",
      data: { uid: reportUid, status: 'mediation' }
    }, { status: 201 });

  } catch (error: unknown) {
    return handleRouteError(error, 'REPORTS POST ERROR');
  }
});