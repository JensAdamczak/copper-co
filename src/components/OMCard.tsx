import type { CSSProperties } from 'react';

interface OMParentInfo {
  capabilityId: string;
  weight: number;
}

interface OMCardProps {
  omId: string;
  name: string;
  unit: string;
  value: number;
  baseline: number;
  parents: OMParentInfo[];
  showDetail: boolean;
  onValueChange?: (v: number) => void;
  valueMin?: number;
  valueMax?: number;
  valueStep?: number;
}

const styles = {
  card: {
    padding: '8px 10px',
    fontSize: '12px',
    lineHeight: '1.5',
  } as CSSProperties,
  header: {
    display: 'flex',
    alignItems: 'baseline',
    gap: '6px',
    marginBottom: '4px',
  } as CSSProperties,
  id: {
    fontWeight: 600,
    color: 'var(--editor-text)',
  } as CSSProperties,
  name: {
    color: 'var(--editor-text-secondary)',
    flex: 1,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
  } as CSSProperties,
  row: {
    display: 'flex',
    gap: '4px',
    color: 'var(--editor-text-muted)',
  } as CSSProperties,
  label: {
    width: '56px',
    flexShrink: 0,
  } as CSSProperties,
  value: {
    fontWeight: 600,
    color: 'var(--editor-text)',
    fontVariantNumeric: 'tabular-nums',
  } as CSSProperties,
  deviation: {
    fontSize: '11px',
    fontVariantNumeric: 'tabular-nums',
    marginLeft: '4px',
  } as CSSProperties,
  detail: {
    marginTop: '4px',
    paddingTop: '4px',
    borderTop: '1px solid var(--editor-border)',
  } as CSSProperties,
  formula: {
    fontSize: '11px',
    color: 'var(--editor-text-muted)',
    fontStyle: 'italic' as const,
    marginBottom: '2px',
  } as CSSProperties,
  parent: {
    color: 'var(--editor-text-muted)',
    fontSize: '11px',
    paddingLeft: '8px',
  } as CSSProperties,
  editableInput: {
    width: '64px',
    background: 'transparent',
    border: 'none',
    borderBottom: '1px solid var(--editor-border)',
    fontSize: '12px',
    fontVariantNumeric: 'tabular-nums',
    textAlign: 'right' as const,
    padding: '0 2px',
    outline: 'none',
  } as CSSProperties,
};

function formatValue(value: number, unit: string): string {
  if (unit === '%' || unit === '% σ') return `${value.toFixed(2)}${unit}`;
  if (unit === '% Cu') return `${value.toFixed(4)} ${unit}`;
  return `${value.toFixed(2)} ${unit}`;
}

export function OMCard({
  omId,
  name,
  unit,
  value,
  baseline,
  parents,
  showDetail,
  onValueChange,
  valueMin,
  valueMax,
  valueStep,
}: OMCardProps) {
  const deviation = value - baseline;
  const deviationColor = Math.abs(deviation) < 0.001
    ? 'var(--editor-text-muted)'
    : deviation > 0
      ? 'var(--color-positive)'
      : 'var(--color-negative)';

  const valueModified = Math.abs(value - baseline) > 0.0001;

  return (
    <div style={styles.card}>
      <div style={styles.header}>
        <span style={styles.id}>{omId}</span>
        <span style={styles.name} title={name}>{name}</span>
      </div>

      <div style={styles.row}>
        <span style={styles.label}>value:</span>
        {onValueChange ? (
          <input
            type="number"
            value={Number(value.toFixed(4))}
            min={valueMin}
            max={valueMax}
            step={valueStep ?? 0.01}
            onChange={(e) => onValueChange(Number(e.target.value))}
            onClick={(e) => e.stopPropagation()}
            style={{
              ...styles.editableInput,
              fontWeight: 600,
              color: valueModified ? 'var(--color-coordination)' : 'var(--editor-text)',
            }}
          />
        ) : (
          <span style={styles.value}>{formatValue(value, unit)}</span>
        )}
        {Math.abs(deviation) > 0.001 && (
          <span style={{ ...styles.deviation, color: deviationColor }}>
            ({deviation > 0 ? '+' : ''}{deviation.toFixed(3)})
          </span>
        )}
      </div>

      <div style={styles.row}>
        <span style={styles.label}>base:</span>
        <span style={{ fontVariantNumeric: 'tabular-nums', color: 'var(--editor-text-muted)' }}>
          {formatValue(baseline, unit)}
        </span>
      </div>

      {showDetail && (
        <div style={styles.detail}>
          <div style={styles.formula}>
            {'= baseline + Σ(w × Δcapability)'}
          </div>
          {parents.map((p) => (
            <div key={p.capabilityId} style={styles.parent}>
              {'←'} {p.capabilityId} w={p.weight.toFixed(1)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
