import { describe, it, expect } from 'vitest';
import { MusicTheoryEngine, Note } from '../musicTheory.engine';

describe('MusicTheoryEngine - Le Dictionnaire Mathématique Harmonique', () => {
  
  describe('1. Génération des Gammes (getNotesInScale)', () => {
    
    it('🟢 Doit générer parfaitement la gamme de Do Majeur (C Major)', () => {
      // C Majeur = C, D, E, F, G, A, B
      const notes = MusicTheoryEngine.getNotesInScale('C', MusicTheoryEngine.SCALES.MAJOR);
      expect(notes).toEqual(['C', 'D', 'E', 'F', 'G', 'A', 'B']);
    });

    it('🟢 Doit générer la gamme de La Mineure Naturelle (A Minor)', () => {
      // A Mineur Naturel = A, B, C, D, E, F, G
      const notes = MusicTheoryEngine.getNotesInScale('A', MusicTheoryEngine.SCALES.MINOR_NATURAL);
      expect(notes).toEqual(['A', 'B', 'C', 'D', 'E', 'F', 'G']);
    });

    it('🟢 Doit générer la gamme de Mi Mineure Harmonique (E Harmonic Minor)', () => {
      // E Mineur Harmonique = E, F#, G, A, B, C, D#
      const notes = MusicTheoryEngine.getNotesInScale('E', MusicTheoryEngine.SCALES.HARMONIC_MINOR);
      expect(notes).toEqual(['E', 'F#', 'G', 'A', 'B', 'C', 'D#']);
    });

    it('🟢 Doit générer la gamme exotique Hirajoshi en Do (C Hirajoshi)', () => {
      // Hirajoshi (Japonais) en Do (C) = C, D, D# (Eb), G, G# (Ab)
      const notes = MusicTheoryEngine.getNotesInScale('C', MusicTheoryEngine.SCALES.HIRAJOSHI);
      expect(notes).toEqual(['C', 'D', 'D#', 'G', 'G#']);
    });
  });

  describe('2. Détection de Gamme depuis une Partition (detectScale)', () => {
    
    it('🟢 Doit détecter une gamme de Do Majeur à 100% avec des notes en désordre', () => {
      // Notes jouées : un arpège de C, un G, un accord de F...
      const playedNotes: Note[] = ['C', 'E', 'G', 'B', 'D', 'F', 'A', 'C', 'G'];
      
      const detections = MusicTheoryEngine.detectScale(playedNotes);
      
      // On s'attend à ce que Do Majeur soit le meilleur résultat (ou l'un des meilleurs)
      const cMajorMatch = detections.find(d => d.root === 'C' && d.scaleKey === 'MAJOR');
      
      expect(cMajorMatch).toBeDefined();
      expect(cMajorMatch?.score).toBe(100);
      
      // La Mineur Naturel partage exactement les mêmes notes, il devrait aussi être à 100%
      const aMinorMatch = detections.find(d => d.root === 'A' && d.scaleKey === 'MINOR_NATURAL');
      expect(aMinorMatch?.score).toBe(100);
    });

    it('🟢 Doit détecter le Mi Mineur Harmonique avec sa note caractéristique (D#)', () => {
      // Notes jouées dans un solo néoclassique
      const playedNotes: Note[] = ['E', 'B', 'G', 'F#', 'E', 'D#', 'C', 'A', 'E'];
      
      const detections = MusicTheoryEngine.detectScale(playedNotes);
      
      const bestMatch = detections[0];
      
      expect(bestMatch.root).toBe('E');
      expect(bestMatch.scaleKey).toBe('HARMONIC_MINOR');
      expect(bestMatch.score).toBe(100);
    });

    it('⚠️ Ne doit retourner aucune gamme si les notes sont totalement dissonantes', () => {
      // Toutes les notes chromatiques jouées = 12 notes.
      // Une gamme standard a 7 notes. Le score max de correspondance sera de 7/12 (58%).
      // Notre filtre élimine les scores inférieurs à 85%.
      const chromaticChaos: Note[] = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
      
      const detections = MusicTheoryEngine.detectScale(chromaticChaos);
      
      // Le tableau doit être vide car aucune gamme n'a un score > 85% sur ce chaos.
      expect(detections.length).toBe(0);
    });

  });
});