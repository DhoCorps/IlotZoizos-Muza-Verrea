import { NextResponse } from 'next/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getServerSession } from 'next-auth/next';
import { authOptions } from "../../../../../lib/auth"; 
import { storageService } from '../../../../../modules/storage/storage.service';
import { connectToDatabase, ProjectModel, getNeo4jSession } from '@ilot/infrastructure';
import { CAPABILITIES } from '@ilot/types';

interface OiseauUser { id: string; uid: string; capabilities: string[]; }
interface RouteParams { params: Promise<{ projectId: string }> }

const s3Client = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT!,
  credentials: { accessKeyId: process.env.R2_ACCESS_KEY_ID!, secretAccessKey: process.env.R2_SECRET_ACCESS_KEY! },
  forcePathStyle: true,
});

async function canUpdateProject(userUid: string, projectUid: string): Promise<boolean> {
  const session = getNeo4jSession();
  try {
    const result = await session.run(`
      MATCH (p:Project { uid: $projectUid })
      MATCH (u:User { uid: $userUid })
      OPTIONAL MATCH (u)-[r:CONTRIBUTES_TO|OWNER_OF|CREATED]->(p)
      OPTIONAL MATCH (u)-[:MEMBER_OF]->(team:Team)-[:HAS_PROJECT]->(p)
      RETURN p.creatorUid AS projectCreatorUid, collect(r.capabilities) + collect(team.defaultProjectCapabilities) AS allCaps
    `, { userUid, projectUid });
    if (result.records.length === 0) return false;
    const record = result.records[0];
    const projectCreatorUid = record.get('projectCreatorUid');
    const caps = record.get('allCaps').flat() || [];
    return (projectCreatorUid === userUid) || caps.includes(CAPABILITIES.PROJECT.UPDATE) || caps.includes('*');
  } catch (error) { return false; } finally { await session.close(); }
}

export async function POST(req: Request, { params }: RouteParams) {
  try {
    let resolvedParams;
    try { resolvedParams = await params; } catch (err) { return NextResponse.json({ error: "Identifiant invalide." }, { status: 400 }); }

    try { await connectToDatabase(); } catch (dbErr) { return NextResponse.json({ error: "Silice injoignable." }, { status: 500 }); }

    let session;
    try { session = await getServerSession(authOptions); } catch (err) { return NextResponse.json({ error: "Erreur session." }, { status: 500 }); }
    
    const user = session?.user as OiseauUser | undefined;
    if (!user || !user.uid) return NextResponse.json({ success: false, message: "Oiseau non identifié." }, { status: 401 });

    const isAuthorized = await canUpdateProject(user.uid, resolvedParams.projectId);
    if (!isAuthorized && !user.capabilities.includes('*')) {
      return NextResponse.json({ success: false, message: "Aura insuffisante." }, { status: 403 });
    }

    let formData;
    try { formData = await req.formData(); } catch (err) { return NextResponse.json({ error: "Formulaire invalide." }, { status: 400 }); }
    
    const file = formData.get('file') as File | null;
    const label = formData.get('label') as string || 'Document de Chantier';

    if (!file) return NextResponse.json({ success: false, message: "Aucun fragment reçu." }, { status: 400 });

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf', 'text/plain', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/zip'];
    if (!allowedTypes.includes(file.type)) return NextResponse.json({ success: false, message: "Format refusé." }, { status: 400 });
    if (file.size > 25 * 1024 * 1024) return NextResponse.json({ success: false, message: "Max 25 Mo." }, { status: 400 });

    let buffer;
    try { buffer = Buffer.from(await file.arrayBuffer()); } catch(e) { return NextResponse.json({ error: "Fichier corrompu." }, { status: 400 }); }

    const customKey = storageService.generateStructuredKey({
      inceptId: 'ilot-zoizos', locale: 'fr', entityType: 'projects', entityId: resolvedParams.projectId, imageType: 'attachments', filename: file.name
    });

    try {
      await s3Client.send(new PutObjectCommand({ Bucket: process.env.R2_BUCKET_NAME!, Key: customKey, Body: buffer, ContentType: file.type }));
    } catch (s3Err) {
      console.error("🔥 [S3 UPLOAD ERROR]", s3Err);
      return NextResponse.json({ error: "Échec de téléversement vers le Cloud." }, { status: 500 });
    }

    const publicUrl = `${process.env.R2_PUBLIC_URL}/${customKey}`;
    const documentPayload = { uid: customKey, name: file.name, label: label, url: publicUrl, mimeType: file.type, createdAt: new Date() };

    let updatedProject;
    try {
      updatedProject = await ProjectModel.findOneAndUpdate(
        { uid: resolvedParams.projectId },
        { $push: { documents: documentPayload }, $set: { "dates.updatedAt": new Date() } },
        { new: true }
      ).lean();
    } catch (dbErr) {
      return NextResponse.json({ error: "Échec du scellage dans la Silice." }, { status: 500 });
    }

    if (!updatedProject) return NextResponse.json({ success: false, message: "Chantier introuvable." }, { status: 404 });
    return NextResponse.json({ success: true, message: "Artefact scellé.", document: documentPayload, project: updatedProject }, { status: 201 });

  } catch (error: any) { return NextResponse.json({ success: false, message: "Le téléversement a échoué." }, { status: 500 }); }
}

export async function DELETE(req: Request, { params }: RouteParams) {
  try {
    let resolvedParams;
    try { resolvedParams = await params; } catch (err) { return NextResponse.json({ error: "Identifiant invalide." }, { status: 400 }); }

    try { await connectToDatabase(); } catch (dbErr) { return NextResponse.json({ error: "La Silice est injoignable." }, { status: 500 }); }

    let session;
    try { session = await getServerSession(authOptions); } catch (err) { return NextResponse.json({ error: "Erreur session." }, { status: 500 }); }
    
    const user = session?.user as OiseauUser | undefined;
    if (!user || !user.uid) return NextResponse.json({ message: "Non autorisé" }, { status: 401 });

    const isAuthorized = await canUpdateProject(user.uid, resolvedParams.projectId);
    if (!isAuthorized && !user.capabilities.includes('*')) return NextResponse.json({ message: "Souveraineté insuffisante." }, { status: 403 });

    let body;
    try { body = await req.json(); } catch (err) { return NextResponse.json({ error: "Corps invalide." }, { status: 400 }); }
    
    if (!body.key) return NextResponse.json({ message: "Clé manquante" }, { status: 400 });

    try {
      const storageKey = storageService.extractKeyFromUrl(body.key);
      await storageService.deleteFile(storageKey);
    } catch (s3Err) {
      console.error("🔥 [S3 DELETE ERROR]", s3Err);
      // On continue pour nettoyer Mongo même si S3 râle (fichier déjà supprimé ?)
    }

    try {
      await ProjectModel.updateOne({ uid: resolvedParams.projectId }, { $pull: { documents: { url: body.key } } });
    } catch (dbErr) { return NextResponse.json({ error: "Échec nettoyage Silice." }, { status: 500 }); }

    return NextResponse.json({ success: true, message: "Artefact désintégré." }, { status: 200 });
  } catch (err: any) { return NextResponse.json({ message: "Erreur globale." }, { status: 500 }); }
}