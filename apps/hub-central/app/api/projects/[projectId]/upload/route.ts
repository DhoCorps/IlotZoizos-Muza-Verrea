// apps/hub-central/app/api/projects/[projectId]/upload/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getServerSession } from 'next-auth/next';
import { authOptions } from "../../../../../lib/auth"; // 🛡️ DOUANE CENTRALE
import { storageService } from '../../../../../modules/storage/storage.service';
import { connectToDatabase, ProjectModel, getNeo4jSession } from '@ilot/infrastructure';
import { CAPABILITIES } from '@ilot/types';
import crypto from 'crypto';

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
 * 🪡 SUTURE DE VÉRIFICATION D'AURA TERRITORIALE (PROJECT)
 * Vérifie si l'oiseau a la souveraineté ou les droits d'écriture sur ce Chantier via Neo4j
 */
async function canUpdateProject(userUid: string, projectUid: string): Promise<boolean> {
  const session = getNeo4jSession();
  try {
    const cypher = `
      MATCH (p:Project { uid: $projectUid })
      MATCH (u:User { uid: $userUid })
      OPTIONAL MATCH (u)-[r:CONTRIBUTES_TO|OWNER_OF|CREATED]->(p)
      OPTIONAL MATCH (u)-[:MEMBER_OF]->(team:Team)-[:HAS_PROJECT]->(p)
      RETURN p.creatorUid AS projectCreatorUid,
             collect(r.capabilities) + collect(team.defaultProjectCapabilities) AS allCaps
    `;
    
    const result = await session.run(cypher, { userUid, projectUid });
    if (result.records.length === 0) return false;

    const record = result.records[0];
    const projectCreatorUid = record.get('projectCreatorUid');
    const caps = record.get('allCaps').flat() || [];

    // Validation : Créateur souverain ou Aura correspondante
    const isCreator = projectCreatorUid === userUid;
    const isAuthorized = caps.includes(CAPABILITIES.PROJECT.UPDATE) || caps.includes('*');

    return isCreator || isAuthorized;
  } catch (error) {
    console.error("🔥 Fracture lors de la vérification d'Aura sur le Chantier :", error);
    return false;
  } finally {
    // 🪡 SUTURE : Le maillage se referme proprement
    await session.close();
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    await connectToDatabase();
    const projectUid = params.projectId;

    // --- 1. SÉCURISATION DE LA DOUANE ---
    const session = await getServerSession(authOptions);
    
    const user = session?.user as OiseauUser | undefined;

    if (!user || !user.uid) {
      return NextResponse.json(
        { success: false, message: "Oiseau non identifié dans la canopée." },
        { status: 401 }
      );
    }

    // --- 2. SCRUTATION DE L'AURA TERRITORIALE ---
    const isAuthorized = await canUpdateProject(user.uid, projectUid);
    const isArchitect = user.capabilities.includes('*');

    if (!isAuthorized && !isArchitect) {
      return NextResponse.json(
        { success: false, message: "Ton Aura ne résonne pas assez fort pour lier un document à ce Chantier." },
        { status: 403 }
      );
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const label = formData.get('label') as string || 'Document de Chantier';

    if (!file) {
      return NextResponse.json(
        { success: false, message: "Aucun fragment de matière (fichier) reçu." },
        { status: 400 }
      );
    }

    // --- 3. LE BOUCLIER DES FORMATS ACCEPTÉS PAR LE CHANTIER ---
    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/webp', 'image/gif',
      'application/pdf', 'text/plain', 'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/zip'
    ];

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { success: false, message: `Le Chantier refuse les artefacts de format ${file.type}.` },
        { status: 400 }
      );
    }

    if (file.size > 25 * 1024 * 1024) { // Limite étendue à 25 Mo pour les fichiers de projet
      return NextResponse.json(
        { success: false, message: "L'artefact est trop lourd pour les archives du Chantier (Max 25 Mo)." },
        { status: 400 }
      );
    }

    // --- 4. TÉLÉVERSEMENT ALCHIMIQUE VERS R2 ---
    const buffer = Buffer.from(await file.arrayBuffer());

    const customKey = storageService.generateStructuredKey({
      inceptId: 'ilot-zoizos',
      locale: 'fr',
      entityType: 'projects',
      entityId: projectUid,
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

    // --- 5. SÉDIMENTATION DANS LA SILICE (MONGODB) ---
    // 🪡 SUTURE : Alignement avec la structure 'documents' utilisée pour Teams/Tasks
    const documentPayload = {
      uid: customKey,
      name: file.name,
      label: label,
      url: publicUrl,
      mimeType: file.type,
      createdAt: new Date()
    };

    const updatedProject = await ProjectModel.findOneAndUpdate(
      { uid: projectUid },
      {
        $push: { documents: documentPayload },
        $set: { "dates.updatedAt": new Date() }
      },
      { new: true }
    ).lean();

    if (!updatedProject) {
      return NextResponse.json(
        { success: false, message: "Chantier introuvable dans la Silice lors du scellage." },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "L'artefact est scellé dans les archives du Chantier.",
        document: documentPayload,
        project: updatedProject
      },
      { status: 201 }
    );

  } catch (error: any) {
    console.error("🔥 Fracture lors de l'upload sur le Chantier :", error);
    return NextResponse.json(
      { success: false, message: error.message || "Le téléversement de Chantier a échoué." },
      { status: 500 }
    );
  }
}