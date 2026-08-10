export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { TeamModel, getNeo4jSession, ITeamDocument } from '@ilot/infrastructure'; 
import { CAPABILITIES } from '@ilot/types'; 
import { slugify } from '@/lib/slugify';
import { revalidateTag } from 'next/cache';
import { withAura, OiseauUser, ApiContext } from '@/lib/api-guards';
import { storageService } from '@/modules/storage/storage.service';
import { checkRateLimit } from '@/modules/security/rateLimiter';

/**
 * 🛡️ INTERROGE LE GRAPHE (Neo4j)
 * Vérifie si l'Oiseau a les capacités requises sur ce Nid.
 */
async function hasCapability(userUid: string, teamUid: string, requiredCapability: string): Promise<boolean> {
  let session;
  try {
    session = getNeo4jSession();
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
    if (session) {
      try { await session.close(); } catch (closeErr) {}
    }
  }
}

// ==========================================
// 📤 POST : Téléversement d'un artefact
// ==========================================
export const POST = withAura(async (req: NextRequest, context: ApiContext, currentUser: OiseauUser) => {
  // 1. Rate Limiting avec Suture de Souveraineté Absolue
  const clientIp = req.headers.get('x-forwarded-for') || '127.0.0.1';
  let rateLimitResult: { allowed?: boolean } = { allowed: true };
  try {
    const res = await checkRateLimit(`upload-team-slug:${clientIp}`, 10, 60);
    if (res && typeof res === 'object') {
      rateLimitResult = res;
    }
  } catch {
    rateLimitResult = { allowed: true };
  }

  if (rateLimitResult.allowed === false) {
    return NextResponse.json({ success: false, message: "Trop de téléversements." }, { status: 429 });
  }

  // 2. Résolution slug
  const resolvedParams = await context.params;
  const rawSlug = resolvedParams?.slug;
  const teamIdentifier = slugify(typeof rawSlug === 'string' ? rawSlug : Array.isArray(rawSlug) ? rawSlug[0] : '');

  // 3. Recherche du Nid
  const team = await TeamModel.findOne({ 
    $or: [{ slug: teamIdentifier }, { uid: teamIdentifier }] 
  }).lean<ITeamDocument>();

  if (!team) return NextResponse.json({ success: false, message: "Nid introuvable." }, { status: 404 });
  const teamUid = team.uid;

  // 4. Autorisation
  const isAuthorized = await hasCapability(currentUser.uid, teamUid, CAPABILITIES.FILE.UPLOAD);
  if (!isAuthorized && !currentUser.capabilities.includes('*')) {
    return NextResponse.json({ success: false, message: "Aura insuffisante." }, { status: 403 });
  }

  // 5. FormData et Upload
  const formData = await req.formData();
  const file = formData.get('file') as File | null;
  const mediaType = (formData.get('mediaType') as string) || 'attachments';
  const label = (formData.get('label') as string) || file?.name || 'Sans titre';

  if (!file) return NextResponse.json({ success: false, message: "Aucun fichier reçu." }, { status: 400 });

  // Validation format
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf', 'text/plain'];
  if (!allowedTypes.includes(file.type)) return NextResponse.json({ success: false, message: "Format interdit." }, { status: 400 });

  const customKey = storageService.generateStructuredKey({
    inceptId: 'ilot-zoizos', locale: 'fr', entityType: 'teams', entityId: teamUid, imageType: mediaType, filename: file.name
  });

  const uploadResult = await storageService.uploadFile(file, customKey);

  // 6. Mise à jour MongoDB
  const updatedTeam = await TeamModel.findOneAndUpdate(
    { uid: teamUid },
    { $push: { documents: { uid: customKey, name: file.name, label, url: uploadResult.publicUrl, mimeType: file.type, createdAt: new Date() } } },
    { new: true }
  ).lean();

  // 💥 Invalidation cache
  revalidateTag('teams');
  revalidateTag(`team-${teamIdentifier}`);

  return NextResponse.json({ success: true, url: uploadResult.publicUrl }, { status: 201 });
});

// ==========================================
// 🧨 DELETE : Suppression d'artefact
// ==========================================
export const DELETE = withAura(async (req: NextRequest, context: ApiContext, currentUser: OiseauUser) => {
  const resolvedParams = await context.params;
  const rawSlug = resolvedParams?.slug;
  const teamIdentifier = slugify(typeof rawSlug === 'string' ? rawSlug : Array.isArray(rawSlug) ? rawSlug[0] : '');

  const team = await TeamModel.findOne({ $or: [{ slug: teamIdentifier }, { uid: teamIdentifier }] }).lean<ITeamDocument>();
  if (!team) return NextResponse.json({ success: false, message: "Nid introuvable." }, { status: 404 });

  const isAuthorized = await hasCapability(currentUser.uid, team.uid, CAPABILITIES.FILE.BURN);
  if (!isAuthorized && !currentUser.capabilities.includes('*')) {
    return NextResponse.json({ success: false, message: "Accès refusé." }, { status: 403 });
  }

  const { key } = await req.json();
  if (!key) return NextResponse.json({ success: false, message: "Clé manquante." }, { status: 400 });

  await storageService.deleteFile(storageService.extractKeyFromUrl(key));
  await TeamModel.updateOne({ uid: team.uid }, { $pull: { documents: { url: key } } });

  // 💥 Invalidation
  revalidateTag('teams');
  revalidateTag(`team-${teamIdentifier}`);

  return NextResponse.json({ success: true }, { status: 200 });
});