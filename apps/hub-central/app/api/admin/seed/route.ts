import { NextResponse } from 'next/server';
import { connectToDatabase } from '@ilot/infrastructure';
import { RoleOrchestrator } from '@ilot/shared-core';
import { CAPABILITIES } from '@ilot/types'; 

export async function GET() {
  try {
    await connectToDatabase();

    // 1. FORGE DES PERMISSIONS (Alignées sur l'ADN exact de l'Îlot)
    const p1 = await RoleOrchestrator.createPermission({ 
      intitule: 'Gérer la Volée', 
      code: CAPABILITIES.TEAM.MANAGE, // "team:manage-members"
      description: 'Ajouter ou bannir des oiseaux du Nid' 
    });
    
    const p2 = await RoleOrchestrator.createPermission({ 
      intitule: 'Forger des Fragments', 
      code: CAPABILITIES.PROJECT.CREATE, // "project:create"
      description: 'Créer de nouveaux chantiers' 
    });
    
    const p3 = await RoleOrchestrator.createPermission({ 
      intitule: 'Détruire le Nid', 
      code: CAPABILITIES.TEAM.DELETE, // "team:delete"
      description: 'Purge absolue de l\'escouade' 
    });
    
    const p4 = await RoleOrchestrator.createPermission({ 
      intitule: 'Modifier les Privilèges', 
      code: CAPABILITIES.MEMBER.UPDATE, // "member:update"
      description: 'Changer les rôles des autres membres' 
    });

    const p5 = await RoleOrchestrator.createPermission({ 
      intitule: 'Inviter des Oiseaux', 
      code: CAPABILITIES.MEMBER.INVITE, 
      description: 'Permet de connecter de nouvelles entités au Nid' 
    });

    const p6 = await RoleOrchestrator.createPermission({ 
      intitule: 'Bannir des Oiseaux', 
      code: CAPABILITIES.MEMBER.EXILE, 
      description: 'Permet d\'exclure définitivement un membre' 
    });

    const p7 = await RoleOrchestrator.createPermission({ 
      intitule: 'Construire Un Nid', 
      code: CAPABILITIES.TEAM.CREATE, 
      description: 'Permet de construire un nid' 
    });

    // 2. FORGE DES GRADES (Mis à jour)
    await RoleOrchestrator.createRole({ 
      intitule: 'ADMIN', 
      description: 'Superviseur absolu', 
      isSystem: true, 
      permissions: [p1._id, p2._id, p3._id, p4._id, p5._id, p6._id, p7._id] // 👈 On ajoute tout
    });

    await RoleOrchestrator.createRole({ 
      intitule: 'BATISSEUR', 
      description: 'Ouvrier du Nid', 
      isSystem: true, 
      permissions: [p2._id, p5._id, p7._id] // 👈 Le bâtisseur peut créer des nids et inviter
    });

    await RoleOrchestrator.createRole({ 
      intitule: 'MEMBRE', 
      description: 'Habitant de la Canopée', 
      isSystem: true, 
      permissions: [p2._id] // Droits standards
    });
    
    return NextResponse.json({ 
      success: true, 
      message: '✨ Le Livre des Sortilèges a été restauré avec l\'ADN exact de l\'Îlot !' 
    });

  } catch (error: any) {
    console.error("❌ Échec de la restauration :", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}