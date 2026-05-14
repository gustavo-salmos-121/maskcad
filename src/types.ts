export interface RectShape { id: number; type: 'rect'; x: number; y: number; w: number; h: number; layer: number; groupId?: number; }
export interface CircleShape { id: number; type: 'circle'; cx: number; cy: number; r: number; layer: number; groupId?: number; }
export interface PolygonShape { id: number; type: 'polygon'; points: { x: number; y: number }[]; layer: number; groupId?: number; }
export interface ArcShape { id: number; type: 'arc'; cx: number; cy: number; innerR: number; outerR: number; startAngle: number; endAngle: number; layer: number; groupId?: number; }
export type Shape = RectShape | CircleShape | PolygonShape | ArcShape;

export type LayerPurpose = 'generic'|'oxidation'|'metallization'|'implant'|'diffusion'|'passivation'|'contact'|'polysilicon'|'active'|'well';
export const LAYER_PURPOSE_LABELS: Record<LayerPurpose, string> = {
  generic:'Genérica', oxidation:'Oxidação', metallization:'Metalização', implant:'Implantação',
  diffusion:'Difusão', passivation:'Passivação', contact:'Contato / Via', polysilicon:'Polissilício',
  active:'Área Ativa', well:'Poço (Well)',
};
export const LAYER_PALETTE = [
  '#8B1A1A','#A0522D','#6B4226','#C4943A','#7A9A5A','#5A7AAA','#9A5A8B','#2E4057','#D4A76A','#4A6741',
  '#8B6914','#6A3D6A','#3B7A8B','#C06040','#556B2F','#704214','#4682B4','#8B4513','#2F4F4F','#B8860B',
];
export interface Layer { id: number; name: string; visible: boolean; color: string; purpose: LayerPurpose; opacity: number; }
export interface Viewport { x: number; y: number; z: number; }
export type Tool = 'select' | 'rect' | 'circle' | 'polygon' | 'arc';
export type Polarity = 'dark' | 'clear';
export type AlignMarkStyle = 'cross' | 'crosshair' | 'lshape' | 'vernier';
export interface DiePosition { x: number; y: number; }
export interface WaferSize { label: string; d: number; }
export const WAFER_SIZES: WaferSize[] = [
  { label: '2″ (50.8 mm)', d: 50800 }, { label: '3″ (76.2 mm)', d: 76200 },
  { label: '4″ (100 mm)', d: 100000 }, { label: '6″ (150 mm)', d: 150000 },
  { label: '8″ (200 mm)', d: 200000 },
];
export interface DieOutlineConfig { enabled: boolean; width: number; margin: number; }
export type DieMarkPosition = 'corners' | 'edges' | 'corners+edges';
export interface DieMarksConfig { enabled: boolean; style: AlignMarkStyle; size: number; offset: number; positions: DieMarkPosition; }
export type WaferMarkPlacement = 'auto4' | 'auto8' | 'manual';
export interface WaferMarksConfig { enabled: boolean; style: AlignMarkStyle; size: number; placement: WaferMarkPlacement; radiusFraction: number; }
export interface MarksConfig { wafer: WaferMarksConfig; die: DieMarksConfig; outline: DieOutlineConfig; }
export const DEFAULT_MARKS: MarksConfig = {
  wafer: { enabled: true, style: 'cross', size: 500, placement: 'auto4', radiusFraction: 0.85 },
  die:   { enabled: true, style: 'cross', size: 30, offset: 15, positions: 'corners' },
  outline: { enabled: true, width: 3, margin: 10 },
};
export function calcDiePadding(marks: MarksConfig): number {
  const outlineOuter = marks.outline.enabled ? marks.outline.margin + marks.outline.width : 0;
  const markOuter = marks.die.enabled ? outlineOuter + marks.die.offset + marks.die.size / 2 : 0;
  return Math.max(outlineOuter, markOuter);
}

/* ─── Shape bounds ───────────────────────────────── */
export function shapeBounds(s: Shape): { minX: number; minY: number; maxX: number; maxY: number } {
  if (s.type === 'rect') return { minX: s.x, minY: s.y, maxX: s.x + s.w, maxY: s.y + s.h };
  if (s.type === 'circle') return { minX: s.cx - s.r, minY: s.cy - s.r, maxX: s.cx + s.r, maxY: s.cy + s.r };
  if (s.type === 'polygon') {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    s.points.forEach(p => { minX = Math.min(minX, p.x); minY = Math.min(minY, p.y); maxX = Math.max(maxX, p.x); maxY = Math.max(maxY, p.y); });
    return { minX, minY, maxX, maxY };
  }
  return { minX: s.cx - s.outerR, minY: s.cy - s.outerR, maxX: s.cx + s.outerR, maxY: s.cy + s.outerR };
}

export function getGroupBounds(shapes: Shape[], ids: number[]) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  shapes.filter(s => ids.includes(s.id)).forEach(s => {
    const b = shapeBounds(s);
    minX = Math.min(minX, b.minX); minY = Math.min(minY, b.minY);
    maxX = Math.max(maxX, b.maxX); maxY = Math.max(maxY, b.maxY);
  });
  return { cx: (minX + maxX) / 2, cy: (minY + maxY) / 2, minX, minY, maxX, maxY };
}

/* ─── Scale shapes relative to selection center ──── */
export function scaleShapes(shapes: Shape[], ids: number[], factor: number): Shape[] {
  const bounds = getGroupBounds(shapes, ids);
  const bx = bounds.cx, by = bounds.cy;
  return shapes.map(s => {
    if (!ids.includes(s.id)) return s;
    if (s.type === 'rect') return { ...s, x: bx + (s.x - bx) * factor, y: by + (s.y - by) * factor, w: s.w * factor, h: s.h * factor };
    if (s.type === 'circle') return { ...s, cx: bx + (s.cx - bx) * factor, cy: by + (s.cy - by) * factor, r: s.r * factor };
    if (s.type === 'polygon') return { ...s, points: s.points.map(p => ({ x: bx + (p.x - bx) * factor, y: by + (p.y - by) * factor })) };
    if (s.type === 'arc') return { ...s, cx: bx + (s.cx - bx) * factor, cy: by + (s.cy - by) * factor, innerR: s.innerR * factor, outerR: s.outerR * factor };
    return s;
  });
}

/* ─── Rotate helpers ─────────────────────────────── */
function rotPt(x: number, y: number, cx: number, cy: number, angle: number): { x: number; y: number } {
  const cos = Math.cos(angle), sin = Math.sin(angle);
  const dx = x - cx, dy = y - cy;
  return { x: cx + dx * cos - dy * sin, y: cy + dx * sin + dy * cos };
}

export function rotateShape(s: Shape, cx: number, cy: number, angle: number, newId: number, groupId?: number): Shape {
  const g = groupId;
  if (s.type === 'rect') {
    const corners = [
      { x: s.x, y: s.y }, { x: s.x + s.w, y: s.y },
      { x: s.x + s.w, y: s.y + s.h }, { x: s.x, y: s.y + s.h },
    ].map(p => rotPt(p.x, p.y, cx, cy, angle));
    return { id: newId, type: 'polygon', points: corners, layer: s.layer, groupId: g };
  }
  if (s.type === 'circle') {
    const nc = rotPt(s.cx, s.cy, cx, cy, angle);
    return { id: newId, type: 'circle', cx: nc.x, cy: nc.y, r: s.r, layer: s.layer, groupId: g };
  }
  if (s.type === 'polygon') {
    return { id: newId, type: 'polygon', points: s.points.map(p => rotPt(p.x, p.y, cx, cy, angle)), layer: s.layer, groupId: g };
  }
  if (s.type === 'arc') {
    const nc = rotPt(s.cx, s.cy, cx, cy, angle);
    return { id: newId, type: 'arc', cx: nc.x, cy: nc.y, innerR: s.innerR, outerR: s.outerR, startAngle: s.startAngle + angle, endAngle: s.endAngle + angle, layer: s.layer, groupId: g };
  }
  return s;
}

/* ─── Polar array ────────────────────────────────── */
export function polarArray(
  shapes: Shape[], ids: number[], cx: number, cy: number,
  count: number, totalAngle: number, startId: number
): { newShapes: Shape[]; nextId: number } {
  const sourceShapes = shapes.filter(s => ids.includes(s.id));
  const newShapes: Shape[] = [];
  let nid = startId;
  const gid = nid + count * sourceShapes.length + 1;
  for (let i = 1; i < count; i++) {
    const angle = (totalAngle / count) * i * (Math.PI / 180);
    sourceShapes.forEach(s => {
      newShapes.push(rotateShape(s, cx, cy, angle, nid, gid));
      nid++;
    });
  }
  return { newShapes, nextId: nid };
}

/* ─── Mirror (creates copies) ────────────────────── */
export function mirrorCopy(
  shapes: Shape[], ids: number[], axis: 'x' | 'y',
  axisPosX: number, axisPosY: number, startId: number
): { newShapes: Shape[]; nextId: number } {
  const sourceShapes = shapes.filter(s => ids.includes(s.id));
  const newShapes: Shape[] = [];
  let nid = startId;

  sourceShapes.forEach(s => {
    let ns: Shape;
    if (axis === 'y') {
      // Mirror across vertical axis at axisPosX (flip X)
      if (s.type === 'rect') {
        ns = { ...s, id: nid, x: 2 * axisPosX - s.x - s.w, groupId: undefined };
      } else if (s.type === 'circle') {
        ns = { ...s, id: nid, cx: 2 * axisPosX - s.cx, groupId: undefined };
      } else if (s.type === 'polygon') {
        ns = { ...s, id: nid, points: s.points.map(p => ({ x: 2 * axisPosX - p.x, y: p.y })), groupId: undefined };
      } else {
        ns = { ...s, id: nid, cx: 2 * axisPosX - s.cx,
          startAngle: Math.PI - s.endAngle, endAngle: Math.PI - s.startAngle, groupId: undefined };
      }
    } else {
      // Mirror across horizontal axis at axisPosY (flip Y)
      if (s.type === 'rect') {
        ns = { ...s, id: nid, y: 2 * axisPosY - s.y - s.h, groupId: undefined };
      } else if (s.type === 'circle') {
        ns = { ...s, id: nid, cy: 2 * axisPosY - s.cy, groupId: undefined };
      } else if (s.type === 'polygon') {
        ns = { ...s, id: nid, points: s.points.map(p => ({ x: p.x, y: 2 * axisPosY - p.y })), groupId: undefined };
      } else {
        ns = { ...s, id: nid, cy: 2 * axisPosY - s.cy,
          startAngle: -s.endAngle, endAngle: -s.startAngle, groupId: undefined };
      }
    }
    newShapes.push(ns);
    nid++;
  });

  return { newShapes, nextId: nid };
}

/* ─── Linear array ───────────────────────────────── */
export function linearArray(
  shapes: Shape[], ids: number[],
  cols: number, rows: number, spacingX: number, spacingY: number,
  startId: number
): { newShapes: Shape[]; nextId: number } {
  const sourceShapes = shapes.filter(s => ids.includes(s.id));
  const newShapes: Shape[] = [];
  let nid = startId;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (r === 0 && c === 0) continue; // skip original position
      const dx = c * spacingX, dy = r * spacingY;
      sourceShapes.forEach(s => {
        let ns: Shape;
        if (s.type === 'rect') {
          ns = { ...s, id: nid, x: s.x + dx, y: s.y + dy, groupId: undefined };
        } else if (s.type === 'circle') {
          ns = { ...s, id: nid, cx: s.cx + dx, cy: s.cy + dy, groupId: undefined };
        } else if (s.type === 'polygon') {
          ns = { ...s, id: nid, points: s.points.map(p => ({ x: p.x + dx, y: p.y + dy })), groupId: undefined };
        } else {
          ns = { ...(s as ArcShape), id: nid, cx: s.cx + dx, cy: s.cy + dy, groupId: undefined };
        }
        newShapes.push(ns);
        nid++;
      });
    }
  }
  return { newShapes, nextId: nid };
}

/* ─── Project & History ──────────────────────────── */
export interface ProjectData {
  version: number; name: string; shapes: Shape[]; layers: Layer[];
  deviceW: number; deviceH: number; gridSize: number; polarity: Polarity;
  simPxW: number; simPxH: number; waferDiam: number; streetW: number;
  marks: MarksConfig; waferDPI: number;
}
export interface HistoryEntry { shapes: Shape[]; label: string; }
