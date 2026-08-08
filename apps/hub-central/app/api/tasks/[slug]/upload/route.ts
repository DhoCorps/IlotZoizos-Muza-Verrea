import { NextRequest, NextResponse } from 'next/server';
import { TaskModel, getNeo4jSession } from '@ilot/infrastructure';
import { CAPABILITIES, ITask } from '@ilot/types';
import { slugify } from '@/lib/slugify';
import { revalidateTag } from 'next/cache';
import { withAura, OiseauUser, ApiContext } from '@/lib/api-guards';
import { storageService } from '@/modules/storage/storage.service';
import { checkRateLimit } from '@/modules/security/rateLimiter';

export const dynamic = 'force-dynamic';

/**
 * 🛡️ UTILITAIRE DE DOUANE (Spécifique à l'Atome)
 * Compile les droits pour la mutation d'artefacts.
 */
async function canUpdateTaskBySlug(userUid: string, taskUid: string): Promise<boolean> {
  let session;
  try {
    session = getNeo4jSession();
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
    if (result.records.length === 0) return false;

    const record = result.records[0];
    const projectCreatorUid = record.get('projectCreatorUid');
    const caps = record.get('allCaps').flat() || [];

    return projectCreatorUid === userUid || caps.includes(CAPABILITIES.TASK.UPDATE) || caps.includes('*');
  } catch (error) {
    console.error("🔥 [TASK CAPS ERROR]", error);
    return false;
  } finally {
    if (session) await session.close();
  }
}

// ==========================================
// 📤 POST : Greffer un artefact
// ==========================================
export const POST = withAura(async (req: NextRequest, context: ApiContext, currentUser: OiseauUser) => {
  // 1. Rate Limiting
  const clientIp = req.headers.get('x-forwarded-for') || '127.0.0.1';
  const { allowed } = await checkRateLimit(`upload-task-slug:${clientIp}`, 10, 60);
  if (!allowed) return NextResponse.json({ success: false, message: "Trop de téléversements." }, { status: 429 });

  const resolvedParams = await context.params;
  const rawSlug = resolvedParams?.slug;
  const taskId = slugify(typeof rawSlug === 'string' ? rawSlug : Array.isArray(rawSlug) ? rawSlug[0] : '');

  const task = await TaskModel.findOne({ uid: taskId }).lean<ITask>();
  if (!task) return NextResponse.json({ success: false, message: "Atome introuvable." }, { status: 404 });

  const isAuthorized = await canUpdateTaskBySlug(currentUser.uid, task.uid);
  if (!isAuthorized && !currentUser.capabilities.includes('*')) {
    return NextResponse.json({ success: false, message: "Aura insuffisante." }, { status: 403 });
  }

  const formData = await req.formData();
  const file = formData.get('file') as File | null;
  if (!file) return NextResponse.json({ success: false, message: "Aucune brindille reçue." }, { status: 400 });

  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf', 'text/plain'];
  if (!allowedTypes.includes(file.type)) return NextResponse.json({ success: false, message: "Format interdit." }, { status: 400 });

  const customKey = storageService.generateStructuredKey({
    inceptId: 'ilot-zoizos',
    locale: 'fr', // 🪡 Ajout du paramètre obligatoire requis par le storageService
    entityType: 'tasks',
    entityId: task.uid,
    imageType: 'attachments',
    filename: file.name
  });

  const uploadResult = await storageService.uploadFile(file, customKey);

  await TaskModel.findOneAndUpdate(
    { uid: task.uid },
    { $push: { documents: { uid: customKey, name: file.name, url: uploadResult.publicUrl, mimeType: file.type, createdAt: new Date() } } }
  );

  // 💥 Invalidation
  revalidateTag(`task-${taskId}`);

  return NextResponse.json({ success: true, url: uploadResult.publicUrl }, { status: 201 });
});

// ==========================================
// 🗑️ DELETE : Désintégration artefact
// ==========================================
export const DELETE = withAura(async (req: Request, context: ApiContext, currentUser: OiseauUser) => {
  const resolvedParams = await context.params;
  const rawSlug = resolvedParams?.slug;
  const taskId = slugify(typeof rawSlug === 'string' ? rawSlug : Array.isArray(rawSlug) ? rawSlug[0] : '');

  const task = await TaskModel.findOne({ uid: taskId }).lean<ITask>();
  if (!task) return NextResponse.json({ success: false, message: "Atome introuvable." }, { status: 404 });

  const isAuthorized = await canUpdateTaskBySlug(currentUser.uid, task.uid);
  if (!isAuthorized && !currentUser.capabilities.includes('*')) {
    return NextResponse.json({ success: false, message: "Aura insuffisante." }, { status: 403 });
  }

  const { key } = await req.json();
  await storageService.deleteFile(storageService.extractKeyFromUrl(key));
  await TaskModel.updateOne({ uid: task.uid }, { $pull: { documents: { url: key } } });

  // 💥 Invalidation
  revalidateTag(`task-${taskId}`);

  return NextResponse.json({ success: true }, { status: 200 });
});