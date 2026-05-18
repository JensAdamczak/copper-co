import type { CSSProperties } from 'react';

export interface CapacitySegment {
  id: string;
  capacity: number;
  type: 'value' | 'supporting' | 'coordination' | 'local';
}

interface CapacityBudgetBarProps {
  segments: CapacitySegment[];
}

const styles = {
  container: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  } as CSSProperties,
  label: {
    fontSize: '10px',
    color: 'var(--editor-text-muted)',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
    whiteSpace: 'nowrap' as const,
    flexShrink: 0,
  } as CSSProperties,
  bar: {
    display: 'flex',
    flex: 1,
    height: '16px',
    borderRadius: '3px',
    overflow: 'hidden',
    border: '1px solid var(--editor-border)',
  } as CSSProperties,
  segment: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '9px',
    fontWeight: 500,
    color: '#fff',
    overflow: 'hidden',
    whiteSpace: 'nowrap' as const,
    transition: 'width 0.2s ease',
  } as CSSProperties,
  legend: {
    display: 'flex',
    gap: '8px',
    fontSize: '10px',
    color: 'var(--editor-text-muted)',
    flexShrink: 0,
  } as CSSProperties,
  legendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '3px',
  } as CSSProperties,
  legendDot: {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
  } as CSSProperties,
};

function segmentColor(type: CapacitySegment['type']): string {
  if (type === 'supporting') return 'var(--color-supporting)';
  if (type === 'coordination') return 'var(--color-coordination)';
  if (type === 'local') return 'var(--color-local)';
  return 'var(--color-constraint)';
}

export function CapacityBudgetBar({ segments }: CapacityBudgetBarProps) {
  const totalValue = segments.filter(s => s.type === 'value').reduce((s, seg) => s + seg.capacity, 0);
  const totalSupporting = segments.filter(s => s.type === 'supporting').reduce((s, seg) => s + seg.capacity, 0);
  const totalCoordination = segments.filter(s => s.type === 'coordination').reduce((s, seg) => s + seg.capacity, 0);
  const totalLocal = segments.filter(s => s.type === 'local').reduce((s, seg) => s + seg.capacity, 0);

  return (
    <div style={styles.container}>
      <span style={styles.label}>Capacity</span>
      <div style={styles.bar}>
        {segments.map((seg) => {
          const width = `${seg.capacity * 100}%`;

          return (
            <div
              key={seg.id}
              style={{
                ...styles.segment,
                width,
                backgroundColor: segmentColor(seg.type),
              }}
              title={`${seg.id}: ${(seg.capacity * 100).toFixed(0)}%`}
            >
              {seg.capacity >= 0.06 ? seg.id : ''}
            </div>
          );
        })}
      </div>
      <div style={styles.legend}>
        <span style={styles.legendItem}>
          <span style={{ ...styles.legendDot, backgroundColor: 'var(--color-constraint)' }} />
          {(totalValue * 100).toFixed(0)}%
        </span>
        <span style={styles.legendItem}>
          <span style={{ ...styles.legendDot, backgroundColor: 'var(--color-supporting)' }} />
          {(totalSupporting * 100).toFixed(0)}%
        </span>
        <span style={styles.legendItem}>
          <span style={{ ...styles.legendDot, backgroundColor: 'var(--color-coordination)' }} />
          {(totalCoordination * 100).toFixed(0)}%
        </span>
        <span style={styles.legendItem}>
          <span style={{ ...styles.legendDot, backgroundColor: 'var(--color-local)' }} />
          {(totalLocal * 100).toFixed(0)}%
        </span>
      </div>
    </div>
  );
}
