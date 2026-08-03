import * as opentype from 'opentype.js';

export function compileAndInjectFont(fontName: string, matrices: Record<string, any[][]>, resolution: number = 16): void {
  if (typeof window === 'undefined') return;

  const unitsPerEm = 1000;
  const ascender = 800;
  const descender = -200;
  const advanceWidth = 1000;
  const scale = unitsPerEm / resolution;
  const fontGlyphs: opentype.Glyph[] = [];

  const notdefPath = new opentype.Path();
  notdefPath.moveTo(100, 0);
  notdefPath.lineTo(100, ascender);
  notdefPath.lineTo(advanceWidth - 100, ascender);
  notdefPath.lineTo(advanceWidth - 100, 0);
  notdefPath.close();
  fontGlyphs.push(new opentype.Glyph({ name: '.notdef', unicode: 0, advanceWidth, path: notdefPath }));

  if (matrices && typeof matrices === 'object') {
    Object.entries(matrices).forEach(([char, matrix]) => {
      if (char.startsWith('frame_')) return;
      if (!Array.isArray(matrix)) return;
      
      const hasPixels = matrix.some((row: any[]) => Array.isArray(row) && row.some(cell => cell !== null));
      if (!hasPixels && char !== ' ') return;

      const path = new opentype.Path();
      matrix.forEach((row: any[], y: number) => {
        if (!Array.isArray(row)) return;
        row.forEach((cell: any, x: number) => {
          if (cell && cell.c && cell.c !== 'transparent') {
            const bx = x * scale;
            const by = ascender - (y * scale);
            path.moveTo(bx, by);
            path.lineTo(bx + scale, by);
            path.lineTo(bx + scale, by - scale);
            path.lineTo(bx, by - scale);
            path.close();
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
    styleTag = document.createElement('style');
    styleTag.id = styleId;
    document.head.appendChild(styleTag);
  }

  styleTag.innerHTML = `
    @font-face {
      font-family: '${fontName}';
      src: url('${url}') format('truetype');
    }
  `;
}