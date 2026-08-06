// apps/hub-central/app/api/tasks/[slug]/upload/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../../lib/auth'; 
import { storageService } from '../../../../../modules/storage/storage.service';
import { checkRateLimit } from '../../../../../modules/security/rateLimiter';
import { connectToDatabase, TaskModel, getNeo4jSession } from '@ilot/infrastructure';
import { CAPABILITIES, ITask } from '@ilot/types';

interface OiseauUser {
  id: string;
  uid: string;
  capabilities: string[];
}

interface RouteParams {
  params: Promise<{ slug: string }>;
}

async function canUpdateTaskBySlug(userUid: string, taskSlug: string): Promise<boolean> {
  let session;
  try {
    session = getNeo4jSession();
    // On cherche l'atome par son slug ou son uid équivalent dans le graphe
    const cypher = `
      MATCH (t:Task { uid: $taskSlug })-[:TASK_OF]->(p:Project)
      MATCH (u:User { uid: $userUid })
      OPTIONAL MATCH (u)-[r:CONTRIBUTES_TO|OWNER_OF|CREATED]->(p)
      OPTIONAL MATCH (u)-[:MEMBER_OF]->(team:Team)-[:HAS_PROJECT]->(p)
      RETURN p.creatorUid AS projectCreatorUid, 
             collect(r.capabilities) + collect(team.defaultProjectCapabilities) AS allCaps
    `;
    const result = await session.run(cypher, { userUid, taskSlug });
    if (result.records.length === 0) return false;

    const record = result.records[0];
    const projectCreatorUid = record.get('projectCreatorUid');
    const caps = record.get('allCaps').flat() || [];

    const isCreator = projectCreatorUid === userUid;
    const isAuthorized = caps.includes(CAPABILITIES.TASK.UPDATE) || caps.includes('*');

    return isCreator || isAuthorized;
  } catch (error) {
    console.error("🔥 Fracture lors de la vérification d'Aura sur l'Atome :", error);
    return false;
  } finally {
    if (session) {
      try { await session.close(); } catch (closeErr) {}
    }
  }
}

// ==========================================
// POST : Greffer un artefact sur un Atome via son slug
// ==========================================
export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const clientIp = req.headers.get('x-forwarded-for') || '127.0.0.1';
    const { allowed } = await checkRateLimit(`upload-task-slug:${clientIp}`, 10, 60);
    if (!allowed) {
      return NextResponse.json({ success: false, message: "Trop de téléversements. Veuillez patienter." }, { status: 429 });
    }

    try { await connectToDatabase(); } catch (dbErr) {
      return NextResponse.json({ success: false, message: "La Silice est injoignable." }, { status: 500 });
    }

    let resolvedParams;
    try { resolvedParams = await params; } catch (paramErr) {
      return NextResponse.json({ success: false, message: "Identifiant d'atome invalide." }, { status: 400 });
    }
    const taskSlug = resolvedParams.slug;

    let session;
    try { session = await getServerSession(authOptions); } catch (sessionErr) {
      return NextResponse.json({ success: false, message: "Erreur de lecture d'Aura." }, { status: 500 });
    }

    const user = session?.user as OiseauUser | undefined;
    if (!user || !user.uid) {
      return NextResponse.json({ success: false, message: "Oiseau non identifié dans la canopée." }, { status: 401 });
    }

    // Récupération de l'atome par son UID/Slug dans MongoDB
    let task: ITask | null = null;
    try {
      task = await TaskModel.findOne({ uid: taskSlug }).lean<ITask>();
    } catch (dbQueryErr) {
      return NextResponse.json({ success: false, message: "Erreur de lecture Silice." }, { status: 500 });
    }

    if (!task) {
      return NextResponse.json({ success: false, message: "Atome introuvable dans la Silice." }, { status: 404 });
    }

    const isAuthorized = await canUpdateTaskBySlug(user.uid, task.uid);
    const isArchitect = user.capabilities.includes('*');

    if (!isAuthorized && !isArchitect) {
      return NextResponse.json({ success: false, message: "Ton Aura ne résonne pas assez fort pour y greffer un document." }, { status: 403 });
    }

    let formData;
    try { formData = await req.formData(); } catch (formErr) {
      return NextResponse.json({ success: false, message: "Formulaire multipart illisible." }, { status: 400 });
    }

    const file = formData.get('file') as File | null;
    const label = (formData.get('label') as string) || 'Pièce jointe';

    if (!file) {
      return NextResponse.json({ success: false, message: "Aucune matière brute (fichier) reçue." }, { status: 400 });
    }

    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/webp', 'image/gif',
      'audio/mpeg', 'audio/mp3', 'audio/ogg', 'audio/webm',
      'video/mp4', 'application/pdf', 'text/plain'
    ];

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ success: false, message: `La Silice de l'Atome rejette le format ${file.type}.` }, { status: 400 });
    }
    if (file.size > 25 * 1024 * 1024) {
      return NextResponse.json({ success: false, message: "Max 25 Mo." }, { status: 400 });
    }

    const customKey = storageService.generateStructuredKey({
      inceptId: 'ilot-zoizos',
      locale: 'fr',
      entityType: 'tasks',
      entityId: task.uid,
      imageType: 'attachments',
      filename: file.name
    });

    let uploadResult;
    try {
      uploadResult = await storageService.uploadFile(file, customKey);
    } catch (s3Err) {
      console.error("🔥 [Storage UPLOAD ERROR TASK]", s3Err);
      return NextResponse.json({ success: false, message: "Échec du téléversement vers le Cloud." }, { status: 500 });
    }

    const attachmentPayload = {
      uid: customKey,
      name: file.name,
      label: label,
      url: uploadResult.publicUrl,
      mimeType: file.type,
      createdAt: new Date()
    };

    let updatedTask;
    try {
      updatedTask = await TaskModel.findOneAndUpdate(
        { uid: task.uid },
        { 
          $push: { documents: attachmentPayload },
          $set: { "dates.updatedAt": new Date() }
        },
        { new: true }
      ).lean();
    } catch (dbQueryErr) {
      console.error("🔥 [TASK MONGODB UPDATE ERROR]", dbQueryErr);
      return NextResponse.json({ success: false, message: "Échec de sédimentation dans la Silice." }, { status: 500 });
    }

    if (!updatedTask) {
      return NextResponse.json({ success: false, message: "Atome introuvable dans la Silice." }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: "Matière scellée et liée avec succès à l'Atome.",
      attachment: attachmentPayload
    }, { status: 201 });

  } catch (error: any) {
    console.error("🔥 Fracture globale lors du téléversement sur l'Atome :", error);
    return NextResponse.json({ success: false, message: error.message || "L'upload d'Atome a échoué." }, { status: 500 });
  }
}

// ==========================================
// DELETE : Dissoudre un artefact d'un Atome via son slug
// ==========================================
export async function DELETE(req: Request, { params }: RouteParams) {
  try {
    try { await connectToDatabase(); } catch (dbErr) {
      return NextResponse.json({ error: "La Silice est injoignable." }, { status: 500 });
    }

    let resolvedParams;
    try { resolvedParams = await params; } catch (paramErr) {
      return NextResponse.json({ error: "Identifiant invalide." }, { status: 400 });
    }
    const taskSlug = resolvedParams.slug;

    let session;
    try { session = await getServerSession(authOptions); } catch (sessionErr) {
      return NextResponse.json({ error: "Erreur de session." }, { status: 500 });
    }

    if (!session || !session.user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    let body;
    try { body = await req.json(); } catch (parseErr) {
      return NextResponse.json({ error: "Corps de requête illisible." }, { status: 400 });
    }

    const { key } = body;
    if (!key) {
      return NextResponse.json({ error: "Clé d'artefact manquante." }, { status: 400 });
    }

    let task: ITask | null = null;
    try {
      task = await TaskModel.findOne({ uid: taskSlug }).lean<ITask>();
    } catch (err) {
      return NextResponse.json({ error: "Erreur Silice." }, { status: 500 });
    }

    if (!task) {
      return NextResponse.json({ success: false, message: "Atome introuvable." }, { status: 404 });
    }

    try {
      const storageKey = storageService.extractKeyFromUrl(key);
      await storageService.deleteFile(storageKey);
    } catch (s3DelErr) {
      console.error("❌ [Storage DELETE ERROR] :", s3DelErr);
    }

    try {
      await TaskModel.updateOne(
        { uid: task.uid },
        { $pull: { documents: { url: key } } }
      );
    } catch (dbPullErr) {
      return NextResponse.json({ error: "Échec du nettoyage dans la Silice." }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: "Artefact désintégré." }, { status: 200 });

  } catch (err: any) {
    console.error("❌ Erreur globale lors de la purge API de l'atome :", err);
    return NextResponse.json({ error: err.message || "Erreur interne." }, { status: 500 });
  }
}