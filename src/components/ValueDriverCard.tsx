import type { CSSProperties } from 'react';

interface VDParentInfo {
  omId: string;
  weight: number;
}

interface ValueDriverCardProps {
  vdId: string;
  name: string;
  value: number;
  baseValue: number;
  unit: string;
  parents: VDParentInfo[];
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
    width: '48px',
    flexShrink: 0,
  } as CSSProperties,
  value: {
    fontWeight: 600,
    color: 'var(--editor-text)',
    fontVariantNumeric: 'tabular-nums',
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
  deviation: {
    fontSize: '11px',
    fontVariantNumeric: 'tabular-nums',
    marginLeft: '4px',
    fontWeight: 500,
  } as CSSProperties,
  editableInput: {
    width: '72px',
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
  if (unit === 'Mtpa') return `${value.toFixed(2)} Mtpa`;
  if (unit === '%') return `${value.toFixed(2)}%`;
  if (unit === '% Cu') return `${value.toFixed(4)} % Cu`;
  if (unit === '$M/yr') return `$${value.toFixed(1)}M/yr`;
  return `${value.toFixed(2)} ${unit}`;
}

export function ValueDriverCard({
  vdId,
  name,
  value,
  baseValue,
  unit,
  parents,
  showDetail,
  onValueChange,
  valueMin,
  valueMax,
  valueStep,
}: ValueDriverCardProps) {
  const deviation = value - baseValue;
  const isCost = unit === '$M/yr';
  // For costs, lower is better (negative deviation = positive); for others, higher is better
  const isImprovement = isCost ? deviation < 0 : deviation > 0;
  const deviationColor = Math.abs(deviation) < 0.001
    ? 'var(--editor-text-muted)'
    : isImprovement
      ? 'var(--color-positive)'
      : 'var(--color-negative)';

  const valueModified = Math.abs(value - baseValue) > 0.0001;

  function formatDeviation(): string {
    if (unit === '$M/yr') return `${deviation > 0 ? '+' : ''}$${deviation.toFixed(1)}M`;
    if (unit === '% Cu') return `${deviation > 0 ? '+' : ''}${deviation.toFixed(4)}`;
    return `${deviation > 0 ? '+' : ''}${deviation.toFixed(2)}`;
  }

  return (
    <div style={styles.card}>
      <div style={styles.header}>
        <span style={styles.id}>{vdId}</span>
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
            ({formatDeviation()})
          </span>
        )}
      </div>

      <div style={styles.row}>
        <span style={styles.label}>base:</span>
        <span style={{ fontVariantNumeric: 'tabular-nums', color: 'var(--editor-text-muted)' }}>
          {formatValue(baseValue, unit)}
        </span>
      </div>

      {showDetail && (
        <div style={styles.detail}>
          <div style={styles.formula}>
            {'= base + Σ(w × Δmetric)'}
          </div>
          {parents.map((p) => (
            <div key={p.omId} style={styles.parent}>
              {'←'} {p.omId} w={p.weight.toFixed(2)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
