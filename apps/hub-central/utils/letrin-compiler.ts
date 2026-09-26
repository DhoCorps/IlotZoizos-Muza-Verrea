import * as opentype from 'opentype.js';

export interface PixelData {
  c: string;
  s?: string;
  [key: string]: any;
}

export function compileAndInjectFont(fontName: string, matrices: Record<string, (PixelData | null)[][]>, resolution: number = 16): void {
  // 🛡️ SSR Check : On ne manipule le DOM que côté client
  if (typeof window === 'undefined') return;

  const unitsPerEm = 1000;
  const ascender = 800;
  const descender = -200;
  const advanceWidth = 1000;
  const scale = unitsPerEm / resolution;
  const fontGlyphs: opentype.Glyph[] = [];

  // Glyphe par défaut (si le caractère n'est pas trouvé)
  const notdefPath = new opentype.Path();
  notdefPath.moveTo(100, 0);
  notdefPath.lineTo(100, ascender);
  notdefPath.lineTo(advanceWidth - 100, ascender);
  notdefPath.lineTo(advanceWidth - 100, 0);
  notdefPath.close();
  fontGlyphs.push(new opentype.Glyph({ name: '.notdef', unicode: 0, advanceWidth, path: notdefPath }));

  if (matrices && typeof matrices === 'object') {
    Object.entries(matrices).forEach(([char, matrix]) => {
      // On ignore les sprites d'animation (frames)
      if (char.startsWith('frame_')) return;
      if (!Array.isArray(matrix)) return;
      
      const hasPixels = matrix.some((row: any[]) => Array.isArray(row) && row.some(cell => cell !== null));
      if (!hasPixels && char !== ' ') return;

      const path = new opentype.Path();
      matrix.forEach((row: any[], y: number) => {
        if (!Array.isArray(row)) return;
        row.forEach((cell: PixelData | null, x: number) => {
          if (cell && cell.c && cell.c !== 'transparent') {
            const bx = x * scale;
            const by = ascender - (y * scale);
            let cx = bx, cy = by, cw = scale, ch = scale;
            const shape = cell.s || 'full';

            // 🎨 Prise en compte des formes complexes (Triangles, Demi-blocs)
            if (shape === 'half-t') { ch = scale/2; }
            else if (shape === 'half-b') { cy = by - scale/2; ch = scale/2; }
            else if (shape === 'half-l') { cw = scale/2; }
            else if (shape === 'half-r') { cx = bx + scale/2; cw = scale/2; }
            else if (shape === 'q-t') { ch = scale/4; }
            else if (shape === 'q-b') { cy = by - scale*0.75; ch = scale/4; }
            else if (shape === 'q-l') { cw = scale/4; }
            else if (shape === 'q-r') { cx = bx + scale*0.75; cw = scale/4; }
            else if (shape === 'tl') { cw = scale/2; ch = scale/2; }
            else if (shape === 'tr') { cx = bx + scale/2; cw = scale/2; ch = scale/2; }
            else if (shape === 'bl') { cy = by - scale/2; cw = scale/2; ch = scale/2; }
            else if (shape === 'br') { cx = bx + scale/2; cy = by - scale/2; cw = scale/2; ch = scale/2; }

            if (shape.startsWith('tri-')) {
              if (shape === 'tri-tl') { path.moveTo(cx, cy); path.lineTo(cx+cw, cy); path.lineTo(cx, cy-ch); path.close(); }
              else if (shape === 'tri-tr') { path.moveTo(cx, cy); path.lineTo(cx+cw, cy); path.lineTo(cx+cw, cy-ch); path.close(); }
              else if (shape === 'tri-bl') { path.moveTo(cx, cy); path.lineTo(cx, cy-ch); path.lineTo(cx+cw, cy-ch); path.close(); }
              else if (shape === 'tri-br') { path.moveTo(cx+cw, cy); path.lineTo(cx+cw, cy-ch); path.lineTo(cx, cy-ch); path.close(); }
              else if (shape === 'tri-t')  { path.moveTo(cx, cy-ch); path.lineTo(cx+cw/2, cy); path.lineTo(cx+cw, cy-ch); path.close(); }
              else if (shape === 'tri-b')  { path.moveTo(cx, cy); path.lineTo(cx+cw, cy); path.lineTo(cx+cw/2, cy-ch); path.close(); }
              else if (shape === 'tri-l')  { path.moveTo(cx+cw, cy); path.lineTo(cx, cy-ch/2); path.lineTo(cx+cw, cy-ch); path.close(); }
              else if (shape === 'tri-r')  { path.moveTo(cx, cy); path.lineTo(cx+cw, cy-ch/2); path.lineTo(cx, cy-ch); path.close(); }
            } else {
              // Rectangle standard
              path.moveTo(cx, cy); 
              path.lineTo(cx + cw, cy); 
              path.lineTo(cx + cw, cy - ch); 
              path.lineTo(cx, cy - ch); 
              path.close();
            }
          }
        });
      });

      fontGlyphs.push(new opentype.Glyph({
        name: char,
        unicode: char.charCodeAt(0),
        advanceWidth,
        path
      }));
    });
  }

  const font = new opentype.Font({
    familyName: fontName,
    styleName: 'Regular',
    unitsPerEm,
    ascender,
    descender,
    glyphs: fontGlyphs
  });

  const buffer = font.toArrayBuffer();
  const blob = new Blob([buffer], { type: 'font/ttf' });
  const url = URL.createObjectURL(blob);

  const styleId = `letrin-dynamic-font-${fontName.replace(/\s+/g, '-').toLowerCase()}`;
  let styleTag = document.getElementById(styleId) as HTMLStyleElement;
  
  if (!styleTag) {
    // Création
    styleTag = document.createElement('style');
    styleTag.id = styleId;
    document.head.appendChild(styleTag);
  } else {
    // 💥 CORRECTION DE FUITE DE MÉMOIRE (Memory Leak)
    // Libération de l'ancienne URL avant d'assigner la nouvelle
    const oldUrl = styleTag.getAttribute('data-url');
    if (oldUrl) {
      URL.revokeObjectURL(oldUrl);
    }
  }

  styleTag.setAttribute('data-url', url);
  styleTag.innerHTML = `
    @font-face {
      font-family: '${fontName}';
      src: url('${url}') format('truetype');
    }
  `;
}