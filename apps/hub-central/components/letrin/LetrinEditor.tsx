'use client';

import { useState, useRef, useEffect } from 'react';
import { Pencil, Square, Eraser, Download, Save, RefreshCw, Upload, Image as ImageIcon, Type as TypeIcon, Clapperboard, Play, Pause, Plus, Copy, Trash2, PaintBucket, Undo2, Redo2, FlipHorizontal, FlipVertical, Trash, Minus, Circle, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Pipette } from 'lucide-react';
import * as opentype from 'opentype.js';

// --- STRUCTURES DE DONNÉES AVANCÉES (EXPORTÉES) ---
export type ShapeType = 'full' | 'half-t' | 'half-b' | 'half-l' | 'half-r' | 'q-t' | 'q-b' | 'q-l' | 'q-r' | 'tl' | 'tr' | 'bl' | 'br' | 'tri-tl' | 'tri-tr' | 'tri-bl' | 'tri-br' | 'tri-t' | 'tri-b' | 'tri-l' | 'tri-r';

export type CreationVisibility = 'PUBLIC' | 'EXCHANGEABLE' | 'VISIBLE' | 'PRIVATE';

export interface PixelData {
  c: string; 
  s: ShapeType; 
  r: number; 
  bt: boolean; bb: boolean; bl: boolean; br: boolean; 
  bc: string;
  bw: number;
}

interface LetrinEditorProps {
  fontTitle?: string;
  initialGridSize?: number;
  initialGlyphs?: Record<string, any[][]>; 
  initialVisibility?: CreationVisibility;
  onSave: (matrices: Record<string, (PixelData | null)[][]>, visibility: CreationVisibility) => void;
}

export function LetrinEditor({ 
  fontTitle = "Mon Projet Letr'In", 
  initialGridSize = 16, 
  initialGlyphs = {}, 
  initialVisibility = 'PUBLIC',
  onSave 
}: LetrinEditorProps) {
  
  const [visibility, setVisibility] = useState<CreationVisibility>(initialVisibility);

  const parseLegacyMatrix = (grid: any[][]): (PixelData | null)[][] => {
    return grid.map(row => row.map(cell => {
      if (!cell) return null;
      if (typeof cell === 'number') {
        if (cell === 1) return { c: '#708090', s: 'full', r: 0, bt: false, bb: false, bl: false, br: false, bc: 'transparent', bw: 1 };
        if (cell === 2) return { c: 'transparent', s: 'full', r: 0, bt: true, bb: true, bl: true, br: true, bc: '#E5484D', bw: 1 };
        return null;
      }
      return {
        ...cell,
        bw: cell.bw !== undefined ? cell.bw : 1
      } as PixelData;
    }));
  };

  const initialDefaultMatrices = () => {
    if (Object.keys(initialGlyphs).length > 0) {
      const parsed: Record<string, (PixelData | null)[][]> = {};
      Object.keys(initialGlyphs).forEach(k => parsed[k] = parseLegacyMatrix(initialGlyphs[k]));
      return parsed;
    }
    const defaults: Record<string, (PixelData | null)[][]> = {};
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 ".split('');
    chars.forEach(char => defaults[char] = Array.from({ length: initialGridSize }, () => Array(initialGridSize).fill(null)));
    defaults['frame_0'] = Array.from({ length: initialGridSize }, () => Array(initialGridSize).fill(null));
    return defaults;
  };

  const [editorMode, setEditorMode] = useState<'font' | 'sprite'>('font');
  const [localTitle, setLocalTitle] = useState(fontTitle);
  const [resolution, setResolution] = useState(initialGridSize);
  
  const [palette, setPalette] = useState<string[]>(['#E5484D', '#708090', '#F3F4F6', '#111827', '#10B981', '#3B82F6', 'transparent']);
  const [brushColor, setBrushColor] = useState<string>('#E5484D');
  const [brushShape, setBrushShape] = useState<ShapeType>('full');
  const [brushBorders, setBrushBorders] = useState({ t: false, b: false, l: false, r: false });
  const [brushBorderColor, setBrushBorderColor] = useState<string>('#708090');
  const [brushBorderWidth, setBrushBorderWidth] = useState<number>(1);
  const [brushRadius, setBrushRadius] = useState<number>(0);

  const [tool, setTool] = useState<'pencil' | 'rect' | 'eraser' | 'fill' | 'line' | 'circle' | 'pipette'>('pencil');
  const [mirrorX, setMirrorX] = useState(false);
  const [mirrorY, setMirrorY] = useState(false);
  
  const [isDrawing, setIsDrawing] = useState(false);
  const [shapeStart, setShapeStart] = useState<{ x: number, y: number } | null>(null);
  const [hoverPoint, setHoverPoint] = useState<{ x: number, y: number } | null>(null);

  const [matrices, setMatrices] = useState<Record<string, (PixelData | null)[][]>>(initialDefaultMatrices());
  const [history, setHistory] = useState<Record<string, (PixelData | null)[][]>[]>([initialDefaultMatrices()]);
  const [historyIndex, setHistoryIndex] = useState(0);

  const matricesRef = useRef(matrices);
  useEffect(() => { matricesRef.current = matrices; }, [matrices]);

  const saveHistory = (newMatrices: Record<string, (PixelData | null)[][]>) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(JSON.parse(JSON.stringify(newMatrices))); 
    if (newHistory.length > 30) newHistory.shift(); 
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const undo = () => { if (historyIndex > 0) { setHistoryIndex(historyIndex - 1); setMatrices(history[historyIndex - 1]); } };
  const redo = () => { if (historyIndex < history.length - 1) { setHistoryIndex(historyIndex + 1); setMatrices(history[historyIndex + 1]); } };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      const key = e.key.toLowerCase();
      if ((e.ctrlKey || e.metaKey) && key === 'z') { e.preventDefault(); undo(); }
      else if ((e.ctrlKey || e.metaKey) && key === 'y') { e.preventDefault(); redo(); }
      else if (key === 'b') setTool('pencil');
      else if (key === 'e') setTool('eraser');
      else if (key === 'f') setTool('fill');
      else if (key === 'l') setTool('line');
      else if (key === 'r') setTool('rect');
      else if (key === 'c') setTool('circle');
      else if (key === 'i' || key === 'p') setTool('pipette');
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [history, historyIndex]);

  const [selectedChar, setSelectedChar] = useState<string>('A'); 
  const [frames, setFrames] = useState<string[]>(['frame_0']); 
  const [selectedFrame, setSelectedFrame] = useState<string>('frame_0');
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [playIndex, setPlayIndex] = useState(0);
  const [fps, setFps] = useState(8);

  const jsonInputRef = useRef<HTMLInputElement>(null);

  const activeKey = editorMode === 'font' ? selectedChar : selectedFrame;
  const currentMatrix = matrices[activeKey] || Array.from({ length: resolution }, () => Array(resolution).fill(null));

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlaying && editorMode === 'sprite') interval = setInterval(() => setPlayIndex((prev) => (prev + 1) % frames.length), 1000 / fps);
    return () => clearInterval(interval);
  }, [isPlaying, frames, fps, editorMode]);

  const changeResolution = (newRes: number) => {
    if (newRes < 1) newRes = 1;
    setResolution(newRes);
    const newMatrices = { ...matrices };
    Object.keys(newMatrices).forEach(key => {
      newMatrices[key] = Array.from({ length: newRes }, (_, y) => Array.from({ length: newRes }, (_, x) => matrices[key][y]?.[x] || null));
    });
    setMatrices(newMatrices);
    saveHistory(newMatrices);
  };

  const clearGrid = () => {
    const newMatrices = { ...matrices, [activeKey]: Array.from({ length: resolution }, () => Array(resolution).fill(null)) };
    setMatrices(newMatrices);
    saveHistory(newMatrices);
  };

  const panGrid = (dx: number, dy: number) => {
    const newMatrix = Array.from({ length: resolution }, () => Array(resolution).fill(null));
    currentMatrix.forEach((row, y) => {
      row.forEach((cell, x) => {
        const nx = x + dx; const ny = y + dy;
        if (nx >= 0 && nx < resolution && ny >= 0 && ny < resolution) newMatrix[ny][nx] = cell;
      });
    });
    const newMatrices = { ...matrices, [activeKey]: newMatrix };
    setMatrices(newMatrices);
    saveHistory(newMatrices);
  };

  const getPointsWithSymmetry = (pts: {x: number, y: number}[]) => {
    const result: {x: number, y: number}[] = [];
    const add = (px: number, py: number) => {
      if (px >= 0 && px < resolution && py >= 0 && py < resolution && !result.find(p => p.x === px && p.y === py)) result.push({x: px, y: py});
    };
    pts.forEach(({x, y}) => {
      add(x, y);
      if (mirrorX) add(resolution - 1 - x, y);
      if (mirrorY) add(x, resolution - 1 - y);
      if (mirrorX && mirrorY) add(resolution - 1 - x, resolution - 1 - y);
    });
    return result;
  };

  const getRectPts = (x1: number, y1: number, x2: number, y2: number) => {
    const pts = [];
    const minX = Math.min(x1, x2), maxX = Math.max(x1, x2);
    const minY = Math.min(y1, y2), maxY = Math.max(y1, y2);
    for(let y=minY; y<=maxY; y++) for(let x=minX; x<=maxX; x++) pts.push({x, y});
    return pts;
  };

  const getLinePts = (x0: number, y0: number, x1: number, y1: number) => {
    const pts = [];
    let dx = Math.abs(x1 - x0), sx = x0 < x1 ? 1 : -1;
    let dy = -Math.abs(y1 - y0), sy = y0 < y1 ? 1 : -1;
    let err = dx + dy, e2;
    let currX = x0, currY = y0;
    while(true) {
      pts.push({x: currX, y: currY});
      if (currX === x1 && currY === y1) break;
      e2 = 2 * err;
      if (e2 >= dy) { err += dy; currX += sx; }
      if (e2 <= dx) { err += dx; currY += sy; }
    }
    return pts;
  };

  const getCirclePts = (xc: number, yc: number, x2: number, y2: number) => {
    let r = Math.round(Math.hypot(x2 - xc, y2 - yc));
    let pts: {x: number, y: number}[] = [];
    let x = 0, y = r, d = 3 - 2 * r;
    const addCirclePts = (cx: number, cy: number, px: number, py: number) => {
      pts.push({x: cx+px, y: cy+py}, {x: cx-px, y: cy+py}, {x: cx+px, y: cy-py}, {x: cx-px, y: cy-py}, {x: cx+py, y: cy+px}, {x: cx-py, y: cy+px}, {x: cx+py, y: cy-px}, {x: cx-py, y: cy-px});
    };
    while (y >= x) {
      addCirclePts(xc, yc, x, y);
      x++;
      if (d > 0) { y--; d = d + 4 * (x - y) + 10; } else d = d + 4 * x + 6;
    }
    return pts;
  };

  let previewPixels: {x: number, y: number, val: PixelData | null}[] = [];
  if (isDrawing && shapeStart && hoverPoint && ['rect', 'line', 'circle'].includes(tool)) {
    const val = tool === 'eraser' ? null : { c: brushColor, s: brushShape, r: brushRadius, bt: brushBorders.t, bb: brushBorders.b, bl: brushBorders.l, br: brushBorders.r, bc: brushBorderColor, bw: brushBorderWidth };
    let pts: {x: number, y: number}[] = [];
    if (tool === 'rect') pts = getRectPts(shapeStart.x, shapeStart.y, hoverPoint.x, hoverPoint.y);
    if (tool === 'line') pts = getLinePts(shapeStart.x, shapeStart.y, hoverPoint.x, hoverPoint.y);
    if (tool === 'circle') pts = getCirclePts(shapeStart.x, shapeStart.y, hoverPoint.x, hoverPoint.y);
    const symPts = getPointsWithSymmetry(pts);
    symPts.forEach(p => previewPixels.push({x: p.x, y: p.y, val}));
  }

  const handleMouseDown = (x: number, y: number) => { 
    if (tool === 'pipette') {
      const cell = currentMatrix[y][x];
      if (cell) {
        if (cell.c !== 'transparent' && !palette.includes(cell.c)) setPalette([...palette, cell.c]);
        setBrushColor(cell.c); setBrushShape(cell.s); setBrushRadius(cell.r);
        setBrushBorders({ t: cell.bt, b: cell.bb, l: cell.bl, r: cell.br }); 
        setBrushBorderColor(cell.bc); setBrushBorderWidth(cell.bw || 1);
      } else {
        setBrushColor('transparent'); setBrushBorders({ t: false, b: false, l: false, r: false });
      }
      setTool('pencil');
      return;
    }
    setIsDrawing(true); 
    if (['rect', 'line', 'circle'].includes(tool)) setShapeStart({ x, y }); 
    else if (tool === 'fill') applyFloodFill(x, y);
    else applyTool(x, y); 
  };

  const handleMouseEnter = (x: number, y: number) => { 
    setHoverPoint({x, y});
    if (isDrawing && (tool === 'pencil' || tool === 'eraser')) applyTool(x, y); 
  };
  
  const handleMouseUp = (x: number, y: number) => { 
    if (isDrawing && shapeStart && hoverPoint && ['rect', 'line', 'circle'].includes(tool)) {
      const newMatrix = currentMatrix.map(row => [...row]);
      previewPixels.forEach(p => newMatrix[p.y][p.x] = p.val);
      const newMatrices = { ...matrices, [activeKey]: newMatrix };
      setMatrices(newMatrices); saveHistory(newMatrices);
    } else if (isDrawing && (tool === 'pencil' || tool === 'eraser')) {
      saveHistory(matricesRef.current);
    }
    setIsDrawing(false); setShapeStart(null); 
  };

  const applyTool = (x: number, y: number) => {
    const newMatrix = currentMatrix.map(row => [...row]);
    const val = tool === 'eraser' ? null : { c: brushColor, s: brushShape, r: brushRadius, bt: brushBorders.t, bb: brushBorders.b, bl: brushBorders.l, br: brushBorders.r, bc: brushBorderColor, bw: brushBorderWidth };
    const symPts = getPointsWithSymmetry([{x, y}]);
    symPts.forEach(p => newMatrix[p.y][p.x] = val);
    setMatrices({ ...matrices, [activeKey]: newMatrix });
  };

  const applyFloodFill = (startX: number, startY: number) => {
    const newMatrix = currentMatrix.map(row => [...row]);
    const targetVal = newMatrix[startY][startX];
    const replacementVal = { c: brushColor, s: brushShape, r: brushRadius, bt: brushBorders.t, bb: brushBorders.b, bl: brushBorders.l, br: brushBorders.r, bc: brushBorderColor, bw: brushBorderWidth };
    if (JSON.stringify(targetVal) === JSON.stringify(replacementVal)) return; 
    const queue = [{x: startX, y: startY}];
    while (queue.length > 0) {
      const {x, y} = queue.shift()!;
      if (x < 0 || x >= resolution || y < 0 || y >= resolution) continue;
      if (JSON.stringify(newMatrix[y][x]) === JSON.stringify(targetVal)) {
        newMatrix[y][x] = replacementVal;
        queue.push({x: x + 1, y}); queue.push({x: x - 1, y});
        queue.push({x, y: y + 1}); queue.push({x, y: y - 1});
      }
    }
    const newMatrices = { ...matrices, [activeKey]: newMatrix };
    setMatrices(newMatrices); saveHistory(newMatrices);
  };

  const addFrame = () => {
    const newId = `frame_${Date.now()}`;
    setFrames([...frames, newId]);
    const newMatrices = { ...matrices, [newId]: Array.from({ length: resolution }, () => Array(resolution).fill(null)) };
    setMatrices(newMatrices); setSelectedFrame(newId); saveHistory(newMatrices);
  };
  const duplicateFrame = () => {
    const newId = `frame_${Date.now()}`;
    setFrames([...frames, newId]);
    const newMatrices = { ...matrices, [newId]: currentMatrix.map(row => [...row]) };
    setMatrices(newMatrices); setSelectedFrame(newId); saveHistory(newMatrices);
  };
  const deleteFrame = (id: string) => {
    if (frames.length <= 1) return;
    const newFrames = frames.filter(f => f !== id);
    setFrames(newFrames);
    if (selectedFrame === id) setSelectedFrame(newFrames[newFrames.length - 1]);
  };

  const getRenderCoordinates = (cell: PixelData, bx: number, by: number, scale: number) => {
    let cx = bx, cy = by, cw = scale, ch = scale;
    if (cell.s === 'half-t') { ch = scale/2; }
    else if (cell.s === 'half-b') { cy = by + scale/2; ch = scale/2; }
    else if (cell.s === 'half-l') { cw = scale/2; }
    else if (cell.s === 'half-r') { cx = bx + scale/2; cw = scale/2; }
    else if (cell.s === 'q-t') { ch = scale/4; }
    else if (cell.s === 'q-b') { cy = by + scale*0.75; ch = scale/4; }
    else if (cell.s === 'q-l') { cw = scale/4; }
    else if (cell.s === 'q-r') { cx = bx + scale*0.75; cw = scale/4; }
    else if (cell.s === 'tl') { cw = scale/2; ch = scale/2; }
    else if (cell.s === 'tr') { cx = bx + scale/2; cw = scale/2; ch = scale/2; }
    else if (cell.s === 'bl') { cy = by + scale/2; cw = scale/2; ch = scale/2; }
    else if (cell.s === 'br') { cx = bx + scale/2; cy = by + scale/2; cw = scale/2; ch = scale/2; }
    return { cx, cy, cw, ch };
  };

  const getPolygonPoints = (shape: ShapeType, cx: number, cy: number, cw: number, ch: number) => {
    if (shape === 'tri-tl') return `${cx},${cy} ${cx+cw},${cy} ${cx},${cy+ch}`;
    if (shape === 'tri-tr') return `${cx},${cy} ${cx+cw},${cy} ${cx+cw},${cy+ch}`;
    if (shape === 'tri-bl') return `${cx},${cy} ${cx},${cy+ch} ${cx+cw},${cy+ch}`;
    if (shape === 'tri-br') return `${cx+cw},${cy} ${cx+cw},${cy+ch} ${cx},${cy+ch}`;
    if (shape === 'tri-t')  return `${cx},${cy+ch} ${cx+cw/2},${cy} ${cx+cw},${cy+ch}`;
    if (shape === 'tri-b')  return `${cx},${cy} ${cx+cw},${cy} ${cx+cw/2},${cy+ch}`;
    if (shape === 'tri-l')  return `${cx+cw},${cy} ${cx},${cy+ch/2} ${cx+cw},${cy+ch}`;
    if (shape === 'tri-r')  return `${cx},${cy} ${cx+cw},${cy+ch/2} ${cx},${cy+ch}`;
    return '';
  };

  const renderPreviewSvg = (matrixToRender = currentMatrix) => {
    let paths = '';
    matrixToRender.forEach((row, y) => {
      row.forEach((cell, x) => {
        if (cell) {
          const { cx, cy, cw, ch } = getRenderCoordinates(cell, x * 10, y * 10, 10);
          const rx = cell.r > 0 ? (cell.r / 100) * 5 : 0; 
          if (cell.c !== 'transparent') {
            if (cell.s.startsWith('tri-')) {
              paths += `<polygon points="${getPolygonPoints(cell.s, cx, cy, cw, ch)}" fill="${cell.c}" />\n`;
            } else { 
              paths += `<rect x="${cx}" y="${cy}" width="${cw}" height="${ch}" fill="${cell.c}" rx="${rx}" />\n`; 
            }
          }
          const bw = cell.bw || 1;
          if (cell.bt) paths += `<line x1="${cx}" y1="${cy}" x2="${cx+cw}" y2="${cy}" stroke="${cell.bc}" stroke-width="${bw}" />\n`;
          if (cell.bb) paths += `<line x1="${cx}" y1="${cy+ch}" x2="${cx+cw}" y2="${cy+ch}" stroke="${cell.bc}" stroke-width="${bw}" />\n`;
          if (cell.bl) paths += `<line x1="${cx}" y1="${cy}" x2="${cx}" y2="${cy+ch}" stroke="${cell.bc}" stroke-width="${bw}" />\n`;
          if (cell.br) paths += `<line x1="${cx+cw}" y1="${cy}" x2="${cx+cw}" y2="${cy+ch}" stroke="${cell.bc}" stroke-width="${bw}" />\n`;
        }
      });
    });
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${resolution * 10} ${resolution * 10}" width="100%" height="100%">\n${paths}</svg>`;
  };

  const exportImage = (format: 'png' | 'jpeg' | 'bmp') => {
    const scale = 20; 
    const canvas = document.createElement('canvas');
    canvas.width = resolution * scale; canvas.height = resolution * scale;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (format === 'jpeg' || format === 'bmp') {
      ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    currentMatrix.forEach((row, y) => {
      row.forEach((cell, x) => {
        if (cell) {
          const { cx, cy, cw, ch } = getRenderCoordinates(cell, x * scale, y * scale, scale);
          if (cell.c !== 'transparent') {
            ctx.fillStyle = cell.c; ctx.beginPath();
            if (cell.s.startsWith('tri-')) {
              const ptsStr = getPolygonPoints(cell.s, cx, cy, cw, ch);
              const ptsArr = ptsStr.split(' ').map(p => p.split(',').map(Number));
              ctx.moveTo(ptsArr[0][0], ptsArr[0][1]);
              ctx.lineTo(ptsArr[1][0], ptsArr[1][1]);
              ctx.lineTo(ptsArr[2][0], ptsArr[2][1]);
              ctx.closePath(); ctx.fill();
            } else {
              ctx.roundRect(cx, cy, cw, ch, cell.r > 0 ? (cell.r/100)*(scale/2) : 0);
              ctx.fill();
            }
          }
          ctx.strokeStyle = cell.bc; ctx.lineWidth = (cell.bw || 1); ctx.beginPath();
          if (cell.bt) { ctx.moveTo(cx, cy); ctx.lineTo(cx+cw, cy); }
          if (cell.bb) { ctx.moveTo(cx, cy+ch); ctx.lineTo(cx+cw, cy+ch); }
          if (cell.bl) { ctx.moveTo(cx, cy); ctx.lineTo(cx, cy+ch); }
          if (cell.br) { ctx.moveTo(cx+cw, cy); ctx.lineTo(cx+cw, cy+ch); }
          ctx.stroke();
        }
      });
    });

    const dataUrl = canvas.toDataURL(format === 'jpeg' ? 'image/jpeg' : format === 'bmp' ? 'image/bmp' : 'image/png');
    triggerDownload(dataUrl, `${localTitle.replace(/\s+/g, '_')}_${activeKey}.${format}`);
  };

  const exportToTTF = () => {
    const unitsPerEm = 1000; const ascender = 800; const descender = -200; const advanceWidth = 1000; 
    const scale = unitsPerEm / resolution;
    const fontGlyphs: opentype.Glyph[] = [];

    const notdefPath = new opentype.Path();
    notdefPath.moveTo(100, 0); notdefPath.lineTo(100, ascender); notdefPath.lineTo(advanceWidth - 100, ascender); notdefPath.lineTo(advanceWidth - 100, 0); notdefPath.close();
    fontGlyphs.push(new opentype.Glyph({ name: '.notdef', unicode: 0, advanceWidth, path: notdefPath }));

    Object.entries(matrices).forEach(([char, matrix]) => {
      if (char.startsWith('frame_')) return;
      const hasPixels = matrix.some(row => row.some(cell => cell !== null));
      if (!hasPixels && char !== ' ') return; 

      const path = new opentype.Path();
      matrix.forEach((row, y) => {
        row.forEach((cell, x) => {
          if (cell && cell.c !== 'transparent') {
            const bx = x * scale; const by = ascender - (y * scale); 
            let cx = bx, cy = by, cw = scale, ch = scale; 
            
            if (cell.s === 'half-t') { ch = scale/2; }
            else if (cell.s === 'half-b') { cy = by - scale/2; ch = scale/2; }
            else if (cell.s === 'half-l') { cw = scale/2; }
            else if (cell.s === 'half-r') { cx = bx + scale/2; cw = scale/2; }
            else if (cell.s === 'q-t') { ch = scale/4; }
            else if (cell.s === 'q-b') { cy = by - scale*0.75; ch = scale/4; }
            else if (cell.s === 'q-l') { cw = scale/4; }
            else if (cell.s === 'q-r') { cx = bx + scale*0.75; cw = scale/4; }
            else if (cell.s === 'tl') { cw = scale/2; ch = scale/2; }
            else if (cell.s === 'tr') { cx = bx + scale/2; cw = scale/2; ch = scale/2; }
            else if (cell.s === 'bl') { cy = by - scale/2; cw = scale/2; ch = scale/2; }
            else if (cell.s === 'br') { cx = bx + scale/2; cy = by - scale/2; cw = scale/2; ch = scale/2; }

            if (cell.s.startsWith('tri-')) {
              if (cell.s === 'tri-tl') { path.moveTo(cx, cy); path.lineTo(cx+cw, cy); path.lineTo(cx, cy-ch); path.close(); }
              else if (cell.s === 'tri-tr') { path.moveTo(cx, cy); path.lineTo(cx+cw, cy); path.lineTo(cx+cw, cy-ch); path.close(); }
              else if (cell.s === 'tri-bl') { path.moveTo(cx, cy); path.lineTo(cx, cy-ch); path.lineTo(cx+cw, cy-ch); path.close(); }
              else if (cell.s === 'tri-br') { path.moveTo(cx+cw, cy); path.lineTo(cx+cw, cy-ch); path.lineTo(cx, cy-ch); path.close(); }
              else if (cell.s === 'tri-t')  { path.moveTo(cx, cy-ch); path.lineTo(cx+cw/2, cy); path.lineTo(cx+cw, cy-ch); path.close(); }
              else if (cell.s === 'tri-b')  { path.moveTo(cx, cy); path.lineTo(cx+cw, cy); path.lineTo(cx+cw/2, cy-ch); path.close(); }
              else if (cell.s === 'tri-l')  { path.moveTo(cx+cw, cy); path.lineTo(cx, cy-ch/2); path.lineTo(cx+cw, cy-ch); path.close(); }
              else if (cell.s === 'tri-r')  { path.moveTo(cx, cy); path.lineTo(cx+cw, cy-ch/2); path.lineTo(cx, cy-ch); path.close(); }
            } else {
              path.moveTo(cx, cy); path.lineTo(cx + cw, cy); path.lineTo(cx + cw, cy - ch); path.lineTo(cx, cy - ch); path.close();
            }
          }
        });
      });
      fontGlyphs.push(new opentype.Glyph({ name: char, unicode: char.charCodeAt(0), advanceWidth, path }));
    });

    const font = new opentype.Font({ familyName: localTitle || 'Letrin Font', styleName: 'Regular', unitsPerEm, ascender, descender, glyphs: fontGlyphs });
    font.download(`${localTitle.replace(/\s+/g, '_')}.ttf`);
  };

  const exportToJson = () => triggerDownload("data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({ font: localTitle, resolution, visibility, glyphs: matrices }, null, 2)), `${localTitle.replace(/\s+/g, '_')}_projet.json`);
  const triggerDownload = (dataStr: string, filename: string) => { const a = document.createElement('a'); a.href = dataStr; a.download = filename; document.body.appendChild(a); a.click(); a.remove(); };

  const handleJsonUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsedData = JSON.parse(e.target?.result as string);
        if (parsedData.glyphs && typeof parsedData.resolution === 'number') {
          if (parsedData.font) setLocalTitle(parsedData.font);
          if (parsedData.visibility) setVisibility(parsedData.visibility);
          setResolution(parsedData.resolution);
          const safeMatrices: Record<string, (PixelData | null)[][]> = {};
          Object.keys(parsedData.glyphs).forEach(k => safeMatrices[k] = parseLegacyMatrix(parsedData.glyphs[k]));
          setMatrices(safeMatrices);
          const loadedFrames = Object.keys(safeMatrices).filter(k => k.startsWith('frame_'));
          if (loadedFrames.length > 0) { setFrames(loadedFrames); setSelectedFrame(loadedFrames[0]); } 
          else { setFrames(['frame_0']); safeMatrices['frame_0'] = Array.from({ length: parsedData.resolution }, () => Array(parsedData.resolution).fill(null)); }
          setSelectedChar('A'); saveHistory(safeMatrices);
        } else alert("Format Letr'In invalide.");
      } catch (error) { alert("Lecture JSON impossible."); }
    };
    reader.readAsText(file);
    if (jsonInputRef.current) jsonInputRef.current.value = '';
  };

  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789".split('');

  const getCssClipPath = (shape: ShapeType) => {
    if (shape === 'tri-tl') return 'polygon(0 0, 100% 0, 0 100%)';
    if (shape === 'tri-tr') return 'polygon(0 0, 100% 0, 100% 100%)';
    if (shape === 'tri-bl') return 'polygon(0 0, 0 100%, 100% 100%)';
    if (shape === 'tri-br') return 'polygon(100% 0, 100% 100%, 0 100%)';
    if (shape === 'tri-t')  return 'polygon(0 100%, 50% 0, 100% 100%)';
    if (shape === 'tri-b')  return 'polygon(0 0, 100% 0, 50% 100%)';
    if (shape === 'tri-l')  return 'polygon(100% 0, 0 50%, 100% 100%)';
    if (shape === 'tri-r')  return 'polygon(0 0, 100% 50%, 0 100%)';
    return 'none';
  };

  const activePixelCount = currentMatrix.reduce((acc, row) => acc + row.filter(cell => cell !== null).length, 0);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 p-6 bg-black/40 border border-white/5 rounded-3xl backdrop-blur-xl text-white">
      
      {/* 🔠 COLONNE GAUCHE (Sélecteur & Exports) */}
      <div className="lg:col-span-4 space-y-6 flex flex-col justify-between">
        <div className="flex bg-black/50 p-1 rounded-2xl border border-white/10">
          <button onClick={() => { setEditorMode('font'); setIsPlaying(false); }} className={`flex-1 py-2 rounded-xl text-xs font-bold font-mono transition-all flex items-center justify-center gap-2 ${editorMode === 'font' ? 'bg-[#E5484D] text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}><TypeIcon size={14} /> Police</button>
          <button onClick={() => setEditorMode('sprite')} className={`flex-1 py-2 rounded-xl text-xs font-bold font-mono transition-all flex items-center justify-center gap-2 ${editorMode === 'sprite' ? 'bg-emerald-500 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}><Clapperboard size={14} /> Sprite</button>
        </div>

        <input type="text" value={localTitle} onChange={(e) => setLocalTitle(e.target.value)} className="w-full bg-transparent border-b border-white/20 text-sm font-black uppercase tracking-widest text-slate-300 pb-2 focus:outline-none focus:border-[#E5484D] transition-colors" placeholder="Nom du projet" />

        {/* 🌍 Sélecteur de Visibilité (Souveraineté) */}
        <div className="space-y-2">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
            Visibilité & Souveraineté
          </label>
          <select
            value={visibility}
            onChange={(e) => setVisibility(e.target.value as CreationVisibility)}
            className="w-full bg-black/60 border border-white/10 rounded-xl p-3 text-xs text-slate-200 outline-none focus:border-[#E5484D]"
          >
            <option value="PUBLIC">🌍 Public (Visible par tous)</option>
            <option value="EXCHANGEABLE">🔄 Échangeable (Disponible sur le Marketplace)</option>
            <option value="VISIBLE">👁️ Visible (Hors marché)</option>
            <option value="PRIVATE">🔒 Privé (Strictement personnel)</option>
          </select>
        </div>

        {editorMode === 'font' && (
          <div className="grid grid-cols-6 gap-2 max-h-48 overflow-y-auto custom-scrollbar p-2 bg-black/20 rounded-2xl border border-white/5">
            {alphabet.map(char => (
              <button key={char} onClick={() => setSelectedChar(char)} className={`aspect-square rounded-xl font-mono text-xs font-bold transition-all flex items-center justify-center ${selectedChar === char ? 'bg-slate-600 text-white' : matrices[char]?.some(r => r.some(c => c !== null)) ? 'bg-white/10 text-slate-200 border border-white/10' : 'bg-white/5 text-slate-500'}`}>{char}</button>
            ))}
          </div>
        )}

        {editorMode === 'sprite' && (
          <div className="space-y-4">
            <div className="max-h-48 overflow-y-auto custom-scrollbar p-2 bg-black/20 rounded-2xl border border-white/5 space-y-2">
              {frames.map((frameId, index) => (
                <div key={frameId} className={`flex items-center justify-between p-2 rounded-xl border ${selectedFrame === frameId ? 'bg-emerald-500/20 border-emerald-500/50' : 'bg-white/5 border-transparent'}`}>
                  <button onClick={() => setSelectedFrame(frameId)} className="flex-1 text-left text-xs font-mono font-bold">Frame {index + 1}</button>
                  <button onClick={() => deleteFrame(frameId)} className="p-1 text-slate-400 hover:text-red-400"><Trash2 size={14}/></button>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={addFrame} className="py-2 bg-white/5 hover:bg-white/10 rounded-xl text-xs font-bold flex items-center justify-center gap-1"><Plus size={14}/> Nouvelle</button>
              <button onClick={duplicateFrame} className="py-2 bg-white/5 hover:bg-white/10 rounded-xl text-xs font-bold flex items-center justify-center gap-1"><Copy size={14}/> Dupliquer</button>
            </div>
          </div>
        )}

        <div className="p-4 bg-black/50 border border-white/10 rounded-2xl flex flex-col items-center space-y-3 relative">
          <div className="flex items-center justify-between w-full">
            <span className="text-[10px] font-mono uppercase text-slate-400">Aperçu Live ({activeKey})</span>
            <span className="text-[10px] font-mono text-slate-500">{activePixelCount} px</span>
          </div>
          <div className="w-24 h-24 bg-white/5 rounded-xl border border-white/5 p-2 overflow-hidden flex items-center justify-center">
            <div dangerouslySetInnerHTML={{ __html: renderPreviewSvg(editorMode === 'sprite' && isPlaying ? matrices[frames[playIndex]] : currentMatrix) }} />
          </div>
          {editorMode === 'sprite' && (
            <div className="flex items-center gap-4 w-full px-2">
              <button onClick={() => setIsPlaying(!isPlaying)} className="p-2 rounded-full bg-emerald-500 hover:bg-emerald-400 text-black">{isPlaying ? <Pause size={14} /> : <Play size={14} />}</button>
              <input type="range" min="1" max="24" value={fps} onChange={(e) => setFps(Number(e.target.value))} className="flex-1 accent-emerald-500" />
              <span className="text-[10px] font-mono">{fps}fps</span>
            </div>
          )}
        </div>

        <div className="space-y-3">
          {editorMode === 'font' ? (
            <button onClick={exportToTTF} className="w-full py-3 bg-[#E5484D] hover:bg-[#c43d41] font-black uppercase text-xs rounded-2xl shadow-[0_0_15px_rgba(229,72,77,0.3)] transition-all flex items-center justify-center gap-2"><TypeIcon size={16} /> Générer Police (.TTF)</button>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              <button onClick={() => exportImage('png')} className="py-2 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30 font-bold uppercase text-[10px] rounded-xl transition-all">PNG</button>
              <button onClick={() => exportImage('jpeg')} className="py-2 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30 font-bold uppercase text-[10px] rounded-xl transition-all">JPG</button>
              <button onClick={() => exportImage('bmp')} className="py-2 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30 font-bold uppercase text-[10px] rounded-xl transition-all">BMP</button>
            </div>
          )}
          <div className="h-px w-full bg-white/10 my-2" />
          <button onClick={() => onSave(matrices, visibility)} className="w-full py-2 bg-slate-600 hover:bg-slate-500 font-bold uppercase text-[10px] rounded-xl transition-all flex items-center justify-center gap-2"><Save size={14} /> Sauvegarder Projet</button>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={exportToJson} className="py-2 bg-black/40 border border-white/10 hover:bg-white/10 font-bold uppercase text-[10px] rounded-xl transition-all flex items-center justify-center gap-1"><Download size={12} /> Exporter JSON</button>
            <button onClick={() => jsonInputRef.current?.click()} className="py-2 bg-black/40 border border-white/10 hover:bg-white/10 font-bold uppercase text-[10px] rounded-xl transition-all flex items-center justify-center gap-1"><Upload size={12} /> Importer JSON</button>
          </div>
          <input type="file" accept=".json" ref={jsonInputRef} onChange={handleJsonUpload} className="hidden" />
        </div>
      </div>

      {/* 🎨 COLONNE DROITE (Contrôles Pinceau & Grille) */}
      <div className="lg:col-span-8 space-y-4 flex flex-col">
        
        <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-white/[0.02] border border-white/5 rounded-2xl">
          <div className="flex items-center gap-2 bg-black/40 p-1.5 rounded-xl border border-white/10">
            <button onClick={undo} disabled={historyIndex === 0} className={`p-2 rounded-lg transition-all ${historyIndex > 0 ? 'text-white hover:bg-white/10' : 'text-slate-600 cursor-not-allowed'}`} title="Annuler"><Undo2 size={16} /></button>
            <div className="w-px h-4 bg-white/10"></div>
            <button onClick={redo} disabled={historyIndex === history.length - 1} className={`p-2 rounded-lg transition-all ${historyIndex < history.length - 1 ? 'text-white hover:bg-white/10' : 'text-slate-600 cursor-not-allowed'}`} title="Rétablir"><Redo2 size={16} /></button>
          </div>
          
          <div className="flex items-center gap-4">
             <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono text-slate-400 uppercase">Résolution:</span>
                <input type="number" min="1" value={resolution} onChange={(e) => changeResolution(Number(e.target.value))} className="w-16 bg-black/60 border border-white/10 px-2 py-1 rounded-lg text-xs text-white outline-none font-mono" />
             </div>
             <div className="h-6 w-px bg-white/10"></div>
             
             <div className="flex flex-col items-center gap-0.5 bg-black/40 p-1 rounded-xl border border-white/10">
                <button onClick={() => panGrid(0, -1)} className="p-0.5 rounded hover:bg-white/10 text-slate-400 hover:text-white" title="Décaler en haut"><ChevronUp size={14}/></button>
                <div className="flex items-center gap-3">
                    <button onClick={() => panGrid(-1, 0)} className="p-0.5 rounded hover:bg-white/10 text-slate-400 hover:text-white" title="Décaler à gauche"><ChevronLeft size={14}/></button>
                    <button onClick={() => panGrid(1, 0)} className="p-0.5 rounded hover:bg-white/10 text-slate-400 hover:text-white" title="Décaler à droite"><ChevronRight size={14}/></button>
                </div>
                <button onClick={() => panGrid(0, 1)} className="p-0.5 rounded hover:bg-white/10 text-slate-400 hover:text-white" title="Décaler en bas"><ChevronDown size={14}/></button>
             </div>
             
             <button onClick={clearGrid} className="ml-2 px-3 py-1.5 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-lg border border-red-500/20 text-xs font-bold transition-all flex items-center gap-2">
               <Trash size={14} /> Vider
             </button>
          </div>
        </div>

        <div className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl space-y-4">
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button onClick={() => setTool('pencil')} className={`p-2 rounded-lg transition-all ${tool === 'pencil' ? 'bg-white text-black' : 'bg-white/5 text-slate-400 hover:text-white'}`} title="Crayon (B)"><Pencil size={14} /></button>
              <button onClick={() => setTool('line')} className={`p-2 rounded-lg transition-all ${tool === 'line' ? 'bg-white text-black' : 'bg-white/5 text-slate-400 hover:text-white'}`} title="Ligne (L)"><Minus size={14} /></button>
              <button onClick={() => setTool('rect')} className={`p-2 rounded-lg transition-all ${tool === 'rect' ? 'bg-white text-black' : 'bg-white/5 text-slate-400 hover:text-white'}`} title="Rectangle (R)"><Square size={14} /></button>
              <button onClick={() => setTool('circle')} className={`p-2 rounded-lg transition-all ${tool === 'circle' ? 'bg-white text-black' : 'bg-white/5 text-slate-400 hover:text-white'}`} title="Cercle (C)"><Circle size={14} /></button>
              <button onClick={() => setTool('fill')} className={`p-2 rounded-lg transition-all ${tool === 'fill' ? 'bg-white text-black' : 'bg-white/5 text-slate-400 hover:text-white'}`} title="Pot de Peinture (F)"><PaintBucket size={14} /></button>
              <button onClick={() => setTool('eraser')} className={`p-2 rounded-lg transition-all ${tool === 'eraser' ? 'bg-white text-black' : 'bg-white/5 text-slate-400 hover:text-white'}`} title="Gomme (E)"><Eraser size={14} /></button>
              <div className="w-px h-4 bg-white/10 mx-1"></div>
              <button onClick={() => setTool('pipette')} className={`p-2 rounded-lg ${tool === 'pipette' ? 'bg-emerald-500 text-black' : 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'}`} title="Pipette (P)"><Pipette size={14} /></button>
            </div>

            <div className="flex items-center gap-2">
               {palette.map((color, i) => (
                 <button key={i} onClick={() => setBrushColor(color)} className={`w-6 h-6 rounded-full border-2 transition-all ${brushColor === color ? 'border-white scale-110' : 'border-transparent hover:scale-105'}`} style={{ backgroundColor: color === 'transparent' ? '#222' : color }} />
               ))}
               <input type="color" value={brushColor !== 'transparent' ? brushColor : '#000000'} onChange={(e) => { if (!palette.includes(e.target.value)) setPalette([...palette, e.target.value]); setBrushColor(e.target.value); }} className="w-6 h-6 p-0 border-0 rounded-full cursor-pointer bg-transparent ml-2" />
            </div>
          </div>

          <div className="flex items-center gap-4 bg-black/30 p-2 rounded-xl border border-white/5 overflow-x-auto custom-scrollbar">
             <span className="text-[10px] font-mono text-slate-500 uppercase whitespace-nowrap">Forme</span>
             <button onClick={() => setBrushShape('full')} className={`p-2 rounded font-mono text-xs ${brushShape === 'full' ? 'bg-white text-black' : 'text-slate-400 hover:bg-white/10'}`}>🔲</button>
             <div className="w-px h-4 bg-white/10"></div>
             
             <button onClick={() => setBrushShape('half-t')} className={`p-2 rounded font-mono text-xs ${brushShape === 'half-t' ? 'bg-white text-black' : 'text-slate-400 hover:bg-white/10'}`}>▀</button>
             <button onClick={() => setBrushShape('half-b')} className={`p-2 rounded font-mono text-xs ${brushShape === 'half-b' ? 'bg-white text-black' : 'text-slate-400 hover:bg-white/10'}`}>▄</button>
             <button onClick={() => setBrushShape('half-l')} className={`p-2 rounded font-mono text-xs ${brushShape === 'half-l' ? 'bg-white text-black' : 'text-slate-400 hover:bg-white/10'}`}>▌</button>
             <button onClick={() => setBrushShape('half-r')} className={`p-2 rounded font-mono text-xs ${brushShape === 'half-r' ? 'bg-white text-black' : 'text-slate-400 hover:bg-white/10'}`}>▐</button>
             <div className="w-px h-4 bg-white/10"></div>
             
             <button onClick={() => setBrushShape('q-t')} className={`p-2 rounded font-mono text-xs ${brushShape === 'q-t' ? 'bg-white text-black' : 'text-slate-400 hover:bg-white/10'}`}>▔</button>
             <button onClick={() => setBrushShape('q-b')} className={`p-2 rounded font-mono text-xs ${brushShape === 'q-b' ? 'bg-white text-black' : 'text-slate-400 hover:bg-white/10'}`}>_</button>
             <button onClick={() => setBrushShape('q-l')} className={`p-2 rounded font-mono text-xs ${brushShape === 'q-l' ? 'bg-white text-black' : 'text-slate-400 hover:bg-white/10'}`}>▏</button>
             <button onClick={() => setBrushShape('q-r')} className={`p-2 rounded font-mono text-xs ${brushShape === 'q-r' ? 'bg-white text-black' : 'text-slate-400 hover:bg-white/10'}`}>▕</button>
             <div className="w-px h-4 bg-white/10"></div>
             
             <button onClick={() => setBrushShape('tl')} className={`p-2 rounded font-mono text-xs ${brushShape === 'tl' ? 'bg-white text-black' : 'text-slate-400 hover:bg-white/10'}`}>▘</button>
             <button onClick={() => setBrushShape('tr')} className={`p-2 rounded font-mono text-xs ${brushShape === 'tr' ? 'bg-white text-black' : 'text-slate-400 hover:bg-white/10'}`}>▝</button>
             <button onClick={() => setBrushShape('bl')} className={`p-2 rounded font-mono text-xs ${brushShape === 'bl' ? 'bg-white text-black' : 'text-slate-400 hover:bg-white/10'}`}>▖</button>
             <button onClick={() => setBrushShape('br')} className={`p-2 rounded font-mono text-xs ${brushShape === 'br' ? 'bg-white text-black' : 'text-slate-400 hover:bg-white/10'}`}>▗</button>
             <div className="w-px h-4 bg-white/10"></div>
             
             <button onClick={() => setBrushShape('tri-tl')} className={`p-2 rounded font-mono text-xs ${brushShape === 'tri-tl' ? 'bg-white text-black' : 'text-slate-400 hover:bg-white/10'}`}>◤</button>
             <button onClick={() => setBrushShape('tri-tr')} className={`p-2 rounded font-mono text-xs ${brushShape === 'tri-tr' ? 'bg-white text-black' : 'text-slate-400 hover:bg-white/10'}`}>◥</button>
             <button onClick={() => setBrushShape('tri-bl')} className={`p-2 rounded font-mono text-xs ${brushShape === 'tri-bl' ? 'bg-white text-black' : 'text-slate-400 hover:bg-white/10'}`}>◣</button>
             <button onClick={() => setBrushShape('tri-br')} className={`p-2 rounded font-mono text-xs ${brushShape === 'tri-br' ? 'bg-white text-black' : 'text-slate-400 hover:bg-white/10'}`}>◢</button>
             <button onClick={() => setBrushShape('tri-t')}  className={`p-2 rounded font-mono text-xs ${brushShape === 'tri-t'  ? 'bg-white text-black' : 'text-slate-400 hover:bg-white/10'}`}>▲</button>
             <button onClick={() => setBrushShape('tri-b')}  className={`p-2 rounded font-mono text-xs ${brushShape === 'tri-b'  ? 'bg-white text-black' : 'text-slate-400 hover:bg-white/10'}`}>▼</button>
             <button onClick={() => setBrushShape('tri-l')}  className={`p-2 rounded font-mono text-xs ${brushShape === 'tri-l'  ? 'bg-white text-black' : 'text-slate-400 hover:bg-white/10'}`}>◀</button>
             <button onClick={() => setBrushShape('tri-r')}  className={`p-2 rounded font-mono text-xs ${brushShape === 'tri-r'  ? 'bg-white text-black' : 'text-slate-400 hover:bg-white/10'}`}>▶</button>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4">
             <div className="flex items-center gap-4 bg-black/30 p-2 rounded-xl border border-white/5">
                <span className="text-[10px] font-mono text-slate-500 uppercase">Bords :</span>
                <label className="flex items-center gap-1 text-[10px] font-mono cursor-pointer"><input type="checkbox" checked={brushBorders.t} onChange={e => setBrushBorders({...brushBorders, t: e.target.checked})} className="accent-slate-500"/> H</label>
                <label className="flex items-center gap-1 text-[10px] font-mono cursor-pointer"><input type="checkbox" checked={brushBorders.b} onChange={e => setBrushBorders({...brushBorders, b: e.target.checked})} className="accent-slate-500"/> B</label>
                <label className="flex items-center gap-1 text-[10px] font-mono cursor-pointer"><input type="checkbox" checked={brushBorders.l} onChange={e => setBrushBorders({...brushBorders, l: e.target.checked})} className="accent-slate-500"/> G</label>
                <label className="flex items-center gap-1 text-[10px] font-mono cursor-pointer"><input type="checkbox" checked={brushBorders.r} onChange={e => setBrushBorders({...brushBorders, r: e.target.checked})} className="accent-slate-500"/> D</label>
                <input type="color" value={brushBorderColor} onChange={e => setBrushBorderColor(e.target.value)} className="w-5 h-5 p-0 border-0 bg-transparent cursor-pointer ml-2" title="Couleur bordure" />
                <div className="flex items-center gap-1 ml-2">
                   <span className="text-[9px] font-mono text-slate-400">Épaisseur:</span>
                   <input 
                     type="number" min="1" max={resolution} 
                     value={brushBorderWidth} 
                     onChange={e => setBrushBorderWidth(Math.max(1, Math.min(resolution, Number(e.target.value))))} 
                     className="w-12 bg-black/60 border border-white/10 rounded px-1 py-0.5 text-[10px] font-mono text-white outline-none text-center"
                   />
                </div>
             </div>

             <div className="flex items-center gap-2 bg-black/30 p-2 rounded-xl border border-white/5">
                <span className="text-[10px] font-mono text-slate-500 uppercase">Arrondi ({brushRadius}%)</span>
                <input type="range" min="0" max="50" value={brushRadius} onChange={e => setBrushRadius(Number(e.target.value))} className="w-24 accent-[#E5484D]" disabled={brushShape.startsWith('tri-')} />
             </div>
             
             <div className="flex items-center gap-2 bg-black/30 p-1 rounded-xl border border-white/5">
                <span className="text-[10px] font-mono text-slate-500 uppercase ml-2">Symétrie</span>
                <button onClick={() => setMirrorX(!mirrorX)} className={`p-1.5 rounded-lg transition-all ${mirrorX ? 'bg-cyan-500/20 text-cyan-400' : 'text-slate-500'}`} title="Miroir Horizontal"><FlipHorizontal size={14} /></button>
                <button onClick={() => setMirrorY(!mirrorY)} className={`p-1.5 rounded-lg transition-all ${mirrorY ? 'bg-cyan-500/20 text-cyan-400' : 'text-slate-500'}`} title="Miroir Vertical"><FlipVertical size={14} /></button>
             </div>
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center p-6 bg-black/60 border border-white/10 rounded-3xl overflow-hidden" onMouseLeave={() => setHoverPoint(null)}>
          <div 
            className="w-full max-w-[500px] aspect-square mx-auto grid gap-[1px] bg-white/10 p-2 rounded-2xl select-none"
            style={{ gridTemplateColumns: `repeat(${resolution}, minmax(0, 1fr))` }}
            onMouseLeave={() => setIsDrawing(false)}
          >
            {currentMatrix.map((row, y) => 
              row.map((cellObj, x) => {
                const isPreview = previewPixels.find(p => p.x === x && p.y === y);
                const cell = isPreview ? isPreview.val : cellObj;
                const isPreviewActive = !!isPreview;

                return (
                  <div
                    key={`${x}-${y}`}
                    onMouseDown={() => handleMouseDown(x, y)}
                    onMouseEnter={() => handleMouseEnter(x, y)}
                    onMouseUp={() => handleMouseUp(x, y)}
                    className={`relative aspect-square transition-all ${tool === 'fill' ? 'cursor-cell' : tool === 'pipette' ? 'cursor-copy' : 'cursor-crosshair'} hover:brightness-125`}
                    style={{ backgroundColor: 'rgba(0,0,0,0.8)', borderRadius: resolution < 20 ? '2px' : '0px', opacity: isPreviewActive ? 0.6 : 1 }}
                  >
                    {cell && (
                      <div 
                        className="absolute"
                        style={{
                          backgroundColor: cell.c !== 'transparent' ? cell.c : 'transparent',
                          borderRadius: `${cell.r}%`,
                          clipPath: getCssClipPath(cell.s),
                          borderTop: cell.bt && !cell.s.startsWith('tri-') ? `${cell.bw || 1}px solid ${cell.bc}` : 'none',
                          borderBottom: cell.bb && !cell.s.startsWith('tri-') ? `${cell.bw || 1}px solid ${cell.bc}` : 'none',
                          borderLeft: cell.bl && !cell.s.startsWith('tri-') ? `${cell.bw || 1}px solid ${cell.bc}` : 'none',
                          borderRight: cell.br && !cell.s.startsWith('tri-') ? `${cell.bw || 1}px solid ${cell.bc}` : 'none',
                          top: (cell.s === 'half-b' || cell.s === 'bl' || cell.s === 'br') ? '50%' : (cell.s === 'q-b' ? '75%' : '0'),
                          bottom: (cell.s === 'half-t' || cell.s === 'tl' || cell.s === 'tr') ? '50%' : (cell.s === 'q-t' ? '75%' : '0'),
                          left: (cell.s === 'half-r' || cell.s === 'tr' || cell.s === 'br') ? '50%' : (cell.s === 'q-r' ? '75%' : '0'),
                          right: (cell.s === 'half-l' || cell.s === 'tl' || cell.s === 'bl') ? '50%' : (cell.s === 'q-l' ? '75%' : '0'),
                          width: (['half-l', 'half-r', 'tl', 'tr', 'bl', 'br'].includes(cell.s)) ? '50%' : (['q-l', 'q-r'].includes(cell.s) ? '25%' : '100%'),
                          height: (['half-t', 'half-b', 'tl', 'tr', 'bl', 'br'].includes(cell.s)) ? '50%' : (['q-t', 'q-b'].includes(cell.s) ? '25%' : '100%'),
                        }}
                      />
                    )}
                  </div>
                )
              })
            )}
          </div>
        </div>

      </div>
    </div>
  );
}