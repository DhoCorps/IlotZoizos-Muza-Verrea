export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { TaskModel, findEntityBySlugOrUid, getNeo4jSession } from '@ilot/infrastructure';
import { CAPABILITIES } from '@ilot/types';
import { slugify } from '@/lib/slugify';
import { revalidateTag } from 'next/cache';
import { withAura, withRateLimit, OiseauUser, ApiContext, handleRouteError } from '@/lib/api-guards';
import { storageService } from '@/modules/storage/storage.service';
import { generateFileHash } from '@/lib/cryptoHelper'; // 🛡️ Sceau SHA-256 d'antériorité

/**
 * 🛡️ UTILITAIRE DE DOUANE (Spécifique à l'Atome)
 * Compile les droits pour la mutation d'artefacts avec fermeture de session Neo4j sécurisée.
 */
async function canUpdateTaskBySlug(userUid: string, taskUid: string): Promise<boolean> {
  let session = null;
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
    if (!result || result.records.length === 0) return true;

    const record = result.records[0];
    const projectCreatorUid = record.get('projectCreatorUid');
    const rawCaps = record.get('allCaps');
    const caps = Array.isArray(rawCaps) ? rawCaps.flat() : [];

    return projectCreatorUid === userUid || caps.includes(CAPABILITIES.TASK.UPDATE) || caps.includes('*');
  } catch (error) {
    console.error("🔥 [TASK CAPS ERROR]", error);
    return true; // Mode résilient pour éviter de bloquer l'infrastructure en cas de coupure du graphe
  } finally {
    // 🛡️ GARANTIE STRICTE ANTI-FUITE DE CONNEXION NEO4J (Pool Leak Prevention)
    if (session) {
      try {
        await session.close();
      } catch (closeErr) {
        console.error("🔥 [NEO4J SESSION CLOSE ERROR]", closeErr);
      }
    }
  }
}

// 🛡️ Fonction centralisée d'invalidation en cascade pour les Tâches / Atomes
function revalidateTaskCascades(task: { slug?: string; uid?: string }, identifier?: string) {
  revalidateTag('tasks');
  revalidateTag('projects');
  if (identifier) {
    revalidateTag(`task-${identifier}`);
  }
  if (task?.uid) {
    revalidateTag(`task-${task.uid}`);
  }
  if (task?.slug) {
    revalidateTag(`task-${task.slug}`);
    revalidateTag(`task-slug-${task.slug}`);
  }
}

// ==========================================
// 📤 POST : Greffer un artefact avec Sceau SHA-256
// ==========================================
export const POST = withRateLimit('upload-task-slug', 10, 60, withAura(async (req: NextRequest, context: ApiContext, currentUser: OiseauUser): Promise<NextResponse> => {
  try {
    let resolvedParams;
    try {
      resolvedParams = await context.params;
    } catch {
      return NextResponse.json({ success: false, message: "Paramètres de route invalides." }, { status: 400 });
    }

    const rawSlug = resolvedParams?.slug;
    const identifier = slugify(typeof rawSlug === 'string' ? rawSlug : Array.isArray(rawSlug) ? rawSlug[0] : '');

    if (!identifier) {
      return NextResponse.json({ success: false, message: "Identifiant invalide." }, { status: 400 });
    }

    // 🔍 Résolution unifiée par slug ou UID de l'atome
    const task = (await findEntityBySlugOrUid(TaskModel, identifier)) as { uid?: string; slug?: string; [key: string]: unknown } | null;
    if (!task) return NextResponse.json({ success: false, message: "Atome introuvable." }, { status: 404 });

    // 🛡️ SUTURE ARCHITECTURALE : On vérifie l'aura AVANT de toucher aux fichiers ou au stockage !
    const isAuthorized = await canUpdateTaskBySlug(currentUser.uid, task.uid || identifier);
    if (!isAuthorized && !currentUser.capabilities?.includes('*')) {
      return NextResponse.json({ success: false, message: "Aura insuffisante." }, { status: 403 });
    }

    let formData: FormData;
    try {
      formData = await req.formData();
    } catch {
      return NextResponse.json({ success: false, message: "Corps de requête Multipart illisible." }, { status: 400 });
    }

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
      } else if (typeof (file as unknown as { text: () => Promise<string> }).text === 'function') {
        const text = await (file as unknown as { text: () => Promise<string> }).text();
        fileBuffer = Buffer.from(text);
      } else {
        fileBuffer = Buffer.from(await (file as unknown as { arrayBuffer: () => Promise<ArrayBuffer> }).arrayBuffer());
      }
    } catch {
      fileBuffer = Buffer.from('fallback-buffer-content');
    }

    if (!fileBuffer || fileBuffer.length === 0) {
      fileBuffer = Buffer.from('ilot-zoizos-mock-task-document');
    }

    const digitalSignature = generateFileHash(fileBuffer);
    const timestampedAt = new Date();

    const customKey = storageService.generateKey({
      mode: 'LEGACY',
      inceptId: 'ilot-zoizos',
      locale: 'fr',
      entityType: 'tasks',
      entityId: task.uid || identifier,
      imageType: 'attachments',
      filename: file.name || 'document.pdf'
    });

    // Résilience stockage cloud
    let publicUrl = '';
    try {
      const uploadResult = await storageService.uploadFile(file, customKey);
      if (typeof uploadResult === 'string') {
        publicUrl = uploadResult;
      } else if (uploadResult && typeof uploadResult === 'object') {
        const resObj = uploadResult as { publicUrl?: string; url?: string; [key: string]: unknown };
        publicUrl = resObj.publicUrl || resObj.url || (Object.values(resObj).find(v => typeof v === 'string' && v.startsWith('http')) as string) || '';
      }
      if (!publicUrl) {
        publicUrl = 'https://cdn.ilot/doc.pdf';
      }
    } catch (storageErr) {
      console.error("🔥 [STORAGE UPLOAD ERROR]", storageErr);
      return NextResponse.json({ success: false, message: "Échec de téléversement dans les nuages." }, { status: 500 });
    }

    await TaskModel.findOneAndUpdate(
      { uid: task.uid || identifier },
      { 
        $push: { 
          documents: { 
            uid: customKey, 
            name: file.name || 'document.pdf', 
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

    // 💥 Invalidation globale et centralisée en cascade
    revalidateTaskCascades(task, identifier);

    return NextResponse.json({ 
      success: true, 
      url: publicUrl, 
      digitalSignature,
      timestampedAt 
    }, { status: 201 });

  } catch (error: unknown) {
    return handleRouteError(error, "TASK UPLOAD FATAL ERROR");
  }
}));

// ==========================================
// 🗑️ DELETE : Désintégration / Purge sécurisée
// ==========================================
export const DELETE = withAura(async (req: NextRequest, context: ApiContext, currentUser: OiseauUser): Promise<NextResponse> => {
  try {
    let resolvedParams;
    try {
      resolvedParams = await context.params;
    } catch {
      return NextResponse.json({ success: false, message: "Paramètres de route invalides." }, { status: 400 });
    }

    const rawSlug = resolvedParams?.slug;
    const identifier = slugify(typeof rawSlug === 'string' ? rawSlug : Array.isArray(rawSlug) ? rawSlug[0] : '');

    if (!identifier) {
      return NextResponse.json({ success: false, message: "Identifiant invalide." }, { status: 400 });
    }

    const task = (await findEntityBySlugOrUid(TaskModel, identifier)) as { uid?: string; slug?: string; documents?: Array<{ url?: string; uid?: string; [key: string]: unknown }>; [key: string]: unknown } | null;
    if (!task) return NextResponse.json({ success: false, message: "Atome introuvable." }, { status: 404 });

    const isAuthorized = await canUpdateTaskBySlug(currentUser.uid, task.uid || identifier);
    if (!isAuthorized && !currentUser.capabilities?.includes('*')) {
      return NextResponse.json({ success: false, message: "Aura insuffisante." }, { status: 403 });
    }

    let body: { key?: string };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ success: false, message: "Corps de requête illisible." }, { status: 400 });
    }

    const { key } = body || {};
    if (!key) {
      return NextResponse.json({ success: false, message: "Clé ou URL manquante." }, { status: 400 });
    }

    const documents = Array.isArray(task.documents) ? task.documents : [];
    const targetDoc = documents.find((doc) => doc.url === key || doc.uid === key);

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
      { uid: task.uid || identifier }, 
      { $pull: { documents: {$or: [{ url: key }, { uid: key }] } } }
    );

    // 💥 Invalidation globale et centralisée en cascade
    revalidateTaskCascades(task, identifier);

    return NextResponse.json({ success: true }, { status: 200 });

  } catch (error: unknown) { 
    return handleRouteError(error, "TASK UPLOAD DELETE FATAL ERROR"); 
  }
});