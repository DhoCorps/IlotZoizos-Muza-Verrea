import { NextRequest, NextResponse } from 'next/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getServerSession } from 'next-auth/next';
import { authOptions } from "../../../../../lib/auth"; // 🛡️ IMPORT DE LA DOUANE CENTRALISÉE
import { storageService } from '../../../../../modules/storage/storage.service';
import { connectToDatabase, TaskModel, getNeo4jSession } from '@ilot/infrastructure';
import { CAPABILITIES } from '@ilot/types';

/**
 * 🦅 INTERFACE LOCALE POUR LE TYPAGE SOUVERAIN DE LA SESSION
 */
interface OiseauUser {
  id: string;
  uid: string;
  capabilities: string[];
}

/**
 * 🌿 INTERFACE DES PARAMÈTRES DE ROUTE (Next.js 15+ Asynchrone)
 */
interface RouteParams {
  params: Promise<{ taskId: string }>;
}

/**
 * ☁️ INITIALISATION DU CLIENT S3 POUR CLOUDFLARE R2
 */
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
 * 🪡 SUTURE DE VÉRIFICATION D'AURA TERRITORIALE (ATOME)
 * Vérifie si l'oiseau a le droit de modifier cette tâche spécifique via Neo4j.
 */
async function canUpdateTask(userUid: string, taskUid: string): Promise<boolean> {
  let session;
  try {
    session = getNeo4jSession();
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
    if (session) {
      try {
        await session.close();
      } catch (closeErr) {
        console.error("⚠️ Erreur lors de la fermeture de la session Neo4j :", closeErr);
      }
    }
  }
}

// ==========================================
// POST : Greffer un artefact sur un Atome
// ==========================================
export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    // -------------------------------------------------------------------------
    // 1. ÉVEIL DE LA SILICE ET RÉSOLUTION DES PARAMÈTRES
    // -------------------------------------------------------------------------
    try {
      await connectToDatabase();
    } catch (dbErr) {
      console.error("❌ [DB ERROR TASK UPLOAD POST]", dbErr);
      return NextResponse.json({ success: false, message: "La Silice est injoignable." }, { status: 500 });
    }

    let resolvedParams;
    try {
      resolvedParams = await params;
    } catch (paramErr) {
      return NextResponse.json({ success: false, message: "Identifiant d'atome invalide." }, { status: 400 });
    }
    const taskUid = resolvedParams.taskId;

    // -------------------------------------------------------------------------
    // 2. DOUBLE VERROU DE SÉCURITÉ (DOUANE & AURA)
    // -------------------------------------------------------------------------
    let session;
    try {
      session = await getServerSession(authOptions);
    } catch (sessionErr) {
      console.error("🔥 [SESSION ERROR TASK UPLOAD POST]", sessionErr);
      return NextResponse.json({ success: false, message: "Erreur de lecture d'Aura." }, { status: 500 });
    }

    const user = session?.user as OiseauUser | undefined;
    if (!user || !user.uid) {
      return NextResponse.json(
        { success: false, message: "Oiseau non identifié dans la canopée." },
        { status: 401 }
      );
    }

    let isAuthorized = false;
    try {
      isAuthorized = await canUpdateTask(user.uid, taskUid);
    } catch (auraErr) {
      console.error("🔥 [AURA CHECK ERROR]", auraErr);
    }
    const isArchitect = user.capabilities.includes('*');

    if (!isAuthorized && !isArchitect) {
      return NextResponse.json(
        { success: false, message: "Ton Aura ne résonne pas assez fort pour y greffer un document." },
        { status: 403 }
      );
    }

    // -------------------------------------------------------------------------
    // 3. EXTRACTION ET VALIDATION DU FORMULAIRE (FICHIER)
    // -------------------------------------------------------------------------
    let formData;
    try {
      formData = await req.formData();
    } catch (formErr) {
      return NextResponse.json({ success: false, message: "Formulaire multipart illisible." }, { status: 400 });
    }

    const file = formData.get('file') as File | null;
    const label = (formData.get('label') as string) || 'Pièce jointe';

    if (!file) {
      return NextResponse.json(
        { success: false, message: "Aucune matière brute (fichier) reçue." },
        { status: 400 }
      );
    }

    // Bouclier des formats acceptés pour les atomes
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

    // -------------------------------------------------------------------------
    // 4. ALCHIMIE ET TRANSMISSION VERS CLOUDFLARE R2 (S3)
    // -------------------------------------------------------------------------
    let buffer;
    try {
      buffer = Buffer.from(await file.arrayBuffer());
    } catch (bufErr) {
      return NextResponse.json({ success: false, message: "Échec de conversion du flux fichier." }, { status: 400 });
    }

    const customKey = storageService.generateStructuredKey({
      inceptId: 'ilot-zoizos',
      locale: 'fr',
      entityType: 'tasks',
      entityId: taskUid,
      imageType: 'attachments',
      filename: file.name
    });

    try {
      const command = new PutObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME!,
        Key: customKey,
        Body: buffer,
        ContentType: file.type,
      });
      await s3Client.send(command);
    } catch (s3Err) {
      console.error("🔥 [S3 UPLOAD ERROR TASK]", s3Err);
      return NextResponse.json({ success: false, message: "Échec du téléversement vers le Cloud." }, { status: 500 });
    }

    const publicUrl = `${process.env.R2_PUBLIC_URL}/${customKey}`;

    // -------------------------------------------------------------------------
    // 5. SÉDIMENTATION PÉRENNE DANS LA SILICE (MONGODB)
    // -------------------------------------------------------------------------
    const attachmentPayload = {
      uid: customKey,
      name: file.name,
      label: label,
      url: publicUrl,
      mimeType: file.type,
      createdAt: new Date()
    };

    let updatedTask;
    try {
      updatedTask = await TaskModel.findOneAndUpdate(
        { uid: taskUid },
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
    console.error("🔥 Fracture globale lors du téléversement sur l'Atome :", error);
    return NextResponse.json(
      { success: false, message: error.message || "L'upload d'Atome a échoué." },
      { status: 500 }
    );
  }
}

// ==========================================
// DELETE : Dissoudre un artefact d'un Atome
// ==========================================
export async function DELETE(req: Request, { params }: RouteParams) {
  try {
    try {
      await connectToDatabase();
    } catch (dbErr) {
      console.error("❌ [DB ERROR TASK UPLOAD DELETE]", dbErr);
      return NextResponse.json({ error: "La Silice est injoignable." }, { status: 500 });
    }

    let resolvedParams;
    try {
      resolvedParams = await params;
    } catch (paramErr) {
      return NextResponse.json({ error: "Identifiant invalide." }, { status: 400 });
    }
    const taskUid = resolvedParams.taskId;

    let session;
    try {
      session = await getServerSession(authOptions);
    } catch (sessionErr) {
      return NextResponse.json({ error: "Erreur de session." }, { status: 500 });
    }

    if (!session || !session.user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    let body;
    try {
      body = await req.json();
    } catch (parseErr) {
      return NextResponse.json({ error: "Corps de requête illisible." }, { status: 400 });
    }

    const { key } = body;
    if (!key) {
      return NextResponse.json({ error: "Clé d'artefact manquante." }, { status: 400 });
    }

    // 1. Désintégration Physique dans le stockage Cloud
    try {
      const storageKey = storageService.extractKeyFromUrl(key);
      await storageService.deleteFile(storageKey);
    } catch (s3DelErr) {
      console.error("❌ [S3 DELETE ERROR] Avertissement de purge physique :", s3DelErr);
      // On continue pour nettoyer Mongo même si le cloud grince
    }

    // 2. Mise à jour de la Silice (MongoDB) : retrait de la référence
    try {
      await TaskModel.updateOne(
        { uid: taskUid },
        { $pull: { documents: { url: key } } }
      );
    } catch (dbPullErr) {
      console.error("🔥 [MONGO PULL ERROR]", dbPullErr);
      return NextResponse.json({ error: "Échec du nettoyage dans la Silice." }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: "Artefact désintégré." }, { status: 200 });

  } catch (err: any) {
    console.error("❌ Erreur globale lors de la purge API de l'atome :", err);
    return NextResponse.json({ error: err.message || "Erreur interne." }, { status: 500 });
  }
}