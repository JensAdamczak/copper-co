import type { CSSProperties } from 'react';

interface ParameterSliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  formatValue: (v: number) => string;
  onChange: (v: number) => void;
  isModified?: boolean;
}

const styles = {
  container: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flex: 1,
  } as CSSProperties,
  label: {
    fontSize: '11px',
    color: 'var(--editor-text-muted)',
    width: '28px',
    flexShrink: 0,
  } as CSSProperties,
  slider: {
    flex: 1,
    height: '4px',
    appearance: 'none' as const,
    WebkitAppearance: 'none' as const,
    background: 'var(--editor-slider-track)',
    borderRadius: '2px',
    outline: 'none',
    cursor: 'pointer',
  } as CSSProperties,
  value: {
    fontSize: '12px',
    fontWeight: 500,
    fontVariantNumeric: 'tabular-nums' as const,
    width: '42px',
    textAlign: 'right' as const,
    color: 'var(--editor-text)',
  } as CSSProperties,
  modifiedValue: {
    color: 'var(--color-modified)',
  } as CSSProperties,
};

export function ParameterSlider({
  label,
  value,
  min,
  max,
  step,
  formatValue,
  onChange,
  isModified,
}: ParameterSliderProps) {
  return (
    <div style={styles.container}>
      <span style={styles.label}>{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        style={styles.slider}
      />
      <span
        style={{
          ...styles.value,
          ...(isModified ? styles.modifiedValue : {}),
        }}
      >
        {formatValue(value)}
      </span>
    </div>
  );
}
