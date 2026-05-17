// apps/hub-central/app/api/teams/[teamId]/upload/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getServerSession } from 'next-auth/next';
import { authOptions } from "../../../../lib/auth"; // 🛡️ IMPORT INDISPENSABLE
import { storageService } from '../../../../modules/storage/storage.service';
import { getNeo4jSession } from '@ilot/infrastructure/src/database/neo4j';
import { CAPABILITIES } from '@ilot/types'; 

// Interface locale pour le typage souverain
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

async function hasCapability(userUid: string, teamUid: string, requiredCapability: string) {
  const session = getNeo4jSession();
  try {
    // Vérification de la résonance dans le Graphe
    const result = await session.run(
      `MATCH (u:User {uid: $userUid})-[r:MEMBER_OF|FOUNDED]->(t:Team {uid: $teamUid})
       RETURN r.capabilities AS caps`,
      { userUid, teamUid }
    );
    if (result.records.length === 0) return false;
    const caps = result.records[0].get('caps') || [];
    
    // Un fondateur ou un oiseau avec SYSTEM_ALL passe toujours
    return caps.includes(CAPABILITIES.SYSTEM.ALL) || caps.includes(requiredCapability);
  } finally {
    await session.close();
  }
}

export async function POST(req: NextRequest, { params }: { params: { teamId: string } }) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const mediaType = formData.get('mediaType') as string | null;
    
    // Utilisation de params.teamId (plus fiable que le FormData)
    const teamId = params.teamId;

    if (!file || !teamId || !mediaType) {
      return NextResponse.json(
        { success: false, message: 'Maladresse : Données manquantes pour sceller la brindille.' },
        { status: 400 }
      );
    }

    // --- 1. L'AURA DE LA SESSION ---
    const session = await getServerSession(authOptions); // ✅ Suture effectuée
    const user = session?.user as OiseauUser | undefined;

    if (!user?.uid) {
      return NextResponse.json(
        { success: false, message: "Étranger. Ton aura n'est pas reconnue ici." }, 
        { status: 401 }
      );
    }

    // --- 2. LA BARRIÈRE KARMIQUE ---
    const canUpload = await hasCapability(user.uid, teamId, CAPABILITIES.FILE.UPLOAD);
    
    if (!canUpload) {
      return NextResponse.json(
        { success: false, message: "Aura insuffisante pour ce Nid." }, 
        { status: 403 }
      );
    }

    // --- 3. VALIDATION DE LA SILICE ---
    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/webp', 'image/gif',
      'audio/mpeg', 'audio/mp3', 'video/mp4', 'application/pdf'
    ];

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { success: false, message: `La Silice rejette le format ${file.type}.` },
        { status: 400 }
      );
    }

    // --- 4. TRANSMISSION VERS R2 ---
    const buffer = Buffer.from(await file.arrayBuffer());

    const customKey = storageService.generateStructuredKey({
        inceptId: 'ilot-zoizos', // Harmonisé avec le nom du projet
        locale: 'fr',
        entityType: 'teams',
        entityId: teamId,
        imageType: mediaType, 
        filename: file.name
    });

    const command = new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME!,
      Key: customKey,
      Body: buffer,
      ContentType: file.type,
    });

    await s3Client.send(command);
    
    return NextResponse.json(
      {
        success: true,
        message: `La brindille est scellée dans R2.`,
        publicUrl: `${process.env.R2_PUBLIC_URL}/${customKey}`,
        teamId,
        mediaType
      },
      { status: 201 }
    );

  } catch (error: any) {
    console.error("🔥 Chaos Matrix Upload :", error.message);
    return NextResponse.json(
      { success: false, message: "Le chaos a frappé la matrice d'upload." },
      { status: 500 }
    );
  }
}