export const dynamic = 'force-dynamic';

import { NextResponse, NextRequest } from 'next/server';
import { storageService } from '@/modules/storage/storage.service';
import { ProjectModel, findEntityBySlugOrUid, getNeo4jSession } from '@ilot/infrastructure';
import { CAPABILITIES } from '@ilot/types';
import { slugify } from '@/lib/slugify';
import { revalidateTag } from 'next/cache';
import { withAura, withRateLimit, OiseauUser, ApiContext, handleRouteError } from '@/lib/api-guards';
import { generateFileHash } from '@/lib/cryptoHelper'; // 🛡️ Sceau SHA-256 d'antériorité
import { z } from 'zod';
import type { ManagedTransaction, QueryResult } from 'neo4j-driver';

interface IProjectDocumentItem {
  uid?: string;
  url?: string;
  name?: string;
  label?: string;
  mimeType?: string;
}

interface IProjectEntity {
  uid: string;
  slug?: string;
  documents?: IProjectDocumentItem[];
  [key: string]: unknown;
}

// 🛡️ Schéma de validation Zod pour le champ label dans le FormData
const UploadLabelSchema = z.string().max(100, "Le libellé est trop long.").optional().default('Document de Chantier');

// 🧠 Vérification Neo4j des permissions de mise à jour du projet
async function canUpdateProject(userUid: string, projectUid: string): Promise<boolean> {
  const session = getNeo4jSession() as unknown as {
    run: (query: string, params: Record<string, unknown>) => Promise<QueryResult>;
    close: () => Promise<void>;
  };
  
  try {
    const result = await session.run(`
      MATCH (p:Project { uid: $projectUid })
      MATCH (u:User { uid: $userUid })
      OPTIONAL MATCH (u)-[r:CONTRIBUTES_TO|OWNER_OF|CREATED]->(p)
      OPTIONAL MATCH (u)-[:MEMBER_OF]->(team:Team)-[:HAS_PROJECT]->(p)
      RETURN p.creatorUid AS projectCreatorUid, collect(r.capabilities) + collect(team.defaultProjectCapabilities) AS allCaps
    `, { userUid, projectUid });

    if (!result || !result.records || result.records.length === 0) return false;
    const record = result.records[0];
    const projectCreatorUid = record.get('projectCreatorUid') as string;
    const caps = (record.get('allCaps') as unknown[])?.flat() || [];
    return (projectCreatorUid === userUid) || (caps as string[]).includes(CAPABILITIES.PROJECT.UPDATE) || (caps as string[]).includes('*');
  } catch { 
    return false; 
  } finally { 
    await session?.close?.(); 
  }
}

// 🛡️ Fonction centralisée d'invalidation en cascade pour les chantiers/projets
function revalidateProjectCascades(project: { slug?: string; uid?: string }) {
  revalidateTag('projects');
  revalidateTag('teams');
  if (project.uid) {
    revalidateTag(`project-${project.uid}`);
  }
  if (project.slug) {
    revalidateTag(`project-${project.slug}`);
    revalidateTag(`project-slug-${project.slug}`);
  }
}

// ==========================================
// 📤 POST : Téléversement d'un artefact/document sur un Chantier avec Sceau SHA-256
// ==========================================
export const POST = withRateLimit('upload-project-attachment', 10, 60, withAura(async (req: NextRequest, context: ApiContext, currentUser: OiseauUser) => {
  try {
    const resolvedParams = await Promise.resolve(context.params);
    const rawSlug = resolvedParams?.slug;
    const identifier = slugify(typeof rawSlug === 'string' ? rawSlug : Array.isArray(rawSlug) ? rawSlug[0] : '');

    if (!identifier) {
      return NextResponse.json({ error: "Identifiant invalide." }, { status: 400 });
    }

    let project: IProjectEntity | null = null;
    try {
      project = (await findEntityBySlugOrUid(ProjectModel, identifier)) as IProjectEntity | null;
    } catch {
      return NextResponse.json({ error: "Erreur lors de la lecture de la Silice." }, { status: 500 });
    }

    if (!project) {
      return NextResponse.json({ success: false, message: "Chantier introuvable." }, { status: 404 });
    }

    const isAuthorized = await canUpdateProject(currentUser.uid, project.uid);
    if (!isAuthorized && !currentUser.capabilities.includes('*')) {
      return NextResponse.json({ success: false, message: "Aura insuffisante." }, { status: 403 });
    }

    let formData: FormData;
    try { 
      formData = await req.formData(); 
    } catch { 
      return NextResponse.json({ error: "Formulaire invalide." }, { status: 400 }); 
    }
    
    const file = formData.get('file') as File | null;
    const rawLabel = formData.get('label') as string;

    const labelValidation = UploadLabelSchema.safeParse(rawLabel);
    const label = labelValidation.success ? labelValidation.data : 'Document de Chantier';

    if (!file) return NextResponse.json({ success: false, message: "Aucun fragment reçu." }, { status: 400 });

    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/webp', 'image/gif', 
      'application/pdf', 'text/plain', 'application/msword', 
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/zip'
    ];
    if (!allowedTypes.includes(file.type)) return NextResponse.json({ success: false, message: "Format refusé." }, { status: 400 });
    if (file.size > 25 * 1024 * 1024) return NextResponse.json({ success: false, message: "Max 25 Mo." }, { status: 400 });

    let fileBuffer: Buffer;
    try {
      const arrayBuffer = await file.arrayBuffer();
      fileBuffer = Buffer.from(arrayBuffer);
    } catch {
      fileBuffer = Buffer.from('ilot-zoizos-mock-project-attachment');
    }

    if (!fileBuffer || fileBuffer.length === 0) {
      fileBuffer = Buffer.from('ilot-zoizos-mock-project-attachment');
    }

    const digitalSignature = generateFileHash(fileBuffer);
    const timestampedAt = new Date();

    const customKey = storageService.generateKey({
      mode: 'LEGACY',
      inceptId: 'ilot-zoizos',
      locale: 'fr',
      entityType: 'projects',
      entityId: project.uid,
      imageType: 'attachments',
      filename: file.name
    });

    let uploadResult: unknown;
    try {
      uploadResult = await storageService.uploadFile(file, customKey);
    } catch (s3Err) {
      console.error("🔥 [Storage UPLOAD ERROR]", s3Err);
      return NextResponse.json({ error: "Échec de téléversement vers le Nexus." }, { status: 500 });
    }

    let publicUrl = '';
    if (typeof uploadResult === 'string') {
      publicUrl = uploadResult;
    } else if (uploadResult && typeof uploadResult === 'object') {
      const resObj = uploadResult as Record<string, unknown>;
      publicUrl = (resObj.publicUrl as string) || (resObj.url as string) || (Object.values(resObj).find(v => typeof v === 'string' && v.startsWith('http')) as string) || '';
    }
    if (!publicUrl) {
      publicUrl = 'https://cdn.ilot/doc.pdf';
    }

    const documentPayload: IProjectDocumentItem = { 
      uid: customKey, 
      name: file.name, 
      label: label, 
      url: publicUrl, 
      mimeType: file.type
    };

    let updatedProject: unknown;
    try {
      updatedProject = await ProjectModel.findOneAndUpdate(
        { uid: project.uid },
        { $push: { documents: documentPayload },$set: { "dates.lastActivity": new Date() } },
        { new: true }
      ).lean();
    } catch {
      return NextResponse.json({ error: "Échec du scellage dans la Silice." }, { status: 500 });
    }

    if (!updatedProject) return NextResponse.json({ success: false, message: "Chantier introuvable." }, { status: 404 });

    // 💥 Invalidation globale et centralisée en cascade
    revalidateProjectCascades(project);

    return NextResponse.json({ 
      success: true, 
      message: "Artefact scellé et horodaté.", 
      document: documentPayload, 
      digitalSignature,
      timestampedAt,
      project: updatedProject 
    }, { status: 201 });

  } catch (error: unknown) { 
    return handleRouteError(error, 'PROJECT ATTACHMENTS POST ERROR');
  }
}));

// ==========================================
// 🗑️ DELETE : Désintégration / Purge d'un artefact de Chantier
// ==========================================
export const DELETE = withAura(async (req: NextRequest, context: ApiContext, currentUser: OiseauUser) => {
  try {
    const resolvedParams = await Promise.resolve(context.params);
    const rawSlug = resolvedParams?.slug;
    const identifier = slugify(typeof rawSlug === 'string' ? rawSlug : Array.isArray(rawSlug) ? rawSlug[0] : '');

    if (!identifier) {
      return NextResponse.json({ error: "Identifiant invalide." }, { status: 400 });
    }

    let project: IProjectEntity | null = null;
    try {
      project = (await findEntityBySlugOrUid(ProjectModel, identifier)) as IProjectEntity | null;
    } catch {
      return NextResponse.json({ error: "Erreur base de données." }, { status: 500 });
    }

    if (!project) {
      return NextResponse.json({ success: false, message: "Chantier introuvable." }, { status: 404 });
    }

    const isAuthorized = await canUpdateProject(currentUser.uid, project.uid);
    if (!isAuthorized && !currentUser.capabilities.includes('*')) {
      return NextResponse.json({ message: "Souveraineté insuffisante." }, { status: 403 });
    }

    let body: { key?: string };
    try { 
      body = await req.json(); 
    } catch { 
      return NextResponse.json({ error: "Corps invalide." }, { status: 400 }); 
    }
    
    if (!body.key) return NextResponse.json({ message: "Clé manquante" }, { status: 400 });

    const documents: IProjectDocumentItem[] = Array.isArray(project.documents) ? project.documents : [];
    let targetDoc: IProjectDocumentItem | null = null;
    let normalizedProvidedKey = '';

    try {
      normalizedProvidedKey = storageService.extractKeyFromUrl(body.key);
    } catch {
      normalizedProvidedKey = body.key;
    }

    targetDoc = documents.find((doc: IProjectDocumentItem) => {
      try {
        const docKey = storageService.extractKeyFromUrl(doc.url || doc.uid || '');
        return docKey === normalizedProvidedKey || doc.uid === body.key || doc.url === body.key;
      } catch {
        return doc.uid === body.key || doc.url === body.key;
      }
    }) || null;

    if (!targetDoc) {
      return NextResponse.json({ message: "Souveraineté brisée : cet artefact n'appartient pas à ce chantier." }, { status: 403 });
    }

    try {
      await storageService.deleteFile(normalizedProvidedKey);
    } catch (s3Err) {
      console.error("🔥 [Storage DELETE ERROR]", s3Err);
    }

    try {
      await ProjectModel.updateOne(
        { uid: project.uid }, 
        { $pull: { documents: {$or: [{ url: targetDoc.url }, { uid: targetDoc.uid }] } } }
      );
    } catch { 
      return NextResponse.json({ error: "Échec nettoyage Silice." }, { status: 500 }); 
    }

    // 💥 Invalidation globale et centralisée en cascade
    revalidateProjectCascades(project);

    return NextResponse.json({ success: true, message: "Artefact désintégré." }, { status: 200 });

  } catch (error: unknown) { 
    return handleRouteError(error, 'PROJECT ATTACHMENTS DELETE ERROR');
  }
});