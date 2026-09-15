export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { OiseauModel, PraiseModel, findEntityBySlugOrUid } from '@ilot/infrastructure';
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

    // 🔍 Résolution unifiée de l'Oiseau ciblé
    const targetUser: any = await findEntityBySlugOrUid(OiseauModel, targetIdentifier);

    if (!targetUser) {
      return NextResponse.json({ error: "L'Oiseau ciblé est introuvable." }, { status: 404 });
    }

    // Récupération des éloges avec les infos des auteurs
    const praises = await PraiseModel.find({ recipient: targetUser._id })
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

    // 🔍 1. Résolution unifiée de l'expéditeur
    const author: any = await findEntityBySlugOrUid(OiseauModel, currentUser.uid);
    if (!author) {
      return NextResponse.json({ error: "Auteur introuvable." }, { status: 404 });
    }

    // 🔍 2. Résolution unifiée de la cible
    const recipient: any = await findEntityBySlugOrUid(OiseauModel, targetIdentifier);
    if (!recipient) {
      return NextResponse.json({ error: "L'Oiseau ciblé est introuvable." }, { status: 404 });
    }

    const targetCanonicalUid = recipient.uid;

    // 3. Verrou d'humilité : Pas d'auto-éloge !
    if (targetCanonicalUid === currentUser.uid) {
      return NextResponse.json({ error: "Le vent repousse tes mots : on ne peut s'adresser des éloges à soi-même." }, { status: 400 });
    }

    // 4. Sédimentation de l'éloge
    const newPraise = await PraiseModel.create({
      author: author._id,
      recipient: recipient._id,
      text,
      type
    });

    // 5. Alimentation du Bouclier Karmique : on incrémente le compteur de la cible
    await OiseauModel.findOneAndUpdate(
      { _id: recipient._id },
      { $inc: { praisesCount: 1 } }
    );

    // 6. 🕸️ Tissage de la toile universelle en arrière-plan (Fire & Forget)
    syncUniversalInteraction(currentUser.uid, targetCanonicalUid, 'PRAISE').catch(console.error);

    // 💥 Invalidation chirurgicale du cache en cascade
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