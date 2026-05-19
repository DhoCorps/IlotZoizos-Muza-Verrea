// apps/hub-central/app/api/teams/[teamId]/upload/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getServerSession } from 'next-auth/next';
import { authOptions } from "../../../../../lib/auth"; // 🛡️ IMPORT INDISPENSABLE
import { storageService } from '../../../../../modules/storage/storage.service';
import { connectToDatabase, getNeo4jSession } from '@ilot/infrastructure'; 
import { TeamModel } from '@ilot/infrastructure/src/database/models/nosql/team.model'; // 🪡 SUTURE : Ajout du modèle
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
    const result = await session.run(
      `
      MATCH (u:User {uid: $userUid})
      OPTIONAL MATCH (u)-[r:MEMBER_OF|FOUNDED]->(t:Team {uid: $teamUid})
      RETURN u.capabilities AS userCaps, r.capabilities AS relCaps
      `,
      { userUid, teamUid }
    );

    if (result.records.length === 0) {
      console.log(`🚫 [Auth] Aucune relation ou utilisateur trouvé pour ${userUid}`);
      return false;
    }

    const record = result.records[0];
    const userCaps = record.get('userCaps') || [];
    const relCaps = record.get('relCaps') || [];
    const allCaps = [...userCaps, ...relCaps];

    const hasCap = allCaps.includes(CAPABILITIES.SYSTEM.ALL) || allCaps.includes(requiredCapability);
    
    if (!hasCap) {
        console.log(`🚫 [Auth] Capacité ${requiredCapability} absente (User: ${userCaps}, Rel: ${relCaps})`);
    }

    return hasCap;
  } finally {
    await session.close();
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { teamId: string } }
) {
  try {
    await connectToDatabase();
    const teamId = params.teamId;

    // --- 1. VÉRIFICATION DE LA DOUANE (SESSION) ---
    const session = await getServerSession(authOptions);
    const user = session?.user as OiseauUser | undefined;

    if (!user || !user.uid) {
      return NextResponse.json(
        { success: false, message: "Oiseau non identifié dans la canopée." },
        { status: 401 }
      );
    }

    // --- 2. VÉRIFICATION DE L'AURA TERRITORIALE (CAPABILITIES) ---
    const isAuthorized = await hasCapability(user.uid, teamId, CAPABILITIES.FILE.UPLOAD);

    if (!isAuthorized) {
      return NextResponse.json(
        { success: false, message: "Ton Aura ne résonne pas assez fort pour sceller un document dans ce Nid." },
        { status: 403 }
      );
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const label = formData.get('label') as string || 'Sans titre';
    const mediaType = formData.get('mediaType') as string || 'attachments';

    if (!file) {
      return NextResponse.json(
        { success: false, message: "Aucune brindille de matière (fichier) reçue." },
        { status: 400 }
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
        inceptId: 'ilot-zoizos',
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
    
    // --- 5. ENREGISTREMENT DANS LA SILICE (MONGODB) ---
    await TeamModel.findOneAndUpdate(
      { uid: teamId },
      { 
        $push: { 
          documents: {
            uid: customKey, // On utilise la clé comme identifiant unique
            name: file.name,
            label: label,
            url: `${process.env.R2_PUBLIC_URL}/${customKey}`,
            mimeType: file.type
          } 
        } 
      }
    );
    
    return NextResponse.json(
      {
        success: true,
        message: `La brindille est scellée dans R2 et la Silice.`,
        publicUrl: `${process.env.R2_PUBLIC_URL}/${customKey}`,
        key: customKey
      },
      { status: 200 }
    );

  } catch (error: any) {
    console.error("🔥 Fracture lors de l'injection du document dans R2 :", error);
    return NextResponse.json(
      { success: false, message: error.message || "L'injection a échoué." },
      { status: 500 }
    );
  }
}