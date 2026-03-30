// apps/hub-central/constants/permissions.ts

export interface PermissionItem {
  id: string;
  label: string;
  power: number;
}

export interface PowerLevelGroup {
  category: string;
  description?: string;
  permissions: PermissionItem[]; // 👈 Vérifie que ce nom est exact
}

// ⚠️ IMPORTANT : POWER_LEVELS doit être un TABLEAU de PowerLevelGroup
export const POWER_LEVELS: PowerLevelGroup[] = [
  {
    category: "Gestion de l'Îlot",
    description: "Pouvoirs de structure et de fondation",
    permissions: [
      { id: 'CAN_DELETE_PROJECT', label: 'Supprimer le nid', power: 90 },
      // ...
    ]
  },
  // ...
];