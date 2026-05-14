import { useRef, useEffect, useState, useCallback } from 'react';
import { Shape, Layer, Viewport, Tool, Polarity, shapeBounds } from '../types';
import { w2s, s2w, snapVal, hitTest, cssVar } from '../utils';

interface CanvasProps {
  shapes: Shape[]; setShapes: React.Dispatch<React.SetStateAction<Shape[]>>;
  selectedIds: number[]; setSelectedIds: (ids: number[]) => void;
  vp: Viewport; setVp: React.Dispatch<React.SetStateAction<Viewport>>;
  tool: Tool; deviceW: number; deviceH: number;
  gridSize: number; showGrid: boolean; snapOn: boolean;
  polarity: Polarity; layers: Layer[];
  activeLayer: number; nextId: number; setNextId: React.Dispatch<React.SetStateAction<number>>;
  onShapeCreated: () => void; onShapeMoved: () => void; theme: string;
}

function hexToRgba(hex: string, a: number) { return `rgba(${parseInt(hex.slice(1,3),16)},${parseInt(hex.slice(3,5),16)},${parseInt(hex.slice(5,7),16)},${a})`; }

function drawGridLines(ctx: CanvasRenderingContext2D, vp: Viewport, gs: number, W: number, H: number, minor: string, major: string) {
  const [wl, wt] = s2w(0, 0, vp, W, H), [wr, wb] = s2w(W, H, vp, W, H);
  for (let x = Math.floor(wl / gs) * gs; x <= wr; x += gs) { const [px] = w2s(x, 0, vp, W, H); const m = Math.abs(x % (gs * 5)) < 0.01; ctx.strokeStyle = m ? major : minor; ctx.lineWidth = m ? 1 : 0.5; ctx.beginPath(); ctx.moveTo(px, 0); ctx.lineTo(px, H); ctx.stroke(); }
  for (let y = Math.floor(wt / gs) * gs; y <= wb; y += gs) { const [, py] = w2s(0, y, vp, W, H); const m = Math.abs(y % (gs * 5)) < 0.01; ctx.strokeStyle = m ? major : minor; ctx.lineWidth = m ? 1 : 0.5; ctx.beginPath(); ctx.moveTo(0, py); ctx.lineTo(W, py); ctx.stroke(); }
}

function drawShapeCanvas(ctx: CanvasRenderingContext2D, s: Shape, vp: Viewport, W: number, H: number) {
  if (s.type === 'rect') {
    const [rx, ry] = w2s(s.x, s.y, vp, W, H);
    ctx.fillRect(rx, ry, s.w * vp.z, s.h * vp.z); ctx.strokeRect(rx, ry, s.w * vp.z, s.h * vp.z);
  } else if (s.type === 'circle') {
    const [cx, cy] = w2s(s.cx, s.cy, vp, W, H);
    ctx.beginPath(); ctx.arc(cx, cy, s.r * vp.z, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  } else if (s.type === 'polygon') {
    if (s.points.length < 3) return;
    ctx.beginPath();
    const [fx, fy] = w2s(s.points[0].x, s.points[0].y, vp, W, H);
    ctx.moveTo(fx, fy);
    for (let i = 1; i < s.points.length; i++) { const [px, py] = w2s(s.points[i].x, s.points[i].y, vp, W, H); ctx.lineTo(px, py); }
    ctx.closePath(); ctx.fill(); ctx.stroke();
  } else if (s.type === 'arc') {
    const [ax, ay] = w2s(s.cx, s.cy, vp, W, H);
    const or = s.outerR * vp.z, ir = s.innerR * vp.z;
    ctx.beginPath();
    if (ir <= 0) { ctx.moveTo(ax, ay); ctx.arc(ax, ay, or, s.startAngle, s.endAngle); ctx.closePath(); }
    else { ctx.arc(ax, ay, or, s.startAngle, s.endAngle); ctx.arc(ax, ay, ir, s.endAngle, s.startAngle, true); ctx.closePath(); }
    ctx.fill(); ctx.stroke();
  }
}

export default function Canvas({
  shapes, setShapes, selectedIds, setSelectedIds,
  vp, setVp, tool, deviceW, deviceH, gridSize, showGrid, snapOn,
  polarity, layers, activeLayer, nextId, setNextId,
  onShapeCreated, onShapeMoved, theme,
}: CanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [cSize, setCSize] = useState({ w: 800, h: 600 });
  const [dragging, setDragging] = useState<any>(null);
  const [panning, setPanning] = useState<any>(null);
  const [mouseWorld, setMouseWorld] = useState({ x: 0, y: 0 });
  const [drawRect, setDrawRect] = useState<any>(null);
  const [drawCircle, setDrawCircle] = useState<any>(null);
  const [polyPoints, setPolyPoints] = useState<{ x: number; y: number }[]>([]);
  const [polyPreview, setPolyPreview] = useState<{ x: number; y: number } | null>(null);
  const [arcDraw, setArcDraw] = useState<any>(null);
  const selSet = new Set(selectedIds);

  useEffect(() => { const el = containerRef.current; if (!el) return; const obs = new ResizeObserver(e => { const { width, height } = e[0].contentRect; setCSize({ w: Math.floor(width), h: Math.floor(height) }); }); obs.observe(el); return () => obs.disconnect(); }, []);
  useEffect(() => { if (cSize.w > 100 && cSize.h > 100) { const m = 1.3; setVp({ x: deviceW / 2, y: deviceH / 2, z: Math.min(cSize.w / (deviceW * m), cSize.h / (deviceH * m)) }); } }, []);

  // ─── Rendering ─────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const W = cSize.w, H = cSize.h, dpr = window.devicePixelRatio || 1;
    canvas.width = W * dpr; canvas.height = H * dpr; canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const canvasBg = cssVar('--canvas'), themeBorder = cssVar('--border');
    const themeGm = cssVar('--grid-minor'), themeGj = cssVar('--grid-major');
    const accent = cssVar('--accent'), selStroke = cssVar('--shape-sel-stroke'), previewFill = cssVar('--preview-fill');
    const isDark = polarity === 'dark';
    const pGm = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.08)';
    const pGj = isDark ? 'rgba(255,255,255,0.16)' : 'rgba(0,0,0,0.16)';
    const [dx0, dy0] = w2s(0, 0, vp, W, H), [dx1, dy1] = w2s(deviceW, deviceH, vp, W, H);
    const dw = dx1 - dx0, dh = dy1 - dy0;

    ctx.fillStyle = canvasBg; ctx.fillRect(0, 0, W, H);
    if (showGrid && vp.z > 0.12 && gridSize * vp.z > 4) drawGridLines(ctx, vp, gridSize, W, H, themeGm, themeGj);
    ctx.fillStyle = isDark ? '#000' : '#fff'; ctx.fillRect(dx0, dy0, dw, dh);
    if (showGrid && vp.z > 0.12 && gridSize * vp.z > 4) { ctx.save(); ctx.beginPath(); ctx.rect(dx0, dy0, dw, dh); ctx.clip(); drawGridLines(ctx, vp, gridSize, W, H, pGm, pGj); ctx.restore(); }
    ctx.strokeStyle = themeBorder; ctx.lineWidth = 1; ctx.strokeRect(dx0, dy0, dw, dh);

    const [ox, oy] = w2s(0, 0, vp, W, H);
    ctx.strokeStyle = isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.2)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(ox - 12, oy); ctx.lineTo(ox + 12, oy); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(ox, oy - 12); ctx.lineTo(ox, oy + 12); ctx.stroke();

    const layerMap = new Map(layers.filter(l => l.visible).map(l => [l.id, l]));
    shapes.forEach(s => {
      const layer = layerMap.get(s.layer); if (!layer) return;
      const isSel = selSet.has(s.id), a = layer.opacity / 100;
      ctx.fillStyle = isSel ? hexToRgba(layer.color, a * 0.5) : hexToRgba(layer.color, a * 0.7);
      ctx.strokeStyle = isSel ? selStroke : hexToRgba(layer.color, a);
      ctx.lineWidth = isSel ? 2.5 : 1;
      if (s.groupId != null && !isSel) { ctx.setLineDash([4, 3]); ctx.lineWidth = 1.5; }
      drawShapeCanvas(ctx, s, vp, W, H);
      ctx.setLineDash([]);
      if (isSel && vp.z > 0.25) {
        ctx.fillStyle = accent; ctx.font = '11px "JetBrains Mono",monospace';
        const b = shapeBounds(s); const [lx, ly] = w2s(b.minX, b.minY, vp, W, H);
        ctx.fillText(`${(b.maxX - b.minX).toFixed(1)}×${(b.maxY - b.minY).toFixed(1)} µm`, lx + 4, ly - 6);
      }
    });

    if (selectedIds.length > 1) {
      let gx0 = Infinity, gy0 = Infinity, gx1 = -Infinity, gy1 = -Infinity;
      shapes.filter(s => selSet.has(s.id)).forEach(s => {
        const b = shapeBounds(s); const [a1, b1] = w2s(b.minX, b.minY, vp, W, H), [a2, b2] = w2s(b.maxX, b.maxY, vp, W, H);
        gx0 = Math.min(gx0, a1); gy0 = Math.min(gy0, b1); gx1 = Math.max(gx1, a2); gy1 = Math.max(gy1, b2);
      });
      ctx.strokeStyle = accent; ctx.lineWidth = 1; ctx.setLineDash([6, 4]);
      ctx.strokeRect(gx0 - 4, gy0 - 4, gx1 - gx0 + 8, gy1 - gy0 + 8); ctx.setLineDash([]);
      ctx.fillStyle = accent; ctx.font = '10px "JetBrains Mono",monospace'; ctx.fillText(`${selectedIds.length} formas`, gx0, gy0 - 8);
    }

    ctx.fillStyle = previewFill; ctx.strokeStyle = accent; ctx.lineWidth = 1.5; ctx.setLineDash([6, 4]);
    if (drawRect) { const [rx, ry] = w2s(drawRect.x, drawRect.y, vp, W, H); ctx.fillRect(rx, ry, drawRect.w * vp.z, drawRect.h * vp.z); ctx.strokeRect(rx, ry, drawRect.w * vp.z, drawRect.h * vp.z); }
    if (drawCircle) { const [cx, cy] = w2s(drawCircle.sx, drawCircle.sy, vp, W, H); ctx.beginPath(); ctx.arc(cx, cy, drawCircle.r * vp.z, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); }
    if (arcDraw) { const [cx, cy] = w2s(arcDraw.cx, arcDraw.cy, vp, W, H); ctx.beginPath(); ctx.arc(cx, cy, arcDraw.r * vp.z, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); }

    if (polyPoints.length > 0) {
      ctx.beginPath(); const [fx, fy] = w2s(polyPoints[0].x, polyPoints[0].y, vp, W, H); ctx.moveTo(fx, fy);
      for (let i = 1; i < polyPoints.length; i++) { const [px, py] = w2s(polyPoints[i].x, polyPoints[i].y, vp, W, H); ctx.lineTo(px, py); }
      if (polyPreview) { const [mx, my] = w2s(polyPreview.x, polyPreview.y, vp, W, H); ctx.lineTo(mx, my); }
      if (polyPoints.length >= 3) { ctx.closePath(); ctx.fill(); }
      ctx.stroke(); ctx.setLineDash([]);
      polyPoints.forEach((p, i) => { const [px, py] = w2s(p.x, p.y, vp, W, H); ctx.fillStyle = i === 0 ? accent : 'rgba(255,255,255,0.9)'; ctx.beginPath(); ctx.arc(px, py, i === 0 ? 5 : 3, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = accent; ctx.lineWidth = 1; ctx.stroke(); });
    }
    ctx.setLineDash([]);

    ctx.fillStyle = isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.35)'; ctx.font = '10px "JetBrains Mono",monospace';
    const ly = dy0 - 4 > 14 ? dy0 - 4 : dy0 + 14;
    ctx.fillText(`${deviceW}×${deviceH} µm · ${isDark ? 'campo escuro' : 'campo claro'}`, dx0 + 4, ly);
  }, [shapes, vp, cSize, showGrid, gridSize, selectedIds, drawRect, drawCircle, polyPoints, polyPreview, arcDraw, deviceW, deviceH, polarity, layers, theme]);

  const getWP = useCallback((e: React.MouseEvent) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const sx = e.clientX - rect.left, sy = e.clientY - rect.top;
    const [rX, rY] = s2w(sx, sy, vp, cSize.w, cSize.h);
    return { sx, sy, wx: snapVal(rX, gridSize, snapOn), wy: snapVal(rY, gridSize, snapOn), rawX: rX, rawY: rY };
  }, [vp, cSize, gridSize, snapOn]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault(); const { wx, wy, rawX, rawY, sx, sy } = getWP(e);
    if (e.button === 1 || (e.button === 0 && e.altKey)) { setPanning({ startSx: sx, startSy: sy, startVp: { ...vp } }); return; }
    if (e.button !== 0) return;
    if (tool === 'select') {
      const vis = new Set(layers.filter(l => l.visible).map(l => l.id));
      const hit = [...shapes].reverse().find(s => vis.has(s.layer) && hitTest(s, rawX, rawY));
      if (hit) {
        let newIds: number[];
        const groupIds = hit.groupId != null ? shapes.filter(s => s.groupId === hit.groupId).map(s => s.id) : [hit.id];
        if (e.shiftKey) { const cur = new Set(selectedIds); const allIn = groupIds.every(id => cur.has(id)); if (allIn) groupIds.forEach(id => cur.delete(id)); else groupIds.forEach(id => cur.add(id)); newIds = Array.from(cur); }
        else newIds = groupIds;
        setSelectedIds(newIds);
        setDragging({ ids: newIds, startWx: rawX, startWy: rawY, origShapes: shapes.filter(s => newIds.includes(s.id)).map(s => ({ ...s })) });
      } else setSelectedIds([]);
    } else if (tool === 'rect') setDrawRect({ sx: wx, sy: wy, x: wx, y: wy, w: 0, h: 0 });
    else if (tool === 'circle') setDrawCircle({ sx: wx, sy: wy, r: 0 });
    else if (tool === 'arc') setArcDraw({ cx: wx, cy: wy, r: 0 });
  }, [tool, shapes, vp, getWP, layers, selectedIds]);

  const handleClick = useCallback((e: React.MouseEvent) => {
    if (tool !== 'polygon' || e.button !== 0 || e.altKey) return;
    const { wx, wy } = getWP(e);
    if (polyPoints.length >= 3) {
      const d = Math.sqrt((wx - polyPoints[0].x) ** 2 + (wy - polyPoints[0].y) ** 2);
      if (d < gridSize * 1.5) {
        const ns: Shape = { id: nextId, type: 'polygon', points: [...polyPoints], layer: activeLayer };
        setShapes(p => [...p, ns]); setNextId(p => p + 1); setSelectedIds([ns.id]);
        setPolyPoints([]); setPolyPreview(null); onShapeCreated(); return;
      }
    }
    setPolyPoints(p => [...p, { x: wx, y: wy }]);
  }, [tool, polyPoints, getWP, gridSize, nextId, activeLayer, onShapeCreated]);

  const handleDblClick = useCallback((e: React.MouseEvent) => {
    if (tool !== 'polygon' || polyPoints.length < 3) return;
    const ns: Shape = { id: nextId, type: 'polygon', points: [...polyPoints], layer: activeLayer };
    setShapes(p => [...p, ns]); setNextId(p => p + 1); setSelectedIds([ns.id]);
    setPolyPoints([]); setPolyPreview(null); onShapeCreated();
  }, [tool, polyPoints, nextId, activeLayer, onShapeCreated]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const { wx, wy, rawX, rawY, sx, sy } = getWP(e); setMouseWorld({ x: rawX, y: rawY });
    if (panning) { const dx = (sx - panning.startSx) / vp.z, dy = (sy - panning.startSy) / vp.z; setVp(p => ({ ...p, x: panning.startVp.x - dx, y: panning.startVp.y - dy })); return; }
    if (dragging) {
      const dx = snapVal(rawX - dragging.startWx, gridSize, snapOn), dy = snapVal(rawY - dragging.startWy, gridSize, snapOn);
      setShapes(prev => prev.map(s => {
        const orig = dragging.origShapes.find((o: Shape) => o.id === s.id); if (!orig) return s;
        if (s.type === 'rect') return { ...s, x: orig.x + dx, y: orig.y + dy };
        if (s.type === 'circle') return { ...s, cx: orig.cx + dx, cy: orig.cy + dy };
        if (s.type === 'polygon') return { ...s, points: (orig as any).points.map((p: any) => ({ x: p.x + dx, y: p.y + dy })) };
        if (s.type === 'arc') return { ...s, cx: orig.cx + dx, cy: orig.cy + dy };
        return s;
      })); return;
    }
    if (drawRect) setDrawRect({ ...drawRect, x: Math.min(drawRect.sx, wx), y: Math.min(drawRect.sy, wy), w: Math.abs(wx - drawRect.sx), h: Math.abs(wy - drawRect.sy) });
    else if (drawCircle) { const dx = wx - drawCircle.sx, dy = wy - drawCircle.sy; setDrawCircle({ ...drawCircle, r: Math.sqrt(dx * dx + dy * dy) }); }
    else if (arcDraw) { const dx = wx - arcDraw.cx, dy = wy - arcDraw.cy; setArcDraw({ ...arcDraw, r: Math.sqrt(dx * dx + dy * dy) }); }
    else if (tool === 'polygon' && polyPoints.length > 0) setPolyPreview({ x: wx, y: wy });
  }, [drawRect, drawCircle, arcDraw, dragging, panning, vp, getWP, gridSize, snapOn, tool, polyPoints]);

  const handleMouseUp = useCallback(() => {
    if (panning) { setPanning(null); return; }
    if (dragging) { setDragging(null); onShapeMoved(); return; }
    const minS = gridSize * 0.4 || 1;
    if (drawRect && drawRect.w > minS && drawRect.h > minS) {
      const ns: Shape = { id: nextId, type: 'rect', x: drawRect.x, y: drawRect.y, w: drawRect.w, h: drawRect.h, layer: activeLayer };
      setShapes(p => [...p, ns]); setNextId(p => p + 1); setSelectedIds([ns.id]); onShapeCreated();
    }
    if (drawCircle && drawCircle.r > minS) {
      const ns: Shape = { id: nextId, type: 'circle', cx: drawCircle.sx, cy: drawCircle.sy, r: drawCircle.r, layer: activeLayer };
      setShapes(p => [...p, ns]); setNextId(p => p + 1); setSelectedIds([ns.id]); onShapeCreated();
    }
    if (arcDraw && arcDraw.r > minS) {
      const ns: Shape = { id: nextId, type: 'arc', cx: arcDraw.cx, cy: arcDraw.cy, innerR: arcDraw.r * 0.5, outerR: arcDraw.r, startAngle: 0, endAngle: Math.PI * 2, layer: activeLayer };
      setShapes(p => [...p, ns]); setNextId(p => p + 1); setSelectedIds([ns.id]); onShapeCreated();
    }
    setDrawRect(null); setDrawCircle(null); setArcDraw(null);
  }, [drawRect, drawCircle, arcDraw, dragging, panning, nextId, activeLayer, gridSize, onShapeCreated, onShapeMoved]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault(); const f = e.deltaY < 0 ? 1.15 : 1 / 1.15; const nz = Math.min(Math.max(vp.z * f, 0.02), 50);
    const rect = canvasRef.current!.getBoundingClientRect(); const sx = e.clientX - rect.left, sy = e.clientY - rect.top;
    const [wx, wy] = s2w(sx, sy, vp, cSize.w, cSize.h);
    setVp({ x: wx - (sx - cSize.w / 2) / nz, y: wy - (sy - cSize.h / 2) / nz, z: nz });
  }, [vp, cSize]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape' && polyPoints.length > 0) { setPolyPoints([]); setPolyPreview(null); } };
    window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h);
  }, [polyPoints]);

  const al = layers.find(l => l.id === activeLayer);
  const toolHint = tool === 'polygon' ? (polyPoints.length === 0 ? 'Clique para iniciar' : polyPoints.length < 3 ? `${polyPoints.length} pts — continue` : `${polyPoints.length} pts — dbl-clique ou clique no 1°`) : '';

  return <div ref={containerRef} style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
    <canvas ref={canvasRef}
      style={{ cursor: tool === 'select' ? (dragging || panning ? 'grabbing' : 'default') : 'crosshair', display: 'block' }}
      onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp}
      onClick={handleClick} onDoubleClick={handleDblClick}
      onWheel={handleWheel} onContextMenu={e => e.preventDefault()} />
    {al && <div style={{ position: 'absolute', top: 8, left: 10, display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--text-dim)', background: 'var(--overlay-bg)', padding: '4px 10px', borderRadius: 'var(--radius)', backdropFilter: 'blur(8px)' }}>
      <div style={{ width: 8, height: 8, borderRadius: 2, background: al.color }} />
      <span><strong style={{ color: 'var(--text)' }}>{al.name}</strong></span>
      {toolHint && <span style={{ color: 'var(--accent)' }}>· {toolHint}</span>}
    </div>}
    <div style={{ position: 'absolute', bottom: 8, left: 10, display: 'flex', gap: 16, fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-dim)', background: 'var(--overlay-bg)', padding: '4px 12px', borderRadius: 'var(--radius)', backdropFilter: 'blur(8px)' }}>
      <span>X: {mouseWorld.x.toFixed(1)}</span><span>Y: {mouseWorld.y.toFixed(1)}</span>
      <span>{(vp.z * 100).toFixed(0)}%</span><span>{shapes.length} formas</span>
    </div>
  </div>;
}
