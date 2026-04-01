import { z } from 'zod';

export const NestThemeSchema = z.enum([
  'work', 'wellness', 'art', 'code', 'social', 'nature', 'chaos'
]);

export const NestSchema = z.object({
  uid: z.string(),
  ownerId: z.string(), // L'oiseau créateur <(:<
  name: z.string().min(3).max(50),
  description: z.string().max(500).optional(),

  // 🎯 L'ANCRAGE (Identité Pivot)
  // Définit le pictogramme et la catégorie majeure dans le Graphe
  mainTheme: NestThemeSchema,

  // 🪶 LES NUANCES (Ailes)
  // Tags libres pour la transversalité
  nuances: z.array(z.string()).max(5).default([]),

  status: z.enum(['active', 'archived', 'private']).default('active'),
  
  metadata: z.object({
    icon: z.string(), 
    color: z.string().default('#3b82f6'),
  }).default({ icon: 'nest_default', color: '#3b82f6' }),

  createdAt: z.date().default(() => new Date()),
});

export type INest = z.infer<typeof NestSchema>;