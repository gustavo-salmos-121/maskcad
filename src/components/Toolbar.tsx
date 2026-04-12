import { ReactNode } from 'react';
import { MousePointer, Square, Circle, Trash2, Download, Copy, Undo2, Redo2, Group, Ungroup } from 'lucide-react';
import { Tool } from '../types';

interface Props {
  tool: Tool; setTool: (t: Tool) => void;
  hasSelection: boolean; selectionCount: number;
  onDuplicate: () => void; onDelete: () => void;
  onUndo: () => void; onRedo: () => void; canUndo: boolean; canRedo: boolean;
  onGroup: () => void; onUngroup: () => void;
  canGroup: boolean; canUngroup: boolean;
  onExportSimMEMS: () => void;
}

function TBtn({ active, onClick, title, children, color, disabled }: {
  active?: boolean; onClick: () => void; title: string; children: ReactNode; color?: string; disabled?: boolean;
}) {
  return <button onClick={onClick} title={title} disabled={disabled} style={{
    display:'flex',alignItems:'center',justifyContent:'center',width:38,height:38,borderRadius:'var(--radius)',
    background:active?'var(--accent-soft)':'transparent',
    border:active?'1px solid var(--accent)':'1px solid transparent',
    color:disabled?'var(--text-faint)':color||( active?'var(--accent)':'var(--text-dim)'),
    cursor:disabled?'default':'pointer',transition:'all var(--transition)',opacity:disabled?0.4:1,
  }} onMouseEnter={e=>{if(!active&&!disabled)(e.currentTarget as HTMLElement).style.background='var(--panel-hover)';}}
     onMouseLeave={e=>{if(!active&&!disabled)(e.currentTarget as HTMLElement).style.background='transparent';}}
  >{children}</button>;
}

export default function Toolbar(p: Props) {
  return <div style={{width:50,display:'flex',flexDirection:'column',alignItems:'center',padding:'10px 0',gap:3,background:'var(--panel)',borderRight:'1px solid var(--border)',flexShrink:0}}>
    <TBtn active={p.tool==='select'} onClick={()=>p.setTool('select')} title="Selecionar (V)"><MousePointer size={17}/></TBtn>
    <TBtn active={p.tool==='rect'} onClick={()=>p.setTool('rect')} title="Retângulo (R)"><Square size={17}/></TBtn>
    <TBtn active={p.tool==='circle'} onClick={()=>p.setTool('circle')} title="Círculo (C)"><Circle size={17}/></TBtn>
    <div style={{width:28,height:1,background:'var(--border)',margin:'5px 0'}}/>
    <TBtn onClick={p.onUndo} title="Desfazer (Ctrl+Z)" disabled={!p.canUndo}><Undo2 size={16}/></TBtn>
    <TBtn onClick={p.onRedo} title="Refazer (Ctrl+Shift+Z)" disabled={!p.canRedo}><Redo2 size={16}/></TBtn>
    <div style={{width:28,height:1,background:'var(--border)',margin:'5px 0'}}/>
    <TBtn onClick={p.onDuplicate} title="Duplicar (Ctrl+D)" disabled={!p.hasSelection}><Copy size={16}/></TBtn>
    <TBtn onClick={p.onDelete} title="Excluir (Del)" disabled={!p.hasSelection} color={p.hasSelection?'var(--danger)':undefined}><Trash2 size={16}/></TBtn>
    <div style={{width:28,height:1,background:'var(--border)',margin:'5px 0'}}/>
    <TBtn onClick={p.onGroup} title="Agrupar (Ctrl+G)" disabled={!p.canGroup} color={p.canGroup?'var(--success)':undefined}><Group size={16}/></TBtn>
    <TBtn onClick={p.onUngroup} title="Desagrupar (Ctrl+Shift+G)" disabled={!p.canUngroup}><Ungroup size={16}/></TBtn>
    <div style={{flex:1}}/>
    <TBtn onClick={p.onExportSimMEMS} title="Exportar simMEMS" color="var(--success)"><Download size={17}/></TBtn>
  </div>;
}
