// app/api/reports/route.ts
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { OiseauModel, ReportModel } from '@ilot/infrastructure';
import { v4 as uuidv4 } from 'uuid';
import { revalidateTag } from 'next/cache';
import { withAura, OiseauUser, ApiContext } from '@/lib/api-guards'; // Bouclier souverain strict

// ==========================================
// GET : Consulter ses signalements (Plaignant ou Accusé, ou Root)
// ==========================================
export const GET = withAura(async (req: Request, _context: ApiContext, currentUser: OiseauUser) => {
  try {
    const oiseau = await OiseauModel.findOne({ uid: currentUser.uid }).lean();
    if (!oiseau) {
      return NextResponse.json({ error: "Oiseau introuvable dans la matrice." }, { status: 404 });
    }

    // L'Architecte voit tout, les oiseaux ne voient que leurs propres affaires
    const isAdmin = currentUser.capabilities?.includes('*');
    const query = isAdmin 
      ? {} 
      : { $or: [{ reporter: (oiseau as any)._id }, { reportedUser: (oiseau as any)._id }] };

    const reports = await ReportModel.find(query)
      .sort({ createdAt: -1 })
      .populate('reporter', 'uid pseudo avatarUrl')
      .populate('reportedUser', 'uid pseudo avatarUrl')
      .lean();

    return NextResponse.json({ success: true, data: reports }, { status: 200 });
  } catch (error: any) {
    console.error("🔥 [REPORTS GET ERROR] :", error);
    return NextResponse.json({ error: "Erreur interne lors de la lecture des rapports." }, { status: 500 });
  }
});

// ==========================================
// POST : Initier un Signalement (Ouvre la Médiation)
// ==========================================
export const POST = withAura(async (req: Request, _context: ApiContext, currentUser: OiseauUser) => {
  try {
    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "Le chant est illisible : Corps de requête manquant." }, { status: 400 });
    }

    const { targetIdentifier, reason } = body;
    if (!targetIdentifier || !reason) {
      return NextResponse.json({ error: "Paramètres incomplets. Une cible et un motif sont requis." }, { status: 400 });
    }

    // 1. Résolution stricte de l'accusé
    const targetUser = await OiseauModel.findOne({
      $or: [{ slug: targetIdentifier }, { uid: targetIdentifier }, { pseudo: targetIdentifier }]
    }).lean();

    if (!targetUser) {
      return NextResponse.json({ error: "L'Oiseau signalé est introuvable dans la Silice." }, { status: 404 });
    }

    // 2. Résolution du plaignant
    const reporter = await OiseauModel.findOne({ uid: currentUser.uid }).lean();
    if (!reporter) {
      return NextResponse.json({ error: "Oiseau plaignant introuvable." }, { status: 404 });
    }

    // 3. Empêcher l'auto-signalement
    if ((targetUser as any).uid === currentUser.uid) {
      return NextResponse.json({ error: "Souveraineté paradoxale : On ne peut pas se signaler soi-même." }, { status: 400 });
    }

    // 4. Forge du rapport dans la Silice (MongoDB)
    const reportUid = `report_${uuidv4()}`;
    const newReport = await ReportModel.create({
      uid: reportUid, 
      reporter: (reporter as any)._id,
      reportedUser: (targetUser as any)._id,
      reason: reason.substring(0, 1000), // Sécurité de longueur selon le schéma
      status: 'mediation', // Ouvre d'abord le sas de médiation avant le jugement !
      mediationLog: []
    });

    // 💥 Invalidation chirurgicale du cache
    revalidateTag('reports');
    revalidateTag(`user-reports-${currentUser.uid}`);
    revalidateTag(`user-reports-${(targetUser as any).uid}`);

    return NextResponse.json({
      success: true,
      message: "Le signalement a été scellé. La phase de médiation est officiellement ouverte.",
      data: { uid: reportUid, status: 'mediation' }
    }, { status: 201 });

  } catch (error: any) {
    console.error("🔥 [REPORTS POST ERROR] :", error);
    return NextResponse.json({ error: "Erreur interne lors de la transmission du signalement." }, { status: 500 });
  }
});