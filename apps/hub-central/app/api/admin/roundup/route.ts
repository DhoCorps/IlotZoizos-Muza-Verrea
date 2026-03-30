import { NextResponse } from 'next/server';
import { connectToDatabase } from '@ilot/infrastructure';
import mongoose from 'mongoose';

export async function GET() {
  try {
    await connectToDatabase();
    
    // 1. Inspection du terrain
    const db = mongoose.connection;
    let rolesSupprimes = 0;
    let permissionsSupprimees = 0;

    // 2. Application du Désherbant (DeleteMany supprime tout le contenu, mais garde la structure)
    if (db.models.Role) {
      const roleResult = await db.models.Role.deleteMany({});
      rolesSupprimes = roleResult.deletedCount;
    }
    
    if (db.models.Permission) {
      const permResult = await db.models.Permission.deleteMany({});
      permissionsSupprimees = permResult.deletedCount;
    }

    return NextResponse.json({ 
      success: true, 
      message: '🔥 Terrain purifié avec succès !',
      details: `Incendie contrôlé : ${rolesSupprimes} Rôle(s) et ${permissionsSupprimees} Permission(s) réduits en cendres.`
    });

  } catch (error: any) {
    console.error("❌ Échec du désherbage :", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}