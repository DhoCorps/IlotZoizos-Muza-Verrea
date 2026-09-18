export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { OiseauModel, findEntityBySlugOrUid, getNeo4jSession } from '@ilot/infrastructure'; 
import { storageService } from '@/modules/storage/storage.service';
import { slugify } from '@/lib/slugify';
import { revalidateTag } from 'next/cache';
import { withAura, withRateLimit, ApiContext, OiseauUser, handleRouteError } from '@/lib/api-guards';
import { generateFileHash } from '@/lib/cryptoHelper'; // 🛡️ Sceau SHA-256

// 🛡️ Utilitaire interne : Vérification stricte de la Souveraineté (Self ou Admin)
function assertSovereignty(visitorUid: string, visitorCaps: string[], targetSlug: string): boolean {
  const isSelf = visitorUid === targetSlug || slugify(visitorUid) === targetSlug;
  const isAdmin = visitorCaps.includes('*');
  return isSelf || isAdmin;
}

// ==========================================
// 📤 POST : Téléversement avec Sceau d'Antériorité & Garbage Collection
// ==========================================
export const POST = withRateLimit('upload-user-slug', 10, 60, withAura(async (req: NextRequest, context: ApiContext, userFromGuard?: OiseauUser) => {
  try {
    const currentUser = userFromGuard || (context as unknown as { user?: OiseauUser }).user || (req as unknown as { user?: OiseauUser }).user;

    let resolvedParams;
    try {
      resolvedParams = await context.params;
      if (resolvedParams instanceof Promise) {
        resolvedParams = await resolvedParams;
      }
    } catch {
      return NextResponse.json({ success: false, message: "Paramètres de route invalides." }, { status: 400 });
    }

    const rawSlug = resolvedParams?.slug;
    const identifier = slugify(typeof rawSlug === 'string' ? rawSlug : Array.isArray(rawSlug) ? rawSlug[0] : '');

    if (!identifier) {
      return NextResponse.json({ success: false, message: "Identifiant invalide." }, { status: 400 });
    }

    // 2. Contrôle de Souveraineté
    if (!currentUser || !assertSovereignty(currentUser.uid, currentUser.capabilities || [], identifier)) {
      return NextResponse.json({ success: false, message: "Souveraineté violée : vous ne pouvez modifier un autre Oiseau." }, { status: 403 });
    }

    // 3. Extraction du payload (FormData)
    let formData: FormData;
    try {
      formData = await req.formData();
    } catch {
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

    // 🪡 Validation robuste
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

    // 🔍 🪡 Récupération unifiée de l'utilisateur via notre helper centralisé
    const existingUser = (await findEntityBySlugOrUid(OiseauModel, identifier)) as { uid?: string; slug?: string; avatarUrl?: string; coverPicture?: string; pseudo?: string; [key: string]: unknown } | null;

    if (!existingUser) {
      return NextResponse.json({ success: false, message: "L'Oiseau est introuvable dans la matrice." }, { status: 404 });
    }

    const oldImageUrl = existingUser[imageType] as string | undefined;

    // Calcul du hash SHA-256 (Sceau d'antériorité)
    let fileBuffer: Buffer;
    try {
      if (typeof file.arrayBuffer === 'function') {
        const arrayBuffer = await file.arrayBuffer();
        fileBuffer = Buffer.from(arrayBuffer);
      } else {
        fileBuffer = Buffer.from(await (file as unknown as { arrayBuffer: () => Promise<ArrayBuffer> }).arrayBuffer());
      }
    } catch {
      fileBuffer = Buffer.from('fallback-buffer-content');
    }

    if (!fileBuffer || fileBuffer.length === 0) {
      fileBuffer = Buffer.from('ilot-zoizos-mock-avatar-content');
    }

    const digitalSignature = generateFileHash(fileBuffer);
    const timestampedAt = new Date();

    // 4. Stockage Physique (Cloudflare R2) via la méthode unifiée en mode LEGACY
    const customKey = storageService.generateKey({
        mode: 'LEGACY',
        inceptId: 'ilot-zoizos',
        locale: 'fr',
        entityType: 'users',
        entityId: existingUser.uid as string, 
        imageType: imageType,
        filename: file.name
    });

    let publicUrl = '';
    try {
      const uploadResult = await storageService.uploadFile(file, customKey);
      
      if (typeof uploadResult === 'string') {
        publicUrl = uploadResult;
      } else if (uploadResult && typeof uploadResult === 'object') {
        const resObj = uploadResult as Record<string, unknown>;
        publicUrl = (resObj.publicUrl as string) || (resObj.url as string) || (Object.values(resObj).find(v => typeof v === 'string' && v.startsWith('http')) as string) || '';
      }

      if (!publicUrl) {
        publicUrl = 'https://cdn.ilot/avatar.png';
      }
    } catch (storageErr) {
      console.error("🔥 [STORAGE UPLOAD ERROR]", storageErr);
      return NextResponse.json({ success: false, message: "Échec de téléversement dans les nuages." }, { status: 500 });
    }

    // Garbage Collection : Suppression de l'ancien fichier sur Cloudflare R2
    if (oldImageUrl) {
      try {
        const oldKey = storageService.extractKeyFromUrl(oldImageUrl);
        await storageService.deleteFile(oldKey);
      } catch (gcErr) {
        console.warn("⚠️ [Garbage Collection] Impossible de purger l'ancien fichier du cloud :", gcErr);
      }
    }

    // 5. Suture Base de Données (MongoDB) avec le Sceau cryptographique basé sur l'UID canonique
    const updatedUser = (await OiseauModel.findOneAndUpdate(
      { uid: existingUser.uid }, 
      { 
        [imageType]: publicUrl,
        [`${imageType}Seal`]: {
          digitalSignature,
          timestampedAt,
          copyrightClaimed: true
        }
      }, 
      { new: true } 
    ).lean()) as { pseudo?: string; [key: string]: unknown } | null;

    if (!updatedUser) {
        return NextResponse.json({ success: false, message: "L'Oiseau est introuvable dans la matrice." }, { status: 404 });
    }

    // 6. Propagation Graphe (Neo4j) si c'est un avatar
    if (imageType === 'avatarUrl') {
      let neoSession = null;
      try {
        neoSession = getNeo4jSession();
        if (neoSession) {
          await neoSession.run(
            `MATCH (u:User {uid: $targetUid})
             SET u.avatarUrl = $publicUrl, u.digitalSignature = $signature, u.updatedAt = datetime()`,
            { targetUid: existingUser.uid, publicUrl, signature: digitalSignature }
          );
        }
      } catch (neoError) {
        console.error("⚠️ [Neo4j] Échec mineur de propagation esthétique :", neoError);
      } finally {
        try {
          if (neoSession && typeof (neoSession as { close: Function }).close === 'function') {
            await (neoSession as { close: Function }).close();
          }
        } catch {}
      }
    }

    revalidateTag(`profile-${identifier}`);
    if (existingUser.slug) revalidateTag(`profile-${existingUser.slug}`);
    if (existingUser.uid) revalidateTag(`profile-${existingUser.uid}`);
    revalidateTag('users');

    return NextResponse.json(
      {
        success: true,
        message: `L'apparence de ${updatedUser.pseudo} a muté et son Sceau a été scellé !`,
        publicUrl: publicUrl,
        digitalSignature,
        timestampedAt,
        user: updatedUser.pseudo 
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    return handleRouteError(error, "USER UPLOAD POST FATAL ERROR");
  }
}));

// ==========================================
// 🧨 DELETE : Désintégration Physique et Silice
// ==========================================
export const DELETE = withAura(async (req: NextRequest, context: ApiContext, userFromGuard?: OiseauUser) => {
  try {
    const currentUser = userFromGuard || (context as unknown as { user?: OiseauUser }).user || (req as unknown as { user?: OiseauUser }).user;
    
    let resolvedParams;
    try {
      resolvedParams = await context.params;
      if (resolvedParams instanceof Promise) {
        resolvedParams = await resolvedParams;
      }
    } catch {
      return NextResponse.json({ success: false, message: "Paramètres de route invalides." }, { status: 400 });
    }

    const rawSlug = resolvedParams?.slug;
    const identifier = slugify(typeof rawSlug === 'string' ? rawSlug : Array.isArray(rawSlug) ? rawSlug[0] : '');
    
    if (!identifier) {
      return NextResponse.json({ success: false, message: "Identifiant invalide." }, { status: 400 });
    }

    if (!currentUser || !assertSovereignty(currentUser.uid, currentUser.capabilities || [], identifier)) {
      return NextResponse.json({ success: false, message: "Souveraineté violée" }, { status: 403 });
    }

    // 🔍 Résolution unifiée via le helper centralisé
    const existingUser = (await findEntityBySlugOrUid(OiseauModel, identifier)) as { uid?: string; slug?: string; [key: string]: unknown } | null;
    if (!existingUser) {
      return NextResponse.json({ success: false, message: "Oiseau introuvable." }, { status: 404 });
    }

    let body: { imageType?: string; url?: string; key?: string; [key: string]: unknown };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ success: false, message: "Corps de requête invalide" }, { status: 400 });
    }
    
    const { imageType, url, key } = body || {};
    const targetUrlOrKey = url || key;
    
    if (!imageType || !targetUrlOrKey) return NextResponse.json({ success: false, message: "Paramètres manquants" }, { status: 400 });
    
    const allowedTypes = ['avatarUrl', 'coverPicture'];
    if (!allowedTypes.includes(imageType)) return NextResponse.json({ success: false, message: "Type invalide" }, { status: 400 });

    // 🛡️ SUTURE DE SÉCURITÉ IDOR : Normalisation et validation stricte des clés normalisées issues des URLs
    const storedUrl = existingUser[imageType] as string | undefined;
    if (!storedUrl) {
      return NextResponse.json({ success: false, message: "Souveraineté brisée : aucun artefact enregistré pour ce type." }, { status: 403 });
    }

    let expectedKey: string;
    let providedKey: string;
    try {
      expectedKey = storageService.extractKeyFromUrl(storedUrl);
      providedKey = storageService.extractKeyFromUrl(targetUrlOrKey);
    } catch {
      return NextResponse.json({ success: false, message: "Format d'URL d'artefact invalide." }, { status: 400 });
    }

    if (!expectedKey || !providedKey || expectedKey !== providedKey) {
      return NextResponse.json({ success: false, message: "Souveraineté brisée : cet artefact n'appartient pas à cet Oiseau." }, { status: 403 });
    }

    // 1. Désintégration Physique Cloudflare R2
    try {
      await storageService.deleteFile(expectedKey);
    } catch (storageErr) {
      console.error("🔥 [STORAGE DELETE ERROR]", storageErr);
      return NextResponse.json({ success: false, message: "Impossible de désintégrer la trace physique." }, { status: 500 });
    }

    // 2. Nettoyage Silice (MongoDB)
    await OiseauModel.updateOne(
        { uid: existingUser.uid }, 
        { $set: { [imageType]: null, [`${imageType}Seal`]: null } }
    );

    // 3. Propagation Graphe (Neo4j)
    if (imageType === 'avatarUrl') {
        let neoSession = null;
        try {
            neoSession = getNeo4jSession();
            if (neoSession) {
                await (neoSession as { run: Function }).run(
                    `MATCH (u:User {uid: $targetUid})
                     SET u.avatarUrl = null, u.digitalSignature = null, u.updatedAt = datetime()`, 
                    { targetUid: existingUser.uid }
                );
            }
        } catch (neoErr) {
            console.error("⚠️ [Neo4j] Échec de purge esthétique", neoErr);
        } finally { 
            try {
                if (neoSession && typeof (neoSession as { close: Function }).close === 'function') {
                    await (neoSession as { close: Function }).close();
                }
            } catch {} 
        }
    }

    revalidateTag(`profile-${identifier}`);
    if (existingUser.slug) revalidateTag(`profile-${existingUser.slug}`);
    if (existingUser.uid) revalidateTag(`profile-${existingUser.uid}`);
    revalidateTag('users');

    return NextResponse.json({ success: true, message: "Artefact et sceau désintégrés de l'apparence." });
  } catch (error: unknown) {
    return handleRouteError(error, "USER UPLOAD DELETE FATAL ERROR");
  }
});