// apps/hub-central/app/api/teams/[slug]/upload/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../../lib/auth';
import { storageService } from '../../../../../modules/storage/storage.service';
import { checkRateLimit } from '../../../../../modules/security/rateLimiter';
import { connectToDatabase, getNeo4jSession } from '@ilot/infrastructure'; 
import { TeamModel, ITeamDocument } from '@ilot/infrastructure'; 
import { CAPABILITIES } from '@ilot/types'; 

interface RouteParams {
  params: Promise<{ slug: string }>;
}

interface OiseauUser {
  id: string;
  uid: string;
  capabilities: string[];
}

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
      try { await session.close(); } catch (closeErr) {}
    }
  }
}

// ==========================================
// POST : Téléversement d'artefact sur le Nid via slug
// ==========================================
export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const clientIp = req.headers.get('x-forwarded-for') || '127.0.0.1';
    const { allowed } = await checkRateLimit(`upload-team-slug:${clientIp}`, 10, 60);
    if (!allowed) {
      return NextResponse.json({ success: false, message: "Trop de téléversements. Veuillez patienter." }, { status: 429 });
    }

    try { await connectToDatabase(); } catch (dbErr) {
      return NextResponse.json({ success: false, message: "La Silice est injoignable." }, { status: 500 });
    }

    let resolvedParams;
    try { resolvedParams = await params; } catch (paramErr) {
      return NextResponse.json({ success: false, message: "Identifiant de nid invalide." }, { status: 400 });
    }
    const teamIdentifier = resolvedParams.slug;

    let session;
    try { session = await getServerSession(authOptions); } catch (sessionErr) {
      return NextResponse.json({ success: false, message: "Erreur de lecture d'Aura." }, { status: 500 });
    }

    const user = session?.user as OiseauUser | undefined;
    if (!user || !user.uid) {
      return NextResponse.json({ success: false, message: "Oiseau non identifié dans la canopée." }, { status: 401 });
    }

    // Recherche de l'escouade/nid par slug ou uid dans MongoDB
    let team: ITeamDocument | null = null;
    try {
      team = await TeamModel.findOne({ 
        $or: [{ slug: teamIdentifier }, { uid: teamIdentifier }] 
      }).lean<ITeamDocument>() as any;
    } catch (queryErr) {
      return NextResponse.json({ success: false, message: "Échec de lecture du Nid." }, { status: 500 });
    }

    if (!team) {
      return NextResponse.json({ success: false, message: "Ce Nid s'est volatilisé de la Silice." }, { status: 404 });
    }

    const teamUid = team.uid;

    let isAuthorized = false;
    try {
      isAuthorized = await hasCapability(user.uid, teamUid, CAPABILITIES.FILE.UPLOAD);
    } catch (capErr) {}

    if (!isAuthorized && !user.capabilities?.includes('*')) {
      return NextResponse.json({ success: false, message: "Ton Aura ne résonne pas assez fort pour sceller un document dans ce Nid." }, { status: 403 });
    }

    let formData;
    try { formData = await req.formData(); } catch (formErr) {
      return NextResponse.json({ success: false, message: "Formulaire multipart illisible." }, { status: 400 });
    }

    const file = formData.get('file') as File | null;
    const mediaType = (formData.get('mediaType') as string) || 'attachments';
    const label = (formData.get('label') as string) || file?.name || 'Sans titre';

    if (!file) {
      return NextResponse.json({ success: false, message: "Aucune brindille de matière (fichier) reçue." }, { status: 400 });
    }

    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/webp', 'image/gif',
      'audio/mpeg', 'audio/mp3', 'video/mp4', 'application/pdf', 'text/plain'
    ];

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ success: false, message: `La Silice rejette le format ${file.type}.` }, { status: 400 });
    }
    if (file.size > 25 * 1024 * 1024) {
      return NextResponse.json({ success: false, message: "Max 25 Mo." }, { status: 400 });
    }

    const customKey = storageService.generateStructuredKey({
      inceptId: 'ilot-zoizos',
      locale: 'fr',
      entityType: 'teams',
      entityId: teamUid,
      imageType: mediaType, 
      filename: file.name
    });

    let uploadResult;
    try {
      uploadResult = await storageService.uploadFile(file, customKey);
    } catch (s3Err) {
      console.error("🔥 [Storage UPLOAD ERROR TEAM]", s3Err);
      return NextResponse.json({ success: false, message: "Échec du téléversement vers le Cloud." }, { status: 500 });
    }

    const documentPayload = {
      uid: customKey,
      name: file.name,
      label: label,
      url: uploadResult.publicUrl,
      mimeType: file.type,
      createdAt: new Date()
    };

    let updatedTeam;
    try {
      updatedTeam = await TeamModel.findOneAndUpdate(
        { uid: teamUid },
        { $push: { documents: documentPayload } },
        { new: true }
      ).lean();
    } catch (dbUpdateErr) {
      return NextResponse.json({ success: false, message: "Échec de sédimentation dans la Silice." }, { status: 500 });
    }

    if (!updatedTeam) {
      return NextResponse.json({ success: false, message: "Nid introuvable pour la sédimentation." }, { status: 404 });
    }
    
    return NextResponse.json({
      success: true,
      message: `La brindille est scellée dans R2 et rattachée à la Silice.`,
      publicUrl: uploadResult.publicUrl,
      key: customKey,
      document: documentPayload
    }, { status: 201 });

  } catch (error: any) {
    console.error("🔥 Fracture globale lors de l'injection du document dans R2 :", error);
    return NextResponse.json({ success: false, message: error.message || "L'injection a échoué." }, { status: 500 });
  }
}

// ==========================================
// DELETE : Désintégration physique et Silice via slug
// ==========================================
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    try { await connectToDatabase(); } catch (dbErr) {
      return NextResponse.json({ error: "La Silice est injoignable." }, { status: 500 });
    }

    let resolvedParams;
    try { resolvedParams = await params; } catch (paramErr) {
      return NextResponse.json({ error: "Identifiant de nid invalide." }, { status: 400 });
    }
    const teamIdentifier = resolvedParams.slug;

    let session;
    try { session = await getServerSession(authOptions); } catch (sessionErr) {
      return NextResponse.json({ error: "Erreur de session." }, { status: 500 });
    }

    const user = session?.user as OiseauUser | undefined;
    if (!user || !user.uid) {
      return NextResponse.json({ success: false, message: "Non autorisé" }, { status: 401 });
    }

    let team: ITeamDocument | null = null;
    try {
      team = await TeamModel.findOne({ 
        $or: [{ slug: teamIdentifier }, { uid: teamIdentifier }] 
      }).lean<ITeamDocument>() as any;
    } catch (queryErr) {
      return NextResponse.json({ success: false, message: "Nid introuvable." }, { status: 404 });
    }

    if (!team) {
      return NextResponse.json({ success: false, message: "Nid introuvable." }, { status: 404 });
    }

    const teamUid = team.uid;

    let isAuthorized = false;
    try {
      isAuthorized = await hasCapability(user.uid, teamUid, CAPABILITIES.FILE.BURN);
    } catch (e) {}

    if (!isAuthorized && !user.capabilities?.includes('*')) {
      return NextResponse.json({ success: false, message: "Souveraineté insuffisante pour brûler cet artefact." }, { status: 403 });
    }

    let body;
    try { body = await req.json(); } catch (parseErr) {
      return NextResponse.json({ success: false, message: "Corps de requête illisible." }, { status: 400 });
    }

    const { key } = body;
    if (!key) {
      return NextResponse.json({ success: false, message: "Clé d'artefact manquante." }, { status: 400 });
    }

    try {
      const storageKey = storageService.extractKeyFromUrl(key);
      await storageService.deleteFile(storageKey);
    } catch (s3DelErr) {
      console.error("❌ [Storage DELETE ERROR] :", s3DelErr);
    }

    try {
      await TeamModel.updateOne(
        { uid: teamUid },
        { $pull: { documents: { url: key } } }
      );
    } catch (mongoPullErr) {
      return NextResponse.json({ success: false, message: "Échec du nettoyage dans la Silice." }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: "Artefact désintégré du Nid." }, { status: 200 });

  } catch (err: any) {
    console.error("❌ Erreur globale lors de la purge :", err);
    return NextResponse.json({ success: false, message: err.message || "Erreur interne." }, { status: 500 });
  }
}