export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { OiseauModel, PraiseModel, findEntityBySlugOrUid } from '@ilot/infrastructure';
import { revalidateTag } from 'next/cache';
import { withAura, OiseauUser, ApiContext, handleRouteError } from '@/lib/api-guards';
import { syncUniversalInteraction } from '@ilot/infrastructure';
import { z } from 'zod';

// 🛡️ Schéma de validation Zod pour l'éloge
const CreatePraiseSchema = z.object({
  targetIdentifier: z.string().min(1, "La cible est requise."),
  text: z.string().min(1, "Le texte de l'éloge est requis.").max(500, "L'éloge est trop long (500 caractères maximum)."),
  type: z.string().optional().default('gratitude'),
});

type CreatePraiseInput = z.infer<typeof CreatePraiseSchema>;

// ==========================================
// GET : Consulter les éloges d'un Oiseau (Le Panthéon)
// ==========================================
export const GET = withAura(async (req: NextRequest, _context: ApiContext, currentUser: OiseauUser) => {
  try {
    const url = new URL(req.url);
    // On consulte soit la cible demandée, soit soi-même par défaut
    const targetIdentifier = url.searchParams.get('targetUid') || currentUser.uid;

    // 🔍 Résolution unifiée de l'Oiseau ciblé
    const targetUser = (await findEntityBySlugOrUid(OiseauModel, targetIdentifier)) as { _id: unknown; uid?: string } | null;

    if (!targetUser) {
      return NextResponse.json({ error: "L'Oiseau ciblé est introuvable." }, { status: 404 });
    }

    // Récupération des éloges avec les infos des auteurs
    const praises = await PraiseModel.find({ recipient: targetUser._id })
      .sort({ createdAt: -1 })
      .populate('author', 'uid pseudo avatarUrl')
      .lean();

    return NextResponse.json({ success: true, data: praises }, { status: 200 });

  } catch (error: unknown) {
    return handleRouteError(error, 'PRAISES GET ERROR');
  }
});

// ==========================================
// POST : Graver un Éloge (Alimente le Bouclier Karmique)
// ==========================================
export const POST = withAura(async (req: NextRequest, _context: ApiContext, currentUser: OiseauUser) => {
  try {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Le chant est illisible : Corps de requête manquant." }, { status: 400 });
    }

    const validationResult = CreatePraiseSchema.safeParse(body);
    if (!validationResult.success) {
      const errorMessage = validationResult.error.issues.map(e => e.message).join(', ');
      return NextResponse.json({ error: `Paramètres incomplets ou invalides : ${errorMessage}` }, { status: 400 });
    }

    const validatedData: CreatePraiseInput = validationResult.data;

    // 🔍 1. Résolution unifiée de l'expéditeur
    const author = (await findEntityBySlugOrUid(OiseauModel, currentUser.uid)) as { _id: unknown; uid?: string } | null;
    if (!author) {
      return NextResponse.json({ error: "Auteur introuvable." }, { status: 404 });
    }

    // 🔍 2. Résolution unifiée de la cible
    const recipient = (await findEntityBySlugOrUid(OiseauModel, validatedData.targetIdentifier)) as { _id: unknown; uid?: string } | null;
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
      text: validatedData.text,
      type: validatedData.type
    });

    // 5. Alimentation du Bouclier Karmique : on incrémente le compteur de la cible
    await OiseauModel.findOneAndUpdate(
      { _id: recipient._id },
      { $inc: { praisesCount: 1 } }
    );

    // 6. 🕸️ Tissage de la toile universelle en arrière-plan (Fire & Forget)
    syncUniversalInteraction(currentUser.uid, targetCanonicalUid || '', 'PRAISE').catch(console.error);

    // 💥 Invalidation chirurgicale du cache en cascade
    revalidateTag('praises');
    if (targetCanonicalUid) {
      revalidateTag(`praises-${targetCanonicalUid}`);
      revalidateTag(`profile-${targetCanonicalUid}`);
    }

    return NextResponse.json({
      success: true,
      message: "L'éloge a été gravé avec succès. Le Bouclier Karmique de la cible se renforce.",
      data: newPraise
    }, { status: 201 });

  } catch (error: unknown) {
    return handleRouteError(error, 'PRAISES POST ERROR');
  }
});