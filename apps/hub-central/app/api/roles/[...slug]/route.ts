import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from "@ilot/infrastructure";
import { RoleOrchestrator } from "@ilot/shared-core";
import { getServerSession } from "next-auth/next";

export const dynamic = 'force-dynamic';

// 1. Sécurité centralisée : La Douane
async function checkAuth() {
  // BYPASS de test local
  if (process.env.NODE_ENV === 'test') return true; 

  const session = await getServerSession() as any;
  const roles = session?.user?.roles || [];
  
  return roles.some((r: any) => 
    (typeof r === 'object' ? r.intitule === 'SUPERADMIN' : r === 'SUPERADMIN') || r === 'SuperAdmin'
  );
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug?: string[] }> }
) {
  try {
    await connectToDatabase();
    if (!(await checkAuth())) {
      return NextResponse.json({ error: "Accès refusé : Réservé aux SuperAdmin" }, { status: 403 });
    }

    // Next.js 14.x / 15.x : Résolution propre des paramètres asynchrones
    const resolvedParams = await params;
    const slug = resolvedParams?.slug || [];
    const resource = slug[0];   // ex: 'permissions' ou un UID de rôle
    const idOrUid = slug[1];    // ex: UID spécifique d'une permission

    // --- LOGIQUE PERMISSIONS ---
    if (resource === 'permissions') {
      if (idOrUid) {
        const perm = await RoleOrchestrator.getPermission(idOrUid);
        return NextResponse.json(perm);
      }
      const allPerms = await RoleOrchestrator.getAllPermissions();
      return NextResponse.json(allPerms);
    }

    // --- LOGIQUE RÔLES (Un rôle spécifique) ---
    const uid = resource; 
    if (uid) {
      const role = await RoleOrchestrator.getRole(uid);
      return NextResponse.json(role);
    }

    return NextResponse.json({ error: "Requête mal formatée" }, { status: 400 });

  } catch (error: any) {
    const status = error.message.includes("introuvable") ? 404 : 500;
    return NextResponse.json({ error: error.message }, { status });
  }
}

export async function POST(
  req: NextRequest, 
  { params }: { params: Promise<{ slug?: string[] }> }
) {
  try {
    await connectToDatabase();
    if (!(await checkAuth())) return NextResponse.json({ error: "Accès refusé par la Douane" }, { status: 403 });

    const resolvedParams = await params;
    const slug = resolvedParams?.slug || [];
    const resource = slug[0];
    const body = await req.json();

    // On ne gère ici que la création de PERMISSIONS (les rôles sont gérés par la route principale)
    if (resource === 'permissions') {
      const newPerm = await RoleOrchestrator.createPermission(body);
      return NextResponse.json(newPerm, { status: 201 });
    }

    return NextResponse.json({ error: "Route non autorisée pour cette ressource" }, { status: 400 });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}