export interface RectShape { id: number; type: 'rect'; x: number; y: number; w: number; h: number; layer: number; }
export interface CircleShape { id: number; type: 'circle'; cx: number; cy: number; r: number; layer: number; }
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

/* ─── Mark system ────────────────────────────────── */
// Hierarchy (inside → outside):
//   1. Device area (deviceW × deviceH) — mask geometry lives here
//   2. Die outline — rectangle frame AROUND device, at `outline.margin` µm from device edge
//   3. Die marks — placed OUTSIDE outline, at `dieMarks.offset` µm from outline edge
// Total die footprint = device + 2*(outline.margin + dieMarks.offset + dieMarks.size/2)

export interface DieOutlineConfig {
  enabled: boolean;
  width: number;        // line thickness (µm)
  margin: number;       // gap between device edge and outline inner edge (µm)
}

export type DieMarkPosition = 'corners' | 'edges' | 'corners+edges';

export interface DieMarksConfig {
  enabled: boolean;
  style: AlignMarkStyle;
  size: number;         // mark size (µm)
  offset: number;       // gap from outline outer edge (or device edge if no outline) to mark center (µm)
  positions: DieMarkPosition;
}

export type WaferMarkPlacement = 'auto4' | 'auto8' | 'manual';

export interface WaferMarksConfig {
  enabled: boolean;
  style: AlignMarkStyle;
  size: number;
  placement: WaferMarkPlacement;
  radiusFraction: number;
}

export interface MarksConfig {
  wafer: WaferMarksConfig;
  die: DieMarksConfig;
  outline: DieOutlineConfig;
}

export const DEFAULT_MARKS: MarksConfig = {
  wafer: { enabled: true, style: 'cross', size: 500, placement: 'auto4', radiusFraction: 0.85 },
  die:   { enabled: true, style: 'cross', size: 30, offset: 15, positions: 'corners' },
  outline: { enabled: true, width: 3, margin: 10 },
};

/** Calculate total padding around device area for die footprint.
 *  This is the maximum extent from device edge outward that any element reaches.
 *  Layout (inside→out): device edge → [margin] → outline → [offset] → mark center ± size/2
 */
export function calcDiePadding(marks: MarksConfig): number {
  // Outline outer edge distance from device edge
  const outlineOuter = marks.outline.enabled
    ? marks.outline.margin + marks.outline.width
    : 0;

  // Mark outer edge distance from device edge
  // Marks sit outside the outline (or outside device if no outline)
  const markOuter = marks.die.enabled
    ? outlineOuter + marks.die.offset + marks.die.size / 2
    : 0;

  // Return whichever reaches further
  return Math.max(outlineOuter, markOuter);
}

/* ─── Project & History ──────────────────────────── */
export interface ProjectData {
  version: number; name: string; shapes: Shape[]; layers: Layer[];
  deviceW: number; deviceH: number; gridSize: number; polarity: Polarity;
  simPxW: number; simPxH: number; waferDiam: number; streetW: number;
  marks: MarksConfig; waferDPI: number;
}
export interface HistoryEntry { shapes: Shape[]; label: string; }
