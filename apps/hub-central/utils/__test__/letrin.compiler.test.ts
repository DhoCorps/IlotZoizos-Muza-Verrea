import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { compileAndInjectFont, PixelData } from '../letrin-compiler';

// 🛡️ Mock opentype.js pour éviter des crashs de parsing binaire dans JSDOM
vi.mock('opentype.js', () => ({
  Path: class {
    moveTo = vi.fn();
    lineTo = vi.fn();
    close = vi.fn();
  },
  Glyph: class {
    constructor(opts: any) { Object.assign(this, opts); }
  },
  Font: class {
    constructor(opts: any) { Object.assign(this, opts); }
    toArrayBuffer = vi.fn(() => new ArrayBuffer(8));
  }
}));

describe('Utilitaire Letr\'In : compileAndInjectFont', () => {
  let createObjectURLMock: any;
  let revokeObjectURLMock: any;

  beforeEach(() => {
    // JSDOM n'implémente pas URL.createObjectURL, on le mock
    createObjectURLMock = vi.fn(() => 'blob:http://localhost/mock-font-url');
    revokeObjectURLMock = vi.fn();
    global.URL.createObjectURL = createObjectURLMock;
    global.URL.revokeObjectURL = revokeObjectURLMock;
    
    // Nettoyer le document
    document.head.innerHTML = '';
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('🟢 Ne doit rien faire si exécuté côté serveur (typeof window === undefined)', () => {
    const originalWindow = global.window;
    // @ts-ignore : Simulation de l'environnement serveur
    delete global.window; 
    
    compileAndInjectFont('TestFont', {});
    
    expect(createObjectURLMock).not.toHaveBeenCalled();
    // Restauration pour les autres tests
    global.window = originalWindow; 
  });

  it('🟢 Doit générer le TTF, créer l\'URL et injecter une balise <style> dans le <head>', () => {
    const matrices: Record<string, (PixelData | null)[][]> = {
      'A': [
        [{ c: '#000000', s: 'full', r: 0, bt: false, bb: false, bl: false, br: false, bc: '', bw: 1 }]
      ]
    };

    compileAndInjectFont('Matrix Font', matrices, 16);

    const styleTag = document.getElementById('letrin-dynamic-font-matrix-font');
    expect(styleTag).not.toBeNull();
    expect(styleTag?.innerHTML).toContain("@font-face");
    expect(styleTag?.innerHTML).toContain("font-family: 'Matrix Font'");
    expect(createObjectURLMock).toHaveBeenCalledTimes(1);
    expect(styleTag?.getAttribute('data-url')).toBe('blob:http://localhost/mock-font-url');
  });

  it('🟢 Doit éviter les fuites de mémoire (Memory Leak) en révoquant l\'ancienne URL lors d\'une mise à jour', () => {
    const matrices: Record<string, (PixelData | null)[][]> = {
      'B': [[{ c: '#000000', s: 'tri-tl', r: 0, bt: false, bb: false, bl: false, br: false, bc: '', bw: 1 }]]
    };

    // Premier appel
    compileAndInjectFont('Update Font', matrices, 16);
    
    // Modification de la valeur de retour du mock pour simuler un nouveau Blob
    createObjectURLMock.mockReturnValueOnce('blob:http://localhost/mock-font-url-v2');
    
    // Deuxième appel (mise à jour)
    compileAndInjectFont('Update Font', matrices, 16);

    // Vérifie que revokeObjectURL a été appelé pour détruire le premier Blob
    expect(revokeObjectURLMock).toHaveBeenCalledWith('blob:http://localhost/mock-font-url');
    
    // Vérifie que le style a bien la nouvelle URL
    const styleTag = document.getElementById('letrin-dynamic-font-update-font');
    expect(styleTag?.getAttribute('data-url')).toBe('blob:http://localhost/mock-font-url-v2');
  });

  it('🟢 Doit ignorer les frames d\'animation (frames_x) et les matrices vides', () => {
    const matrices: Record<string, (PixelData | null)[][]> = {
      'frame_1': [[{ c: '#000000', s: 'full', r: 0, bt: false, bb: false, bl: false, br: false, bc: '', bw: 1 }]], // Ignoré
      'C': [[null, null]] // Vide, ignoré
    };

    compileAndInjectFont('Empty Font', matrices, 16);

    // La balise style est créée, mais la police générée via opentype ne contiendra que le glyphe par défaut (.notdef)
    const styleTag = document.getElementById('letrin-dynamic-font-empty-font');
    expect(styleTag).not.toBeNull();
  });
});