import { useState, useRef } from 'react';
import { Eye, EyeOff, Download, ChevronDown, ChevronRight, Trash2, Edit3, Layers, Package, Target, Crosshair as XI, Box, Maximize2 } from 'lucide-react';
import { Shape, Layer, Polarity, AlignMarkStyle, LayerPurpose, MarksConfig, WAFER_SIZES, LAYER_PURPOSE_LABELS, LAYER_PALETTE, calcDiePadding, getGroupBounds } from '../types';
import { calcDiePositions } from '../utils';
import NumInput from './NumInput';

const sel: React.CSSProperties={flex:1,background:'var(--input-bg)',border:'1px solid var(--border)',borderRadius:'var(--radius)',color:'var(--text)',padding:'5px 8px',fontSize:11,outline:'none',fontFamily:'var(--font-body)'};
const sec: React.CSSProperties={fontSize:10,fontWeight:700,color:'var(--text-faint)',textTransform:'uppercase',letterSpacing:'1.2px',marginBottom:6,marginTop:14,display:'flex',alignItems:'center',gap:6};
function Badge({children}:{children:React.ReactNode}){return<span style={{fontSize:9,padding:'1px 6px',borderRadius:10,background:'var(--badge-bg)',color:'var(--text-dim)',fontWeight:600}}>{children}</span>;}
function Toggle({value,onChange,label}:{value:boolean;onChange:(v:boolean)=>void;label:string}){
  return<label style={{display:'flex',alignItems:'center',gap:8,fontSize:11,color:'var(--text)',cursor:'pointer'}}><div onClick={()=>onChange(!value)} style={{width:32,height:18,borderRadius:9,cursor:'pointer',background:value?'var(--accent)':'var(--border)',position:'relative',transition:'background 0.15s'}}><div style={{width:14,height:14,borderRadius:7,background:'#fff',position:'absolute',top:2,left:value?16:2,transition:'left 0.15s'}}/></div><span style={{color:value?'var(--text)':'var(--text-dim)'}}>{label}</span></label>;
}
function Sub({title,icon,children,open:d=true}:{title:string;icon:React.ReactNode;children:React.ReactNode;open?:boolean}){
  const[o,setO]=useState(d);
  return<div style={{marginTop:8,borderRadius:'var(--radius)',border:'1px solid var(--border)',overflow:'hidden'}}><div onClick={()=>setO(!o)} style={{display:'flex',alignItems:'center',gap:6,padding:'6px 8px',background:'var(--panel-light)',cursor:'pointer',fontSize:11,fontWeight:600,color:'var(--text-dim)'}}>{o?<ChevronDown size={11}/>:<ChevronRight size={11}/>}{icon}<span>{title}</span></div>{o&&<div style={{padding:'8px 10px',display:'flex',flexDirection:'column',gap:6}}>{children}</div>}</div>;
}
function ColorPicker({color,onChange,onClose}:{color:string;onChange:(c:string)=>void;onClose:()=>void}){
  return<div className="fade-in" style={{position:'absolute',top:'100%',left:0,zIndex:50,background:'var(--panel)',border:'1px solid var(--border)',borderRadius:8,padding:10,boxShadow:'0 8px 24px rgba(0,0,0,0.3)',marginTop:4}} onClick={e=>e.stopPropagation()}><div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:4,marginBottom:8}}>{LAYER_PALETTE.map(c=><button key={c} onClick={()=>{onChange(c);onClose();}} style={{width:26,height:26,borderRadius:4,border:c===color?'2px solid var(--text)':'2px solid transparent',background:c,cursor:'pointer'}}/>)}</div><label style={{display:'flex',alignItems:'center',gap:6,fontSize:11,color:'var(--text-dim)'}}><input type="color" value={color} onChange={e=>onChange(e.target.value)} style={{width:28,height:22,border:'none',cursor:'pointer',background:'transparent'}}/><input type="text" value={color} onChange={e=>{if(/^#[0-9a-fA-F]{6}$/.test(e.target.value))onChange(e.target.value);}} style={{flex:1,background:'var(--input-bg)',border:'1px solid var(--border)',borderRadius:4,color:'var(--text)',padding:'3px 6px',fontSize:11,fontFamily:'var(--font-mono)',outline:'none'}}/></label></div>;
}
function LayerRow({layer,isActive,onActivate,onUpdate,onDelete,shapeCount,canDelete}:{layer:Layer;isActive:boolean;onActivate:()=>void;onUpdate:(p:Partial<Layer>)=>void;onDelete:()=>void;shapeCount:number;canDelete:boolean}){
  const[exp,setExp]=useState(false);const[ed,setEd]=useState(false);const[nv,setNv]=useState(layer.name);const[cp,setCp]=useState(false);const nr=useRef<HTMLInputElement>(null);
  const startEd=(e:React.MouseEvent)=>{e.stopPropagation();setEd(true);setNv(layer.name);setTimeout(()=>nr.current?.focus(),50);};
  const commit=()=>{if(nv.trim())onUpdate({name:nv.trim()});setEd(false);};
  return<div style={{marginBottom:3,borderRadius:'var(--radius)',border:isActive?'1px solid var(--border-light)':'1px solid transparent',background:isActive?'var(--panel-light)':'transparent'}}>
    <div style={{display:'flex',alignItems:'center',gap:6,padding:'6px 8px',cursor:'pointer'}} onClick={onActivate}>
      <button onClick={e=>{e.stopPropagation();setExp(!exp);}} style={{background:'none',border:'none',cursor:'pointer',color:'var(--text-dim)',padding:0,display:'flex'}}>{exp?<ChevronDown size={12}/>:<ChevronRight size={12}/>}</button>
      <div style={{position:'relative'}}><button onClick={e=>{e.stopPropagation();setCp(!cp);}} style={{width:14,height:14,borderRadius:3,background:layer.color,border:'1px solid var(--border)',cursor:'pointer'}}/>{cp&&<ColorPicker color={layer.color} onChange={c=>onUpdate({color:c})} onClose={()=>setCp(false)}/>}</div>
      {ed?<input ref={nr} value={nv} onChange={e=>setNv(e.target.value)} onBlur={commit} onKeyDown={e=>{if(e.key==='Enter')commit();if(e.key==='Escape')setEd(false);}} onClick={e=>e.stopPropagation()} style={{flex:1,background:'var(--input-bg)',border:'1px solid var(--accent)',borderRadius:3,color:'var(--text)',padding:'2px 5px',fontSize:12,outline:'none'}}/>
      :<span onDoubleClick={startEd} style={{flex:1,fontSize:12,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{layer.name}</span>}
      <Badge>{shapeCount}</Badge>
      {!ed&&<button onClick={startEd} style={{background:'none',border:'none',cursor:'pointer',color:'var(--text-faint)',padding:1,display:'flex'}}><Edit3 size={11}/></button>}
      <button onClick={e=>{e.stopPropagation();onUpdate({visible:!layer.visible});}} style={{background:'none',border:'none',cursor:'pointer',color:layer.visible?'var(--text-dim)':'var(--border)',padding:2}}>{layer.visible?<Eye size={13}/>:<EyeOff size={13}/>}</button>
    </div>
    {exp&&<div className="fade-in" style={{padding:'4px 8px 8px 28px',display:'flex',flexDirection:'column',gap:6}}>
      <label style={{display:'flex',alignItems:'center',gap:6,fontSize:11}}><span style={{minWidth:58,color:'var(--text-dim)'}}>Finalidade</span><select value={layer.purpose} onChange={e=>onUpdate({purpose:e.target.value as LayerPurpose})} onClick={e=>e.stopPropagation()} style={sel}>{Object.entries(LAYER_PURPOSE_LABELS).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></label>
      <label style={{display:'flex',alignItems:'center',gap:6,fontSize:11}}><span style={{minWidth:58,color:'var(--text-dim)'}}>Opacidade</span><input type="range" min={10} max={100} value={layer.opacity} onChange={e=>onUpdate({opacity:Number(e.target.value)})} style={{flex:1,accentColor:layer.color,height:3,cursor:'pointer'}}/><span style={{fontSize:10,fontFamily:'var(--font-mono)',color:'var(--text-faint)',minWidth:28,textAlign:'right'}}>{layer.opacity}%</span></label>
      {canDelete&&<button onClick={e=>{e.stopPropagation();onDelete();}} style={{display:'flex',alignItems:'center',gap:4,fontSize:10,color:'var(--danger)',background:'var(--danger-soft)',border:'none',borderRadius:4,padding:'3px 8px',cursor:'pointer',alignSelf:'flex-start',marginTop:2}}><Trash2 size={10}/> Excluir</button>}
    </div>}
  </div>;
}
function MSel({value,onChange}:{value:AlignMarkStyle;onChange:(v:AlignMarkStyle)=>void}){
  return<select value={value} onChange={e=>onChange(e.target.value as AlignMarkStyle)} style={sel}><option value="cross">Cruz simples</option><option value="crosshair">Cruz + anel</option><option value="lshape">L nos cantos</option><option value="vernier">Vernier</option></select>;
}

interface Props {
  deviceW:number;setDeviceW:(v:number)=>void;deviceH:number;setDeviceH:(v:number)=>void;
  gridSize:number;setGridSize:(v:number)=>void;
  selectedIds:number[];shapes:Shape[];setShapes:React.Dispatch<React.SetStateAction<Shape[]>>;
  layers:Layer[];setLayers:React.Dispatch<React.SetStateAction<Layer[]>>;activeLayer:number;setActiveLayer:(id:number)=>void;
  simPxW:number;setSimPxW:(v:number)=>void;simPxH:number;setSimPxH:(v:number)=>void;polarity:Polarity;
  waferDiam:number;setWaferDiam:(v:number)=>void;streetW:number;setStreetW:(v:number)=>void;
  marks:MarksConfig;setMarks:React.Dispatch<React.SetStateAction<MarksConfig>>;waferDPI:number;setWaferDPI:(v:number)=>void;
  onExportSimMEMS:()=>void;onExportSimMEMSPerLayer:()=>void;onOpenWaferModal:()=>void;
  onScale:(factor:number)=>void;pushHistory:(label:string)=>void;
}

export default function RightPanel(p:Props){
  const{deviceW,setDeviceW,deviceH,setDeviceH,gridSize,setGridSize,selectedIds,shapes,setShapes,
    layers,setLayers,activeLayer,setActiveLayer,simPxW,setSimPxW,simPxH,setSimPxH,polarity,
    waferDiam,setWaferDiam,streetW,setStreetW,marks,setMarks,waferDPI,setWaferDPI,
    onExportSimMEMS,onExportSimMEMSPerLayer,onOpenWaferModal,onScale,pushHistory}=p;
  const[tab,setTab]=useState<'design'|'layers'|'export'>('design');
  const[scaleFactor,setScaleFactor]=useState(1.0);
  const uW=(x:Partial<typeof marks.wafer>)=>setMarks(m=>({...m,wafer:{...m.wafer,...x}}));
  const uD=(x:Partial<typeof marks.die>)=>setMarks(m=>({...m,die:{...m.die,...x}}));
  const uO=(x:Partial<typeof marks.outline>)=>setMarks(m=>({...m,outline:{...m.outline,...x}}));
  const sc=new Map<number,number>();shapes.forEach(s=>sc.set(s.layer,(sc.get(s.layer)||0)+1));
  const pad=calcDiePadding(marks);const totalW=deviceW+2*pad,totalH=deviceH+2*pad;

  const selectedShapes=shapes.filter(s=>selectedIds.includes(s.id));
  const singleSel=selectedShapes.length===1?selectedShapes[0]:null;
  const singleLayer=singleSel?layers.find(l=>l.id===singleSel.layer):null;

  // Group info
  const hasGroup=selectedShapes.length>0&&selectedShapes.some(s=>s.groupId!=null);
  const bounds=selectedShapes.length>0?getGroupBounds(shapes,selectedIds):null;

  const tBtn=(k:string,l:string,ic:React.ReactNode)=>{const a=tab===k;return<button key={k} onClick={()=>setTab(k as any)} style={{flex:1,padding:'7px 0',fontSize:10,fontWeight:600,cursor:'pointer',background:a?'var(--panel-light)':'transparent',color:a?'var(--accent)':'var(--text-dim)',borderBottom:a?'2px solid var(--accent)':'2px solid transparent',textTransform:'uppercase',letterSpacing:'0.5px',border:'none',borderTop:'none',borderLeft:'none',borderRight:'none',display:'flex',alignItems:'center',justifyContent:'center',gap:4,transition:'all var(--transition)'}}>{ic} {l}</button>;};

  const applyScale=()=>{
    if(scaleFactor!==1&&selectedIds.length>0){
      onScale(scaleFactor);
      setScaleFactor(1.0);
    }
  };

  return<div style={{width:275,display:'flex',flexDirection:'column',background:'var(--panel)',borderLeft:'1px solid var(--border)',flexShrink:0,overflow:'hidden'}}>
    <div style={{display:'flex',borderBottom:'1px solid var(--border)'}}>{tBtn('design','Design',<Edit3 size={12}/>)}{tBtn('layers','Camadas',<Layers size={12}/>)}{tBtn('export','Exportar',<Package size={12}/>)}</div>
    <div style={{flex:1,overflow:'auto',padding:'4px 12px 16px'}}>

    {tab==='design'&&<>
      <div style={sec}>Área do Dispositivo</div>
      <div style={{display:'flex',flexDirection:'column',gap:6}}>
        <NumInput label="Largura" value={deviceW} onChange={setDeviceW}/>
        <NumInput label="Altura" value={deviceH} onChange={setDeviceH}/>
        <NumInput label="Grade" value={gridSize} onChange={v=>setGridSize(Math.max(1,v))}/>
      </div>

      {/* Single shape edit */}
      {singleSel&&<>
        <div style={sec}>Forma Selecionada{singleLayer&&<span style={{fontSize:9,padding:'1px 6px',borderRadius:10,background:singleLayer.color+'30',color:singleLayer.color,fontWeight:600}}>{singleLayer.name}</span>}</div>
        <div style={{display:'flex',flexDirection:'column',gap:6}}>
          {singleSel.type==='rect'&&<><NumInput label="X" value={singleSel.x} onChange={v=>setShapes(q=>q.map(s=>s.id===singleSel.id?{...s,x:v}:s))}/><NumInput label="Y" value={singleSel.y} onChange={v=>setShapes(q=>q.map(s=>s.id===singleSel.id?{...s,y:v}:s))}/><NumInput label="Largura" value={singleSel.w} onChange={v=>setShapes(q=>q.map(s=>s.id===singleSel.id?{...s,w:Math.max(1,v)}:s))}/><NumInput label="Altura" value={singleSel.h} onChange={v=>setShapes(q=>q.map(s=>s.id===singleSel.id?{...s,h:Math.max(1,v)}:s))}/></>}
          {singleSel.type==='circle'&&<><NumInput label="Centro X" value={singleSel.cx} onChange={v=>setShapes(q=>q.map(s=>s.id===singleSel.id?{...s,cx:v}:s))}/><NumInput label="Centro Y" value={singleSel.cy} onChange={v=>setShapes(q=>q.map(s=>s.id===singleSel.id?{...s,cy:v}:s))}/><NumInput label="Raio" value={singleSel.r} onChange={v=>setShapes(q=>q.map(s=>s.id===singleSel.id?{...s,r:Math.max(1,v)}:s))}/></>}
          <label style={{display:'flex',alignItems:'center',gap:6,fontSize:11,marginTop:4}}><span style={{minWidth:64,color:'var(--text-dim)'}}>Camada</span><select value={singleSel.layer} onChange={e=>{const nl=Number(e.target.value);setShapes(q=>q.map(s=>s.id===singleSel.id?{...s,layer:nl}:s));}} style={sel}>{layers.map(l=><option key={l.id} value={l.id}>{l.name}</option>)}</select></label>
        </div>
      </>}

      {/* Multi-select / Group scale controls */}
      {selectedIds.length>0&&<>
        <div style={sec}><Maximize2 size={11}/> Escalonar{selectedIds.length>1&&<Badge>{selectedIds.length}</Badge>}</div>
        {bounds&&<div style={{fontSize:10,color:'var(--text-faint)',fontFamily:'var(--font-mono)',marginBottom:6}}>
          Bbox: {(bounds.maxX-bounds.minX).toFixed(1)} × {(bounds.maxY-bounds.minY).toFixed(1)} µm
          {hasGroup&&<span style={{color:'var(--accent)',marginLeft:6}}>· Grupo</span>}
        </div>}
        <div style={{display:'flex',gap:6,alignItems:'center'}}>
          <NumInput label="Fator" value={scaleFactor} onChange={v=>setScaleFactor(Math.max(0.01,v))} unit="×" step={0.1} min={0.01}/>
        </div>
        <div style={{display:'flex',gap:4,marginTop:6}}>
          {[0.5,0.75,1.5,2].map(f=>(
            <button key={f} onClick={()=>{onScale(f);}} style={{flex:1,padding:'4px',fontSize:10,fontFamily:'var(--font-mono)',background:'var(--panel-light)',border:'1px solid var(--border)',borderRadius:'var(--radius)',color:'var(--text-dim)',cursor:'pointer'}}>{f}×</button>
          ))}
        </div>
        <button onClick={applyScale} disabled={scaleFactor===1} style={{
          width:'100%',padding:'6px',fontSize:11,fontWeight:600,marginTop:6,
          background:scaleFactor!==1?'var(--accent)':'var(--panel-light)',
          color:scaleFactor!==1?'#fff':'var(--text-faint)',
          border:'none',borderRadius:'var(--radius)',cursor:scaleFactor!==1?'pointer':'default',
        }}>Aplicar escala {scaleFactor}×</button>
      </>}

      <div style={sec}>Atalhos</div>
      <div style={{fontSize:11,color:'var(--text-dim)',lineHeight:2}}>
        {[['R','Retângulo'],['C','Círculo'],['V','Selecionar'],['G','Grade'],['Del','Excluir'],['Shift+Click','Multi-seleção'],['Ctrl+G','Agrupar'],['Ctrl+⇧+G','Desagrupar'],['Ctrl+Z','Desfazer'],['Alt+Drag','Pan'],['Scroll','Zoom']].map(([k,l])=><div key={k} style={{display:'flex',gap:8,alignItems:'center'}}><kbd style={{background:'var(--kbd-bg)',padding:'1px 6px',borderRadius:3,fontSize:9,fontFamily:'var(--font-mono)',border:'1px solid var(--border)',minWidth:32,textAlign:'center'}}>{k}</kbd><span>{l}</span></div>)}
      </div>
    </>}

    {tab==='layers'&&<>
      <div style={{...sec,marginTop:10}}>Camadas <Badge>{layers.length}</Badge></div>
      <div style={{fontSize:10,color:'var(--text-faint)',marginBottom:8}}>Clique para ativar · Duplo-clique para renomear</div>
      {layers.map(l=><LayerRow key={l.id} layer={l} isActive={activeLayer===l.id} onActivate={()=>setActiveLayer(l.id)}
        onUpdate={x=>setLayers(q=>q.map(ll=>ll.id===l.id?{...ll,...x}:ll))}
        onDelete={()=>{setShapes(q=>q.filter(s=>s.layer!==l.id));setLayers(q=>q.filter(ll=>ll.id!==l.id));if(activeLayer===l.id){const r=layers.filter(ll=>ll.id!==l.id);if(r.length)setActiveLayer(r[0].id);}}}
        shapeCount={sc.get(l.id)||0} canDelete={layers.length>1}/>)}
      <button onClick={()=>{const id=Math.max(...layers.map(l=>l.id),-1)+1;setLayers(q=>[...q,{id,name:`Camada ${id+1}`,visible:true,color:LAYER_PALETTE[id%LAYER_PALETTE.length],purpose:'generic',opacity:80}]);}}
        style={{width:'100%',padding:'6px 8px',fontSize:11,color:'var(--accent)',background:'transparent',border:'1px dashed var(--border)',borderRadius:'var(--radius)',cursor:'pointer',marginTop:6}}>+ Nova Camada</button>
      <div style={{fontSize:10,color:'var(--text-faint)',marginTop:12,padding:'6px 8px',background:'var(--panel-light)',borderRadius:'var(--radius)'}}>
        Camadas ocultas não são exportadas.
      </div>
    </>}

    {tab==='export'&&<>
      <div style={sec}>simMEMS</div>
      <div style={{display:'flex',flexDirection:'column',gap:6}}>
        <NumInput label="Pixels X" value={simPxW} onChange={v=>setSimPxW(Math.max(1,v))} unit="px"/>
        <NumInput label="Pixels Y" value={simPxH} onChange={v=>setSimPxH(Math.max(1,v))} unit="px"/>
        <div style={{fontSize:10,color:'var(--text-faint)',fontFamily:'var(--font-mono)'}}>{(deviceW/simPxW).toFixed(2)} × {(deviceH/simPxH).toFixed(2)} µm/px</div>
        <div style={{fontSize:10,color:'var(--text-faint)'}}>Camadas ocultas não serão exportadas.</div>
        <div style={{display:'flex',gap:6}}>
          <button onClick={onExportSimMEMS} style={eb('var(--accent)')}><Download size={12}/> Todas</button>
          <button onClick={onExportSimMEMSPerLayer} style={eb('var(--accent-dim)')}><Layers size={12}/> Por camada</button>
        </div>
      </div>
      <div style={sec}>Fotolito — Wafer</div>
      <div style={{display:'flex',flexDirection:'column',gap:6}}>
        <label style={{display:'flex',alignItems:'center',gap:6,fontSize:12}}><span style={{minWidth:64,color:'var(--text-dim)',fontSize:11}}>Lâmina</span><select value={waferDiam} onChange={e=>setWaferDiam(Number(e.target.value))} style={sel}>{WAFER_SIZES.map(w=><option key={w.d} value={w.d}>{w.label}</option>)}</select></label>
        <NumInput label="Ruas" value={streetW} onChange={setStreetW}/>
        <NumInput label="DPI" value={waferDPI} onChange={v=>setWaferDPI(Math.max(72,v))} unit="dpi"/>
        <div style={{fontSize:10,color:'var(--text-faint)',fontFamily:'var(--font-mono)',padding:'5px 8px',background:'var(--panel-light)',borderRadius:'var(--radius)',lineHeight:1.8}}>
          {calcDiePositions(waferDiam,deviceW,deviceH,streetW,marks).length} dies · footprint {totalW.toFixed(0)}×{totalH.toFixed(0)} µm
        </div>
      </div>
      <div style={sec}><Target size={11}/> Marcas de Alinhamento</div>
      <Sub title="Contorno do Die" icon={<Box size={11}/>}>
        <Toggle value={marks.outline.enabled} onChange={v=>uO({enabled:v})} label="Ativar contorno"/>
        {marks.outline.enabled&&<><NumInput label="Espessura" value={marks.outline.width} onChange={v=>uO({width:v})}/><NumInput label="Distância" value={marks.outline.margin} onChange={v=>uO({margin:v})}/></>}
      </Sub>
      <Sub title="Marcas do Die" icon={<Target size={11}/>}>
        <Toggle value={marks.die.enabled} onChange={v=>uD({enabled:v})} label="Ativar marcas"/>
        {marks.die.enabled&&<><label style={{display:'flex',alignItems:'center',gap:6,fontSize:11}}><span style={{minWidth:64,color:'var(--text-dim)'}}>Estilo</span><MSel value={marks.die.style} onChange={v=>uD({style:v})}/></label><NumInput label="Tamanho" value={marks.die.size} onChange={v=>uD({size:v})}/><NumInput label="Offset" value={marks.die.offset} onChange={v=>uD({offset:v})}/><label style={{display:'flex',alignItems:'center',gap:6,fontSize:11}}><span style={{minWidth:64,color:'var(--text-dim)'}}>Posições</span><select value={marks.die.positions} onChange={e=>uD({positions:e.target.value as any})} style={sel}><option value="corners">Cantos (4)</option><option value="edges">Arestas (4)</option><option value="corners+edges">Todos (8)</option></select></label></>}
      </Sub>
      <Sub title="Marcas do Wafer" icon={<XI size={11}/>}>
        <Toggle value={marks.wafer.enabled} onChange={v=>uW({enabled:v})} label="Ativar marcas"/>
        {marks.wafer.enabled&&<><label style={{display:'flex',alignItems:'center',gap:6,fontSize:11}}><span style={{minWidth:64,color:'var(--text-dim)'}}>Estilo</span><MSel value={marks.wafer.style} onChange={v=>uW({style:v})}/></label><NumInput label="Tamanho" value={marks.wafer.size} onChange={v=>uW({size:v})}/><label style={{display:'flex',alignItems:'center',gap:6,fontSize:11}}><span style={{minWidth:64,color:'var(--text-dim)'}}>Disposição</span><select value={marks.wafer.placement} onChange={e=>uW({placement:e.target.value as any})} style={sel}><option value="auto4">4 cardeais</option><option value="auto8">8 pontos</option><option value="manual">Manual</option></select></label><label style={{display:'flex',alignItems:'center',gap:6,fontSize:11}}><span style={{minWidth:64,color:'var(--text-dim)'}}>Posição</span><input type="range" min={50} max={98} value={marks.wafer.radiusFraction*100} onChange={e=>uW({radiusFraction:Number(e.target.value)/100})} style={{flex:1,accentColor:'var(--accent)',height:3,cursor:'pointer'}}/><span style={{fontSize:10,fontFamily:'var(--font-mono)',color:'var(--text-faint)',minWidth:28,textAlign:'right'}}>{(marks.wafer.radiusFraction*100).toFixed(0)}%</span></label></>}
      </Sub>
      <button onClick={onOpenWaferModal} style={{...eb('var(--success)'),width:'100%',marginTop:10}}><Eye size={13}/> Pré-visualizar & Exportar</button>
    </>}
    </div>
  </div>;
}
function eb(bg:string):React.CSSProperties{return{flex:1,padding:'7px 10px',fontSize:11,fontWeight:600,background:bg,color:'#fff',border:'none',borderRadius:'var(--radius)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:5,transition:'all var(--transition)'};}
