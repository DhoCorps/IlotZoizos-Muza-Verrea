import { describe, it, expect } from 'vitest';
import { UserSchema } from '../core/user.types';

describe('UserSchema - Validation de l\'Oiseau', () => {
  
  const validUser = {
    uid: '65f1a2b3c4d5e6f7a8b9c0d1',
    username: 'Albatros_Serein',
    email: 'contact@ilot-zoizos.fr',
    password: 'Password123!',
    roles: [
      {
        uid: 'role_admin',
        intitule: 'ADMIN',
        status: 'active',
        isSystem: true
      }
    ],
    characterSheet: {
      mood: '🚀',
      alignment: 'good'
    }
  };

  it('✅ doit valider un oiseau parfaitement conforme', () => {
    const result = UserSchema.safeParse(validUser);
    expect(result.success).toBe(true);
  });

  describe('🔐 Sécurité du Chant (Password)', () => {
    it('❌ doit rejeter un mot de passe sans caractère spécial', () => {
      const invalid = { ...validUser, password: 'Password123' };
      const result = UserSchema.safeParse(invalid);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toBe("Il faut au moins un caractère spécial");
      }
    });

    it('❌ doit rejeter un mot de passe trop court', () => {
      const result = UserSchema.safeParse({ ...validUser, password: 'P1!' });
      expect(result.success).toBe(false);
    });
  });

  describe('📊 Gamification & État', () => {
    it('🐣 doit appliquer les valeurs par défaut (Level 1, XP 0)', () => {
      const { password, ...minimalUser } = validUser;
      const result = UserSchema.parse(minimalUser); // .parse lève une erreur si échec
      
      expect(result.characterSheet.level).toBe(1);
      expect(result.characterSheet.xp).toBe(0);
      expect(result.status).toBe('pending');
    });

    it('🧠 doit valider le score de charge mentale', () => {
      const result = UserSchema.safeParse({
        ...validUser,
        wellbeing: { mentalLoadScore: 150 } // Trop haut (max 100)
      });
      expect(result.success).toBe(false);
    });
  });
});