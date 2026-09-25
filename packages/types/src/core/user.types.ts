import { z } from 'zod';

/**
 * 🌌 CONSTANTES & ÉQUATIONS DE L'ÎLOT
 * L'utilisateur n'est plus défini par un métier ou un niveau, mais par sa fréquence.
 */

// 🌱 I. LA GRAINE (Ce qui est incompressible et identitaire)
export const OiseauSeedSchema = z.object({
  uid: z.string(), 
  pseudo: z.string().min(3).max(30), // L'identité chantée d'origine
  
  // 🌿 Le Nom d'Usage Souverain (Modifiable uniquement via le tribut de l'Alvéole)
  nickname: z.string().min(3).max(30).optional().nullable(),
  nicknameIsLocked: z.boolean().default(true),

  email: z.string().email(),
  password: z.string().min(8).optional(),
  signature: z.string(),
  
  // Le Color Picker ! Un code Hexadécimal pour l'écologie visuelle (ex: Gris Bleuté / Rouge sombre)
  frequenceHEX: z.string().regex(/^#([0-9A-F]{3}){1,2}$/i).default('#2F4F4F'), 

  // --- NOUVEAUX ATTRIBUTS (Identité Visuelle et Compétences) ---
  avatarUrl: z.string().url().optional().nullable(),
  coverPicture: z.string().url().optional().nullable(),
  
  // L'Aura : L'énergie dégagée par l'Oiseau (ex: ["TypeScript", "Designer", "Balrog"])
  capabilities: z.array(z.string()).default([]),
  isBanned: z.boolean().default(false),
  profileStatus: z.enum(['RESPECTABLE', 'NEUTRAL', 'INDESIRABLE']).default('RESPECTABLE'),
});

// 💼 SOUS-SCHÉMAS DU PROFIL PROFESSIONNEL (SSOT)
export const RemotePreferenceSchema = z.enum(['FULL_REMOTE', 'HYBRID', 'ON_SITE', 'FLEXIBLE']);
export const ProfessionalStatusSchema = z.enum(['FREELANCE', 'EMPLOYEE', 'JOB_SEEKER', 'STUDENT', 'ENTREPRENEUR', 'OTHER']);

export const ProfessionalExperienceSchema = z.object({
  uid: z.string().optional(),
  title: z.string().min(2, "Le poste doit comporter au moins 2 caractères"),
  company: z.string().min(1, "L'entreprise est requise"),
  startDate: z.coerce.date(),
  endDate: z.coerce.date().optional().nullable(),
  description: z.string().optional(),
  isVisibleInCv: z.boolean().default(true) // 👁️ Option pour masquer cette ligne des CV générés
});

export const EducationSchema = z.object({
  uid: z.string().optional(),
  degree: z.string().min(2, "Le diplôme doit comporter au moins 2 caractères"),
  institution: z.string().min(1, "L'établissement est requis"),
  startDate: z.coerce.date(),
  endDate: z.coerce.date().optional().nullable(),
  description: z.string().optional(),
  isVisibleInCv: z.boolean().default(true) // 👁️ Option d'affichage sélectif
});

export const CvProfileSchema = z.object({
  catchphrase: z.string().max(300, "L'accroche doit être concise (max 300 char.)").optional(),
  professionalStatus: ProfessionalStatusSchema.default('EMPLOYEE'),
  remotePreference: RemotePreferenceSchema.default('FLEXIBLE'),
  
  // Spécifique aux Freelances
  freelanceDailyRateCents: z.number().min(0).optional().nullable(), // TJM en centimes
  isRateNegotiable: z.boolean().default(false), // Négociation à la mission
  
  experiences: z.array(ProfessionalExperienceSchema).default([]),
  educations: z.array(EducationSchema).default([]),
  hobbies: z.array(z.string()).default([]),
});

// 🌿 II. LE SANCTUAIRE (La Liberté Polymorphe et l'État d'Âme)
export const OiseauLeafSchema = z.object({
  // Fini le CV, le profil RPG ou l'autel pré-formaté. 
  // L'utilisateur injecte l'objet JSON qu'il veut, typé proprement en record de données sérialisables.
  sanctuaire: z.record(z.union([z.string(), z.number(), z.boolean(), z.null()])).default({}), 
  
  // 💼 LE PROFIL PROFESSIONNEL UNIQUE (Sera appelé par les templates de CV)
  cvProfile: CvProfileSchema.optional(),

  // --- NOUVEL ATTRIBUT (Le Verrou) ---
  // L'Anneau de Sauron : Protection ultime de la santé mentale de l'utilisateur
  sanctuaireVerrouille: z.boolean().default(false),

  // L'Entropie remplace la charge mentale. Si elle tombe à 0, le Caprice s'active.
  entropieActive: z.number().min(0).max(100).default(100),
  
  // Le statut de stase ou d'envol
  isGhostMode: z.boolean().default(false),
  isOpenToInvitations: z.boolean().default(true),

  // 🪡 SUTURE DU MAILLON MANQUANT : Collection des Références de Nids rattachés à l'Oiseau
  teams: z.array(z.object({
     id: z.string(),
     name: z.string(),
     role: z.string().optional()
  })).default([]),

  // 🔑 SUTURE POUR LE CHANT OUBLIÉ : Jetons de réinitialisation
  resetPasswordToken: z.string().optional(),
  resetPasswordExpires: z.number().optional(),

  // 🪡 SUTURE : Alignement avec la structure globale des artefacts (Fichiers de l'Oiseau)
  documents: z.array(z.object({
     uid: z.string(),
     name: z.string(),
     label: z.string(),
     url: z.string(),
     mimeType: z.string(),
     createdAt: z.coerce.date().default(() => new Date())
  })).default([])
});

// 🏗️ III. L'OISEAU COMPLET
// L'Oiseau est la fusion de sa Graine (Identité) et de son Sanctuaire (État)
export const OiseauSchema = OiseauSeedSchema.merge(OiseauLeafSchema);

// ✨ TYPESCRIPT : Extraction automatique !
export type IOiseau = z.infer<typeof OiseauSchema>;
export type ISeed = z.infer<typeof OiseauSeedSchema>;
export type ILeaf = z.infer<typeof OiseauLeafSchema>;
export type ICvProfile = z.infer<typeof CvProfileSchema>;
export type IProfessionalExperience = z.infer<typeof ProfessionalExperienceSchema>;
export type IEducation = z.infer<typeof EducationSchema>;