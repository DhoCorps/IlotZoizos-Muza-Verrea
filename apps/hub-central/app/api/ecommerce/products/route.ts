export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { ProductModel, OiseauModel } from '@ilot/infrastructure';
import { v4 as uuidv4 } from 'uuid';
import { slugify } from '@/lib/slugify';
import { revalidateTag } from 'next/cache';
import { withSilice, withAura, OiseauUser, ApiContext } from '@/lib/api-guards';
import { getCachedProducts } from '@/lib/cache/ecommerce.cache';
import { ProductSchema } from '@ilot/types';

// ==========================================
// GET : Recenser les artefacts du catalogue (Public / Silice)
// ==========================================
export const GET = withSilice(async (req: Request, _context: ApiContext) => {
  try {
    const url = new URL(req.url);
    const storeUid = url.searchParams.get('storeUid');
    const category = url.searchParams.get('category');
    const products = await getCachedProducts(storeUid, category);
    return NextResponse.json(products, { status: 200 });
  } catch (error: any) {
    console.error("  Erreur lors de la lecture des artefacts :", error);
    return NextResponse.json({ error: error.message || "Échec de la lecture." }, { status: 500 });
  }
});

// ==========================================
// POST : Ajouter un artefact au catalogue (Strictement Privé / Aura)
// ==========================================
export const POST = withAura(async (req: Request, _context: ApiContext, currentUser: OiseauUser) => {
  try {
    const userUid = currentUser.uid || currentUser.id;
    
    // 🛡️ DOUANE VIBRATOIRE : Vérification du Tribunal de la Canopée
    const oiseauProfile = await OiseauModel.findOne({ uid: userUid }).lean() as any;
    if (oiseauProfile && (oiseauProfile.isBanned || oiseauProfile.profileStatus === 'INDESIRABLE')) {
      return NextResponse.json({ 
         error: "Souveraineté restreinte : Votre fréquence est jugée indésirable. Le dépôt d'artefacts vous est interdit." 
      }, { status: 403 });
    }
    
    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "Corps de requête illisible." }, { status: 400 });
    }

    // 🛡️ BLINDAGE MASS ASSIGNMENT : Validation stricte via ProductSchema
    const validation = ProductSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ 
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
    
    // 2. Enregistrement en base de données de manière strictement filtrée (sans sellerUid absent du schema)
    const newProduct = await ProductModel.create({
      ...validatedData,
      uid: productUid,
      slug: finalSlug,
    });
    
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
  } catch (error: any) {
    console.error("  Fracture lors de l'ajout de l'artefact :", error);
    return NextResponse.json({ error: error.message || "Échec de l'ajout." }, { status: 500 });
  }
});