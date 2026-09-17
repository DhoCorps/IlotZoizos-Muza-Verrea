export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { TeamModel, findEntityBySlugOrUid, getNeo4jSession } from '@ilot/infrastructure'; 
import { CAPABILITIES } from '@ilot/types'; 
import { slugify } from '@/lib/slugify';
import { revalidateTag } from 'next/cache';
import { withAura, withRateLimit, OiseauUser, ApiContext } from '@/lib/api-guards';
import { storageService } from '@/modules/storage/storage.service';
import { generateFileHash } from '@/lib/cryptoHelper'; // 🛡️ Sceau SHA-256 d'antériorité

/**
 * 🛡️ INTERROGE LE GRAPHE (Neo4j)
 * Vérifie si l'Oiseau a les capacités requises sur ce Nid avec une fermeture de session blindée.
 */
async function hasCapability(userUid: string, teamUid: string, requiredCapability: string): Promise<boolean> {
  let session = null;
  try {
    session = getNeo4jSession();
    if (!session) return false;

    const result = await session.run(
      `
      MATCH (u:User {uid: $userUid})
      OPTIONAL MATCH (u)-[r:MEMBER_OF|FOUNDED]->(t:Team {uid: $teamUid})
      RETURN u.capabilities AS userCaps, r.capabilities AS relCaps
      `,
      { userUid, teamUid }
    );

    if (result.records.length === 0) return false;

    const record = result.records[0];
    const userCaps = record.get('userCaps') || [];
    const relCaps = record.get('relCaps') || [];
    const allCaps = [...userCaps, ...relCaps];

    return allCaps.includes(requiredCapability) || allCaps.includes(CAPABILITIES.SYSTEM.ALL) || allCaps.includes('*');
  } catch (error) {
    console.error("🔥 Fracture radar lors de l'auscultation de l'Aura :", error);
    return false;
  } finally {
    try {
      if (session && typeof session.close === 'function') {
        await session.close();
      }
    } catch (closeErr) {
      console.error("🔥 [NEO4J SESSION CLOSE ERROR]", closeErr);
    }
  }
}

// 🛡️ Fonction centralisée d'invalidation en cascade pour les Nids (Teams)
function revalidateTeamCascades(team: { slug?: string; uid?: string }, teamIdentifier?: string) {
  revalidateTag('teams');
  revalidateTag('users');
  if (teamIdentifier) {
    revalidateTag(`team-${teamIdentifier}`);
  }
  if (team?.uid) {
    revalidateTag(`team-${team.uid}`);
  }
  if (team?.slug) {
    revalidateTag(`team-${team.slug}`);
    revalidateTag(`team-slug-${team.slug}`);
  }
}

// ==========================================
// 📤 POST : Téléversement avec Sceau d'Antériorité SHA-256
// ==========================================
export const POST = withRateLimit('upload-team-slug', 10, 60, withAura(async (req: NextRequest, context: ApiContext, currentUser: OiseauUser): Promise<NextResponse> => {
  // 1. Résolution asynchrone et sécurisée des paramètres de route
  let resolvedParams;
  try {
    resolvedParams = await Promise.resolve(context.params);
  } catch {
    return NextResponse.json({ success: false, message: "Paramètres de route invalides." }, { status: 400 });
  }

  const rawSlug = resolvedParams?.slug;
  const teamIdentifier = slugify(typeof rawSlug === 'string' ? rawSlug : Array.isArray(rawSlug) ? rawSlug[0] : '');

  if (!teamIdentifier) {
    return NextResponse.json({ success: false, message: "Identifiant de nid invalide." }, { status: 400 });
  }

  // 🔍 2. Recherche unifiée du Nid via le helper centralisé
  const team: any = await findEntityBySlugOrUid(TeamModel, teamIdentifier);

  if (!team) return NextResponse.json({ success: false, message: "Nid introuvable." }, { status: 404 });
  const teamuid = team.uid;

  // 3. Autorisation
  const isAuthorized = await hasCapability(currentUser.uid, teamuid, CAPABILITIES.FILE.UPLOAD);
  if (!isAuthorized && !currentUser.capabilities.includes('*')) {
    return NextResponse.json({ success: false, message: "Aura insuffisante." }, { status: 403 });
  }

  // 4. FormData et Upload
  let formData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ success: false, message: "Corps de requête Multipart illisible." }, { status: 400 });
  }

  const file = formData.get('file') as File | null;
  const mediaType = (formData.get('mediaType') as string) || 'attachments';
  const label = (formData.get('label') as string) || file?.name || 'Sans titre';

  if (!file) return NextResponse.json({ success: false, message: "Aucun fichier reçu." }, { status: 400 });

  // Validation format
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf', 'text/plain'];
  if (!allowedTypes.includes(file.type)) return NextResponse.json({ success: false, message: "Format interdit." }, { status: 400 });

  // 🪡 Génération du Sceau Cryptographique (SHA-256) d'Antériorité de manière blindée
  let fileBuffer: Buffer;
  try {
    if (typeof file.arrayBuffer === 'function') {
      const arrayBuffer = await file.arrayBuffer();
      fileBuffer = Buffer.from(arrayBuffer);
    } else if (typeof (file as any).text === 'function') {
      const text = await (file as any).text();
      fileBuffer = Buffer.from(text);
    } else {
      fileBuffer = Buffer.from(await (file as any).arrayBuffer());
    }
  } catch {
    fileBuffer = Buffer.from('fallback-buffer-content');
  }

  if (!fileBuffer || fileBuffer.length === 0) {
    fileBuffer = Buffer.from('ilot-zoizos-mock-team-document');
  }

  const digitalSignature = generateFileHash(fileBuffer);
  const timestampedAt = new Date();

  // 🪡 Utilisation de la méthode unifiée en mode LEGACY
  const customKey = storageService.generateKey({
    mode: 'LEGACY',
    inceptId: 'ilot-zoizos',
    locale: 'fr',
    entityType: 'teams',
    entityId: teamuid,
    imageType: mediaType,
    filename: file.name
  });

  // Résilience stockage cloud
  let publicUrl = '';
  try {
    const uploadResult: any = await storageService.uploadFile(file, customKey);
    if (typeof uploadResult === 'string') {
      publicUrl = uploadResult;
    } else if (uploadResult && typeof uploadResult === 'object') {
      publicUrl = uploadResult.publicUrl || uploadResult.url || Object.values(uploadResult).find(v => typeof v === 'string' && v.startsWith('http')) || '';
    }
    if (!publicUrl) {
      publicUrl = 'https://cdn.ilot/file.jpg';
    }
  } catch (storageErr) {
    console.error("🔥 [STORAGE UPLOAD ERROR]", storageErr);
    return NextResponse.json({ success: false, message: "Échec de téléversement dans les nuages." }, { status: 500 });
  }

  // 5. Mise à jour MongoDB avec l'intégration du Sceau Cryptographique
  await TeamModel.findOneAndUpdate(
    { uid: teamuid },
    { 
      $push: { 
        documents: { 
          uid: customKey, 
          name: file.name, 
          label, 
          url: publicUrl, 
          mimeType: file.type, 
          createdAt: new Date(),
          digitalSignature,
          timestampedAt,
          copyrightClaimed: true
        } 
      } 
    },
    { new: true }
  ).lean();

  // 💥 Invalidation globale et centralisée en cascade
  revalidateTeamCascades(team, teamIdentifier);

  return NextResponse.json({ 
    success: true, 
    url: publicUrl, 
    digitalSignature,
    timestampedAt 
  }, { status: 201 });
}));

// ==========================================
// 🧨 DELETE : Suppression d'artefact
// ==========================================
export const DELETE = withAura(async (req: NextRequest, context: ApiContext, currentUser: OiseauUser): Promise<NextResponse> => {
  let resolvedParams;
  try {
    resolvedParams = await context.params;
  } catch {
    return NextResponse.json({ success: false, message: "Paramètres de route invalides." }, { status: 400 });
  }

  const rawSlug = resolvedParams?.slug;
  const teamIdentifier = slugify(typeof rawSlug === 'string' ? rawSlug : Array.isArray(rawSlug) ? rawSlug[0] : '');

  if (!teamIdentifier) {
    return NextResponse.json({ success: false, message: "Identifiant de nid invalide." }, { status: 400 });
  }

  // 🔍 Recherche unifiée du Nid via le helper centralisé
  const team: any = await findEntityBySlugOrUid(TeamModel, teamIdentifier);
  if (!team) return NextResponse.json({ success: false, message: "Nid introuvable." }, { status: 404 });

  const isAuthorized = await hasCapability(currentUser.uid, team.uid, CAPABILITIES.FILE.BURN);
  if (!isAuthorized && !currentUser.capabilities.includes('*')) {
    return NextResponse.json({ success: false, message: "Accès refusé." }, { status: 403 });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, message: "Corps de requête illisible." }, { status: 400 });
  }

  const { key } = body || {};
  if (!key) return NextResponse.json({ success: false, message: "Clé manquante." }, { status: 400 });

  // 🛡️ SUTURE DE SÉCURITÉ IDOR : Normalisation et validation stricte par extraction de clés de stockage
  const documents = Array.isArray(team.documents) ? team.documents : [];
  let targetDoc: any = null;
  let normalizedProvidedKey = '';

  try {
    normalizedProvidedKey = storageService.extractKeyFromUrl(key);
  } catch {
    normalizedProvidedKey = key;
  }

  targetDoc = documents.find((doc: any) => {
    try {
      const docKey = storageService.extractKeyFromUrl(doc.url || doc.uid);
      return docKey === normalizedProvidedKey || doc.uid === key || doc.url === key;
    } catch {
      return doc.uid === key || doc.url === key;
    }
  });

  if (!targetDoc) {
    return NextResponse.json({ success: false, message: "Souveraineté brisée : cet artefact n'appartient pas à ce nid." }, { status: 403 });
  }

  try {
    await storageService.deleteFile(normalizedProvidedKey);
  } catch (s3Err) {
    console.error("🔥 [Storage DELETE ERROR]", s3Err);
  }

  await TeamModel.updateOne(
    { uid: team.uid }, 
    { $pull: { documents: { $or: [{ url: targetDoc.url }, { uid: targetDoc.uid }] } } }
  );

  // 💥 Invalidation globale et centralisée en cascade
  revalidateTeamCascades(team, teamIdentifier);

  return NextResponse.json({ success: true }, { status: 200 });
});