import { useRef, useEffect, useState, useCallback } from 'react';
import { Shape, Layer, Viewport, Tool, Polarity } from '../types';
import { w2s, s2w, snapVal, hitTest, cssVar } from '../utils';

interface CanvasProps {
  shapes: Shape[];
  setShapes: React.Dispatch<React.SetStateAction<Shape[]>>;
  selectedId: number | null;
  setSelectedId: (id: number | null) => void;
  vp: Viewport;
  setVp: React.Dispatch<React.SetStateAction<Viewport>>;
  tool: Tool;
  deviceW: number; deviceH: number;
  gridSize: number; showGrid: boolean; snapOn: boolean;
  polarity: Polarity;
  layers: Layer[];
  activeLayer: number;
  nextId: number;
  setNextId: React.Dispatch<React.SetStateAction<number>>;
  onShapeCreated: () => void;
  onShapeMoved: () => void;
  theme: string;
}

interface DrawingState {
  type: 'rect' | 'circle';
  startX: number; startY: number;
  x?: number; y?: number; w?: number; h?: number;
  cx?: number; cy?: number; r?: number;
}

function hexToRgba(hex: string, a: number): string {
  return `rgba(${parseInt(hex.slice(1,3),16)},${parseInt(hex.slice(3,5),16)},${parseInt(hex.slice(5,7),16)},${a})`;
}

function drawGridLines(
  ctx: CanvasRenderingContext2D, vp: Viewport, gridSize: number,
  W: number, H: number, minorColor: string, majorColor: string
) {
  const [wl, wt] = s2w(0, 0, vp, W, H);
  const [wr, wb] = s2w(W, H, vp, W, H);
  const startX = Math.floor(wl / gridSize) * gridSize;
  const startY = Math.floor(wt / gridSize) * gridSize;
  for (let x = startX; x <= wr; x += gridSize) {
    const [sx] = w2s(x, 0, vp, W, H);
    const isMajor = Math.abs(x % (gridSize * 5)) < 0.01;
    ctx.strokeStyle = isMajor ? majorColor : minorColor;
    ctx.lineWidth = isMajor ? 1 : 0.5;
    ctx.beginPath(); ctx.moveTo(sx, 0); ctx.lineTo(sx, H); ctx.stroke();
  }
  for (let y = startY; y <= wb; y += gridSize) {
    const [, sy] = w2s(0, y, vp, W, H);
    const isMajor = Math.abs(y % (gridSize * 5)) < 0.01;
    ctx.strokeStyle = isMajor ? majorColor : minorColor;
    ctx.lineWidth = isMajor ? 1 : 0.5;
    ctx.beginPath(); ctx.moveTo(0, sy); ctx.lineTo(W, sy); ctx.stroke();
  }
}

export default function Canvas({
  shapes, setShapes, selectedId, setSelectedId,
  vp, setVp, tool, deviceW, deviceH, gridSize,
  showGrid, snapOn, polarity, layers, activeLayer,
  nextId, setNextId, onShapeCreated, onShapeMoved, theme,
}: CanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [cSize, setCSize] = useState({ w: 800, h: 600 });
  const [drawing, setDrawing] = useState<DrawingState | null>(null);
  const [dragging, setDragging] = useState<any>(null);
  const [panning, setPanning] = useState<any>(null);
  const [mouseWorld, setMouseWorld] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const el = containerRef.current; if (!el) return;
    const obs = new ResizeObserver(e => { const { width, height } = e[0].contentRect; setCSize({ w: Math.floor(width), h: Math.floor(height) }); });
    obs.observe(el); return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (cSize.w > 100 && cSize.h > 100) {
      const m = 1.3;
      setVp({ x: deviceW / 2, y: deviceH / 2, z: Math.min(cSize.w / (deviceW * m), cSize.h / (deviceH * m)) });
    }
  }, []);

  // ─── Rendering (two-pass grid) ─────────────────
  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const W = cSize.w, H = cSize.h, dpr = window.devicePixelRatio || 1;
    canvas.width = W * dpr; canvas.height = H * dpr;
    canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const canvasBg = cssVar('--canvas');
    const themeBorder = cssVar('--border');
    const themeGridMinor = cssVar('--grid-minor');
    const themeGridMajor = cssVar('--grid-major');
    const accent = cssVar('--accent');
    const selStroke = cssVar('--shape-sel-stroke');
    const previewFill = cssVar('--preview-fill');

    const isDark = polarity === 'dark';
    const deviceBg = isDark ? '#000000' : '#FFFFFF';
    // Grid colors that contrast with the polarity background
    const polGridMinor = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.08)';
    const polGridMajor = isDark ? 'rgba(255,255,255,0.16)' : 'rgba(0,0,0,0.16)';

    // Device area screen coords
    const [dx0, dy0] = w2s(0, 0, vp, W, H);
    const [dx1, dy1] = w2s(deviceW, deviceH, vp, W, H);
    const dw = dx1 - dx0, dh = dy1 - dy0;

    // === PASS 1: Canvas background + theme grid (outside device area) ===
    ctx.fillStyle = canvasBg;
    ctx.fillRect(0, 0, W, H);

    if (showGrid && vp.z > 0.12 && gridSize * vp.z > 4) {
      drawGridLines(ctx, vp, gridSize, W, H, themeGridMinor, themeGridMajor);
    }

    // === PASS 2: Device area + polarity grid (inside device area) ===
    ctx.fillStyle = deviceBg;
    ctx.fillRect(dx0, dy0, dw, dh);

    if (showGrid && vp.z > 0.12 && gridSize * vp.z > 4) {
      ctx.save();
      ctx.beginPath(); ctx.rect(dx0, dy0, dw, dh); ctx.clip();
      drawGridLines(ctx, vp, gridSize, W, H, polGridMinor, polGridMajor);
      ctx.restore();
    }

    // Device border
    ctx.strokeStyle = themeBorder; ctx.lineWidth = 1;
    ctx.strokeRect(dx0, dy0, dw, dh);

    // Origin
    const [ox, oy] = w2s(0, 0, vp, W, H);
    ctx.strokeStyle = isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.2)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(ox - 12, oy); ctx.lineTo(ox + 12, oy); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(ox, oy - 12); ctx.lineTo(ox, oy + 12); ctx.stroke();

    // Shapes
    const layerMap = new Map(layers.filter(l => l.visible).map(l => [l.id, l]));
    shapes.forEach(s => {
      const layer = layerMap.get(s.layer); if (!layer) return;
      const isSel = s.id === selectedId;
      const a = layer.opacity / 100;
      ctx.fillStyle = isSel ? hexToRgba(layer.color, a * 0.5) : hexToRgba(layer.color, a * 0.7);
      ctx.strokeStyle = isSel ? selStroke : hexToRgba(layer.color, a);
      ctx.lineWidth = isSel ? 2.5 : 1;

      if (s.type === 'rect') {
        const [rx, ry] = w2s(s.x, s.y, vp, W, H);
        const rw = s.w * vp.z, rh = s.h * vp.z;
        ctx.fillRect(rx, ry, rw, rh); ctx.strokeRect(rx, ry, rw, rh);
        if (isSel && vp.z > 0.25) { ctx.fillStyle = accent; ctx.font = '11px "JetBrains Mono",monospace'; ctx.fillText(`${s.w.toFixed(1)}×${s.h.toFixed(1)} µm`, rx + 4, ry - 6); }
      } else if (s.type === 'circle') {
        const [cx, cy] = w2s(s.cx, s.cy, vp, W, H);
        const sr = s.r * vp.z;
        ctx.beginPath(); ctx.arc(cx, cy, sr, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        if (isSel && vp.z > 0.25) { ctx.fillStyle = accent; ctx.font = '11px "JetBrains Mono",monospace'; ctx.fillText(`r=${s.r.toFixed(1)} µm`, cx + sr + 6, cy); }
      }
    });

    // Drawing preview
    if (drawing) {
      ctx.fillStyle = previewFill; ctx.strokeStyle = accent; ctx.lineWidth = 1.5; ctx.setLineDash([6, 4]);
      if (drawing.type === 'rect' && drawing.w !== undefined) {
        const [rx, ry] = w2s(drawing.x!, drawing.y!, vp, W, H);
        ctx.fillRect(rx, ry, drawing.w! * vp.z, drawing.h! * vp.z);
        ctx.strokeRect(rx, ry, drawing.w! * vp.z, drawing.h! * vp.z);
      } else if (drawing.type === 'circle' && drawing.r !== undefined) {
        const [cx, cy] = w2s(drawing.cx!, drawing.cy!, vp, W, H);
        ctx.beginPath(); ctx.arc(cx, cy, drawing.r! * vp.z, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      }
      ctx.setLineDash([]);
    }

    // Device label
    ctx.fillStyle = isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.35)';
    ctx.font = '10px "JetBrains Mono",monospace';
    const ly = dy0 - 4 > 14 ? dy0 - 4 : dy0 + 14;
    ctx.fillText(`${deviceW}×${deviceH} µm · ${isDark ? 'campo escuro' : 'campo claro'}`, dx0 + 4, ly);

  }, [shapes, vp, cSize, showGrid, gridSize, selectedId, drawing, deviceW, deviceH, polarity, layers, theme]);

  // ─── Mouse ─────────────────────────────────────
  const getWorldPos = useCallback((e: React.MouseEvent) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const sx = e.clientX - rect.left, sy = e.clientY - rect.top;
    const [rawX, rawY] = s2w(sx, sy, vp, cSize.w, cSize.h);
    return { sx, sy, wx: snapVal(rawX, gridSize, snapOn), wy: snapVal(rawY, gridSize, snapOn), rawX, rawY };
  }, [vp, cSize, gridSize, snapOn]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const { wx, wy, rawX, rawY, sx, sy } = getWorldPos(e);
    if (e.button === 1 || (e.button === 0 && e.altKey)) { setPanning({ startSx: sx, startSy: sy, startVp: { ...vp } }); return; }
    if (e.button !== 0) return;
    if (tool === 'select') {
      const vis = new Set(layers.filter(l => l.visible).map(l => l.id));
      const hit = [...shapes].reverse().find(s => vis.has(s.layer) && hitTest(s, rawX, rawY));
      if (hit) { setSelectedId(hit.id); setDragging({ id: hit.id, startWx: rawX, startWy: rawY, orig: { ...hit } }); }
      else setSelectedId(null);
    } else if (tool === 'rect') setDrawing({ type: 'rect', startX: wx, startY: wy, x: wx, y: wy, w: 0, h: 0 });
    else if (tool === 'circle') setDrawing({ type: 'circle', startX: wx, startY: wy, cx: wx, cy: wy, r: 0 });
  }, [tool, shapes, vp, getWorldPos, layers]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const { wx, wy, rawX, rawY, sx, sy } = getWorldPos(e);
    setMouseWorld({ x: rawX, y: rawY });
    if (panning) { const dx = (sx - panning.startSx) / vp.z, dy = (sy - panning.startSy) / vp.z; setVp(p => ({ ...p, x: panning.startVp.x - dx, y: panning.startVp.y - dy })); return; }
    if (dragging) {
      const dx = snapVal(rawX - dragging.startWx, gridSize, snapOn), dy = snapVal(rawY - dragging.startWy, gridSize, snapOn);
      setShapes(p => p.map(s => { if (s.id !== dragging.id) return s; const o = dragging.orig; return s.type === 'rect' ? { ...s, x: o.x + dx, y: o.y + dy } : { ...s, cx: o.cx + dx, cy: o.cy + dy }; }));
      return;
    }
    if (drawing) {
      if (drawing.type === 'rect') setDrawing({ ...drawing, x: Math.min(drawing.startX, wx), y: Math.min(drawing.startY, wy), w: Math.abs(wx - drawing.startX), h: Math.abs(wy - drawing.startY) });
      else { const ddx = wx - drawing.startX, ddy = wy - drawing.startY; setDrawing({ ...drawing, r: Math.sqrt(ddx * ddx + ddy * ddy) }); }
    }
  }, [drawing, dragging, panning, vp, getWorldPos, gridSize, snapOn]);

  const handleMouseUp = useCallback(() => {
    if (panning) { setPanning(null); return; }
    if (dragging) { setDragging(null); onShapeMoved(); return; }
    if (drawing) {
      const minS = gridSize * 0.4 || 1; let ns: Shape | null = null;
      if (drawing.type === 'rect' && drawing.w! > minS && drawing.h! > minS)
        ns = { id: nextId, type: 'rect', x: drawing.x!, y: drawing.y!, w: drawing.w!, h: drawing.h!, layer: activeLayer };
      else if (drawing.type === 'circle' && drawing.r! > minS)
        ns = { id: nextId, type: 'circle', cx: drawing.cx!, cy: drawing.cy!, r: drawing.r!, layer: activeLayer };
      if (ns) { setShapes(p => [...p, ns!]); setNextId(p => p + 1); setSelectedId(ns.id); onShapeCreated(); }
      setDrawing(null);
    }
  }, [drawing, dragging, panning, nextId, activeLayer, gridSize, onShapeCreated, onShapeMoved]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const f = e.deltaY < 0 ? 1.15 : 1 / 1.15;
    const nz = Math.min(Math.max(vp.z * f, 0.02), 50);
    const rect = canvasRef.current!.getBoundingClientRect();
    const sx = e.clientX - rect.left, sy = e.clientY - rect.top;
    const [wx, wy] = s2w(sx, sy, vp, cSize.w, cSize.h);
    setVp({ x: wx - (sx - cSize.w / 2) / nz, y: wy - (sy - cSize.h / 2) / nz, z: nz });
  }, [vp, cSize]);

  const al = layers.find(l => l.id === activeLayer);

  return (
    <div ref={containerRef} style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
      <canvas ref={canvasRef}
        style={{ cursor: tool === 'select' ? (dragging || panning ? 'grabbing' : 'default') : 'crosshair', display: 'block' }}
        onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp}
        onWheel={handleWheel} onContextMenu={e => e.preventDefault()} />
      {al && (
        <div style={{ position: 'absolute', top: 8, left: 10, display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--text-dim)', background: 'var(--overlay-bg)', padding: '4px 10px', borderRadius: 'var(--radius)', backdropFilter: 'blur(8px)' }}>
          <div style={{ width: 8, height: 8, borderRadius: 2, background: al.color }} />
          <span>Desenhando em: <strong style={{ color: 'var(--text)' }}>{al.name}</strong></span>
        </div>
      )}
      <div style={{ position: 'absolute', bottom: 8, left: 10, display: 'flex', gap: 16, fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-dim)', background: 'var(--overlay-bg)', padding: '4px 12px', borderRadius: 'var(--radius)', backdropFilter: 'blur(8px)' }}>
        <span>X: {mouseWorld.x.toFixed(1)} µm</span>
        <span>Y: {mouseWorld.y.toFixed(1)} µm</span>
        <span>Zoom: {(vp.z * 100).toFixed(0)}%</span>
        <span>Formas: {shapes.length}</span>
      </div>
    </div>
  );
}
