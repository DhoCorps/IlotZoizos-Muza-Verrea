export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { KontaktProfileModel, findEntityBySlugOrUid } from '@ilot/infrastructure';
import { slugify } from '@/lib/slugify';
import { revalidateTag } from 'next/cache';
import { withSilice, withAura, OiseauUser, ApiContext } from '@/lib/api-guards';

// ==========================================
// GET : Ausculter un profil Kontakt spécifique (Public / Silice)
// ==========================================
export const GET = withSilice(async (_req: Request, context: ApiContext) => {
  try {
    let resolvedParams;
    try {
      resolvedParams = await context.params;
    } catch {
      return NextResponse.json({ error: "Paramètres de route invalides." }, { status: 400 });
    }

    const rawSlug = resolvedParams?.slug;
    const identifier = slugify(typeof rawSlug === 'string' ? rawSlug : Array.isArray(rawSlug) ? rawSlug[0] : '');

    if (!identifier) {
      return NextResponse.json({ error: "Identifiant invalide." }, { status: 400 });
    }

    // 🔍 Résolution unifiée du profil Kontakt via notre helper centralisé
    const profile: any = await findEntityBySlugOrUid(KontaktProfileModel, identifier);

    if (!profile) {
      return NextResponse.json({ error: "Profil Kontakt introuvable dans la matrice." }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: profile }, { status: 200 });

  } catch (error: any) {
    console.error("🔥 Erreur globale GET Kontakt Profile Slug :", error);
    return NextResponse.json({ error: "Erreur interne du serveur." }, { status: 500 });
  }
});

// ==========================================
// PUT : Muter / Mettre à jour un profil Kontakt (Strictement Privé / Aura)
// ==========================================
export const PUT = withAura(async (req: Request, context: ApiContext, currentUser: OiseauUser) => {
  try {
    let resolvedParams;
    let body;
    try {
      resolvedParams = await context.params;
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Requête ou paramètres invalides." }, { status: 400 });
    }

    const rawSlug = resolvedParams?.slug;
    const identifier = slugify(typeof rawSlug === 'string' ? rawSlug : Array.isArray(rawSlug) ? rawSlug[0] : '');

    if (!identifier) {
      return NextResponse.json({ error: "Identifiant invalide." }, { status: 400 });
    }

    // 🔍 Recherche unifiée pour trouver le profil par slug ou UID avant mise à jour
    const targetProfile: any = await findEntityBySlugOrUid(KontaktProfileModel, identifier, { lean: false });

    if (!targetProfile) {
      return NextResponse.json({ error: "Profil introuvable dans la matrice." }, { status: 404 });
    }

    // Vérification de Souveraineté : Seul le propriétaire ou un Architecte peut modifier
    const isOwner = targetProfile.userUid === currentUser.uid;
    const isArchitect = currentUser.capabilities?.includes('*');

    if (!isOwner && !isArchitect) {
      return NextResponse.json({ error: "Souveraineté violée : tu ne peux modifier ce profil." }, { status: 403 });
    }

    // Si on met à jour le titre professionnel, on génère un nouveau slug
    if (body.professionalTitle) {
      const baseSlug = slugify(body.professionalTitle);
      let finalSlug = baseSlug;
      let slugExists = await findEntityBySlugOrUid(KontaktProfileModel, finalSlug);
      let counter = 1;
      let safetyCounter = 0;
      // On vérifie que le slug généré n'est pas déjà pris par UN AUTRE profil
      while (slugExists && slugExists.uid !== targetProfile.uid && safetyCounter < 50) {
        finalSlug = `${baseSlug}-${counter}`;
        slugExists = await findEntityBySlugOrUid(KontaktProfileModel, finalSlug);
        counter++;
        safetyCounter++;
      }
      body.slug = finalSlug;
    }

    const updatedProfile = await KontaktProfileModel.findOneAndUpdate(
      { uid: targetProfile.uid },
      { $set: body },
      { new: true }
    ).lean();

    // 💥 BOOM ! Invalidation chirurgicale du cache en cascade
    revalidateTag('kontakt-profiles');
    revalidateTag(`kontakt-profile-${identifier}`);
    if ((updatedProfile as any)?.slug) revalidateTag(`kontakt-profile-${(updatedProfile as any).slug}`);
    if ((updatedProfile as any)?.uid) revalidateTag(`kontakt-profile-${(updatedProfile as any).uid}`);

    return NextResponse.json({
      success: true,
      message: "Le profil Kontakt a muté avec succès.",
      data: updatedProfile
    }, { status: 200 });

  } catch (error: any) {
    console.error("🔥 Erreur globale PUT Kontakt Profile :", error);
    return NextResponse.json({ error: error.message || "Erreur lors de la mise à jour." }, { status: 500 });
  }
});

// ==========================================
// DELETE : Dissoudre un profil Kontakt (Strictement Privé / Aura)
// ==========================================
export const DELETE = withAura(async (_req: Request, context: ApiContext, currentUser: OiseauUser) => {
  try {
    let resolvedParams;
    try {
      resolvedParams = await context.params;
    } catch {
      return NextResponse.json({ error: "Paramètres invalides." }, { status: 400 });
    }

    const rawSlug = resolvedParams?.slug;
    const identifier = slugify(typeof rawSlug === 'string' ? rawSlug : Array.isArray(rawSlug) ? rawSlug[0] : '');

    if (!identifier) {
      return NextResponse.json({ error: "Identifiant invalide." }, { status: 400 });
    }

    // 🔍 Utilisation de notre helper unifié pour cibler la suppression
    const targetProfile: any = await findEntityBySlugOrUid(KontaktProfileModel, identifier);

    if (!targetProfile) {
      return NextResponse.json({ error: "Profil introuvable pour dissolution." }, { status: 404 });
    }

    // Vérification de Souveraineté
    const isOwner = targetProfile.userUid === currentUser.uid;
    const isArchitect = currentUser.capabilities?.includes('*');

    if (!isOwner && !isArchitect) {
      return NextResponse.json({ error: "Souveraineté violée : dissolution interdite." }, { status: 403 });
    }

    await KontaktProfileModel.deleteOne({ uid: targetProfile.uid });

    // 💥 Invalidation du cache
    revalidateTag('kontakt-profiles');
    revalidateTag(`kontakt-profile-${identifier}`);
    revalidateTag(`kontakt-profile-${targetProfile.uid}`);
    if (targetProfile.slug) revalidateTag(`kontakt-profile-${targetProfile.slug}`);

    return NextResponse.json({
      success: true,
      message: `Le profil a été désintégré de la matrice.`
    }, { status: 200 });

  } catch (error: any) {
    console.error("🔥 Erreur globale DELETE Kontakt Profile :", error);
    return NextResponse.json({ error: error.message || "Erreur lors de la suppression." }, { status: 500 });
  }
});