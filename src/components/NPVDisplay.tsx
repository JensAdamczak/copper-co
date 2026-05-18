import { useState, useRef, useEffect, type CSSProperties, type ReactNode } from 'react';

export interface ScenarioOption {
  id: string;
  name: string;
  description: string;
  detail: string;
  npvImpact: string;
}

interface NPVDisplayProps {
  npv: number;
  baselineNPV: number;
  onReset: () => void;
  scenarios: ScenarioOption[];
  onApplyScenario: (scenarioId: string) => void;
  children?: ReactNode;
}

const styles = {
  container: {
    padding: '10px 20px',
    borderBottom: '1px solid var(--editor-border)',
    backgroundColor: 'var(--editor-topbar-bg)',
    position: 'sticky',
    top: 0,
    zIndex: 10,
  } as CSSProperties,
  topRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  } as CSSProperties,
  npvGroup: {
    display: 'flex',
    alignItems: 'baseline',
    gap: '12px',
  } as CSSProperties,
  npvLabel: {
    fontSize: '13px',
    color: 'var(--editor-text-secondary)',
    fontWeight: 500,
  } as CSSProperties,
  npvValue: {
    fontSize: '28px',
    fontWeight: 600,
    color: 'var(--editor-text)',
    fontVariantNumeric: 'tabular-nums',
  } as CSSProperties,
  delta: {
    fontSize: '14px',
    fontWeight: 500,
    padding: '2px 8px',
    borderRadius: '4px',
    fontVariantNumeric: 'tabular-nums',
  } as CSSProperties,
  buttons: {
    display: 'flex',
    gap: '8px',
  } as CSSProperties,
  button: {
    fontSize: '13px',
    padding: '6px 12px',
    borderRadius: '4px',
    border: '1px solid var(--editor-border)',
    backgroundColor: 'var(--editor-surface)',
    color: 'var(--editor-text)',
    cursor: 'pointer',
  } as CSSProperties,
  dropdownWrapper: {
    position: 'relative',
  } as CSSProperties,
  dropdownButton: {
    fontSize: '13px',
    padding: '6px 12px',
    borderRadius: '4px',
    border: '1px solid var(--color-constraint)',
    backgroundColor: 'var(--color-constraint)',
    color: '#ffffff',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  } as CSSProperties,
  dropdownMenu: {
    position: 'absolute',
    top: '100%',
    right: 0,
    marginTop: '4px',
    minWidth: '360px',
    maxHeight: '480px',
    overflowY: 'auto',
    backgroundColor: 'var(--editor-surface)',
    border: '1px solid var(--editor-border)',
    borderRadius: '6px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
    zIndex: 20,
  } as CSSProperties,
  menuItem: {
    padding: '8px 12px',
    borderBottom: '1px solid var(--editor-border)',
  } as CSSProperties,
  menuItemLast: {
    borderBottom: 'none',
  } as CSSProperties,
  menuItemHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  } as CSSProperties,
  menuItemNameGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  } as CSSProperties,
  menuItemName: {
    fontSize: '13px',
    fontWeight: 500,
    color: 'var(--editor-text)',
  } as CSSProperties,
  menuItemImpact: {
    fontSize: '11px',
    fontWeight: 500,
    color: 'var(--color-constraint)',
  } as CSSProperties,
  applyButton: {
    fontSize: '11px',
    padding: '3px 8px',
    borderRadius: '3px',
    border: '1px solid var(--color-constraint)',
    backgroundColor: 'transparent',
    color: 'var(--color-constraint)',
    cursor: 'pointer',
    flexShrink: 0,
    fontWeight: 500,
  } as CSSProperties,
  menuItemDesc: {
    fontSize: '11px',
    color: 'var(--editor-text-secondary)',
    marginTop: '2px',
  } as CSSProperties,
  moreToggle: {
    fontSize: '11px',
    color: 'var(--editor-text-secondary)',
    cursor: 'pointer',
    border: 'none',
    backgroundColor: 'transparent',
    padding: '2px 0',
    marginTop: '4px',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '3px',
  } as CSSProperties,
  detailText: {
    fontSize: '11px',
    lineHeight: '1.5',
    color: 'var(--editor-text-secondary)',
    marginTop: '4px',
    paddingTop: '4px',
    borderTop: '1px solid var(--editor-border)',
  } as CSSProperties,
  childRow: {
    marginTop: '8px',
  } as CSSProperties,
};

function formatNPV(value: number): string {
  return `$${Math.round(value).toLocaleString()}M`;
}

function formatDelta(delta: number): string {
  const sign = delta >= 0 ? '+' : '';
  return `${sign}$${Math.round(delta)}M`;
}

function ScenarioMenuItem({
  scenario,
  isLast,
  onApply,
}: {
  scenario: ScenarioOption;
  isLast: boolean;
  onApply: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      style={{ ...styles.menuItem, ...(isLast ? styles.menuItemLast : {}) }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--editor-bg)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
      }}
    >
      <div style={styles.menuItemHeader}>
        <div style={styles.menuItemNameGroup}>
          <span style={styles.menuItemName}>{scenario.name}</span>
          <span style={{
            ...styles.menuItemImpact,
            color: scenario.npvImpact.startsWith('-')
              ? 'var(--color-negative)'
              : 'var(--color-positive)',
          }}>{scenario.npvImpact}</span>
        </div>
        <button
          style={styles.applyButton}
          onClick={onApply}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--color-constraint)';
            (e.currentTarget as HTMLElement).style.color = '#ffffff';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
            (e.currentTarget as HTMLElement).style.color = 'var(--color-constraint)';
          }}
        >
          Apply
        </button>
      </div>
      <div style={styles.menuItemDesc}>{scenario.description}</div>
      {scenario.detail && (
        <>
          <button
            style={styles.moreToggle}
            onClick={(e) => {
              e.stopPropagation();
              setExpanded(!expanded);
            }}
          >
            <span style={{ fontSize: '8px' }}>{expanded ? '\u25BC' : '\u25B6'}</span>
            {expanded ? 'less' : 'more'}
          </button>
          {expanded && <div style={styles.detailText}>{scenario.detail}</div>}
        </>
      )}
    </div>
  );
}

export function NPVDisplay({ npv, baselineNPV, onReset, scenarios, onApplyScenario, children }: NPVDisplayProps) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [open]);

  const delta = npv - baselineNPV;
  const isPositive = delta >= 0;
  const isModified = Math.abs(delta) > 0.5;

  const deltaStyle: CSSProperties = {
    ...styles.delta,
    color: isPositive ? 'var(--color-positive)' : 'var(--color-negative)',
    backgroundColor: isPositive
      ? 'rgba(29, 158, 117, 0.1)'
      : 'rgba(217, 74, 74, 0.1)',
  };

  return (
    <div style={styles.container}>
      <div style={styles.topRow}>
        <div style={styles.npvGroup}>
          <span style={styles.npvLabel}>NPV</span>
          <span style={styles.npvValue}>{formatNPV(npv)}</span>
          {isModified && <span style={deltaStyle}>{formatDelta(delta)}</span>}
        </div>
        <div style={styles.buttons}>
          <button style={styles.button} onClick={onReset}>
            Reset to baseline
          </button>
          <div style={styles.dropdownWrapper} ref={wrapperRef}>
            <button
              style={styles.dropdownButton}
              onClick={() => setOpen(!open)}
            >
              Apply scenario
              <span style={{ fontSize: '10px' }}>{open ? '\u25B2' : '\u25BC'}</span>
            </button>
            {open && (
              <div style={styles.dropdownMenu}>
                {scenarios.map((s, i) => (
                  <ScenarioMenuItem
                    key={s.id}
                    scenario={s}
                    isLast={i === scenarios.length - 1}
                    onApply={() => {
                      onApplyScenario(s.id);
                      setOpen(false);
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      {children && <div style={styles.childRow}>{children}</div>}
    </div>
  );
}
