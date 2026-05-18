import type { CSSProperties } from 'react';

interface CapabilityCardProps {
  capId: string;
  name: string;
  type: 'value' | 'supporting' | 'coordination' | 'local';
  capacity: number;
  noiseSigma: number;
  baselineCapacity: number;
  baselineNoiseSigma: number;
  effectiveMean: number;
  isLocked: boolean;
  onCapacityChange: (value: number) => void;
  onNoiseChange: (value: number) => void;
  onToggleLock: () => void;
}

const styles = {
  card: {
    padding: '8px 10px',
    fontSize: '12px',
    lineHeight: '1.5',
  } as CSSProperties,
  cardDimmed: {
    padding: '8px 10px',
    fontSize: '12px',
    lineHeight: '1.5',
    opacity: 0.6,
  } as CSSProperties,
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    marginBottom: '4px',
  } as CSSProperties,
  dot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    flexShrink: 0,
  } as CSSProperties,
  id: {
    fontWeight: 600,
    color: 'var(--editor-text)',
    fontSize: '11px',
  } as CSSProperties,
  name: {
    color: 'var(--editor-text-secondary)',
    flex: 1,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
    fontSize: '11px',
  } as CSSProperties,
  lock: {
    cursor: 'pointer',
    fontSize: '11px',
    opacity: 0.6,
    userSelect: 'none' as const,
  } as CSSProperties,
  row: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    marginBottom: '2px',
  } as CSSProperties,
  label: {
    width: '56px',
    flexShrink: 0,
    color: 'var(--editor-text-muted)',
    fontSize: '11px',
  } as CSSProperties,
  slider: {
    flex: 1,
    height: '4px',
    cursor: 'pointer',
  } as CSSProperties,
  value: {
    width: '44px',
    textAlign: 'right' as const,
    fontVariantNumeric: 'tabular-nums',
    fontWeight: 500,
    color: 'var(--editor-text)',
    fontSize: '11px',
  } as CSSProperties,
  effective: {
    fontSize: '11px',
    color: 'var(--editor-text-muted)',
    paddingLeft: '56px',
  } as CSSProperties,
  delta: {
    fontSize: '10px',
    fontVariantNumeric: 'tabular-nums',
    marginLeft: '4px',
    fontWeight: 500,
  } as CSSProperties,
};

function DeltaBadge({ current, baseline, format }: { current: number; baseline: number; format: (v: number) => string }) {
  const diff = current - baseline;
  if (Math.abs(diff) < 0.005) return null;
  const color = diff > 0 ? 'var(--color-positive)' : 'var(--color-negative)';
  return (
    <span style={{ ...styles.delta, color }}>
      {format(baseline)} {'\u2192'} {format(current)}
    </span>
  );
}

export function CapabilityCard({
  capId,
  name,
  type,
  capacity,
  noiseSigma,
  baselineCapacity,
  baselineNoiseSigma,
  effectiveMean,
  isLocked,
  onCapacityChange,
  onNoiseChange,
  onToggleLock,
}: CapabilityCardProps) {
  const dotColor = type === 'value'
    ? 'var(--color-constraint)'
    : type === 'supporting'
      ? 'var(--color-supporting)'
      : type === 'coordination'
        ? 'var(--color-coordination)'
        : 'var(--color-local)';
  const cardStyle = (type === 'coordination' || type === 'local') ? styles.cardDimmed : styles.card;

  return (
    <div style={cardStyle}>
      <div style={styles.header}>
        <span style={{ ...styles.dot, backgroundColor: dotColor }} />
        <span style={styles.id}>{capId}</span>
        <span style={styles.name} title={name}>{name}</span>
        <span style={styles.lock} onClick={onToggleLock}>
          {isLocked ? '\u{1F512}' : '\u{1F513}'}
        </span>
      </div>

      <div style={styles.row}>
        <span style={styles.label}>capacity</span>
        <input
          type="range"
          style={styles.slider}
          min={0.01}
          max={0.50}
          step={0.01}
          value={capacity}
          onChange={(e) => onCapacityChange(parseFloat(e.target.value))}
          disabled={isLocked}
        />
        <span style={styles.value}>{(capacity * 100).toFixed(0)}%</span>
        <DeltaBadge current={capacity} baseline={baselineCapacity} format={(v) => `${(v * 100).toFixed(0)}%`} />
      </div>

      <div style={styles.row}>
        <span style={styles.label}>noise σ</span>
        <input
          type="range"
          style={styles.slider}
          min={0.01}
          max={0.30}
          step={0.01}
          value={noiseSigma}
          onChange={(e) => onNoiseChange(parseFloat(e.target.value))}
          disabled={isLocked}
        />
        <span style={styles.value}>{noiseSigma.toFixed(2)}</span>
        <DeltaBadge current={noiseSigma} baseline={baselineNoiseSigma} format={(v) => v.toFixed(2)} />
      </div>

      <div style={styles.effective}>
        effective: {effectiveMean.toFixed(4)}
      </div>
    </div>
  );
}
