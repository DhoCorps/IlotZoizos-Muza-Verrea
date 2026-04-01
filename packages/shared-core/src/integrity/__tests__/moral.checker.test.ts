import { describe, it, expect } from 'vitest';
import { MoralChecker } from '../moral.checker'; // Ajuste le chemin si besoin

describe('MoralChecker - Filtrage des Pseudos', () => {

  it('✅ doit valider un pseudo poétique et conforme', () => {
    const analysis = MoralChecker.analyze("Mesange_Bleue_974");
    expect(analysis.isSafe).toBe(true);
  });

  it('❌ doit bloquer les noms réservés par le Système (ADMIN)', () => {
    const reservedNames = ['ADMIN', 'SYSTEM', 'MODERATOR', 'ROOT', 'SUPPORT'];
    
    reservedNames.forEach(name => {
      const analysis = MoralChecker.analyze(name);
      expect(analysis.isSafe).toBe(false);
      expect(analysis.reason).toContain('réservé');
    });
  });

  it('❌ doit détecter et bloquer les insultes (Blacklist)', () => {
    // Test avec un mot de ta blacklist
    const analysis = MoralChecker.analyze("INSULTE1_Zoizo");
    expect(analysis.isSafe).toBe(false);
    expect(analysis.reason).toContain('inapproprié');
  });

  it('✨ doit proposer une suggestion aléatoire en cas de refus', () => {
    const analysis = MoralChecker.analyze("ADMIN_USER");
    expect(analysis.isSafe).toBe(false);
    expect(analysis.suggestion).toBeDefined();
    expect(analysis.suggestion).toMatch(/Oiseau_[\d]+/);
  });

  it('🛡️ doit être insensible à la casse (Majuscules/Minuscules)', () => {
    const analysis = MoralChecker.analyze("aDmIn_99");
    expect(analysis.isSafe).toBe(false);
  });
});