export const dynamic = 'force-dynamic';

import { NextResponse, NextRequest } from 'next/server';
import { CVTemplateModel } from '@ilot/infrastructure';
import { v4 as uuidv4 } from 'uuid';
import { revalidateTag } from 'next/cache';
import { withSilice, withAura, OiseauUser, ApiContext } from '@/lib/api-guards';
import { getCachedTemplates } from '@/lib/cache/kontakt.cache';
import { handleRouteError } from '@/lib/api-guards';
import { z } from 'zod';

// 🛡️ Schéma Zod optimisé : Délégation des valeurs par défaut au validateur
const CreateCVTemplateSchema = z.object({
  title: z.string().min(1, "Le titre est requis.").default('Parchemin Sans Nom'),
  description: z.string().default('Modèle forgé dans la matrice.'),
  priceShards: z.number().min(0, "Le prix en Shards ne peut être négatif.").default(0),
  barterAccepted: z.boolean().default(true),
  letrinFontFamily: z.string().default('sans'),
  blocks: z.array(z.unknown()).default([]),
  tags: z.array(z.string()).default([]), // 🏷️ Tags cosmétiques utiles pour l'indexation
});

type CreateCVTemplateInput = z.infer<typeof CreateCVTemplateSchema>;

interface CVTemplateDocument {
  uid: string;
  authorUid: string;
  title: string;
  [key: string]: unknown;
}

export const GET = withSilice(async (req: NextRequest, _context: ApiContext) => {
  try {
    let url: URL;
    try {
      url = new URL(req.url);
    } catch {
      return NextResponse.json({ error: "URL de requête invalide." }, { status: 400 });
    }
    const authorUid = url.searchParams.get('authorUid');
    const templates = await getCachedTemplates(authorUid);
    return NextResponse.json({ success: true, data: templates }, { status: 200 });
  } catch (error: unknown) {
    return handleRouteError(error, 'KONTAKT TEMPLATES GET ERROR');
  }
});

export const POST = withAura(async (req: NextRequest, _context: ApiContext, currentUser: OiseauUser) => {
  try {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      // Si le corps est illisible ou vide, on passera un objet vide pour que Zod applique les valeurs par défaut
      body = {}; 
    }

    // 🛡️ Validation et assainissement via Zod
    const validation = CreateCVTemplateSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: "Données de modèle de CV invalides.", details: validation.error.flatten() }, { status: 400 });
    }
    const sanitizedData: CreateCVTemplateInput = validation.data;

    const userUid = currentUser.uid;
    const userName = (currentUser as Record<string, unknown>).name as string || 'Oiseau Inconnu';
    const templateUid = `tmpl_${uuidv4()}`;

    let newTemplate: CVTemplateDocument;
    try {
      // 🔮 L'insertion en base est maintenant très épurée grâce au typage strict de Zod
      newTemplate = (await CVTemplateModel.create({
        ...sanitizedData,
        uid: templateUid,
        authorUid: userUid,
        authorName: userName,
      })) as unknown as CVTemplateDocument;
    } catch (createErr) {
      console.error("  [TEMPLATE CREATE ERROR]", createErr);
      return NextResponse.json({ error: "Échec de la sédimentation du modèle en base." }, { status: 500 });
    }

    revalidateTag('cv-templates');
    revalidateTag(`author-${userUid}`);

    return NextResponse.json({
      success: true,
      message: "Modèle de CV sédimenté et publié comme artefact.",
      data: newTemplate
    }, { status: 201 });

  } catch (error: unknown) {
    return handleRouteError(error, 'KONTAKT TEMPLATES POST ERROR');
  }
});