import { NextRequest, NextResponse } from 'next/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getServerSession } from 'next-auth/next';
import { authOptions } from "../../../../../lib/auth"; // 🛡️ IMPORT INDISPENSABLE
import { storageService } from '../../../../../modules/storage/storage.service';
import { connectToDatabase, getNeo4jSession } from '@ilot/infrastructure'; 
import { TeamModel } from '@ilot/infrastructure/src/database/models/nosql/team.model'; 
import { CAPABILITIES } from '@ilot/types'; 

/**
 * 🌿 INTERFACE DES PARAMÈTRES DE ROUTE ([slug])
 * Conforme à l'exigence asynchrone de Next.js 15+ pour les segments dynamiques.
 */
interface RouteParams {
  params: Promise<{ slug: string }>;
}

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
      try {
        await session.close();
      } catch (closeErr) {
        console.error("⚠️ Erreur fermeture session Neo4j :", closeErr);
      }
    }
  }
}

// ==========================================
// POST : Téléversement d'artefact sur le Nid
// ==========================================
export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    // -------------------------------------------------------------------------
    // 1. ÉVEIL DE LA SILICE
    // -------------------------------------------------------------------------
    try {
      await connectToDatabase();
    } catch (dbErr) {
      console.error("❌ [DB ERROR TEAM UPLOAD POST]", dbErr);
      return NextResponse.json({ success: false, message: "La Silice est injoignable." }, { status: 500 });
    }

    // -------------------------------------------------------------------------
    // 2. RÉSOLUTION DES PARAMÈTRES DYNAMIQUES DE L'URL ([slug])
    // -------------------------------------------------------------------------
    let resolvedParams;
    try {
      resolvedParams = await params;
    } catch (paramErr) {
      return NextResponse.json({ success: false, message: "Identifiant de nid invalide." }, { status: 400 });
    }

    const teamIdentifier = resolvedParams.slug;

    // -------------------------------------------------------------------------
    // 3. VÉRIFICATION DE LA DOUANE (SESSION)
    // -------------------------------------------------------------------------
    let session;
    try {
      session = await getServerSession(authOptions);
    } catch (sessionErr) {
      console.error("🔥 [SESSION ERROR TEAM UPLOAD POST]", sessionErr);
      return NextResponse.json({ success: false, message: "Erreur de lecture d'Aura." }, { status: 500 });
    }

    const user = session?.user as OiseauUser | undefined;
    if (!user || !user.uid) {
      return NextResponse.json(
        { success: false, message: "Oiseau non identifié dans la canopée." },
        { status: 401 }
      );
    }

    // -------------------------------------------------------------------------
    // 4. RÉCUPÉRATION DU NID DANS LA SILICE (Supporte slug ou uid)
    // -------------------------------------------------------------------------
    let team;
    try {
      team = await TeamModel.findOne({ 
        $or: [{ slug: teamIdentifier }, { uid: teamIdentifier }] 
      }).lean();
    } catch (queryErr) {
      console.error("🔥 [TEAM QUERY ERROR]", queryErr);
      return NextResponse.json({ success: false, message: "Échec de lecture du Nid." }, { status: 500 });
    }

    if (!team) {
      return NextResponse.json({ success: false, message: "Ce Nid s'est volatilisé de la Silice." }, { status: 404 });
    }

    const teamUid = (team as any).uid;

    // -------------------------------------------------------------------------
    // 5. VÉRIFICATION DE L'AURA TERRITORIALE (CAPABILITIES)
    // -------------------------------------------------------------------------
    let isAuthorized = false;
    try {
      isAuthorized = await hasCapability(user.uid, teamUid, CAPABILITIES.FILE.UPLOAD);
    } catch (capErr) {
      console.error("🔥 [CAPABILITY CHECK ERROR]", capErr);
    }

    if (!isAuthorized && !user.capabilities?.includes('*')) {
      return NextResponse.json(
        { success: false, message: "Ton Aura ne résonne pas assez fort pour sceller un document dans ce Nid." },
        { status: 403 }
      );
    }

    // -------------------------------------------------------------------------
    // 6. EXTRACTION DU FORMULAIRE ET VALIDATION DU FORMAT
    // -------------------------------------------------------------------------
    let formData;
    try {
      formData = await req.formData();
    } catch (formErr) {
      return NextResponse.json({ success: false, message: "Formulaire multipart illisible." }, { status: 400 });
    }

    const file = formData.get('file') as File | null;
    const mediaType = (formData.get('mediaType') as string) || 'attachments';
    const label = (formData.get('label') as string) || file?.name || 'Sans titre';

    if (!file) {
      return NextResponse.json(
        { success: false, message: "Aucune brindille de matière (fichier) reçue." },
        { status: 400 }
      );
    }

    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/webp', 'image/gif',
      'audio/mpeg', 'audio/mp3', 'video/mp4', 'application/pdf', 'text/plain'
    ];

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { success: false, message: `La Silice rejette le format ${file.type}.` },
        { status: 400 }
      );
    }

    // -------------------------------------------------------------------------
    // 7. ALCHIMIE ET TRANSMISSION VERS R2 (S3)
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
        entityType: 'teams',
        entityId: teamUid,
        imageType: mediaType, 
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
      console.error("🔥 [S3 UPLOAD ERROR TEAM]", s3Err);
      return NextResponse.json({ success: false, message: "Échec du téléversement vers le Cloud." }, { status: 500 });
    }
    
    // -------------------------------------------------------------------------
    // 8. SÉDIMENTATION DANS LA SILICE (MONGODB)
    // -------------------------------------------------------------------------
    const publicUrl = `${process.env.R2_PUBLIC_URL}/${customKey}`;
    let updatedTeam;
    try {
      updatedTeam = await TeamModel.findOneAndUpdate(
        { uid: teamUid },
        { 
          $push: { 
            documents: {
              uid: customKey,
              name: file.name,
              label: label,
              url: publicUrl,
              mimeType: file.type,
              createdAt: new Date()
            } 
          } 
        },
        { new: true }
      ).lean();
    } catch (dbUpdateErr) {
      console.error("🔥 [TEAM MONGODB UPDATE ERROR]", dbUpdateErr);
      return NextResponse.json({ success: false, message: "Échec de sédimentation dans la Silice." }, { status: 500 });
    }

    if (!updatedTeam) {
      return NextResponse.json({ success: false, message: "Nid introuvable pour la sédimentation." }, { status: 404 });
    }
    
    return NextResponse.json(
      {
        success: true,
        message: `La brindille est scellée dans R2 et rattachée à la Silice.`,
        publicUrl: publicUrl,
        key: customKey
      },
      { status: 201 }
    );

  } catch (error: any) {
    console.error("🔥 Fracture globale lors de l'injection du document dans R2 :", error);
    return NextResponse.json(
      { success: false, message: error.message || "L'injection a échoué." },
      { status: 500 }
    );
  }
}

// ==========================================
// DELETE : Désintégration physique et Silice
// ==========================================
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    try {
      await connectToDatabase();
    } catch (dbErr) {
      console.error("❌ [DB ERROR TEAM UPLOAD DELETE]", dbErr);
      return NextResponse.json({ error: "La Silice est injoignable." }, { status: 500 });
    }

    let resolvedParams;
    try {
      resolvedParams = await params;
    } catch (paramErr) {
      return NextResponse.json({ error: "Identifiant de nid invalide." }, { status: 400 });
    }

    const teamIdentifier = resolvedParams.slug;

    let session;
    try {
      session = await getServerSession(authOptions);
    } catch (sessionErr) {
      return NextResponse.json({ error: "Erreur de session." }, { status: 500 });
    }

    const user = session?.user as OiseauUser | undefined;
    if (!user || !user.uid) {
      return NextResponse.json({ success: false, message: "Non autorisé" }, { status: 401 });
    }

    let team;
    try {
      team = await TeamModel.findOne({ 
        $or: [{ slug: teamIdentifier }, { uid: teamIdentifier }] 
      }).lean();
    } catch (queryErr) {
      return NextResponse.json({ success: false, message: "Nid introuvable." }, { status: 404 });
    }

    if (!team) {
      return NextResponse.json({ success: false, message: "Nid introuvable." }, { status: 404 });
    }

    const teamUid = (team as any).uid;

    let isAuthorized = false;
    try {
      isAuthorized = await hasCapability(user.uid, teamUid, CAPABILITIES.FILE.BURN);
    } catch (e) {}

    if (!isAuthorized && !user.capabilities?.includes('*')) {
      return NextResponse.json({ success: false, message: "Souveraineté insuffisante pour brûler cet artefact." }, { status: 403 });
    }

    let body;
    try {
      body = await req.json();
    } catch (parseErr) {
      return NextResponse.json({ success: false, message: "Corps de requête illisible." }, { status: 400 });
    }

    const { key } = body;
    if (!key) {
      return NextResponse.json({ success: false, message: "Clé d'artefact manquante." }, { status: 400 });
    }

    // 1. Désintégration Physique (R2)
    try {
      const storageKey = storageService.extractKeyFromUrl(key);
      await storageService.deleteFile(storageKey);
    } catch (s3DelErr) {
      console.error("❌ [S3 DELETE ERROR] Avertissement purge physique :", s3DelErr);
    }

    // 2. Mise à jour de la Silice (Mongo)
    try {
      await TeamModel.updateOne(
        { uid: teamUid },
        { $pull: { documents: { url: key } } }
      );
    } catch (mongoPullErr) {
      console.error("🔥 [MONGO PULL ERROR]", mongoPullErr);
      return NextResponse.json({ success: false, message: "Échec du nettoyage dans la Silice." }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: "Artefact désintégré du Nid." }, { status: 200 });

  } catch (err: any) {
    console.error("🔥 Fracture globale lors de la purge :", err);
    return NextResponse.json({ success: false, message: err.message || "Erreur interne." }, { status: 500 });
  }
}