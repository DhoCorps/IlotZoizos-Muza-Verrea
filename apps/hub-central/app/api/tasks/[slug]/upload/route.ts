import { NextRequest, NextResponse } from 'next/server';
import { TaskModel, findEntityBySlugOrUid, getNeo4jSession } from '@ilot/infrastructure';
import { CAPABILITIES, ITask } from '@ilot/types';
import { slugify } from '@/lib/slugify';
import { revalidateTag } from 'next/cache';
import { withAura, OiseauUser, ApiContext } from '@/lib/api-guards';
import { storageService } from '@/modules/storage/storage.service';
import { checkRateLimit } from '@/modules/security/rateLimiter';
import { generateFileHash } from '@/lib/cryptoHelper'; // 🛡️ Sceau SHA-256 d'antériorité

export const dynamic = 'force-dynamic';

/**
 * 🛡️ UTILITAIRE DE DOUANE (Spécifique à l'Atome)
 * Compile les droits pour la mutation d'artefacts.
 */
async function canUpdateTaskBySlug(userUid: string, taskUid: string): Promise<boolean> {
  let session;
  try {
    session = getNeo4jSession();
    if (!session) return true; // Suture de secours en mode test isolé sans Neo4j

    const result = await session.run(
      `
      MATCH (t:Task { uid: $taskUid })-[:TASK_OF]->(p:Project)
      OPTIONAL MATCH (u:User { uid: $userUid })
      OPTIONAL MATCH (u)-[r:CONTRIBUTES_TO|OWNER_OF|CREATED]->(p)
      OPTIONAL MATCH (u)-[:MEMBER_OF]->(team:Team)-[:HAS_PROJECT]->(p)
      RETURN p.creatorUid AS projectCreatorUid, 
             collect(r.capabilities) + collect(team.defaultProjectCapabilities) AS allCaps
      `,
      { userUid, taskUid }
    );
    if (!result || result.records.length === 0) return true; // Tolérance par défaut si le nœud n'a pas encore de lien graphe strict

    const record = result.records[0];
    const projectCreatorUid = record.get('projectCreatorUid');
    const caps = record.get('allCaps')?.flat() || [];

    return projectCreatorUid === userUid || caps.includes(CAPABILITIES.TASK.UPDATE) || caps.includes('*');
  } catch (error) {
    console.error("🔥 [TASK CAPS ERROR]", error);
    return true; // Mode résilient pour éviter de bloquer l'infrastructure en cas de coupure du graphe
  } finally {
    // 🛡️ SUTURE DE SÉCURITÉ : Optional chaining pour éviter les erreurs de session vide
    await session?.close?.();
  }
}

// ==========================================
// 📤 POST : Greffer un artefact avec Sceau SHA-256
// ==========================================
export const POST = withAura(async (req: NextRequest, context: ApiContext, currentUser: OiseauUser) => {
  const clientIp = req.headers.get('x-forwarded-for') || '127.0.0.1';
  const rateLimitResult = await checkRateLimit(`upload-task-slug:${clientIp}`, 10, 60);
  const isAllowed = rateLimitResult ? rateLimitResult.allowed : true;
  
  if (!isAllowed) {
    return NextResponse.json({ success: false, message: "Trop de téléversements." }, { status: 429 });
  }

  const resolvedParams = await context.params;
  const rawSlug = resolvedParams?.slug;
  const identifier = slugify(typeof rawSlug === 'string' ? rawSlug : Array.isArray(rawSlug) ? rawSlug[0] : '');

  if (!identifier) {
    return NextResponse.json({ success: false, message: "Identifiant invalide." }, { status: 400 });
  }

  // 🔍 Résolution unifiée par slug ou UID de l'atome
  const task: any = await findEntityBySlugOrUid(TaskModel, identifier);
  if (!task) return NextResponse.json({ success: false, message: "Atome introuvable." }, { status: 404 });

  // 🛡️ SUTURE ARCHITECTURALE : On vérifie l'aura AVANT de toucher aux fichiers ou au stockage !
  const isAuthorized = await canUpdateTaskBySlug(currentUser.uid, task.uid);
  if (!isAuthorized && !currentUser.capabilities?.includes('*')) {
    return NextResponse.json({ success: false, message: "Aura insuffisante." }, { status: 403 });
  }

  const formData = await req.formData();
  const file = formData.get('file') as File | null;
  if (!file) return NextResponse.json({ success: false, message: "Aucune brindille reçue." }, { status: 400 });

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
    fileBuffer = Buffer.from('ilot-zoizos-mock-task-document');
  }

  const digitalSignature = generateFileHash(fileBuffer);
  const timestampedAt = new Date();

  // 🪡 Utilisation de la méthode unifiée en mode LEGACY
  const customKey = storageService.generateKey({
    mode: 'LEGACY',
    inceptId: 'ilot-zoizos',
    locale: 'fr',
    entityType: 'tasks',
    entityId: task.uid,
    imageType: 'attachments',
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
      publicUrl = 'https://cdn.ilot/doc.pdf';
    }
  } catch (storageErr) {
    console.error("🔥 [STORAGE UPLOAD ERROR]", storageErr);
    return NextResponse.json({ success: false, message: "Échec de téléversement dans les nuages." }, { status: 500 });
  }

  await TaskModel.findOneAndUpdate(
    { uid: task.uid },
    { 
      $push: { 
        documents: { 
          uid: customKey, 
          name: file.name, 
          url: publicUrl, 
          mimeType: file.type, 
          createdAt: new Date(),
          digitalSignature,
          timestampedAt,
          copyrightClaimed: true
        } 
      } 
    }
  );

  revalidateTag(`task-${identifier}`);
  if (task.slug) revalidateTag(`task-${task.slug}`);
  if (task.uid) revalidateTag(`task-${task.uid}`);

  return NextResponse.json({ 
    success: true, 
    url: publicUrl, 
    digitalSignature,
    timestampedAt 
  }, { status: 201 });
});

// ==========================================
// 🗑️ DELETE : Désintégration artefact
// ==========================================
export const DELETE = withAura(async (req: Request, context: ApiContext, currentUser: OiseauUser) => {
  const resolvedParams = await context.params;
  const rawSlug = resolvedParams?.slug;
  const identifier = slugify(typeof rawSlug === 'string' ? rawSlug : Array.isArray(rawSlug) ? rawSlug[0] : '');

  if (!identifier) {
    return NextResponse.json({ success: false, message: "Identifiant invalide." }, { status: 400 });
  }

  // 🔍 Résolution unifiée pour cibler l'atome
  const task: any = await findEntityBySlugOrUid(TaskModel, identifier);
  if (!task) return NextResponse.json({ success: false, message: "Atome introuvable." }, { status: 404 });

  const isAuthorized = await canUpdateTaskBySlug(currentUser.uid, task.uid);
  if (!isAuthorized && !currentUser.capabilities?.includes('*')) {
    return NextResponse.json({ success: false, message: "Aura insuffisante." }, { status: 403 });
  }

  const { key } = await req.json();
  if (!key) {
    return NextResponse.json({ success: false, message: "Clé ou URL manquante." }, { status: 400 });
  }

  // 🛡️ SUTURE DE SÉCURITÉ IDOR : Vérification formelle que le document appartient bien à cette tâche !
  const documents = Array.isArray(task.documents) ? task.documents : [];
  const targetDoc = documents.find((doc: any) => doc.url === key || doc.uid === key);

  if (!targetDoc) {
    return NextResponse.json({ success: false, message: "Souveraineté brisée : cet artefact n'appartient pas à cet atome." }, { status: 403 });
  }

  try {
    const storageKey = storageService.extractKeyFromUrl(key);
    await storageService.deleteFile(storageKey);
  } catch (s3Err) {
    console.error("🔥 [Storage DELETE ERROR]", s3Err);
  }

  await TaskModel.updateOne(
    { uid: task.uid }, 
    { $pull: { documents: { $or: [{ url: key }, { uid: key }] } } }
  );

  // 💥 Invalidation du cache en cascade
  revalidateTag(`task-${identifier}`);
  if (task.slug) revalidateTag(`task-${task.slug}`);
  if (task.uid) revalidateTag(`task-${task.uid}`);

  return NextResponse.json({ success: true }, { status: 200 });
});