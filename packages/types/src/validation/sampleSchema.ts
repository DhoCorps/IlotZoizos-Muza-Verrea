import { z } from 'zod';

export const SampleUploadSchema = z.object({
  title: z.string().min(2, "Le titre du sample est trop court."),
  tempoBpm: z.coerce.number().min(40).max(300),
  musicalKey: z.string().min(1, "La tonalité est requise."),
  style: z.string().min(2, "Le style est requis."),
  allowRadio: z.preprocess((val) => val === 'true' || val === true, z.boolean()).default(true),
  allowBlindTest: z.preprocess((val) => val === 'true' || val === true, z.boolean()).default(true),
  allowShowcase: z.preprocess((val) => val === 'true' || val === true, z.boolean()).default(true),
});