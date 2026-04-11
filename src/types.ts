export interface RectShape { id: number; type: 'rect'; x: number; y: number; w: number; h: number; layer: number; groupId?: number; }
export interface CircleShape { id: number; type: 'circle'; cx: number; cy: number; r: number; layer: number; groupId?: number; }
export type Shape = RectShape | CircleShape;

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
export type Tool = 'select' | 'rect' | 'circle';
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

/* ─── Group helpers ──────────────────────────────── */
export function getGroupBounds(shapes: Shape[], ids: number[]): { cx: number; cy: number; minX: number; minY: number; maxX: number; maxY: number } {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  shapes.filter(s => ids.includes(s.id)).forEach(s => {
    if (s.type === 'rect') {
      minX = Math.min(minX, s.x); minY = Math.min(minY, s.y);
      maxX = Math.max(maxX, s.x + s.w); maxY = Math.max(maxY, s.y + s.h);
    } else {
      minX = Math.min(minX, s.cx - s.r); minY = Math.min(minY, s.cy - s.r);
      maxX = Math.max(maxX, s.cx + s.r); maxY = Math.max(maxY, s.cy + s.r);
    }
  });
  return { cx: (minX + maxX) / 2, cy: (minY + maxY) / 2, minX, minY, maxX, maxY };
}

export function scaleShapes(shapes: Shape[], ids: number[], factor: number): Shape[] {
  const bounds = getGroupBounds(shapes, ids);
  return shapes.map(s => {
    if (!ids.includes(s.id)) return s;
    if (s.type === 'rect') {
      const newW = s.w * factor, newH = s.h * factor;
      const newX = bounds.cx + (s.x - bounds.cx) * factor;
      const newY = bounds.cy + (s.y - bounds.cy) * factor;
      return { ...s, x: newX, y: newY, w: newW, h: newH };
    } else {
      const newCx = bounds.cx + (s.cx - bounds.cx) * factor;
      const newCy = bounds.cy + (s.cy - bounds.cy) * factor;
      return { ...s, cx: newCx, cy: newCy, r: s.r * factor };
    }
  });
}

/* ─── Project & History ──────────────────────────── */
export interface ProjectData {
  version: number; name: string; shapes: Shape[]; layers: Layer[];
  deviceW: number; deviceH: number; gridSize: number; polarity: Polarity;
  simPxW: number; simPxH: number; waferDiam: number; streetW: number;
  marks: MarksConfig; waferDPI: number;
}
export interface HistoryEntry { shapes: Shape[]; label: string; }
