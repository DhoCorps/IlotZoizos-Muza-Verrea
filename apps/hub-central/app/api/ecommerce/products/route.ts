export const dynamic = 'force-dynamic';

import { NextResponse, NextRequest } from 'next/server';
import { ProductModel, OiseauModel } from '@ilot/infrastructure';
import { IOiseau} from '@ilot/types';
import { v4 as uuidv4 } from 'uuid';
import { slugify } from '@/lib/slugify';
import { revalidateTag } from 'next/cache';
import { withSilice, withAura, OiseauUser, ApiContext, handleRouteError } from '@/lib/api-guards';
import { getCachedProducts } from '@/lib/cache/ecommerce.cache';
import { ProductSchema, IProduct } from '@ilot/types';

// ==========================================
// GET : Recenser les artefacts du catalogue (Public / Silice)
// ==========================================
export const GET = withSilice(async (req: NextRequest, _context: ApiContext) => {
  try {
    let url: URL;
    try {
      url = new URL(req.url);
    } catch {
      return NextResponse.json({ success: false, error: "URL de requête invalide." }, { status: 400 });
    }

    const storeUid = url.searchParams.get('storeUid');
    const category = url.searchParams.get('category');
    const products = await getCachedProducts(storeUid, category);
    return NextResponse.json(products, { status: 200 });
  } catch (error: unknown) {
    return handleRouteError(error, "Échec de la lecture des artefacts du catalogue.");
  }
});

// ==========================================
// POST : Ajouter un artefact au catalogue (Strictement Privé / Aura)
// ==========================================
export const POST = withAura(async (req: NextRequest, _context: ApiContext, currentUser: OiseauUser) => {
  try {
    const userUid = currentUser.uid;
    
    // 🛡️ DOUANE VIBRATOIRE : Vérification du Tribunal de la Canopée
    const oiseauProfile = await OiseauModel.findOne({ uid: userUid }).lean() as IOiseau | null;
    if (oiseauProfile && (oiseauProfile.isBanned || oiseauProfile.profileStatus === 'INDESIRABLE')) {
      return NextResponse.json({ 
         success: false,
         error: "Souveraineté restreinte : Votre fréquence est jugée indésirable. Le dépôt d'artefacts vous est interdit." 
      }, { status: 403 });
    }
    
    let rawBody: unknown;
    try {
      rawBody = await req.json();
    } catch {
      return NextResponse.json({ success: false, error: "Corps de requête illisible." }, { status: 400 });
    }

    // 🛡️ BLINDAGE MASS ASSIGNMENT : Validation stricte via ProductSchema
    const validation = ProductSchema.safeParse(rawBody);
    if (!validation.success) {
      return NextResponse.json({ 
        success: false,
        error: "Contrat souverain invalide : Le format des données produit est corrompu.", 
        details: validation.error.flatten() 
      }, { status: 400 });
    }

    const validatedData = validation.data;
    const productUid = `prod_${uuidv4()}`;
    
    // 1. Génération sécurisée et unique du Slug avec garde-fou anti-boucle
    const baseSlug = slugify(validatedData.title || 'artefact');
    let finalSlug = baseSlug;
         
    let slugExists = await ProductModel.findOne({ slug: finalSlug }).lean();
    let counter = 1;
    let safetyCounter = 0;
    while (slugExists && safetyCounter < 50) {
      finalSlug = `${baseSlug}-${counter}`;
      slugExists = await ProductModel.findOne({ slug: finalSlug }).lean();
      counter++;
      safetyCounter++;
    }
    
    // 2. Enregistrement en base de données de manière strictement filtrée
    const newProduct = await ProductModel.create({
      ...validatedData,
      ownerUid: validatedData.ownerUid || userUid,
      uid: productUid,
      slug: finalSlug,
    }) as unknown as IProduct;
    
    // 💥 Invalidation chirurgicale du cache en cascade
    revalidateTag('products');
    if (validatedData.storeUid) {
      revalidateTag(`store-products-${validatedData.storeUid}`);
    }
    return NextResponse.json({
      success: true,
      message: "Artefact ajouté au catalogue de l'îlot.",
      data: newProduct
    }, { status: 201 });
  } catch (error: unknown) {
    return handleRouteError(error, "Échec lors de l'ajout de l'artefact.");
  }
});