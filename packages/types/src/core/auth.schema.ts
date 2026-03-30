import { z } from 'zod';

export const ForgotPasswordSchema = z.object({
  email: z.string().email("Format d'email invalide"),
});

export const ResetPasswordSchema = z.object({
  token: z.string(), 
  password: z.string().min(8, "Le mot de passe doit contenir au moins 8 caractères"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Les mots de passe ne correspondent pas",
  path: ["confirmPassword"],
});

export type IForgotPassword = z.infer<typeof ForgotPasswordSchema>;
export type IResetPassword = z.infer<typeof ResetPasswordSchema>;