// apps/hub-central/app/api/tasks/[taskId]/upload/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getServerSession } from 'next-auth/next';
import { authOptions } from "../../../../../lib/auth"; // 🛡️ IMPORT DE LA DOUANE CENTRALISÉE
import { storageService } from '../../../../../modules/storage/storage.service';
import { connectToDatabase, TaskModel, getNeo4jSession } from '@ilot/infrastructure';
import { CAPABILITIES } from '@ilot/types';

// Interface locale pour le typage souverain de la session
interface OiseauUser {
  id: string;
  uid: string;
  capabilities: string[];
}

const s3Client = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT!,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
  forcePathStyle: true,
});

/**
 * 🪡 SUTURE DE VÉRIFICATION D'AURA TERRITORIALE
 * Vérifie si l'oiseau a le droit de modifier cette tâche spécifique via Neo4j
 */
async function canUpdateTask(userUid: string, taskUid: string) {
  const session = getNeo4jSession();
  try {
    const cypher = `
      MATCH (t:Task { uid: $taskUid })-[:TASK_OF]->(p:Project)
      MATCH (u:User { uid: $userUid })
      OPTIONAL MATCH (u)-[r:CONTRIBUTES_TO|OWNER_OF|CREATED]->(p)
      OPTIONAL MATCH (u)-[:MEMBER_OF]->(team:Team)-[:HAS_PROJECT]->(p)
      RETURN p.creatorUid AS projectCreatorUid, 
             collect(r.capabilities) + collect(team.defaultProjectCapabilities) AS allCaps
    `;
    const result = await session.run(cypher, { userUid, taskUid });
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
    // 🪡 SUTURE : Le maillage se referme proprement
    await session.close();
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { taskId: string } }
) {
  try {
    await connectToDatabase();
    const taskUid = params.taskId;

    // --- 1. DOUBLE VERROU DE SÉCURITÉ ---
    const session = await getServerSession(authOptions);
    const user = session?.user as OiseauUser | undefined;

    if (!user || !user.uid) {
      return NextResponse.json(
        { success: false, message: "Oiseau non identifié dans la canopée." },
        { status: 401 }
      );
    }

    const isAuthorized = await canUpdateTask(user.uid, taskUid);
    const isArchitect = user.capabilities.includes('*');

    if (!isAuthorized && !isArchitect) {
      return NextResponse.json(
        { success: false, message: "Ton Aura ne résonne pas assez fort pour y greffer un document." },
        { status: 403 }
      );
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const label = formData.get('label') as string || 'Pièce jointe';

    if (!file) {
      return NextResponse.json(
        { success: false, message: "Aucune matière brute (fichier) reçue." },
        { status: 400 }
      );
    }

    // --- 2. LE BOUCLIER DES FORMATS ---
    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/webp', 'image/gif',
      'audio/mpeg', 'audio/mp3', 'audio/ogg', 'audio/webm',
      'video/mp4', 'application/pdf', 'text/plain'
    ];

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { success: false, message: `La Silice de l'Atome rejette le format ${file.type}.` },
        { status: 400 }
      );
    }

    // --- 3. ALCHIMIE ET TRANSMISSION VERS R2 ---
    const buffer = Buffer.from(await file.arrayBuffer());

    const customKey = storageService.generateStructuredKey({
      inceptId: 'ilot-zoizos',
      locale: 'fr',
      entityType: 'tasks',
      entityId: taskUid,
      imageType: 'attachments',
      filename: file.name
    });

    const command = new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME!,
      Key: customKey,
      Body: buffer,
      ContentType: file.type,
    });

    await s3Client.send(command);
    const publicUrl = `${process.env.R2_PUBLIC_URL}/${customKey}`;

    // --- 4. SÉDIMENTATION DANS LA SILICE (MONGODB) ---
    // 🪡 SUTURE : Alignement avec la structure 'documents' utilisée pour Teams/Projects
    const attachmentPayload = {
      uid: customKey,
      name: file.name,
      label: label,
      url: publicUrl,
      mimeType: file.type,
      createdAt: new Date()
    };

    const updatedTask = await TaskModel.findOneAndUpdate(
      { uid: taskUid },
      { 
        $push: { documents: attachmentPayload },
        $set: { "dates.updatedAt": new Date() }
      },
      { new: true }
    ).lean();

    if (!updatedTask) {
      return NextResponse.json(
        { success: false, message: "Atome introuvable dans la Silice." },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "Matière scellée et liée avec succès à l'Atome.",
        attachment: attachmentPayload
      },
      { status: 201 }
    );

  } catch (error: any) {
    console.error("🔥 Fracture lors du téléversement sur l'Atome :", error);
    return NextResponse.json(
      { success: false, message: error.message || "L'upload d'Atome a échoué." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: Request, 
  { params }: { params: { taskUid: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  try {
    const { key } = await req.json(); // L'URL envoyée par la TaskCard
    if (!key) throw new Error("Clé d'artefact manquante.");

    // 1. Désintégration Physique (SUTURE R2)
    const storageKey = storageService.extractKeyFromUrl(key);
    await storageService.deleteFile(storageKey);

    // 2. Mise à jour de la Silice (Mongo) : on enlève la référence
    await TaskModel.updateOne(
      { uid: params.taskUid },
      { $pull: { documents: { url: key } } } // Retire l'objet correspondant à l'URL
    );

    return NextResponse.json({ success: true, message: "Artefact désintégré." });
  } catch (err: any) {
    console.error("❌ Erreur lors de la purge API :", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}