interface NumInputProps {
  label: string;
  value: number;
  onChange: (v: number) => void;
  unit?: string;
  min?: number;
  step?: number;
  labelWidth?: number;
}

export default function NumInput({ label, value, onChange, unit = 'µm', min = 0, step = 1, labelWidth = 64 }: NumInputProps) {
  return (
    <label style={{
      display: 'flex', alignItems: 'center', gap: 6, fontSize: 12,
      color: 'var(--text)',
    }}>
      <span style={{ minWidth: labelWidth, color: 'var(--text-dim)', fontSize: 11 }}>{label}</span>
      <input
        type="number" value={value} min={min} step={step}
        onChange={e => onChange(Number(e.target.value) || 0)}
        style={{
          flex: 1, background: 'var(--input-bg)',
          border: '1px solid var(--border)', borderRadius: 'var(--radius)',
          color: 'var(--text)', padding: '5px 8px', fontSize: 12,
          fontFamily: 'var(--font-mono)', outline: 'none', minWidth: 0,
          transition: 'border-color var(--transition)',
        }}
        onFocus={e => e.currentTarget.style.borderColor = 'var(--accent)'}
        onBlur={e => e.currentTarget.style.borderColor = 'var(--border)'}
      />
      {unit && <span style={{ color: 'var(--text-faint)', fontSize: 10, minWidth: 20 }}>{unit}</span>}
    </label>
  );
}
