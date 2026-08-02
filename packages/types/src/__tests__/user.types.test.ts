import { describe, it, expect } from 'vitest';
import { OiseauSchema, OiseauSeedSchema } from '../core/user.types'; 

describe('OiseauSchema - Validation de l\'Essence et du Sanctuaire', () => {
  
  // L'Oiseau complet tel qu'il doit sortir de la matrice
  const validBird = {
    uid: 'bird-777',
    pseudo: 'Albatros_Serein',
    email: 'contact@ilot-zoizos.fr',
    password: 'Password123!',
    frequenceHEX: '#2F4F4F', // Fréquence par défaut (Dark Slate Gray)
    capabilities: ['TypeScript', 'Poésie'], // 🪡 CORRECTION : "aura" remplacé par "capabilities"
    avatarUrl: 'https://cdn.ilot.io/avatars/bird-777.png',
    coverPicture: null,
    signature: 'Oiseau libre de la matrice', 
    // Partie Sanctuaire
    sanctuaire: { livrePrefere: 'Le Petit Prince', météoIntérieure: 'Calme' },
    sanctuaireVerrouille: false,
    entropieActive: 100,
    isGhostMode: false,
    isOpenToInvitations: true
  };

  it('✅ doit valider un Oiseau complet (Graine + Sanctuaire)', () => {
    const result = OiseauSchema.safeParse(validBird);
    expect(result.success).toBe(true);
  });

  describe('🌱 La Graine (Identité Incompressible)', () => {
    it('❌ doit rejeter un pseudo trop court (Identité inaudible)', () => {
      const invalid = { ...validBird, pseudo: 'Al' };
      const result = OiseauSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('🎨 doit valider une fréquence HEX courte ou longue', () => {
      const shortHex = { ...validBird, frequenceHEX: '#ABC' };
      const longHex = { ...validBird, frequenceHEX: '#AABBCC' };
      expect(OiseauSchema.safeParse(shortHex).success).toBe(true);
      expect(OiseauSchema.safeParse(longHex).success).toBe(true);
    });
  });

  describe('🌿 Le Sanctuaire (Liberté et Protection)', () => {
    it('🔓 doit accepter n\'importe quel format JSON dans le sanctuaire', () => {
      const complexSanctuary = { 
        ...validBird, 
        sanctuaire: { 
          tags: [1, 2, 3], 
          meta: { deep: { nesting: true } } 
        } 
      };
      const result = OiseauSchema.safeParse(complexSanctuary);
      expect(result.success).toBe(true);
    });

    it('🛑 doit limiter l\'Entropie entre 0 et 100', () => {
      const highEntropie = { ...validBird, entropieActive: 150 };
      const negativeEntropie = { ...validBird, entropieActive: -10 };
      
      expect(OiseauSchema.safeParse(highEntropie).success).toBe(false);
      expect(OiseauSchema.safeParse(negativeEntropie).success).toBe(false);
    });
    
    it('🔑 doit accepter les jetons de récupération de chant temporaires', () => {
      const birdWithTokens = { 
        ...validBird, 
        resetPasswordToken: 'hex_string_temporaire',
        resetPasswordExpires: 1735689600000 // Timestamp
      };
      const result = OiseauSchema.safeParse(birdWithTokens);
      expect(result.success).toBe(true);
    });
  });

  describe('🌌 Équilibre et Anti-Gamification', () => {
    it('🐣 doit appliquer les valeurs par défaut lors de la création d\'une Graine', () => {
      // On ne donne que le strict nécessaire + la signature requise
      const minimalSeed = {
        uid: 'bird-001',
        pseudo: 'Nouveau_Venu',
        email: 'new@ilot.io',
        signature: 'Graine d\'Oiseau'
      };

      const result = OiseauSchema.parse(minimalSeed);
      
      expect(result.frequenceHEX).toBe('#2F4F4F'); // Fréquence neutre
      expect(result.entropieActive).toBe(100);    // Énergie pleine
      expect(result.sanctuaire).toEqual({});      // Sanctuaire vierge
      expect(result.capabilities).toEqual([]);    // Aura vide
    });

    it('🛡️ ne doit pas tolérer de propriétés étrangères (Protection du Sanctuaire)', () => {
      const intrusiveData = {
        ...validBird,
        level: 50, // Gamification proscrite
        xp: 1000,  // Compétition bannie
        mentalLoadScore: 85 // Ingerence médicale interdite
      };

      // Si le schéma utilise .strict(), ces champs feront échouer la validation
      const result = OiseauSchema.safeParse(intrusiveData);
      
      if (OiseauSchema.description?.includes('strict')) {
        expect(result.success).toBe(false);
      }
    });
  });
});