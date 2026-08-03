// types/cv.types.ts
export type CVFieldType = 'header' | 'summary' | 'experience' | 'education' | 'skills' | 'artifacts' | 'languages';

export interface CVBlock {
  id: string;
  type: CVFieldType;
  title: string;
  enabled: boolean;
  layoutPosition: { x: number; y: number; w: number; h: number }; // Pour le positionnement dynamique
  data: any; // Données spécifiques au bloc
}

export interface CVTemplate {
  uid: string;
  name: string;
  description: string;
  previewImage: string;
  blocks: CVBlock[];
}