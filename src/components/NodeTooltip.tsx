import type { CSSProperties } from 'react';

interface NodeTooltipProps {
  x: number;
  y: number;
  name: string;
  value: string;
  unit?: string;
}

const styles = {
  container: {
    position: 'absolute',
    pointerEvents: 'none',
    backgroundColor: 'rgba(50, 50, 50, 0.92)',
    color: '#fff',
    padding: '5px 9px',
    borderRadius: '4px',
    fontSize: '11px',
    lineHeight: '1.4',
    whiteSpace: 'nowrap',
    zIndex: 100,
    transform: 'translate(-50%, -100%)',
    marginTop: '-8px',
  } as CSSProperties,
  name: {
    fontWeight: 600,
    marginBottom: '1px',
  } as CSSProperties,
  value: {
    fontVariantNumeric: 'tabular-nums',
    opacity: 0.9,
  } as CSSProperties,
};

export function NodeTooltip({ x, y, name, value, unit }: NodeTooltipProps) {
  return (
    <div style={{ ...styles.container, left: x, top: y }}>
      <div style={styles.name}>{name}</div>
      <div style={styles.value}>
        {value}{unit ? ` ${unit}` : ''}
      </div>
    </div>
  );
}
