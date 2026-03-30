import { ReactNode } from 'react';
import {
  MousePointer, Square, Circle, Trash2, Download, Copy, Undo2, Redo2
} from 'lucide-react';
import { Tool } from '../types';

interface ToolbarProps {
  tool: Tool;
  setTool: (t: Tool) => void;
  selectedId: number | null;
  onDuplicate: () => void;
  onDelete: () => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onExportSimMEMS: () => void;
}

function TBtn({ active, onClick, title, children, color, disabled }: {
  active?: boolean; onClick: () => void; title: string;
  children: ReactNode; color?: string; disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick} title={title} disabled={disabled}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        width: 38, height: 38, borderRadius: 'var(--radius)',
        background: active ? 'var(--accent-soft)' : 'transparent',
        border: active ? '1px solid var(--accent)' : '1px solid transparent',
        color: disabled ? 'var(--text-faint)' : color ? color : active ? 'var(--accent)' : 'var(--text-dim)',
        cursor: disabled ? 'default' : 'pointer',
        transition: 'all var(--transition)',
        opacity: disabled ? 0.4 : 1,
      }}
      onMouseEnter={e => {
        if (!active && !disabled) e.currentTarget.style.background = 'var(--panel-hover)';
      }}
      onMouseLeave={e => {
        if (!active && !disabled) e.currentTarget.style.background = 'transparent';
      }}
    >
      {children}
    </button>
  );
}

export default function Toolbar({
  tool, setTool, selectedId, onDuplicate, onDelete,
  onUndo, onRedo, canUndo, canRedo, onExportSimMEMS
}: ToolbarProps) {
  return (
    <div style={{
      width: 50, display: 'flex', flexDirection: 'column', alignItems: 'center',
      padding: '10px 0', gap: 3, background: 'var(--panel)',
      borderRight: '1px solid var(--border)', flexShrink: 0,
    }}>
      <TBtn active={tool === 'select'} onClick={() => setTool('select')} title="Selecionar (V)">
        <MousePointer size={17} />
      </TBtn>
      <TBtn active={tool === 'rect'} onClick={() => setTool('rect')} title="Retângulo (R)">
        <Square size={17} />
      </TBtn>
      <TBtn active={tool === 'circle'} onClick={() => setTool('circle')} title="Círculo (C)">
        <Circle size={17} />
      </TBtn>

      <div style={{ width: 28, height: 1, background: 'var(--border)', margin: '5px 0' }} />

      <TBtn onClick={onUndo} title="Desfazer (Ctrl+Z)" disabled={!canUndo}>
        <Undo2 size={16} />
      </TBtn>
      <TBtn onClick={onRedo} title="Refazer (Ctrl+Shift+Z)" disabled={!canRedo}>
        <Redo2 size={16} />
      </TBtn>

      <div style={{ width: 28, height: 1, background: 'var(--border)', margin: '5px 0' }} />

      <TBtn onClick={onDuplicate} title="Duplicar (Ctrl+D)">
        <Copy size={16} />
      </TBtn>
      <TBtn onClick={onDelete} title="Excluir (Del)" color={selectedId != null ? 'var(--danger)' : undefined}>
        <Trash2 size={16} />
      </TBtn>

      <div style={{ flex: 1 }} />

      <TBtn onClick={onExportSimMEMS} title="Exportar simMEMS" color="var(--success)">
        <Download size={17} />
      </TBtn>
    </div>
  );
}
