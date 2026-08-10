export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { storageService } from '@/modules/storage/storage.service';
import { checkRateLimit } from '@/modules/security/rateLimiter';
import { ProjectModel, getNeo4jSession } from '@ilot/infrastructure';
import { CAPABILITIES } from '@ilot/types';
import { slugify } from '@/lib/slugify';
import { revalidateTag } from 'next/cache';
import { withAura, OiseauUser, ApiContext } from '@/lib/api-guards';

// 🧠 Vérification Neo4j des permissions de mise à jour du projet
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
  } catch (error) { 
    return false; 
  } finally { 
    await session?.close?.(); 
  }
}

// ==========================================
// 📤 POST : Téléversement d'un artefact/document sur un Chantier
// ==========================================
export const POST = withAura(async (req: Request, context: ApiContext, currentUser: OiseauUser) => {
  try {
    const resolvedParams = await context.params;
    const rawSlug = resolvedParams?.slug;
    const slug = slugify(typeof rawSlug === 'string' ? rawSlug : Array.isArray(rawSlug) ? rawSlug[0] : '');

    if (!slug) {
      return NextResponse.json({ error: "Identifiant invalide." }, { status: 400 });
    }

    // 🛡️ SUTURE DE SOUVERAINETÉ ABSOLUE : Rate Limiting blindé anti-undefined
    const clientIp = req.headers.get('x-forwarded-for') || '127.0.0.1';
    let rateLimitResult: { allowed?: boolean } = { allowed: true };
    try {
      const res = await checkRateLimit(`upload-project-attachment:${clientIp}`, 10, 60);
      if (res && typeof res === 'object') {
        rateLimitResult = res;
      }
    } catch {
      rateLimitResult = { allowed: true };
    }

    if (rateLimitResult.allowed === false) {
      return NextResponse.json({ success: false, message: "Trop de téléversements. Veuillez patienter." }, { status: 429 });
    }

    // Recherche du projet par son slug dans la Silice
    let project;
    try {
      project = await ProjectModel.findOne({ slug }).lean();
    } catch (dbErr) {
      return NextResponse.json({ error: "Erreur lors de la lecture de la Silice." }, { status: 500 });
    }

    if (!project) {
      return NextResponse.json({ success: false, message: "Chantier introuvable." }, { status: 404 });
    }

    const isAuthorized = await canUpdateProject(currentUser.uid, project.uid);
    if (!isAuthorized && !currentUser.capabilities.includes('*')) {
      return NextResponse.json({ success: false, message: "Aura insuffisante." }, { status: 403 });
    }

    let formData;
    try { 
      formData = await req.formData(); 
    } catch (err) { 
      return NextResponse.json({ error: "Formulaire invalide." }, { status: 400 }); 
    }
    
    const file = formData.get('file') as File | null;
    const label = formData.get('label') as string || 'Document de Chantier';

    if (!file) return NextResponse.json({ success: false, message: "Aucun fragment reçu." }, { status: 400 });

    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/webp', 'image/gif', 
      'application/pdf', 'text/plain', 'application/msword', 
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/zip'
    ];
    if (!allowedTypes.includes(file.type)) return NextResponse.json({ success: false, message: "Format refusé." }, { status: 400 });
    if (file.size > 25 * 1024 * 1024) return NextResponse.json({ success: false, message: "Max 25 Mo." }, { status: 400 });

    const customKey = storageService.generateStructuredKey({
      inceptId: 'ilot-zoizos', locale: 'fr', entityType: 'projects', entityId: project.uid, imageType: 'attachments', filename: file.name
    });

    let uploadResult;
    try {
      uploadResult = await storageService.uploadFile(file, customKey);
    } catch (s3Err) {
      console.error("🔥 [Storage UPLOAD ERROR]", s3Err);
      return NextResponse.json({ error: "Échec de téléversement vers le Nexus." }, { status: 500 });
    }

    const documentPayload = { 
      uid: customKey, 
      name: file.name, 
      label: label, 
      url: uploadResult.publicUrl, 
      mimeType: file.type, 
      createdAt: new Date() 
    };

    let updatedProject;
    try {
      updatedProject = await ProjectModel.findOneAndUpdate(
        { slug },
        { $push: { documents: documentPayload }, $set: { "dates.lastActivity": new Date() } },
        { new: true }
      ).lean();
    } catch (dbErr) {
      return NextResponse.json({ error: "Échec du scellage dans la Silice." }, { status: 500 });
    }

    if (!updatedProject) return NextResponse.json({ success: false, message: "Chantier introuvable." }, { status: 404 });

    // 💥 BOOM ! Invalidation chirurgicale du cache en cascade
    revalidateTag('projects');
    revalidateTag(`project-${project.uid}`);
    revalidateTag(`project-slug-${slug}`);

    return NextResponse.json({ success: true, message: "Artefact scellé.", document: documentPayload, project: updatedProject }, { status: 201 });

  } catch (error: any) { 
    console.error("❌ [PROJECT ATTACHMENTS POST ERROR]", error);
    return NextResponse.json({ success: false, message: "Le téléversement a échoué." }, { status: 500 }); 
  }
});

// ==========================================
// 🗑️ DELETE : Désintégration / Purge d'un artefact de Chantier
// ==========================================
export const DELETE = withAura(async (req: Request, context: ApiContext, currentUser: OiseauUser) => {
  try {
    const resolvedParams = await context.params;
    const rawSlug = resolvedParams?.slug;
    const slug = slugify(typeof rawSlug === 'string' ? rawSlug : Array.isArray(rawSlug) ? rawSlug[0] : '');

    if (!slug) {
      return NextResponse.json({ error: "Identifiant invalide." }, { status: 400 });
    }

    let project;
    try {
      project = await ProjectModel.findOne({ slug }).lean();
    } catch (dbErr) {
      return NextResponse.json({ error: "Erreur base de données." }, { status: 500 });
    }

    if (!project) {
      return NextResponse.json({ success: false, message: "Chantier introuvable." }, { status: 404 });
    }

    const isAuthorized = await canUpdateProject(currentUser.uid, project.uid);
    if (!isAuthorized && !currentUser.capabilities.includes('*')) {
      return NextResponse.json({ message: "Souveraineté insuffisante." }, { status: 403 });
    }

    let body;
    try { 
      body = await req.json(); 
    } catch (err) { 
      return NextResponse.json({ error: "Corps invalide." }, { status: 400 }); 
    }
    
    if (!body.key) return NextResponse.json({ message: "Clé manquante" }, { status: 400 });

    try {
      const storageKey = storageService.extractKeyFromUrl(body.key);
      await storageService.deleteFile(storageKey);
    } catch (s3Err) {
      console.error("🔥 [Storage DELETE ERROR]", s3Err);
    }

    try {
      await ProjectModel.updateOne({ slug }, { $pull: { documents: { url: body.key } } });
    } catch (dbErr) { 
      return NextResponse.json({ error: "Échec nettoyage Silice." }, { status: 500 }); 
    }

    // 💥 BOOM ! Invalidation chirurgicale du cache en cascade
    revalidateTag('projects');
    revalidateTag(`project-${project.uid}`);
    revalidateTag(`project-slug-${slug}`);

    return NextResponse.json({ success: true, message: "Artefact désintégré." }, { status: 200 });

  } catch (err: any) { 
    console.error("❌ [PROJECT ATTACHMENTS DELETE ERROR]", err);
    return NextResponse.json({ message: "Erreur globale." }, { status: 500 }); 
  }
});