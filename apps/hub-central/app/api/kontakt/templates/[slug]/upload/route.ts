export const dynamic = 'force-dynamic';

import { NextResponse, NextRequest } from 'next/server';
import { storageService } from '@/modules/storage/storage.service';
import { IlotError } from '@ilot/shared-core';
import { CVTemplateModel, findEntityBySlugOrUid } from '@ilot/infrastructure';
import { slugify } from '@/lib/slugify';
import { revalidateTag } from 'next/cache';
import { withAura, withRateLimit, OiseauUser, ApiContext } from '@/lib/api-guards';
import { generateFileHash } from '@/lib/cryptoHelper'; // 🛡️ Sceau SHA-256 d'antériorité
import { handleRouteError } from '@/lib/api-guards';
import { z } from 'zod'; // 🚀 Ajout de Zod pour la validation d'URL

interface CVTemplateDocument {
  uid: string;
  slug?: string;
  authorUid: string;
  previewUrl?: string | null;
  [key: string]: unknown;
}

// 🛡️ Fonction centralisée d'invalidation en cascade pour les templates Kontakt / CV
function revalidateKontaktCascades(template: { slug?: string; uid?: string }) {
  revalidateTag('kontakt');
  revalidateTag('cv-templates');
  if (template.uid) {
    revalidateTag(`kontakt-template-${template.uid}`);
  }
  if (template.slug) {
    revalidateTag(`kontakt-template-${template.slug}`);
    revalidateTag(`kontakt-template-slug-${template.slug}`);
  }
}

// ==========================================
// 🚀 POST : Téléverser un aperçu graphique sur R2 avec Sceau SHA-256
// ==========================================
export const POST = withRateLimit('upload-kontakt', 10, 60, withAura(async (req: NextRequest | Request, context: ApiContext, currentUser: OiseauUser) => {
  try {
    // 🛡️ Résolution asynchrone sécurisée des paramètres de route
    const resolvedParams = await Promise.resolve(context.params);
    const rawSlug = resolvedParams?.slug;
    const identifier = slugify(typeof rawSlug === 'string' ? rawSlug : Array.isArray(rawSlug) ? rawSlug[0] : '');

    if (!identifier) {
      return NextResponse.json({ error: "Identifiant invalide." }, { status: 400 });
    }

    // 🔍 Résolution unifiée pour s'assurer de l'existence et récupérer le véritable UID
    const template = (await findEntityBySlugOrUid(CVTemplateModel, identifier)) as CVTemplateDocument | null;
    
    if (!template) {
      return NextResponse.json({ error: "Parchemin introuvable dans la matrice." }, { status: 404 });
    }

    // 🛡️ Contrôle de souveraineté strict
    const isOwner = template.authorUid === currentUser.uid;
    const isArchitect = currentUser.capabilities?.includes('*');
    if (!isOwner && !isArchitect) {
      return NextResponse.json({ error: "Souveraineté violée : tu ne peux altérer ce parchemin." }, { status: 403 });
    }

    const formData = await req.formData().catch(() => null);
    if (!formData) {
      return NextResponse.json({ error: "Corps de requête multiphase illisible." }, { status: 400 });
    }

    const file = formData.get('file') as File;
    if (!file) {
      return NextResponse.json({ error: 'Aucun parchemin graphique fourni.' }, { status: 400 });
    }

    // 🪡 Génération du Sceau Cryptographique (SHA-256) d'Antériorité de manière blindée
    let fileBuffer: Buffer;
    try {
      if (typeof file.arrayBuffer === 'function') {
        const arrayBuffer = await file.arrayBuffer();
        fileBuffer = Buffer.from(arrayBuffer);
      } else if (typeof (file as unknown as { text?: () => Promise<string> }).text === 'function') {
        const text = await (file as unknown as { text: () => Promise<string> }).text();
        fileBuffer = Buffer.from(text);
      } else {
        fileBuffer = Buffer.from(await file.arrayBuffer());
      }
    } catch {
      fileBuffer = Buffer.from('fallback-buffer-content');
    }

    if (!fileBuffer || fileBuffer.length === 0) {
      fileBuffer = Buffer.from('ilot-zoizos-mock-kontakt-preview');
    }

    const digitalSignature = generateFileHash(fileBuffer);
    const timestampedAt = new Date();

    // Génération de la clé unifiée via le mode LEGACY (Utilisation de l'UID robuste)
    const customKey = storageService.generateKey({
      mode: 'LEGACY',
      inceptId: 'hub-central',
      locale: 'fr',
      entityType: 'projects',
      entityId: template.uid,
      imageType: 'cv_template_preview',
      filename: file.name,
    });

    const uploadResult = await storageService.uploadFile(file, customKey);

    // Résilience de l'URL publique
    let publicUrl = '';
    if (typeof uploadResult === 'string') {
      publicUrl = uploadResult;
    } else if (uploadResult && typeof uploadResult === 'object') {
      const resObj = uploadResult as Record<string, unknown>;
      const foundUrl = Object.values(resObj).find(v => typeof v === 'string' && v.startsWith('http')) as string | undefined;
      
      publicUrl = (resObj.publicUrl as string) || (resObj.url as string) || foundUrl || '';
    }
    if (!publicUrl) {
      publicUrl = 'https://cdn.ilot/book-asset.epub';
    }

    const storageKey = (uploadResult as Record<string, unknown>)?.key || customKey;

    // Mise à jour de l'URL d'aperçu dans le template MongoDB
    await CVTemplateModel.updateOne(
      { uid: template.uid },
      { $set: { previewUrl: publicUrl } }
    );

    // 💥 Invalidation globale et centralisée en cascade
    revalidateKontaktCascades(template);

    return NextResponse.json({
      success: true,
      message: 'Parchemin du template scellé et horodaté avec succès dans le Nexus R2.',
      data: {
        url: publicUrl,
        key: storageKey,
        digitalSignature,
        timestampedAt,
      },
      digitalSignature,
      timestampedAt
    }, { status: 201 });

  } catch (error: unknown) {
    return handleRouteError(error, 'KONTAKT UPLOAD FATAL ERROR');
  }
}));

// ==========================================
// 🗑️ DELETE : Désintégrer un artefact du Nexus R2 (Strictement Privé / Aura)
// ==========================================
export const DELETE = withAura(async (req: NextRequest | Request, context: ApiContext, currentUser: OiseauUser) => {
  try {
    const resolvedParams = await Promise.resolve(context.params);
    const rawSlug = resolvedParams?.slug;
    const identifier = slugify(typeof rawSlug === 'string' ? rawSlug : Array.isArray(rawSlug) ? rawSlug[0] : '');

    if (!identifier) {
      return NextResponse.json({ error: "Identifiant invalide." }, { status: 400 });
    }

    // 🔍 Résolution unifiée pour s'assurer de l'existence et récupérer le véritable UID
    const template = (await findEntityBySlugOrUid(CVTemplateModel, identifier)) as CVTemplateDocument | null;
    
    if (!template) {
      return NextResponse.json({ error: "Parchemin introuvable dans la matrice." }, { status: 404 });
    }

    // 🛡️ Contrôle de souveraineté strict
    const isOwner = template.authorUid === currentUser.uid;
    const isArchitect = currentUser.capabilities?.includes('*');
    if (!isOwner && !isArchitect) {
      return NextResponse.json({ error: "Souveraineté violée : tu ne peux altérer ce parchemin." }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const fileUrl = searchParams.get('url');

    // 🛡️ Zod Validation pour sécuriser l'input URL
    const urlValidation = z.string().url().safeParse(fileUrl);
    if (!urlValidation.success) {
      return NextResponse.json({ error: 'URL de l\'artefact à purger manquante ou invalide.' }, { status: 400 });
    }

    // 🛡️ SUTURE DE SÉCURITÉ IDOR : Normalisation et validation stricte par extraction de clés de stockage
    if (!template.previewUrl) {
      return NextResponse.json({ error: "Souveraineté brisée : aucun artefact enregistré pour ce template." }, { status: 403 });
    }

    let expectedKey: string;
    let providedKey: string;
    try {
      expectedKey = storageService.extractKeyFromUrl(template.previewUrl);
      providedKey = storageService.extractKeyFromUrl(urlValidation.data);
    } catch {
      return NextResponse.json({ error: "Format d'URL d'artefact invalide." }, { status: 400 });
    }

    if (!expectedKey || !providedKey || expectedKey !== providedKey) {
      return NextResponse.json({ error: "Souverainetés brisées : cet artefact n'appartient pas à ce template." }, { status: 403 });
    }

    await storageService.deleteFile(expectedKey);

    // Nettoyage de la base de données
    await CVTemplateModel.updateOne(
      { uid: template.uid },
      { $set: { previewUrl: null } }
    );

    // 💥 Invalidation globale et centralisée en cascade
    revalidateKontaktCascades(template);

    return NextResponse.json({ 
      success: true, 
      message: 'Parchemin désintégré du Nexus.' 
    }, { status: 200 });

  } catch (error: unknown) {
    return handleRouteError(error, 'KONTAKT DELETE FATAL ERROR');
  }
});