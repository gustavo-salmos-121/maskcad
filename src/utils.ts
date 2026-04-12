import {
  Shape, Layer, DiePosition, AlignMarkStyle, Polarity, Viewport,
  ProjectData, MarksConfig, LAYER_PURPOSE_LABELS, calcDiePadding
} from './types';

export function cssVar(n: string): string { return getComputedStyle(document.documentElement).getPropertyValue(n).trim(); }
export function w2s(wx: number, wy: number, vp: Viewport, cw: number, ch: number): [number, number] {
  return [(wx - vp.x) * vp.z + cw / 2, (wy - vp.y) * vp.z + ch / 2];
}
export function s2w(sx: number, sy: number, vp: Viewport, cw: number, ch: number): [number, number] {
  return [(sx - cw / 2) / vp.z + vp.x, (sy - ch / 2) / vp.z + vp.y];
}
export function snapVal(v: number, g: number, on: boolean): number { return on ? Math.round(v / g) * g : v; }
export function hitTest(s: Shape, wx: number, wy: number): boolean {
  if (s.type === 'rect') return wx >= s.x && wx <= s.x + s.w && wy >= s.y && wy <= s.y + s.h;
  if (s.type === 'circle') { const dx = wx - s.cx, dy = wy - s.cy; return dx * dx + dy * dy <= s.r * s.r; }
  return false;
}

/** Filter shapes to only those on visible layers */
export function visibleShapes(shapes: Shape[], layers: Layer[]): Shape[] {
  const visIds = new Set(layers.filter(l => l.visible).map(l => l.id));
  return shapes.filter(s => visIds.has(s.layer));
}

/* ─── Die positions ──────────────────────────────── */
export function calcDiePositions(D: number, deviceW: number, deviceH: number, street: number, marks: MarksConfig): DiePosition[] {
  const pad = calcDiePadding(marks);
  const totalW = deviceW + 2*pad, totalH = deviceH + 2*pad;
  const stepX = totalW + street, stepY = totalH + street;
  const R = D / 2, maxN = Math.ceil(D / Math.min(stepX, stepY));
  const pos: DiePosition[] = [];
  for (let r = -maxN; r <= maxN; r++) for (let c = -maxN; c <= maxN; c++) {
    const cx = c*stepX, cy = r*stepY, hw = totalW/2, hh = totalH/2;
    if ([[cx-hw,cy-hh],[cx+hw,cy-hh],[cx-hw,cy+hh],[cx+hw,cy+hh]].every(([x,y]) => x*x+y*y <= R*R))
      pos.push({ x: cx, y: cy });
  }
  return pos;
}

/* ─── Alignment marks ────────────────────────────── */
export function drawAlignMark(ctx: CanvasRenderingContext2D, style: AlignMarkStyle, x: number, y: number, size: number, lw: number) {
  ctx.save(); ctx.translate(x, y);
  if (style === 'cross') { ctx.fillRect(-size/2,-lw/2,size,lw); ctx.fillRect(-lw/2,-size/2,lw,size); }
  else if (style === 'crosshair') { ctx.fillRect(-size/2,-lw/2,size,lw); ctx.fillRect(-lw/2,-size/2,lw,size); ctx.beginPath(); ctx.arc(0,0,size*0.3,0,Math.PI*2); ctx.lineWidth=lw; ctx.strokeStyle=ctx.fillStyle as string; ctx.stroke(); }
  else if (style === 'lshape') { ([[1,1],[-1,1],[1,-1],[-1,-1]] as [number,number][]).forEach(([dx,dy])=>{ctx.fillRect(dx>0?0:-size/2,dy>0?0:-lw/2,size/2,lw);ctx.fillRect(dx>0?0:-lw/2,dy>0?0:-size/2,lw,size/2);}); }
  else if (style === 'vernier') { ctx.fillRect(-size/2,-lw/2,size,lw); ctx.fillRect(-lw/2,-size/2,lw,size); for(let i=1;i<=4;i++){const g=(size/10)*i,tl=size*(0.15-i*0.02);ctx.fillRect(g-lw/4,-tl,lw/2,tl*2);ctx.fillRect(-g-lw/4,-tl,lw/2,tl*2);ctx.fillRect(-tl,g-lw/4,tl*2,lw/2);ctx.fillRect(-tl,-g-lw/4,tl*2,lw/2);} }
  ctx.restore();
}

function renderOneDie(ctx: CanvasRenderingContext2D, shapes: Shape[], dx: number, dy: number, dw: number, dh: number, marks: MarksConfig, scale: number, fgColor: string, footprintW: number, footprintH: number) {
  const pad = calcDiePadding(marks)*scale;
  ctx.save(); ctx.beginPath(); ctx.rect(dx-pad, dy-pad, footprintW, footprintH); ctx.clip();
  ctx.fillStyle = fgColor;
  shapes.forEach(s => {
    if (s.type==='rect') {
      const px=Math.round(dx+s.x*scale), py=Math.round(dy+s.y*scale);
      const pw=Math.max(1,Math.round(s.w*scale)), ph=Math.max(1,Math.round(s.h*scale));
      ctx.fillRect(px, py, pw, ph);
    } else {
      ctx.beginPath(); ctx.arc(Math.round(dx+s.cx*scale), Math.round(dy+s.cy*scale), Math.max(1,Math.round(s.r*scale)), 0, Math.PI*2); ctx.fill();
    }
  });
  if (marks.outline.enabled) { const m=marks.outline.margin*scale, lw=marks.outline.width*scale; ctx.strokeStyle=fgColor; ctx.lineWidth=lw; ctx.strokeRect(dx-m-lw/2,dy-m-lw/2,dw+2*(m+lw/2),dh+2*(m+lw/2)); }
  if (marks.die.enabled) {
    const oo=marks.outline.enabled?(marks.outline.margin+marks.outline.width)*scale:0;
    const md=oo+marks.die.offset*scale, sz=marks.die.size*scale, lw2=Math.max(0.5,marks.die.size*0.08*scale);
    ctx.fillStyle=fgColor; const cx2=dx+dw/2, cy2=dy+dh/2; const pts:[number,number][]=[];
    if(marks.die.positions==='corners'||marks.die.positions==='corners+edges') pts.push([dx-md,dy-md],[dx+dw+md,dy-md],[dx-md,dy+dh+md],[dx+dw+md,dy+dh+md]);
    if(marks.die.positions==='edges'||marks.die.positions==='corners+edges') pts.push([cx2,dy-md],[cx2,dy+dh+md],[dx-md,cy2],[dx+dw+md,cy2]);
    pts.forEach(([mx,my])=>drawAlignMark(ctx,marks.die.style,mx,my,sz,lw2));
  }
  ctx.restore();
}

function drawWaferMarks(ctx: CanvasRenderingContext2D, center: number, waferDiam: number, marks: MarksConfig, scale: number) {
  const cfg=marks.wafer; if(!cfg.enabled) return;
  const sz=cfg.size*scale, lw=Math.max(1,cfg.size*0.08*scale), R=(waferDiam/2)*cfg.radiusFraction*scale;
  const pts:[number,number][]=[];
  if(cfg.placement==='auto4') pts.push([center,center-R],[center,center+R],[center-R,center],[center+R,center]);
  else if(cfg.placement==='auto8') { pts.push([center,center-R],[center,center+R],[center-R,center],[center+R,center]); const d=R*Math.SQRT1_2; pts.push([center-d,center-d],[center+d,center-d],[center-d,center+d],[center+d,center+d]); }
  pts.forEach(([mx,my])=>drawAlignMark(ctx,cfg.style,mx,my,sz,lw));
}

/* ─── simMEMS (respects layer visibility) ────────── */
function renderForSim(ctx: CanvasRenderingContext2D, shapes: Shape[], dW: number, dH: number, cW: number, cH: number, pol: Polarity) {
  const bg=pol==='dark'?'#000':'#fff', fg=pol==='dark'?'#fff':'#000';
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle=bg; ctx.fillRect(0,0,cW,cH); ctx.fillStyle=fg;

  const sx = cW / dW, sy = cH / dH;

  shapes.forEach(s => {
    if (s.type === 'rect') {
      const px = Math.round(s.x * sx);
      const py = Math.round(s.y * sy);
      const pw = Math.max(1, Math.round(s.w * sx));
      const ph = Math.max(1, Math.round(s.h * sy));
      ctx.fillRect(px, py, pw, ph);
    } else {
      const cx = Math.round(s.cx * sx);
      const cy = Math.round(s.cy * sy);
      const r = Math.max(1, Math.round(s.r * sx));
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
    }
  });
}
function binarize(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const img=ctx.getImageData(0,0,w,h); const d=img.data;
  for(let i=0;i<d.length;i+=4){const v=d[i]>128?255:0;d[i]=d[i+1]=d[i+2]=v;d[i+3]=255;}
  ctx.putImageData(img,0,0);
}

export function exportSimMEMS(shapes: Shape[], layers: Layer[], dW: number, dH: number, pW: number, pH: number, pol: Polarity) {
  const vis = visibleShapes(shapes, layers);
  const c=document.createElement('canvas'); c.width=pW; c.height=pH;
  renderForSim(c.getContext('2d')!, vis, dW, dH, pW, pH, pol);
  binarize(c.getContext('2d')!, pW, pH); dl(c, `mask_simMEMS_${pW}x${pH}.png`);
}

export function exportSimMEMSPerLayer(shapes: Shape[], layers: Layer[], dW: number, dH: number, pW: number, pH: number, pol: Polarity) {
  layers.filter(l => l.visible).forEach(l => {
    const ls=shapes.filter(s=>s.layer===l.id); if(!ls.length) return;
    const c=document.createElement('canvas'); c.width=pW; c.height=pH;
    renderForSim(c.getContext('2d')!, ls, dW, dH, pW, pH, pol);
    binarize(c.getContext('2d')!, pW, pH);
    dl(c, `mask_${safe(l.name)}_${LAYER_PURPOSE_LABELS[l.purpose]}_${pW}x${pH}.png`);
  });
}

export function exportWafer(shapes: Shape[], layers: Layer[], deviceW: number, deviceH: number,
  waferDiam: number, streetW: number, polarity: Polarity, marks: MarksConfig, dpi: number, waferLabel: string) {
  const vis = visibleShapes(shapes, layers);
  const dies=calcDiePositions(waferDiam,deviceW,deviceH,streetW,marks);
  const pad=calcDiePadding(marks), totalW=deviceW+2*pad, totalH=deviceH+2*pad;
  const pxIdeal=Math.round((waferDiam/1000/25.4)*dpi), cappedPx=Math.min(pxIdeal,8000);
  const scale=cappedPx/waferDiam, center=cappedPx/2;
  const bg=polarity==='dark'?'#000':'#fff', fg=polarity==='dark'?'#fff':'#000';
  const c=document.createElement('canvas'); c.width=cappedPx; c.height=cappedPx;
  const ctx=c.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle=bg; ctx.fillRect(0,0,cappedPx,cappedPx);
  ctx.save(); ctx.beginPath(); ctx.arc(center,center,(waferDiam/2)*scale,0,Math.PI*2); ctx.clip();
  dies.forEach(die => {
    const dx=center+(die.x-deviceW/2)*scale, dy=center+(die.y-deviceH/2)*scale;
    renderOneDie(ctx, vis, dx, dy, deviceW*scale, deviceH*scale, marks, scale, fg, totalW*scale, totalH*scale);
  });
  ctx.fillStyle=fg; drawWaferMarks(ctx,center,waferDiam,marks,scale);
  ctx.restore(); binarize(ctx,cappedPx,cappedPx); dl(c, `mask_wafer_${waferLabel}.png`);
}

export function exportWaferPerLayer(shapes: Shape[], layers: Layer[], dW: number, dH: number,
  waferDiam: number, streetW: number, pol: Polarity, marks: MarksConfig, dpi: number) {
  layers.filter(l => l.visible).forEach(l => {
    const ls=shapes.filter(s=>s.layer===l.id); if(!ls.length) return;
    exportWafer(ls, [l], dW, dH, waferDiam, streetW, pol, marks, dpi, `${safe(l.name)}_${LAYER_PURPOSE_LABELS[l.purpose]}`);
  });
}

/* ─── Preview ────────────────────────────────────── */
export function renderWaferPreview(ctx: CanvasRenderingContext2D, size: number, shapes: Shape[], deviceW: number, deviceH: number, waferDiam: number, streetW: number, marks: MarksConfig,
  colors: {bg:string;fill:string;stroke:string;dieFill:string;dieStroke:string;dieShape:string;accent:string;textDim:string}) {
  const dies=calcDiePositions(waferDiam,deviceW,deviceH,streetW,marks);
  const pad=calcDiePadding(marks), totalW=deviceW+2*pad, totalH=deviceH+2*pad;
  const scale=(size*0.88)/waferDiam, center=size/2;
  const dw=deviceW*scale, dh=deviceH*scale, fpW=totalW*scale, fpH=totalH*scale, sd=dw>6&&dh>6;
  ctx.fillStyle=colors.bg; ctx.fillRect(0,0,size,size);
  ctx.fillStyle=colors.fill; ctx.beginPath(); ctx.arc(center,center,(waferDiam/2)*scale,0,Math.PI*2); ctx.fill();
  ctx.strokeStyle=colors.stroke; ctx.lineWidth=1.5; ctx.stroke();
  const flatY=center+(waferDiam/2)*scale*0.97; ctx.strokeStyle=colors.stroke; ctx.lineWidth=2;
  ctx.beginPath(); ctx.moveTo(center-(waferDiam/4)*scale,flatY); ctx.lineTo(center+(waferDiam/4)*scale,flatY); ctx.stroke();
  ctx.save(); ctx.beginPath(); ctx.arc(center,center,(waferDiam/2)*scale-1,0,Math.PI*2); ctx.clip();
  dies.forEach(die => {
    const dx=center+(die.x-deviceW/2)*scale, dy=center+(die.y-deviceH/2)*scale, pp=pad*scale;
    ctx.save(); ctx.beginPath(); ctx.rect(dx-pp,dy-pp,fpW,fpH); ctx.clip();
    if(sd){ctx.fillStyle=colors.dieFill; ctx.fillRect(dx,dy,dw,dh);}
    ctx.fillStyle=colors.dieShape;
    shapes.forEach(s=>{if(s.type==='rect')ctx.fillRect(dx+s.x*scale,dy+s.y*scale,s.w*scale,s.h*scale);else{ctx.beginPath();ctx.arc(dx+s.cx*scale,dy+s.cy*scale,s.r*scale,0,Math.PI*2);ctx.fill();}});
    if(sd){
      if(marks.outline.enabled){const m=marks.outline.margin*scale,lw=Math.max(0.5,marks.outline.width*scale);ctx.strokeStyle=colors.accent;ctx.lineWidth=lw;ctx.strokeRect(dx-m-lw/2,dy-m-lw/2,dw+2*(m+lw/2),dh+2*(m+lw/2));}
      if(marks.die.enabled){const oo=marks.outline.enabled?(marks.outline.margin+marks.outline.width)*scale:0,md=oo+marks.die.offset*scale,sz=marks.die.size*scale,lw=Math.max(0.5,marks.die.size*0.08*scale);ctx.fillStyle=colors.accent;const cx2=dx+dw/2,cy2=dy+dh/2;const pts:[number,number][]=[];if(marks.die.positions==='corners'||marks.die.positions==='corners+edges')pts.push([dx-md,dy-md],[dx+dw+md,dy-md],[dx-md,dy+dh+md],[dx+dw+md,dy+dh+md]);if(marks.die.positions==='edges'||marks.die.positions==='corners+edges')pts.push([cx2,dy-md],[cx2,dy+dh+md],[dx-md,cy2],[dx+dw+md,cy2]);pts.forEach(([mx,my])=>drawAlignMark(ctx,marks.die.style,mx,my,sz,lw));}
      ctx.strokeStyle=colors.dieStroke;ctx.lineWidth=0.5;ctx.strokeRect(dx,dy,dw,dh);
    }
    ctx.restore();
  });
  ctx.restore();
  ctx.fillStyle=colors.accent; drawWaferMarks(ctx,center,waferDiam,marks,scale);
  ctx.fillStyle=colors.textDim;ctx.font='11px "JetBrains Mono",monospace';
  ctx.fillText(`${dies.length} dies · ${deviceW}×${deviceH} µm · footprint ${totalW.toFixed(0)}×${totalH.toFixed(0)} µm · rua ${streetW} µm`,10,size-10);
}

function safe(s:string){return s.replace(/[^a-zA-Z0-9_-]/g,'_');}
function dl(c:HTMLCanvasElement,f:string){const a=document.createElement('a');a.download=f;a.href=c.toDataURL('image/png');a.click();}

export function saveProject(data: ProjectData) {
  const b=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
  const u=URL.createObjectURL(b);const a=document.createElement('a');a.download=`${data.name||'maskcad'}.mcad.json`;a.href=u;a.click();URL.revokeObjectURL(u);
}
export function loadProject(file: File): Promise<ProjectData> {
  return new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>{try{res(JSON.parse(r.result as string));}catch{rej(new Error('Arquivo inválido'));}};r.onerror=()=>rej(new Error('Erro'));r.readAsText(file);});
}
