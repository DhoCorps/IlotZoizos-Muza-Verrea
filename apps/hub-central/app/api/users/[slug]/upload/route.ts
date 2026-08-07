import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { connectToDatabase, OiseauModel, getNeo4jSession } from '@ilot/infrastructure'; 
import { storageService } from '../../../../../modules/storage/storage.service';
import { checkRateLimit } from '../../../../../modules/security/rateLimiter';
import { authOptions } from "../../../../../lib/auth"; 
import { IOiseau } from '@ilot/types';
import { slugify } from '@/lib/slugify';

interface RouteParams {
  params: Promise<{ slug: string }>;
}

interface OiseauUser {
  id: string;
  uid: string;
  capabilities: string[];
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const clientIp = req.headers.get('x-forwarded-for') || '127.0.0.1';
    const { allowed } = await checkRateLimit(`upload-user-slug:${clientIp}`, 10, 60);
    if (!allowed) {
      return NextResponse.json({ success: false, message: "Trop de téléversements. Veuillez patienter." }, { status: 429 });
    }

    try {
      await connectToDatabase();
    } catch (dbErr) {
      console.error("❌ [DB ERROR USER UPLOAD]", dbErr);
      return NextResponse.json({ success: false, message: "La Silice est injoignable." }, { status: 500 });
    }

    let rawSlug;
    try {
      const resolvedParams = await params;
      rawSlug = resolvedParams.slug;
    } catch (paramErr) {
      return NextResponse.json({ success: false, message: "Paramètres de route invalides." }, { status: 400 });
    }
    const targetSlug = slugify(rawSlug || '');

    // 🛡️ DOUANE DE SOUVERAINETÉ ET DE CONNEXION
    let session;
    try {
      session = await getServerSession(authOptions);
    } catch (sessionErr) {
      return NextResponse.json({ success: false, message: "Erreur de lecture d'Aura." }, { status: 500 });
    }

    const visitorUid = (session?.user as OiseauUser | undefined)?.uid;
    const visitorCaps = (session?.user as OiseauUser | undefined)?.capabilities || [];

    if (!visitorUid) {
      return NextResponse.json({ success: false, message: "Le miroir est vide. Identifie-toi." }, { status: 401 });
    }

    // Le visiteur est-il propriétaire du profil ou a-t-il les pleins pouvoirs ?
    const isSelf = visitorUid === targetSlug || slugify(visitorUid) === targetSlug;
    const isAdmin = visitorCaps.includes('*');

    if (!isSelf && !isAdmin) {
      return NextResponse.json({ success: false, message: "Souveraineté violée : vous ne pouvez modifier un autre Oiseau." }, { status: 403 });
    }

    // Extraction du payload
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

    // Le Bouclier des Types
    const allowedTypes = ['avatarUrl', 'coverPicture']; 
    if (!allowedTypes.includes(imageType)) {
        return NextResponse.json({ success: false, message: `Type d'image invalide (attendu: ${allowedTypes.join(', ')}).` }, { status: 400 });
    }

    // Le Bouclier des Formats & Poids
    const allowedImageTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedImageTypes.includes(file.type)) {
      return NextResponse.json({ success: false, message: `Ineptie : La Silice attend une image, pas du ${file.type}.` }, { status: 400 });
    }

    if (file.size > 5 * 1024 * 1024) {
       return NextResponse.json({ success: false, message: `La brindille est trop lourde (Max 5 Mo).` }, { status: 400 });
    }

    // --- L'ALCHIMIE DU STORAGE VIA STORAGE SERVICE (Cloudflare R2) ---
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

    // --- LA SUTURE BASE DE DONNÉES (MongoDB) ---
    const updatedUser = (await OiseauModel.findOneAndUpdate(
        { $or: [{ slug: targetSlug }, { uid: targetSlug }] }, 
        { [imageType]: publicUrl }, 
        { new: true } 
    ).lean()) as unknown as IOiseau | null;

    if (!updatedUser) {
        return NextResponse.json({ success: false, message: "L'Oiseau est introuvable dans la matrice." }, { status: 404 });
    }

    // --- PROPAGATION DANS LE GRAPHE (Neo4j) ---
    if (imageType === 'avatarUrl') {
      const neoSession = getNeo4jSession();
      try {
        await neoSession.run(
          `MATCH (u:User) WHERE u.uid = $targetId OR u.slug = $targetId
           SET u.avatarUrl = $publicUrl, u.updatedAt = datetime()`,
          { targetId: targetSlug, publicUrl }
        );
      } catch (neoError) {
        console.error("⚠️ [Neo4j] Échec mineur de propagation esthétique sur le nœud User :", neoError);
      } finally {
        try { await neoSession.close(); } catch (closeErr) {}
      }
    }

    return NextResponse.json(
      {
        success: true,
        message: `L'apparence de ${updatedUser.pseudo} a muté avec succès !`,
        publicUrl: publicUrl,
        user: updatedUser.pseudo 
      },
      { status: 201 }
    );

  } catch (error: any) {
    console.error("🔥 Ineptitude technique :", error);
    return NextResponse.json({ success: false, message: "Le chaos a frappé la matrice d'upload." }, { status: 500 });
  }
}

// --- 🧨 DELETE : DÉSINTÉGRATION PHYSIQUE ET SILICE ---
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    try {
      await connectToDatabase();
    } catch (dbErr) {
      return NextResponse.json({ message: "La Silice est injoignable." }, { status: 500 });
    }

    let rawSlug;
    try {
      const resolvedParams = await params;
      rawSlug = resolvedParams.slug;
    } catch (paramErr) {
      return NextResponse.json({ message: "Paramètres de route invalides." }, { status: 400 });
    }
    const targetSlug = slugify(rawSlug || '');
    
    let session;
    try {
      session = await getServerSession(authOptions);
    } catch (sessionErr) {
      return NextResponse.json({ message: "Erreur de lecture d'Aura." }, { status: 500 });
    }

    const visitorUid = (session?.user as OiseauUser | undefined)?.uid;
    const visitorCaps = (session?.user as OiseauUser | undefined)?.capabilities || [];

    if (!visitorUid) {
      return NextResponse.json({ message: "Non autorisé" }, { status: 401 });
    }

    const isSelf = visitorUid === targetSlug || slugify(visitorUid) === targetSlug;
    const isAdmin = visitorCaps.includes('*');

    if (!isSelf && !isAdmin) {
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

    // 1. Désintégration Physique via storageService
    try {
      const storageKey = storageService.extractKeyFromUrl(url);
      await storageService.deleteFile(storageKey);
    } catch (storageErr) {
      console.error("🔥 [STORAGE DELETE ERROR]", storageErr);
      return NextResponse.json({ message: "Impossible de désintégrer la trace physique." }, { status: 500 });
    }

    // 2. Nettoyage de la Silice (Mongo)
    await OiseauModel.updateOne(
        { $or: [{ slug: targetSlug }, { uid: targetSlug }] }, 
        { $set: { [imageType]: null } }
    );

    // 3. Propagation au Graphe (Neo4j)
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

    return NextResponse.json({ success: true, message: "Artefact désintégré de l'apparence." });
  } catch (err: any) {
    console.error("🔥 Fracture de purge :", err);
    return NextResponse.json({ message: err.message || "Erreur interne" }, { status: 500 });
  }
}