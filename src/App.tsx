import { useState, useEffect, useCallback, useRef } from 'react';
import { Hexagon, Grid3X3, Crosshair, Moon, Sun, RotateCcw, Save, FolderOpen, Info, X } from 'lucide-react';
import { ThemeProvider, useTheme } from './theme';
import { Shape, Layer, Viewport, Tool, Polarity, MarksConfig, HistoryEntry, ProjectData, WAFER_SIZES, LAYER_PALETTE, DEFAULT_MARKS, scaleShapes } from './types';
import { exportSimMEMS, exportSimMEMSPerLayer, exportWafer, saveProject, loadProject } from './utils';
import Toolbar from './components/Toolbar';
import Canvas from './components/Canvas';
import RightPanel from './components/RightPanel';
import WaferModal from './components/WaferModal';

const CY='2025',CH='SyncField Corporation',AV='1.0.0';
const DL:Layer[]=[{id:0,name:'Camada 1',visible:true,color:'#8B1A1A',purpose:'generic',opacity:80}];
const MH=60;

function MaskCADApp(){
  const{theme,toggle:tt}=useTheme();
  const[shapes,setShapes]=useState<Shape[]>([]);const[nextId,setNextId]=useState(1);
  const[selectedIds,setSelectedIds]=useState<number[]>([]);
  const[vp,setVp]=useState<Viewport>({x:250,y:250,z:1});const[tool,setTool]=useState<Tool>('select');
  const[projectName,setProjectName]=useState('Sem título');
  const[deviceW,setDeviceW]=useState(500);const[deviceH,setDeviceH]=useState(500);
  const[gridSize,setGridSize]=useState(25);const[showGrid,setShowGrid]=useState(true);
  const[snapOn,setSnapOn]=useState(true);const[polarity,setPolarity]=useState<Polarity>('dark');
  const[layers,setLayers]=useState<Layer[]>(DL);const[activeLayer,setActiveLayer]=useState(0);
  const[simPxW,setSimPxW]=useState(256);const[simPxH,setSimPxH]=useState(256);
  const[waferModal,setWaferModal]=useState(false);
  const[waferDiam,setWaferDiam]=useState(100000);const[streetW,setStreetW]=useState(200);
  const[marks,setMarks]=useState<MarksConfig>(DEFAULT_MARKS);const[waferDPI,setWaferDPI]=useState(2540);
  const[nextGroupId,setNextGroupId]=useState(1);

  // Undo/Redo
  const[history,setHistory]=useState<HistoryEntry[]>([]);const[hi,setHi]=useState(-1);
  const push=useCallback((l:string)=>{
    setHistory(p=>{const t=[...p.slice(0,hi+1),{shapes:JSON.parse(JSON.stringify(shapes)),label:l}];if(t.length>MH)t.shift();return t;});
    setHi(p=>Math.min(p+1,MH-1));
  },[shapes,hi]);
  useEffect(()=>{if(!history.length){setHistory([{shapes:[],label:'Início'}]);setHi(0);}},[]);
  const undo=useCallback(()=>{if(hi<=0)return;setShapes(JSON.parse(JSON.stringify(history[hi-1].shapes)));setHi(hi-1);setSelectedIds([]);},[history,hi]);
  const redo=useCallback(()=>{if(hi>=history.length-1)return;setShapes(JSON.parse(JSON.stringify(history[hi+1].shapes)));setHi(hi+1);setSelectedIds([]);},[history,hi]);

  // Group / Ungroup
  const canGroup=selectedIds.length>=2;
  const selShapes=shapes.filter(s=>selectedIds.includes(s.id));
  const canUngroup=selShapes.some(s=>s.groupId!=null);

  const doGroup=useCallback(()=>{
    if(selectedIds.length<2)return;
    const gid=nextGroupId;
    setShapes(p=>p.map(s=>selectedIds.includes(s.id)?{...s,groupId:gid}:s));
    setNextGroupId(p=>p+1);
    push('Agrupar');
  },[selectedIds,nextGroupId,push]);

  const doUngroup=useCallback(()=>{
    const gids=new Set(selShapes.filter(s=>s.groupId!=null).map(s=>s.groupId!));
    if(!gids.size)return;
    setShapes(p=>p.map(s=>gids.has(s.groupId!)?{...s,groupId:undefined}:s));
    push('Desagrupar');
  },[selShapes,push]);

  const doScale=useCallback((factor:number)=>{
    if(!selectedIds.length||factor===1)return;
    setShapes(p=>scaleShapes(p,selectedIds,factor));
    push(`Escalar ×${factor}`);
  },[selectedIds,push]);

  // Keyboard
  useEffect(()=>{
    const h=(e:KeyboardEvent)=>{
      const t=e.target as HTMLElement;if(t.tagName==='INPUT'||t.tagName==='SELECT'||t.tagName==='TEXTAREA')return;
      if((e.ctrlKey||e.metaKey)&&e.key==='z'&&!e.shiftKey){e.preventDefault();undo();return;}
      if((e.ctrlKey||e.metaKey)&&(e.key==='Z'||(e.key==='z'&&e.shiftKey))){e.preventDefault();redo();return;}
      if((e.ctrlKey||e.metaKey)&&e.key==='s'){e.preventDefault();doSave();return;}
      if((e.ctrlKey||e.metaKey)&&e.key==='d'){e.preventDefault();dup();return;}
      if((e.ctrlKey||e.metaKey)&&e.key==='g'&&!e.shiftKey){e.preventDefault();doGroup();return;}
      if((e.ctrlKey||e.metaKey)&&e.key==='g'&&e.shiftKey){e.preventDefault();doUngroup();return;}
      if((e.ctrlKey||e.metaKey)&&e.key==='G'){e.preventDefault();doUngroup();return;}
      if(e.key==='Delete'||e.key==='Backspace'){if(selectedIds.length){setShapes(p=>p.filter(s=>!selectedIds.includes(s.id)));setSelectedIds([]);push('Excluir');}}
      if(e.key==='Escape')setTool('select');if(e.key==='r')setTool('rect');if(e.key==='c')setTool('circle');if(e.key==='v')setTool('select');if(e.key==='g'&&!e.ctrlKey&&!e.metaKey)setShowGrid(p=>!p);
    };window.addEventListener('keydown',h);return()=>window.removeEventListener('keydown',h);
  },[selectedIds,undo,redo,push,doGroup,doUngroup]);

  const dup=useCallback(()=>{
    if(!selectedIds.length)return;
    const newShapes:Shape[]=[];let nid=nextId;
    selectedIds.forEach(sid=>{
      const s=shapes.find(sh=>sh.id===sid);if(!s)return;
      const ns={...s,id:nid,groupId:undefined} as Shape;
      if(ns.type==='rect'){ns.x+=gridSize;ns.y+=gridSize;}
      if(ns.type==='circle'){ns.cx+=gridSize;ns.cy+=gridSize;}
      newShapes.push(ns);nid++;
    });
    setShapes(p=>[...p,...newShapes]);
    setSelectedIds(newShapes.map(s=>s.id));
    setNextId(nid);push('Duplicar');
  },[shapes,selectedIds,nextId,gridSize,push]);

  const del=useCallback(()=>{if(selectedIds.length){setShapes(p=>p.filter(s=>!selectedIds.includes(s.id)));setSelectedIds([]);push('Excluir');}},[selectedIds,push]);

  // Exports — now pass layers so hidden layers are excluded
  const exSim=useCallback(()=>exportSimMEMS(shapes,layers,deviceW,deviceH,simPxW,simPxH,polarity),[shapes,layers,deviceW,deviceH,simPxW,simPxH,polarity]);
  const exSimL=useCallback(()=>exportSimMEMSPerLayer(shapes,layers,deviceW,deviceH,simPxW,simPxH,polarity),[shapes,layers,deviceW,deviceH,simPxW,simPxH,polarity]);
  const exW=useCallback(()=>{const l=WAFER_SIZES.find(w=>w.d===waferDiam)?.label||'';exportWafer(shapes,layers,deviceW,deviceH,waferDiam,streetW,polarity,marks,waferDPI,l);},[shapes,layers,deviceW,deviceH,waferDiam,streetW,polarity,marks,waferDPI]);
  const fitV=useCallback(()=>{const m=1.3;setVp({x:deviceW/2,y:deviceH/2,z:Math.min(800/(deviceW*m),600/(deviceH*m))});},[deviceW,deviceH]);

  const fRef=useRef<HTMLInputElement>(null);
  const doSave=useCallback(()=>saveProject({version:4,name:projectName,shapes,layers,deviceW,deviceH,gridSize,polarity,simPxW,simPxH,waferDiam,streetW,marks,waferDPI}),[projectName,shapes,layers,deviceW,deviceH,gridSize,polarity,simPxW,simPxH,waferDiam,streetW,marks,waferDPI]);
  const doLoad=useCallback(async(f:File)=>{try{const d=await loadProject(f);setShapes(d.shapes||[]);setLayers(d.layers||DL);setDeviceW(d.deviceW||500);setDeviceH(d.deviceH||500);setGridSize(d.gridSize||25);setPolarity(d.polarity||'dark');setSimPxW(d.simPxW||256);setSimPxH(d.simPxH||256);setWaferDiam(d.waferDiam||100000);setStreetW(d.streetW||200);setMarks(d.marks||DEFAULT_MARKS);setWaferDPI(d.waferDPI||2540);setProjectName(d.name||'Carregado');setSelectedIds([]);setNextId(Math.max(...(d.shapes||[]).map(s=>s.id),0)+1);const maxG=Math.max(...(d.shapes||[]).map(s=>s.groupId||0),0);setNextGroupId(maxG+1);setHistory([{shapes:JSON.parse(JSON.stringify(d.shapes||[])),label:'Carregar'}]);setHi(0);}catch(e){alert('Erro: '+(e as Error).message);}},[]);

  const[en,setEn]=useState(false);const[aboutOpen,setAboutOpen]=useState(false);
  const hb=(a=false):React.CSSProperties=>({display:'flex',alignItems:'center',justifyContent:'center',width:34,height:34,borderRadius:'var(--radius)',background:a?'var(--accent-soft)':'transparent',border:a?'1px solid var(--accent)':'1px solid transparent',color:a?'var(--accent)':'var(--text-dim)',cursor:'pointer',transition:'all var(--transition)'});

  return<div style={{width:'100%',height:'100vh',display:'flex',flexDirection:'column',background:'var(--bg)',overflow:'hidden',userSelect:'none'}}>
    <input ref={fRef} type="file" accept=".json,.mcad.json" style={{display:'none'}} onChange={e=>{if(e.target.files?.[0])doLoad(e.target.files[0]);e.target.value='';}}/>
    <div style={{display:'flex',alignItems:'center',height:46,padding:'0 14px',background:'var(--panel)',borderBottom:'1px solid var(--border)',gap:8,flexShrink:0}}>
      <div style={{display:'flex',alignItems:'center',gap:7,marginRight:6}}><Hexagon size={19} color="var(--accent)" strokeWidth={2.5}/><span style={{fontSize:14,fontWeight:700,letterSpacing:'1.5px',color:'var(--text)'}}>MASK<span style={{color:'var(--accent)'}}>CAD</span></span></div>
      <div style={{width:1,height:24,background:'var(--border)'}}/>
      {en?<input value={projectName} onChange={e=>setProjectName(e.target.value)} onBlur={()=>setEn(false)} onKeyDown={e=>{if(e.key==='Enter')setEn(false);}} autoFocus style={{background:'var(--input-bg)',border:'1px solid var(--accent)',borderRadius:'var(--radius)',color:'var(--text)',padding:'3px 8px',fontSize:12,outline:'none',width:150}}/>
      :<span onClick={()=>setEn(true)} style={{fontSize:12,color:'var(--text-dim)',cursor:'pointer',padding:'3px 6px',maxWidth:160,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}} title="Renomear">{projectName}</span>}
      <div style={{width:1,height:24,background:'var(--border)'}}/>
      <button onClick={doSave} style={hb()} title="Salvar (Ctrl+S)"><Save size={14}/></button>
      <button onClick={()=>fRef.current?.click()} style={hb()} title="Abrir"><FolderOpen size={14}/></button>
      <div style={{width:1,height:24,background:'var(--border)'}}/>
      <button onClick={()=>setShowGrid(p=>!p)} style={hb(showGrid)} title="Grade (G)"><Grid3X3 size={15}/></button>
      <button onClick={()=>setSnapOn(p=>!p)} style={hb(snapOn)} title="Snap"><Crosshair size={15}/></button>
      <button onClick={()=>setPolarity(p=>p==='dark'?'clear':'dark')} style={hb()} title="Polaridade">{polarity==='dark'?<Moon size={15}/>:<Sun size={15}/>}</button>
      <span style={{fontSize:10,color:'var(--text-dim)'}}>{polarity==='dark'?'Escuro':'Claro'}</span>
      <div style={{flex:1}}/>
      <span style={{fontSize:9,color:'var(--text-faint)',letterSpacing:'0.3px'}}>© {CH}</span>
      <div style={{width:1,height:24,background:'var(--border)'}}/>
      <button onClick={()=>setAboutOpen(true)} style={hb()} title="Sobre"><Info size={14}/></button>
      <button onClick={tt} style={{...hb(),gap:6,width:'auto',padding:'0 10px',fontSize:11,fontWeight:500}} title="Tema">{theme==='dark'?<Sun size={14}/>:<Moon size={14}/>}<span style={{color:'var(--text-dim)'}}>{theme==='dark'?'Claro':'Escuro'}</span></button>
      <div style={{width:1,height:24,background:'var(--border)'}}/>
      <button onClick={fitV} style={hb()} title="Ajustar"><RotateCcw size={14}/></button>
    </div>
    <div style={{display:'flex',flex:1,overflow:'hidden'}}>
      <Toolbar tool={tool} setTool={setTool} hasSelection={selectedIds.length>0} selectionCount={selectedIds.length}
        onDuplicate={dup} onDelete={del} onUndo={undo} onRedo={redo} canUndo={hi>0} canRedo={hi<history.length-1}
        onGroup={doGroup} onUngroup={doUngroup} canGroup={canGroup} canUngroup={canUngroup}
        onExportSimMEMS={exSim}/>
      <Canvas shapes={shapes} setShapes={setShapes} selectedIds={selectedIds} setSelectedIds={setSelectedIds}
        vp={vp} setVp={setVp} tool={tool} deviceW={deviceW} deviceH={deviceH}
        gridSize={gridSize} showGrid={showGrid} snapOn={snapOn} polarity={polarity}
        layers={layers} activeLayer={activeLayer} nextId={nextId} setNextId={setNextId}
        onShapeCreated={()=>push('Criar')} onShapeMoved={()=>push('Mover')} theme={theme}/>
      <RightPanel deviceW={deviceW} setDeviceW={setDeviceW} deviceH={deviceH} setDeviceH={setDeviceH}
        gridSize={gridSize} setGridSize={setGridSize} selectedIds={selectedIds}
        shapes={shapes} setShapes={setShapes}
        layers={layers} setLayers={setLayers} activeLayer={activeLayer} setActiveLayer={setActiveLayer}
        simPxW={simPxW} setSimPxW={setSimPxW} simPxH={simPxH} setSimPxH={setSimPxH} polarity={polarity}
        waferDiam={waferDiam} setWaferDiam={setWaferDiam} streetW={streetW} setStreetW={setStreetW}
        marks={marks} setMarks={setMarks} waferDPI={waferDPI} setWaferDPI={setWaferDPI}
        onExportSimMEMS={exSim} onExportSimMEMSPerLayer={exSimL} onOpenWaferModal={()=>setWaferModal(true)}
        onScale={doScale} pushHistory={push}/>
    </div>
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:16,height:22,background:'var(--panel)',borderTop:'1px solid var(--border)',flexShrink:0,fontSize:9,color:'var(--text-faint)',letterSpacing:'0.3px'}}>
      <span>MaskCAD v{AV}</span><span>·</span><span>© {CY} {CH}. All rights reserved.</span>
    </div>
    {waferModal&&<WaferModal shapes={shapes} deviceW={deviceW} deviceH={deviceH} waferDiam={waferDiam} streetW={streetW} polarity={polarity} marks={marks} onClose={()=>setWaferModal(false)} onExport={exW} theme={theme}/>}
    {aboutOpen&&<div style={{position:'fixed',inset:0,background:'var(--modal-bg)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:2000,backdropFilter:'blur(6px)'}} onClick={()=>setAboutOpen(false)}>
      <div className="fade-in" onClick={e=>e.stopPropagation()} style={{background:'var(--panel)',borderRadius:12,border:'1px solid var(--border)',padding:32,maxWidth:420,width:'90vw',boxShadow:'0 24px 64px rgba(0,0,0,0.4)',textAlign:'center'}}>
        <div style={{display:'flex',justifyContent:'flex-end',marginBottom:8}}><button onClick={()=>setAboutOpen(false)} style={{background:'none',border:'none',color:'var(--text-dim)',cursor:'pointer',padding:4}}><X size={18}/></button></div>
        <Hexagon size={36} color="var(--accent)" strokeWidth={2} style={{margin:'0 auto 12px'}}/>
        <h2 style={{fontSize:20,fontWeight:700,margin:0,color:'var(--text)',letterSpacing:'2px'}}>MASK<span style={{color:'var(--accent)'}}>CAD</span></h2>
        <p style={{fontSize:12,color:'var(--text-dim)',marginTop:4}}>v{AV}</p>
        <div style={{width:40,height:2,background:'var(--accent)',margin:'16px auto',borderRadius:1}}/>
        <p style={{fontSize:13,color:'var(--text)',lineHeight:1.7}}>Editor de máscaras litográficas para projeto e fabricação de dispositivos semicondutores e MEMS.</p>
        <div style={{width:40,height:2,background:'var(--border)',margin:'16px auto',borderRadius:1}}/>
        <p style={{fontSize:11,color:'var(--text-dim)',marginTop:12}}>Desenvolvido por</p>
        <p style={{fontSize:15,fontWeight:700,color:'var(--accent)',marginTop:4,letterSpacing:'0.5px'}}>{CH}</p>
        <p style={{fontSize:10,color:'var(--text-faint)',marginTop:12}}>© {CY} {CH}. Todos os direitos reservados.</p>
      </div>
    </div>}
  </div>;
}
export default function App(){return<ThemeProvider><MaskCADApp/></ThemeProvider>;}
