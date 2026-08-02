import { z } from 'zod';

export const JobQuestSchema = z.object({
  uid: z.string(),
  projectUid: z.string(),
  title: z.string().min(3, "Le titre de la quête est requis"), 
  slug: z.string().min(1, "Slug requis"), // 🪡 L'empreinte URL de la quête
  description: z.string(),
  requiredSkills: z.array(z.string()),
  rewardLore: z.string().optional(), 
  status: z.enum(['ACTIVE', 'FILLED', 'ARCHIVED']).default('ACTIVE'),
  createdAt: z.date().optional(),
});

export type JobQuest = z.infer<typeof JobQuestSchema>;