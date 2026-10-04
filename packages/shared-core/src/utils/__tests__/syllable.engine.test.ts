// packages/shared-core/src/utils/__tests__/syllable.engine.test.ts

import { describe, it, expect } from 'vitest';
import { SyllableEngine } from '../syllable.engine';

describe('SyllableEngine - Le Compteur Quantique de Poetrik', () => {
  
  it('🟢 doit compter correctement un vers simple sans particularité', () => {
    // "Le vent se lève" -> Le (1) vent (1) se (1) lè-v(e) (1 apocope) = 4
    expect(SyllableEngine.countPieds('Le vent se lève')).toBe(4);
  });

  it('🟢 doit gérer l\'élision du E muet devant une voyelle (Victor Hugo)', () => {
    // "Demain, dès l'aube, à l'heure où blanchit la campagne" -> 12 pieds (Alexandrin)
    // l'aube à -> lau-b(e)-à (élision)
    // l'heure où -> lheu-r(e)-où (élision)
    // campagne -> cam-pa-gn(e) (apocope fin de vers)
    const hugoLine = "Demain, dès l'aube, à l'heure où blanchit la campagne";
    expect(SyllableEngine.countPieds(hugoLine)).toBe(12);
  });

  it('🟢 doit gérer la chute du E muet devant une consonne intra-vers (Racine)', () => {
    // "Je le vis, je rougis, je pâlis à sa vue" -> 12 pieds (Alexandrin)
    // vue -> vu(e) (apocope fin de vers)
    const racineLine = "Je le vis, je rougis, je pâlis à sa vue";
    expect(SyllableEngine.countPieds(racineLine)).toBe(12);
  });

  it('🟢 doit gérer les fins de vers féminines complexes (-es, -ent)', () => {
    // "Et la mer et l'amour ont pour l'homme des pleurs" -> 12 pieds
    const hugoLine2 = "Et la mer et l'amour ont pour l'homme des pleurs";
    expect(SyllableEngine.countPieds(hugoLine2)).toBe(12);

    // "Ils chantent faux" -> Ils(1) chan-tent(2) faux(1) = 4
    expect(SyllableEngine.countPieds('Ils chantent faux')).toBe(4);
    
    // "Ils chantent" (fin de vers) -> Ils(1) chan-t(ent) (1) = 2
    expect(SyllableEngine.countPieds('Ils chantent')).toBe(2);
  });

  it('🟢 doit identifier automatiquement un Haïku', () => {
    // Note : le moteur est désormais immunisé contre la ponctuation et les chiffres (5)
    const strictHaiku = `
      Matin de brouillard (5)
      Un oiseau chante très loin (7)
      La forêt s'éveille (5)
    `;
    const result = SyllableEngine.analyzePoem(strictHaiku);
    expect(result.format).toBe('HAIKU');
    expect(result.structure).toEqual([5, 7, 5]);
  });

  it('🟢 doit identifier automatiquement une succession d\'Alexandrins', () => {
    const alexandrins = `
      Demain, dès l'aube, à l'heure où blanchit la campagne
      Je le vis, je rougis, je pâlis à sa vue
    `;
    const result = SyllableEngine.analyzePoem(alexandrins);
    expect(result.format).toBe('ALEXANDRINE');
    expect(result.totalLines).toBe(2);
    expect(result.structure).toEqual([12, 12]);
  });
});