import { NextRequest, NextResponse } from 'next/server';
import { OiseauModel, getNeo4jSession } from '@ilot/infrastructure'; 
import { storageService } from '@/modules/storage/storage.service';
import { checkRateLimit } from '@/modules/security/rateLimiter';
import { IOiseau } from '@ilot/types';
import { slugify } from '@/lib/slugify';
import { revalidateTag } from 'next/cache';
import { withAura, OiseauUser, ApiContext } from '@/lib/api-guards'; // 🪡 Notre bouclier souverain strict

export const dynamic = 'force-dynamic';

// 🛡️ Utilitaire interne : Vérification stricte de la Souveraineté (Self ou Admin)
function assertSovereignty(visitorUid: string, visitorCaps: string[], targetSlug: string): boolean {
  const isSelf = visitorUid === targetSlug || slugify(visitorUid) === targetSlug;
  const isAdmin = visitorCaps.includes('*');
  return isSelf || isAdmin;
}

// ==========================================
// 📤 POST : Téléversement d'une Brindille (Avatar / Cover)
// ==========================================
export const POST = withAura(async (req: NextRequest, context: ApiContext, currentUser: OiseauUser) => {
  // 1. Rate Limiting sur l'IP
  const clientIp = req.headers.get('x-forwarded-for') || '127.0.0.1';
  const { allowed } = await checkRateLimit(`upload-user-slug:${clientIp}`, 10, 60);
  if (!allowed) {
    return NextResponse.json({ success: false, message: "Trop de téléversements. Veuillez patienter." }, { status: 429 });
  }

  const resolvedParams = await context.params;
  const rawSlug = resolvedParams?.slug;
  const targetSlug = slugify(typeof rawSlug === 'string' ? rawSlug : Array.isArray(rawSlug) ? rawSlug[0] : '');

  // 2. Contrôle de Souveraineté
  if (!assertSovereignty(currentUser.uid, currentUser.capabilities, targetSlug)) {
    return NextResponse.json({ success: false, message: "Souveraineté violée : vous ne pouvez modifier un autre Oiseau." }, { status: 403 });
  }

  // 3. Extraction du payload (FormData)
  let formData;
  try {
    formData = await req.formData();
  } catch (formErr) {
    return NextResponse.json({ success: false, message: "L'onde est muette : Corps de requête invalide." }, { status: 400 });
  }

  const file = formData.get('file') as File | null;
  const imageType = formData.get('imageType') as string | null; 
  
  if (!file || !imageType) {
    return NextResponse.json({ success: false, message: 'Maladresse : Il manque la brindille ou le imageType.' }, { status: 400 });
  }

  const allowedTypes = ['avatarUrl', 'coverPicture']; 
  if (!allowedTypes.includes(imageType)) {
      return NextResponse.json({ success: false, message: `Type d'image invalide (attendu: ${allowedTypes.join(', ')}).` }, { status: 400 });
  }

  // 🪡 Validation robuste (Gère les navigateurs et l'environnement de test Node/Vitest)
      const allowedImageTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
      const fileType = file.type || '';
      
      const isValidType = allowedImageTypes.includes(fileType) || 
        (fileType === '' && /\.(jpg|jpeg|png|webp|gif)$/i.test(file.name || 'avatar.jpg'));

      if (!isValidType) {
        return NextResponse.json({ success: false, message: `Ineptie : La Silice attend une image, pas du ${fileType || 'inconnu'}.` }, { status: 400 });
      }

  if (file.size > 5 * 1024 * 1024) {
     return NextResponse.json({ success: false, message: `La brindille est trop lourde (Max 5 Mo).` }, { status: 400 });
  }

  // 4. Stockage Physique (Cloudflare R2)
  const customKey = storageService.generateStructuredKey({
      inceptId: 'ilot-zoizos',
      locale: 'fr',
      entityType: 'users',
      entityId: targetSlug, 
      imageType: imageType,
      filename: file.name
  });

  let publicUrl;
  try {
    const uploadResult = await storageService.uploadFile(file, customKey);
    publicUrl = uploadResult.publicUrl;
  } catch (storageErr) {
    console.error("🔥 [STORAGE UPLOAD ERROR]", storageErr);
    return NextResponse.json({ success: false, message: "Échec de téléversement dans les nuages." }, { status: 500 });
  }

  // 5. Suture Base de Données (MongoDB)
  const updatedUser = (await OiseauModel.findOneAndUpdate(
      { $or: [{ slug: targetSlug }, { uid: targetSlug }] }, 
      { [imageType]: publicUrl }, 
      { new: true } 
  ).lean()) as unknown as IOiseau | null;

  if (!updatedUser) {
      return NextResponse.json({ success: false, message: "L'Oiseau est introuvable dans la matrice." }, { status: 404 });
  }

  // 6. Propagation Graphe (Neo4j) si c'est un avatar
  if (imageType === 'avatarUrl') {
    const neoSession = getNeo4jSession();
    try {
      await neoSession.run(
        `MATCH (u:User) WHERE u.uid = $targetId OR u.slug = $targetId
         SET u.avatarUrl = $publicUrl, u.updatedAt = datetime()`,
        { targetId: targetSlug, publicUrl }
      );
    } catch (neoError) {
      console.error("⚠️ [Neo4j] Échec mineur de propagation esthétique :", neoError);
    } finally {
      try { await neoSession.close(); } catch (e) {}
    }
  }

  // 💥 BOOM ! Le cache de ce profil est périmé, on l'invalide proprement
  revalidateTag(`profile-${targetSlug}`);
  revalidateTag('users');

  return NextResponse.json(
    {
      success: true,
      message: `L'apparence de ${updatedUser.pseudo} a muté avec succès !`,
      publicUrl: publicUrl,
      user: updatedUser.pseudo 
    },
    { status: 201 }
  );
});

// ==========================================
// 🧨 DELETE : Désintégration Physique et Silice
// ==========================================
export const DELETE = withAura(async (req: NextRequest, context: ApiContext, currentUser: OiseauUser) => {
  const resolvedParams = await context.params;
  const rawSlug = resolvedParams?.slug;
  const targetSlug = slugify(typeof rawSlug === 'string' ? rawSlug : Array.isArray(rawSlug) ? rawSlug[0] : '');
  
  // Contrôle de Souveraineté
  if (!assertSovereignty(currentUser.uid, currentUser.capabilities, targetSlug)) {
    return NextResponse.json({ message: "Souveraineté violée" }, { status: 403 });
  }

  let body;
  try {
    body = await req.json();
  } catch (jsonErr) {
    return NextResponse.json({ message: "Corps de requête invalide" }, { status: 400 });
  }
  
  const { imageType, url } = body;
  
  if (!imageType || !url) return NextResponse.json({ message: "Paramètres manquants" }, { status: 400 });
  
  const allowedTypes = ['avatarUrl', 'coverPicture'];
  if (!allowedTypes.includes(imageType)) return NextResponse.json({ message: "Type invalide" }, { status: 400 });

  // 1. Désintégration Physique Cloudflare R2
  try {
    const storageKey = storageService.extractKeyFromUrl(url);
    await storageService.deleteFile(storageKey);
  } catch (storageErr) {
    console.error("🔥 [STORAGE DELETE ERROR]", storageErr);
    return NextResponse.json({ message: "Impossible de désintégrer la trace physique." }, { status: 500 });
  }

  // 2. Nettoyage Silice (MongoDB)
  await OiseauModel.updateOne(
      { $or: [{ slug: targetSlug }, { uid: targetSlug }] }, 
      { $set: { [imageType]: null } }
  );

  // 3. Propagation Graphe (Neo4j)
  if (imageType === 'avatarUrl') {
      const neoSession = getNeo4jSession();
      try {
          await neoSession.run(
            `MATCH (u:User) WHERE u.uid = $targetId OR u.slug = $targetId 
             SET u.avatarUrl = null, u.updatedAt = datetime()`, 
            { targetId: targetSlug }
          );
      } catch (neoErr) {
          console.error("⚠️ [Neo4j] Échec de purge esthétique", neoErr);
      } finally { 
          try { await neoSession.close(); } catch (e) {} 
      }
  }

  // 💥 BOOM ! Invalidation du cache profil
  revalidateTag(`profile-${targetSlug}`);
  revalidateTag('users');

  return NextResponse.json({ success: true, message: "Artefact désintégré de l'apparence." });
});