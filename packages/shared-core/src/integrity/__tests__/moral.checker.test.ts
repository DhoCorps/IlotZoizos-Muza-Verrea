import { describe, it, expect, beforeEach } from 'vitest';
import { MoralChecker } from '../moral.checker';

describe('MoralChecker - Intégrité du Chant', () => {
  let checker: MoralChecker;

  beforeEach(() => {
    // On instancie un nouveau veilleur avant chaque test
    checker = new MoralChecker();
  });

  it('✅ doit valider un pseudo poétique et conforme', () => {
    const analysis = checker.analyze("Mesange_Bleue_974");
    expect(analysis.isSafe).toBe(true);
    expect(analysis.score).toBeGreaterThanOrEqual(70);
  });

  it('❌ doit bloquer les noms réservés par le Système (ADMIN)', () => {
    // Liste alignée sur SYSTEM_KEYWORDS du checker
    const reservedNames = ['ADMIN', 'SYSTEM', 'NEXUS', 'ROOT', 'SUPPORT'];
    
    reservedNames.forEach(name => {
      const analysis = checker.analyze(name);
      expect(analysis.isSafe).toBe(false);
      // ✅ SUTURE : Utilisation de .some() pour une détection robuste dans le tableau de flags
      expect(analysis.flags.some(f => f.includes('system_reserved'))).toBe(true);
      expect(analysis.reason).toContain('protégé par les piliers');
    });
  });

  it('❌ doit détecter et bloquer l\'Ombre (Mots d\'insulte)', () => {
    // "haine" est dans notre SHADOW_WORDS
    const analysis = checker.analyze("Oiseau_De_Haine");
    expect(analysis.isSafe).toBe(false);
    // ✅ SUTURE : Vérification robuste du flag d'Ombre
    expect(analysis.flags.some(f => f.includes('shadow_detected'))).toBe(true);
    expect(analysis.reason).toContain("L'Ombre a été détectée");
  });

  it('✨ doit proposer une suggestion d\'Oiseau en cas de refus système', () => {
    const analysis = checker.analyze("ADMIN_USER");
    expect(analysis.isSafe).toBe(false);
    expect(analysis.suggestion).toBeDefined();
    // ✅ SYNCHRONISATION LORE : Le test attend désormais "Oiseau_" conformément à la mise à jour
    expect(analysis.suggestion).toMatch(/Oiseau_[\d]+/);
  });

  it('🛡️ doit déjouer le camouflage (Leet Speak)', () => {
    // 4dm1n -> admin (Système)
    const analysis = checker.analyze("4dm1n_Zoizo");
    expect(analysis.isSafe).toBe(false);
    expect(analysis.flags).toContain('system_reserved:admin');
  });

  it('📢 doit détecter les "Cris" (Aggressivité visuelle)', () => {
    // Trop de majuscules déclenchent la pénalité d'aggressivité (Pénalité 40 -> Score 60)
    const analysis = checker.analyze("MOI_JE_CRIE_TROP_FORT");
    expect(analysis.isSafe).toBe(false);
    expect(analysis.flags).toContain("aggressive_shouting");
    expect(analysis.reason).toContain("trop perçant");
  });

  it('🌀 doit détecter le "Chaos" (Spam de symboles)', () => {
    // Trop de caractères spéciaux nuisent à la lisibilité (Pénalité 40 -> Score 60)
    const analysis = checker.analyze("!!!-___-!!!");
    expect(analysis.isSafe).toBe(false);
    expect(analysis.flags).toContain("chaos_detected");
    expect(analysis.reason).toContain("structure de ton message est instable");
  });

  it('❌ doit rejeter le silence (Contenu vide)', () => {
    const analysis = checker.analyze("   ");
    expect(analysis.isSafe).toBe(false);
    expect(analysis.flags).toContain("empty_content");
  });
});