// app/api/praises/route.ts
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { OiseauModel, PraiseModel } from '@ilot/infrastructure';
import { revalidateTag } from 'next/cache';
import { withAura, OiseauUser, ApiContext } from '@/lib/api-guards';
import { syncUniversalInteraction } from '@ilot/infrastructure'; // Ou le chemin relatif vers neo4j.sync.service

// ==========================================
// GET : Consulter les éloges d'un Oiseau (Le Panthéon)
// ==========================================
export const GET = withAura(async (req: Request, _context: ApiContext, currentUser: OiseauUser) => {
  try {
    const url = new URL(req.url);
    // On consulte soit la cible demandée, soit soi-même par défaut
    const targetIdentifier = url.searchParams.get('targetUid') || currentUser.uid;

    const targetUser = await OiseauModel.findOne({
      $or: [{ slug: targetIdentifier }, { uid: targetIdentifier }, { pseudo: targetIdentifier }]
    }).lean();

    if (!targetUser) {
      return NextResponse.json({ error: "L'Oiseau ciblé est introuvable." }, { status: 404 });
    }

    // Récupération des éloges avec les infos des auteurs
    const praises = await PraiseModel.find({ recipient: (targetUser as any)._id })
      .sort({ createdAt: -1 })
      .populate('author', 'uid pseudo avatarUrl')
      .lean();

    return NextResponse.json({ success: true, data: praises }, { status: 200 });

  } catch (error: any) {
    console.error("🔥 [PRAISES GET ERROR] :", error);
    return NextResponse.json({ error: "Erreur interne lors de la lecture du Panthéon." }, { status: 500 });
  }
});

// ==========================================
// POST : Graver un Éloge (Alimente le Bouclier Karmique)
// ==========================================
export const POST = withAura(async (req: Request, _context: ApiContext, currentUser: OiseauUser) => {
  try {
    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "Le chant est illisible : Corps de requête manquant." }, { status: 400 });
    }

    const { targetIdentifier, text, type = 'gratitude' } = body;

    if (!targetIdentifier || !text) {
      return NextResponse.json({ error: "Paramètres incomplets. Une cible et un texte sont requis." }, { status: 400 });
    }

    if (text.length > 500) {
      return NextResponse.json({ error: "L'éloge est trop long (500 caractères maximum)." }, { status: 400 });
    }

    // 1. Résolution de l'expéditeur
    const author = await OiseauModel.findOne({ uid: currentUser.uid }).lean();
    if (!author) {
      return NextResponse.json({ error: "Auteur introuvable." }, { status: 404 });
    }

    // 2. Résolution de la cible
    const recipient = await OiseauModel.findOne({
      $or: [{ slug: targetIdentifier }, { uid: targetIdentifier }, { pseudo: targetIdentifier }]
    }).lean();

    if (!recipient) {
      return NextResponse.json({ error: "L'Oiseau ciblé est introuvable." }, { status: 404 });
    }

    const targetCanonicalUid = (recipient as any).uid;

    // 3. Verrou d'humilité : Pas d'auto-éloge !
    if (targetCanonicalUid === currentUser.uid) {
      return NextResponse.json({ error: "Le vent repousse tes mots : on ne peut s'adresser des éloges à soi-même." }, { status: 400 });
    }

    // 4. Sédimentation de l'éloge
    const newPraise = await PraiseModel.create({
      author: (author as any)._id,
      recipient: (recipient as any)._id,
      text,
      type
    });

    // 5. Alimentation du Bouclier Karmique : on incrémente le compteur de la cible
    await OiseauModel.findOneAndUpdate(
      { _id: (recipient as any)._id },
      { $inc: { praisesCount: 1 } }
    );

    // 6. 🕸️ Tissage de la toile universelle en arrière-plan (Fire & Forget)
    syncUniversalInteraction(currentUser.uid, targetCanonicalUid, 'PRAISE').catch(console.error);

    // 💥 Invalidation chirurgicale du cache
    revalidateTag('praises');
    revalidateTag(`praises-${targetCanonicalUid}`);
    revalidateTag(`profile-${targetCanonicalUid}`); // Car le compteur praisesCount a changé !

    return NextResponse.json({
      success: true,
      message: "L'éloge a été gravé avec succès. Le Bouclier Karmique de la cible se renforce.",
      data: newPraise
    }, { status: 201 });

  } catch (error: any) {
    console.error("🔥 [PRAISES POST ERROR] :", error);
    return NextResponse.json({ error: "Erreur interne lors de la gravure de l'éloge." }, { status: 500 });
  }
});