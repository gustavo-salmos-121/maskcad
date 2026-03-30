import { useRef, useEffect } from 'react';
import { X, Download } from 'lucide-react';
import { Shape, Polarity, MarksConfig, WAFER_SIZES } from '../types';
import { renderWaferPreview, cssVar } from '../utils';

interface Props {
  shapes:Shape[];deviceW:number;deviceH:number;waferDiam:number;streetW:number;
  polarity:Polarity;marks:MarksConfig;onClose:()=>void;onExport:()=>void;theme:string;
}

export default function WaferModal({shapes,deviceW,deviceH,waferDiam,streetW,polarity,marks,onClose,onExport,theme}:Props){
  const ref=useRef<HTMLCanvasElement>(null); const size=500;
  useEffect(()=>{
    const c=ref.current;if(!c)return;const ctx=c.getContext('2d')!;const dpr=window.devicePixelRatio||1;
    c.width=size*dpr;c.height=size*dpr;c.style.width=size+'px';c.style.height=size+'px';ctx.setTransform(dpr,0,0,dpr,0,0);
    renderWaferPreview(ctx,size,shapes,deviceW,deviceH,waferDiam,streetW,marks,{
      bg:cssVar('--wafer-bg'),fill:cssVar('--wafer-fill'),stroke:cssVar('--wafer-stroke'),
      dieFill:cssVar('--die-fill'),dieStroke:cssVar('--die-stroke'),dieShape:cssVar('--die-shape'),
      accent:cssVar('--accent'),textDim:cssVar('--text-dim'),
    });
  },[shapes,deviceW,deviceH,waferDiam,streetW,polarity,marks,theme]);

  return <div style={{position:'fixed',inset:0,background:'var(--modal-bg)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000,backdropFilter:'blur(6px)'}} onClick={onClose}>
    <div className="fade-in" onClick={e=>e.stopPropagation()} style={{background:'var(--panel)',borderRadius:12,border:'1px solid var(--border)',padding:28,maxWidth:600,width:'92vw',boxShadow:'0 24px 64px rgba(0,0,0,0.4)'}}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16}}>
        <div>
          <h3 style={{fontSize:16,fontWeight:700,margin:0}}>Pré-visualização — {WAFER_SIZES.find(w=>w.d===waferDiam)?.label}</h3>
          <p style={{fontSize:11,color:'var(--text-dim)',marginTop:4}}>Exportação gera PNG binário recortado no wafer. Frame e marcas fora do dispositivo.</p>
        </div>
        <button onClick={onClose} style={{background:'none',border:'none',color:'var(--text-dim)',cursor:'pointer',padding:4}}><X size={20}/></button>
      </div>
      <canvas ref={ref} style={{width:size,maxWidth:'100%',height:'auto',borderRadius:8,border:'1px solid var(--border)',display:'block',margin:'0 auto'}}/>
      <div style={{display:'flex',gap:12,marginTop:20,justifyContent:'flex-end'}}>
        <button onClick={onClose} style={{padding:'8px 18px',fontSize:12,background:'transparent',border:'1px solid var(--border)',borderRadius:'var(--radius)',color:'var(--text)',cursor:'pointer'}}>Fechar</button>
        <button onClick={()=>{onExport();onClose();}} style={{padding:'8px 18px',fontSize:12,fontWeight:600,background:'var(--success)',color:'#fff',border:'none',borderRadius:'var(--radius)',cursor:'pointer',display:'flex',alignItems:'center',gap:6}}><Download size={14}/> Exportar Fotolito</button>
      </div>
    </div>
  </div>;
}
