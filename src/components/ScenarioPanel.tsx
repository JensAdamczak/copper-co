import { useState, type CSSProperties } from 'react';
import type { Network, Scenario } from '../engine/types';
import type { ForwardResult } from '../engine/forward';
import type { BuilderAdjustment } from '../views/CircularNPVView';
import type { CapacitySegment } from './CapacityBudgetBar';

type PanelMode = 'info' | 'builder' | 'saved' | 'about';

interface ActiveScenarioData {
  name: string;
  description: string;
  detail: string;
  npvImpact: string;
  parameterOverrides: Array<{ nodeId: string; param: string; value: number }>;
}

interface ScenarioPanelProps {
  network: Network;
  panelMode: PanelMode;
  onSetPanelMode: (mode: PanelMode) => void;
  activeScenarioId: string | null;
  activeScenarioData: ActiveScenarioData | null;
  baselineResult: ForwardResult;
  forwardResult: ForwardResult;
  budgetSegments: CapacitySegment[];
  builderAdjustments: BuilderAdjustment[];
  builderName: string;
  onSetBuilderName: (name: string) => void;
  onAddAdjustment: (adj: BuilderAdjustment) => void;
  onRemoveAdjustment: (index: number) => void;
  onSaveScenario: () => void;
  onClearBuilder: () => void;
  customScenarios: Scenario[];
  onEditCustomScenario: (id: string) => void;
  onDeleteCustomScenario: (id: string) => void;
  onApplyScenario: (id: string) => void;
  onReset: () => void;
  onClose: () => void;
}

const styles = {
  container: {
    width: '320px',
    flexShrink: 0,
    height: '100%',
    overflowY: 'auto',
    borderLeft: '1px solid rgba(255,255,255,0.1)',
    backgroundColor: '#2a2a30',
    display: 'flex',
    flexDirection: 'column',
  } as CSSProperties,
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 12px',
    borderBottom: '1px solid rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(30,30,36,0.95)',
    position: 'sticky',
    top: 0,
    zIndex: 5,
  } as CSSProperties,
  headerTitle: {
    fontSize: '11px',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.8px',
    color: 'rgba(255,255,255,0.6)',
  } as CSSProperties,
  closeButton: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: '16px',
    color: 'rgba(255,255,255,0.6)',
    padding: '2px 6px',
    borderRadius: '3px',
  } as CSSProperties,
  tabs: {
    display: 'flex',
    borderBottom: '1px solid rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(30,30,36,0.95)',
  } as CSSProperties,
  tab: {
    flex: 1,
    padding: '8px 12px',
    fontSize: '11px',
    fontWeight: 500,
    textAlign: 'center',
    cursor: 'pointer',
    border: 'none',
    background: 'transparent',
    color: 'rgba(255,255,255,0.35)',
    borderBottom: '2px solid transparent',
    transition: 'color 0.15s, border-color 0.15s',
  } as CSSProperties,
  tabActive: {
    color: '#e5e5e5',
    borderBottom: '2px solid #B87333',
  } as CSSProperties,
  section: {
    padding: '10px 12px',
    borderBottom: '1px solid rgba(255,255,255,0.1)',
  } as CSSProperties,
  sectionTitle: {
    fontSize: '10px',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    color: 'rgba(255,255,255,0.35)',
    marginBottom: '6px',
  } as CSSProperties,
  body: {
    flex: 1,
    overflowY: 'auto',
    padding: '0',
  } as CSSProperties,
  badge: {
    display: 'inline-block',
    padding: '2px 8px',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: 600,
    fontVariantNumeric: 'tabular-nums',
  } as CSSProperties,
  input: {
    width: '100%',
    padding: '6px 8px',
    fontSize: '12px',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '4px',
    backgroundColor: 'rgba(255,255,255,0.06)',
    color: '#e5e5e5',
    outline: 'none',
  } as CSSProperties,
  select: {
    width: '100%',
    padding: '5px 8px',
    fontSize: '12px',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '4px',
    backgroundColor: 'rgba(255,255,255,0.06)',
    color: '#e5e5e5',
    cursor: 'pointer',
  } as CSSProperties,
  adjustmentItem: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '4px 8px',
    marginBottom: '4px',
    borderRadius: '4px',
    backgroundColor: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.1)',
    fontSize: '11px',
  } as CSSProperties,
  removeButton: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: 'var(--color-negative)',
    fontSize: '14px',
    padding: '0 4px',
    lineHeight: 1,
  } as CSSProperties,
  actionButton: {
    padding: '6px 12px',
    fontSize: '12px',
    fontWeight: 500,
    borderRadius: '4px',
    border: '1px solid var(--color-constraint)',
    backgroundColor: 'var(--color-constraint)',
    color: '#fff',
    cursor: 'pointer',
  } as CSSProperties,
  secondaryButton: {
    padding: '6px 12px',
    fontSize: '12px',
    fontWeight: 500,
    borderRadius: '4px',
    border: '1px solid rgba(255,255,255,0.1)',
    backgroundColor: 'transparent',
    color: 'rgba(255,255,255,0.6)',
    cursor: 'pointer',
  } as CSSProperties,
  savedItem: {
    padding: '8px 12px',
    borderBottom: '1px solid rgba(255,255,255,0.1)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  } as CSSProperties,
  emptyState: {
    padding: '24px 12px',
    textAlign: 'center',
    color: 'rgba(255,255,255,0.35)',
    fontSize: '12px',
  } as CSSProperties,
  sliderRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '6px',
  } as CSSProperties,
  slider: {
    flex: 1,
    cursor: 'pointer',
  } as CSSProperties,
  sliderLabel: {
    width: '36px',
    fontSize: '11px',
    color: 'rgba(255,255,255,0.35)',
    flexShrink: 0,
  } as CSSProperties,
  sliderValue: {
    width: '44px',
    textAlign: 'right',
    fontVariantNumeric: 'tabular-nums',
    fontSize: '11px',
    color: '#e5e5e5',
  } as CSSProperties,
};

function ImpactSummary({ network, activeScenarioData, baselineResult, forwardResult }: {
  network: Network;
  activeScenarioData: ActiveScenarioData;
  baselineResult: ForwardResult;
  forwardResult: ForwardResult;
}) {
  // Build human-readable impact descriptions
  const impacts: Array<{ description: string; delta: string; isPositive: boolean }> = [];

  // Collect affected OMs and VDs across all overrides
  const affectedOmIds = new Set<string>();
  for (const po of activeScenarioData.parameterOverrides) {
    for (const [omId, om] of network.operationalMetrics) {
      if (om.parents.some(p => p.capabilityId === po.nodeId)) {
        affectedOmIds.add(omId);
      }
    }
  }

  // OM-level impacts
  for (const omId of affectedOmIds) {
    const om = network.operationalMetrics.get(omId);
    if (!om) continue;
    const baseMean = baselineResult.nodeStates.get(omId)?.mean ?? 0;
    const currMean = forwardResult.nodeStates.get(omId)?.mean ?? 0;
    const diff = currMean - baseMean;
    if (Math.abs(diff) < 1e-6) continue;
    const sign = diff > 0 ? '+' : '';
    impacts.push({
      description: om.name,
      delta: `${sign}${diff.toFixed(3)} ${om.unit}`,
      isPositive: diff > 0,
    });
  }

  // VD-level impacts
  const affectedVdIds = new Set<string>();
  for (const [vdId, vd] of network.valueDrivers) {
    if (vd.parents.some(p => affectedOmIds.has(p.omId))) {
      affectedVdIds.add(vdId);
    }
  }
  for (const vdId of affectedVdIds) {
    const vd = network.valueDrivers.get(vdId);
    if (!vd) continue;
    const baseVal = baselineResult.vdValues[vdId] ?? 0;
    const currVal = forwardResult.vdValues[vdId] ?? 0;
    const diff = currVal - baseVal;
    if (Math.abs(diff) < 1e-6) continue;
    const sign = diff > 0 ? '+' : '';
    impacts.push({
      description: vd.name,
      delta: `${sign}${diff.toFixed(2)} ${vd.unit}`,
      isPositive: diff > 0,
    });
  }

  if (impacts.length === 0) return null;

  return (
    <div style={styles.section}>
      <div style={styles.sectionTitle as CSSProperties}>Impact</div>
      {impacts.map((item, i) => (
        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
          <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)' }}>
            {item.description}
          </span>
          <span style={{ fontSize: '11px', fontWeight: 500, fontVariantNumeric: 'tabular-nums', color: item.isPositive ? 'var(--color-positive)' : 'var(--color-negative)' }}>
            {item.delta}
          </span>
        </div>
      ))}
    </div>
  );
}

function formatChangeDescription(network: Network, parameterOverrides: ActiveScenarioData['parameterOverrides']): string[] {
  // Group overrides by capability
  const grouped = new Map<string, Array<{ param: string; value: number }>>();
  for (const po of parameterOverrides) {
    const arr = grouped.get(po.nodeId) ?? [];
    arr.push({ param: po.param, value: po.value });
    grouped.set(po.nodeId, arr);
  }

  const lines: string[] = [];
  for (const [nodeId, changes] of grouped) {
    const cap = network.capabilities.get(nodeId);
    if (!cap) continue;
    const parts: string[] = [];
    for (const ch of changes) {
      if (ch.param === 'capacity') {
        const baselinePct = (cap.baselineCapacity * 100).toFixed(0);
        const newPct = (ch.value * 100).toFixed(0);
        const direction = ch.value > cap.baselineCapacity ? 'increased' : 'reduced';
        parts.push(`capacity ${direction} from ${baselinePct}% to ${newPct}%`);
      } else {
        const direction = ch.value < cap.baselineNoiseSigma ? 'reduced' : 'increased';
        parts.push(`noise ${direction} from ${cap.baselineNoiseSigma.toFixed(2)} to ${ch.value.toFixed(2)}`);
      }
    }
    lines.push(`${cap.name}: ${parts.join(', ')}`);
  }
  return lines;
}

function InfoTab({ network, activeScenarioData, baselineResult, forwardResult }: {
  network: Network;
  activeScenarioData: ActiveScenarioData | null;
  baselineResult: ForwardResult;
  forwardResult: ForwardResult;
}) {
  if (!activeScenarioData) {
    return (
      <div style={styles.emptyState as CSSProperties}>
        Select a scenario to view details
      </div>
    );
  }

  const npvDelta = forwardResult.npv - baselineResult.npv;
  const isPositive = npvDelta >= 0;
  const changeDescriptions = activeScenarioData.parameterOverrides.length > 0
    ? formatChangeDescription(network, activeScenarioData.parameterOverrides)
    : [];

  return (
    <div>
      <div style={styles.section}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
          <span style={{ fontSize: '13px', fontWeight: 600, color: '#e5e5e5' }}>
            {activeScenarioData.name}
          </span>
          <span style={{
            ...styles.badge,
            color: isPositive ? 'var(--color-positive)' : 'var(--color-negative)',
            backgroundColor: isPositive ? 'rgba(29, 158, 117, 0.1)' : 'rgba(217, 74, 74, 0.1)',
          }}>
            {activeScenarioData.npvImpact}
          </span>
        </div>
        <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)', lineHeight: '1.5' }}>
          {activeScenarioData.description}
        </div>
        {activeScenarioData.detail && (
          <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', lineHeight: '1.5', marginTop: '6px', paddingTop: '6px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
            {activeScenarioData.detail}
          </div>
        )}
      </div>

      {changeDescriptions.length > 0 && (
        <div style={styles.section}>
          <div style={styles.sectionTitle as CSSProperties}>What Changes</div>
          {changeDescriptions.map((line, i) => (
            <div key={i} style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)', lineHeight: '1.6', marginBottom: '4px' }}>
              {line}
            </div>
          ))}
        </div>
      )}

      {activeScenarioData.parameterOverrides.length > 0 && (
        <ImpactSummary
          network={network}
          activeScenarioData={activeScenarioData}
          baselineResult={baselineResult}
          forwardResult={forwardResult}
        />
      )}
    </div>
  );
}

type LayerType = 'capability' | 'om' | 'vd';

function getOMRange(unit: string): { min: number; max: number; step: number } {
  if (unit === '% σ' || unit === '%') return { min: 0, max: 100, step: 0.1 };
  if (unit === '% Cu') return { min: 0, max: 2, step: 0.001 };
  if (unit === 'Mtpa') return { min: 1, max: 50, step: 0.1 };
  return { min: 0, max: 100, step: 0.1 };
}

function getVDRange(unit: string): { min: number; max: number; step: number } {
  if (unit === 'Mtpa') return { min: 1, max: 50, step: 0.1 };
  if (unit === '% Cu') return { min: 0, max: 2, step: 0.001 };
  if (unit === '%') return { min: 0, max: 100, step: 0.1 };
  if (unit === '$M/yr') return { min: 0, max: 500, step: 1 };
  return { min: 0, max: 100, step: 0.1 };
}

function formatAdjustmentDisplay(adj: BuilderAdjustment, network: Network): string {
  if (adj.type === 'capability') {
    const cap = network.capabilities.get(adj.capabilityId);
    const displayValue = adj.param === 'capacity'
      ? `${(adj.value * 100).toFixed(0)}%`
      : adj.value.toFixed(2);
    return `${cap?.name ?? adj.capabilityId} — ${adj.param}: ${displayValue}`;
  }
  if (adj.type === 'om') {
    const om = network.operationalMetrics.get(adj.omId);
    return `${om?.name ?? adj.omId} → target: ${adj.value.toFixed(2)} ${om?.unit ?? ''}`;
  }
  const vd = network.valueDrivers.get(adj.vdId);
  return `${vd?.name ?? adj.vdId} → target: ${adj.value.toFixed(2)} ${vd?.unit ?? ''}`;
}

function BuilderTab({ network, builderAdjustments, builderName, onSetBuilderName, onAddAdjustment, onRemoveAdjustment, onSaveScenario, onClearBuilder, baselineResult, forwardResult, budgetSegments }: {
  network: Network;
  builderAdjustments: BuilderAdjustment[];
  builderName: string;
  onSetBuilderName: (name: string) => void;
  onAddAdjustment: (adj: BuilderAdjustment) => void;
  onRemoveAdjustment: (index: number) => void;
  onSaveScenario: () => void;
  onClearBuilder: () => void;
  baselineResult: ForwardResult;
  forwardResult: ForwardResult;
  budgetSegments: CapacitySegment[];
}) {
  const [layer, setLayer] = useState<LayerType>('capability');
  const [selectedCap, setSelectedCap] = useState('');
  const [selectedParam, setSelectedParam] = useState<'capacity' | 'noiseSigma'>('capacity');
  const [paramValue, setParamValue] = useState(0.10);
  const [selectedOM, setSelectedOM] = useState('');
  const [omValue, setOmValue] = useState(0);
  const [selectedVD, setSelectedVD] = useState('');
  const [vdValue, setVdValue] = useState(0);

  const npvDelta = forwardResult.npv - baselineResult.npv;
  const caps = Array.from(network.capabilities.entries());
  const oms = Array.from(network.operationalMetrics.entries());
  const vds = Array.from(network.valueDrivers.entries());

  const handleAdd = () => {
    if (layer === 'capability') {
      if (!selectedCap) return;
      onAddAdjustment({ type: 'capability', capabilityId: selectedCap, param: selectedParam, value: paramValue });
      setSelectedCap('');
      setParamValue(selectedParam === 'capacity' ? 0.10 : 0.05);
    } else if (layer === 'om') {
      if (!selectedOM) return;
      onAddAdjustment({ type: 'om', omId: selectedOM, value: omValue });
      setSelectedOM('');
      setOmValue(0);
    } else {
      if (!selectedVD) return;
      onAddAdjustment({ type: 'vd', vdId: selectedVD, value: vdValue });
      setSelectedVD('');
      setVdValue(0);
    }
  };

  // When OM selection changes, set slider to baseline
  const handleOMChange = (omId: string) => {
    setSelectedOM(omId);
    if (omId) {
      const om = network.operationalMetrics.get(omId);
      if (om) setOmValue(om.baseline);
    }
  };

  // When VD selection changes, set slider to base value
  const handleVDChange = (vdId: string) => {
    setSelectedVD(vdId);
    if (vdId) {
      const vd = network.valueDrivers.get(vdId);
      if (vd) setVdValue(vd.baseValue);
    }
  };

  const canAdd = layer === 'capability' ? !!selectedCap
    : layer === 'om' ? !!selectedOM
    : !!selectedVD;

  // Get current OM/VD range
  const currentOMRange = selectedOM ? getOMRange(network.operationalMetrics.get(selectedOM)?.unit ?? '') : null;
  const currentVDRange = selectedVD ? getVDRange(network.valueDrivers.get(selectedVD)?.unit ?? '') : null;

  return (
    <div>
      {/* Name */}
      <div style={styles.section}>
        <div style={styles.sectionTitle as CSSProperties}>Scenario Name</div>
        <input
          type="text"
          style={styles.input}
          placeholder="My custom scenario"
          value={builderName}
          onChange={(e) => onSetBuilderName(e.target.value)}
        />
      </div>

      {/* Current adjustments */}
      <div style={styles.section}>
        <div style={styles.sectionTitle as CSSProperties}>Adjustments ({builderAdjustments.length})</div>
        {builderAdjustments.length === 0 && (
          <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)' }}>No adjustments yet</div>
        )}
        {builderAdjustments.map((adj, i) => (
          <div key={i} style={styles.adjustmentItem}>
            <span style={{ color: '#e5e5e5' }}>
              {formatAdjustmentDisplay(adj, network)}
            </span>
            <button style={styles.removeButton} onClick={() => onRemoveAdjustment(i)}>×</button>
          </div>
        ))}
      </div>

      {/* Add adjustment form */}
      <div style={styles.section}>
        <div style={styles.sectionTitle as CSSProperties}>+ Add Adjustment</div>

        {/* Layer selector */}
        <div style={{ display: 'flex', gap: '4px', marginBottom: '8px' }}>
          {(['capability', 'om', 'vd'] as LayerType[]).map(l => (
            <button
              key={l}
              style={{
                flex: 1,
                padding: '4px 6px',
                fontSize: '10px',
                fontWeight: 500,
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '3px',
                cursor: 'pointer',
                backgroundColor: layer === l ? 'rgba(255,255,255,0.15)' : 'transparent',
                color: layer === l ? '#fff' : 'rgba(255,255,255,0.35)',
              }}
              onClick={() => setLayer(l)}
            >
              {l === 'capability' ? 'Capability' : l === 'om' ? 'Op. Metric' : 'Value Driver'}
            </button>
          ))}
        </div>

        {/* Capability form */}
        {layer === 'capability' && (
          <>
            <select
              style={{ ...styles.select, marginBottom: '6px' }}
              value={selectedCap}
              onChange={(e) => setSelectedCap(e.target.value)}
            >
              <option value="" disabled>Select capability...</option>
              {caps.map(([id, cap]) => (
                <option key={id} value={id}>{id} — {cap.name}</option>
              ))}
            </select>

            <div style={{ display: 'flex', gap: '6px', marginBottom: '6px' }}>
              <label style={{ fontSize: '10px', color: 'rgba(255,255,255,0.6)', display: 'flex', alignItems: 'center', gap: '3px', cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="param"
                  checked={selectedParam === 'capacity'}
                  onChange={() => { setSelectedParam('capacity'); setParamValue(0.10); }}
                />
                capacity
              </label>
              <label style={{ fontSize: '10px', color: 'rgba(255,255,255,0.6)', display: 'flex', alignItems: 'center', gap: '3px', cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="param"
                  checked={selectedParam === 'noiseSigma'}
                  onChange={() => { setSelectedParam('noiseSigma'); setParamValue(0.05); }}
                />
                noise σ
              </label>
            </div>

            <div style={styles.sliderRow}>
              <span style={styles.sliderLabel as CSSProperties}>{selectedParam === 'capacity' ? 'cap' : 'σ'}</span>
              <input
                type="range"
                className="sp-slider"
                style={styles.slider}
                min={selectedParam === 'capacity' ? 0.01 : 0.01}
                max={selectedParam === 'capacity' ? 0.50 : 0.30}
                step={0.01}
                value={paramValue}
                onChange={(e) => setParamValue(parseFloat(e.target.value))}
              />
              <span style={styles.sliderValue as CSSProperties}>
                {selectedParam === 'capacity' ? `${(paramValue * 100).toFixed(0)}%` : paramValue.toFixed(2)}
              </span>
            </div>
          </>
        )}

        {/* OM form */}
        {layer === 'om' && (
          <>
            <select
              style={{ ...styles.select, marginBottom: '6px' }}
              value={selectedOM}
              onChange={(e) => handleOMChange(e.target.value)}
            >
              <option value="" disabled>Select operational metric...</option>
              {oms.map(([id, om]) => (
                <option key={id} value={id}>{id} — {om.name} ({om.unit})</option>
              ))}
            </select>

            {selectedOM && currentOMRange && (() => {
              const om = network.operationalMetrics.get(selectedOM)!;
              return (
                <>
                  <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.35)', marginBottom: '4px' }}>
                    Baseline: {om.baseline.toFixed(2)} {om.unit}
                  </div>
                  <div style={styles.sliderRow}>
                    <span style={styles.sliderLabel as CSSProperties}>target</span>
                    <input
                      type="range"
                      className="sp-slider"
                      style={styles.slider}
                      min={currentOMRange.min}
                      max={currentOMRange.max}
                      step={currentOMRange.step}
                      value={omValue}
                      onChange={(e) => setOmValue(parseFloat(e.target.value))}
                    />
                    <span style={styles.sliderValue as CSSProperties}>
                      {omValue.toFixed(2)}
                    </span>
                  </div>
                </>
              );
            })()}
          </>
        )}

        {/* VD form */}
        {layer === 'vd' && (
          <>
            <select
              style={{ ...styles.select, marginBottom: '6px' }}
              value={selectedVD}
              onChange={(e) => handleVDChange(e.target.value)}
            >
              <option value="" disabled>Select value driver...</option>
              {vds.map(([id, vd]) => (
                <option key={id} value={id}>{id} — {vd.name} ({vd.unit})</option>
              ))}
            </select>

            {selectedVD && currentVDRange && (() => {
              const vd = network.valueDrivers.get(selectedVD)!;
              return (
                <>
                  <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.35)', marginBottom: '4px' }}>
                    Base value: {vd.baseValue.toFixed(2)} {vd.unit}
                  </div>
                  <div style={styles.sliderRow}>
                    <span style={styles.sliderLabel as CSSProperties}>target</span>
                    <input
                      type="range"
                      className="sp-slider"
                      style={styles.slider}
                      min={currentVDRange.min}
                      max={currentVDRange.max}
                      step={currentVDRange.step}
                      value={vdValue}
                      onChange={(e) => setVdValue(parseFloat(e.target.value))}
                    />
                    <span style={styles.sliderValue as CSSProperties}>
                      {vdValue.toFixed(2)}
                    </span>
                  </div>
                </>
              );
            })()}
          </>
        )}

        <button
          style={{ ...styles.actionButton, width: '100%', marginTop: '8px', opacity: canAdd ? 1 : 0.5 }}
          onClick={handleAdd}
          disabled={!canAdd}
        >
          Add
        </button>
      </div>

      {/* Live NPV preview */}
      <div style={styles.section}>
        <div style={styles.sectionTitle as CSSProperties}>NPV Preview</div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
          <span style={{ fontSize: '18px', fontWeight: 600, color: '#e5e5e5', fontVariantNumeric: 'tabular-nums' }}>
            ${Math.round(forwardResult.npv).toLocaleString()}M
          </span>
          {Math.abs(npvDelta) > 0.5 && (
            <span style={{
              ...styles.badge,
              color: npvDelta >= 0 ? 'var(--color-positive)' : 'var(--color-negative)',
              backgroundColor: npvDelta >= 0 ? 'rgba(29, 158, 117, 0.1)' : 'rgba(217, 74, 74, 0.1)',
            }}>
              {npvDelta >= 0 ? '+' : ''}{Math.round(npvDelta)}M
            </span>
          )}
        </div>
      </div>

      {/* Budget summary */}
      <div style={styles.section}>
        <div style={styles.sectionTitle as CSSProperties}>Capacity Budget</div>
        {(() => {
          const totals = { value: 0, supporting: 0, coordination: 0, local: 0 };
          for (const seg of budgetSegments) totals[seg.type] += seg.capacity;
          const fmt = (v: number) => (v * 100).toFixed(0);
          return (
            <div style={{ fontSize: '11px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <span style={{ color: '#1D9E75' }}>Value {fmt(totals.value)}%</span>
              <span style={{ color: '#5DCAA5' }}>Support {fmt(totals.supporting)}%</span>
              <span style={{ color: '#EF9F27' }}>Coord {fmt(totals.coordination)}%</span>
              <span style={{ color: '#B4B2A9' }}>Local {fmt(totals.local)}%</span>
            </div>
          );
        })()}
      </div>

      {/* Actions */}
      <div style={{ ...styles.section, display: 'flex', gap: '8px', borderBottom: 'none' }}>
        <button
          style={{ ...styles.actionButton, flex: 1, opacity: builderAdjustments.length > 0 ? 1 : 0.5 }}
          onClick={onSaveScenario}
          disabled={builderAdjustments.length === 0}
        >
          Save Scenario
        </button>
        <button style={{ ...styles.secondaryButton, flex: 1 }} onClick={onClearBuilder}>
          Clear
        </button>
      </div>
    </div>
  );
}

function SavedTab({ customScenarios, onApplyScenario, onEditCustomScenario, onDeleteCustomScenario }: {
  customScenarios: Scenario[];
  onApplyScenario: (id: string) => void;
  onEditCustomScenario: (id: string) => void;
  onDeleteCustomScenario: (id: string) => void;
}) {
  if (customScenarios.length === 0) {
    return (
      <div style={styles.emptyState as CSSProperties}>
        No custom scenarios yet
      </div>
    );
  }

  return (
    <div>
      {customScenarios.map((s) => (
        <div key={s.id} style={styles.savedItem}>
          <div>
            <div style={{ fontSize: '12px', fontWeight: 500, color: '#e5e5e5' }}>
              {s.name}
            </div>
            <div style={{ fontSize: '11px', color: s.npvImpact.startsWith('-') ? 'var(--color-negative)' : 'var(--color-positive)' }}>
              {s.npvImpact}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '4px' }}>
            <button
              style={{ ...styles.secondaryButton, padding: '4px 8px', fontSize: '11px' }}
              onClick={() => onApplyScenario(s.id)}
            >
              Apply
            </button>
            <button
              style={{ ...styles.secondaryButton, padding: '4px 8px', fontSize: '11px' }}
              onClick={() => onEditCustomScenario(s.id)}
            >
              Edit
            </button>
            <button
              style={{ ...styles.removeButton, fontSize: '16px' }}
              onClick={() => onDeleteCustomScenario(s.id)}
              title="Delete scenario"
            >
              ×
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

const aboutStyles = {
  heading: {
    fontSize: '12px',
    fontWeight: 600,
    color: '#e5e5e5',
    marginBottom: '6px',
    marginTop: '14px',
  } as CSSProperties,
  paragraph: {
    fontSize: '11px',
    color: 'rgba(255,255,255,0.6)',
    lineHeight: '1.6',
    marginBottom: '8px',
  } as CSSProperties,
  formula: {
    fontFamily: 'monospace',
    fontSize: '10.5px',
    color: '#e5e5e5',
    backgroundColor: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '4px',
    padding: '8px 10px',
    marginBottom: '8px',
    lineHeight: '1.7',
    whiteSpace: 'pre-wrap',
    overflowX: 'auto',
  } as CSSProperties,
  note: {
    fontSize: '10px',
    color: 'rgba(255,255,255,0.35)',
    fontStyle: 'italic',
    lineHeight: '1.5',
    marginBottom: '8px',
  } as CSSProperties,
};

function AboutTab() {
  return (
    <div style={{ padding: '10px 12px' }}>
      <div style={{ ...aboutStyles.heading, marginTop: '0' }}>Model Structure</div>
      <div style={aboutStyles.paragraph}>
        This tool uses a <strong>Linear Gaussian Bayesian Network</strong> (LGBN) with four layers.
        Each layer feeds the next through weighted linear combinations, until the final NPV
        calculation which is non-linear (multiplicative).
      </div>
      <div style={aboutStyles.paragraph}>
        The network has 12 capabilities → 7 operational metrics → 7 value drivers → 1 NPV node.
      </div>

      <div style={aboutStyles.heading}>Layer 1: Capability Effective Mean</div>
      <div style={aboutStyles.paragraph}>
        Each capability produces a signal based on its allocated capacity and noise level:
      </div>
      <div style={aboutStyles.formula}>
{`effective = capacity × 1/(1 + σ)`}
      </div>
      <div style={aboutStyles.paragraph}>
        More capacity increases output. Lower noise (σ) improves quality. The combined effect
        is the capability's "effective mean" — its contribution strength to downstream metrics.
      </div>

      <div style={aboutStyles.heading}>Layer 2: Operational Metrics</div>
      <div style={aboutStyles.paragraph}>
        Each operational metric is computed as its baseline value plus a weighted sum of
        capability <em>deltas</em> (changes from baseline):
      </div>
      <div style={aboutStyles.formula}>
{`OM_i = baseline_i + Σ w_ij × Δcap_j

where Δcap_j = effective_j − baseline_effective_j`}
      </div>
      <div style={aboutStyles.paragraph}>
        The weights (w) determine how strongly each capability influences each metric.
        Only changes from baseline propagate — at default parameters, all OMs equal their baseline values.
      </div>

      <div style={aboutStyles.heading}>Layer 3: Value Drivers</div>
      <div style={aboutStyles.paragraph}>
        Value drivers follow the same pattern — base value plus weighted OM deltas:
      </div>
      <div style={aboutStyles.formula}>
{`VD_i = baseValue_i + Σ w_ij × ΔOM_j

where ΔOM_j = OM_j − OM_j.baseline`}
      </div>
      <div style={aboutStyles.paragraph}>
        The seven value drivers are: Throughput (Mt/yr), Head Grade (% Cu),
        Recovery (%), Mining Cost ($M/yr), Processing Cost ($M/yr),
        Maintenance Cost ($M/yr), and G&A Cost ($M/yr).
      </div>

      <div style={aboutStyles.heading}>Layer 4: NPV (Non-linear)</div>
      <div style={aboutStyles.paragraph}>
        The final NPV calculation uses a standard discounted cash flow model.
        This step is multiplicative — improvements in throughput, grade, and recovery compound:
      </div>
      <div style={aboutStyles.formula}>
{`Cu produced = Throughput × 10⁶
  × Grade/100 × Recovery/100

Revenue = Cu produced × Cu price / 10⁶

Cost = Mining + Processing
  + Maintenance + G&A

FCF = Revenue − Cost

NPV = Σ(t=1..20) FCF / (1 + 0.08)^t`}
      </div>
      <div style={aboutStyles.note}>
        Cu price = $8,420/t, discount rate = 8%, horizon = 20 years.
      </div>

      <div style={aboutStyles.heading}>Budget Constraint</div>
      <div style={aboutStyles.paragraph}>
        All 12 capability capacities must sum to 100%. This is the mechanism through which
        non-value work (coordination, local optimization) affects NPV — not through direct
        negative edges, but by consuming budget that would otherwise go to value-creating capabilities.
      </div>
      <div style={aboutStyles.paragraph}>
        When a scenario increases coordination capacity, the remaining capabilities are
        proportionally scaled down to maintain the budget. This opportunity cost is why
        scenarios S6 and S7 show negative NPV impact despite having no direct negative connections.
      </div>

      <div style={aboutStyles.heading}>Why Some Capabilities Matter More</div>
      <div style={aboutStyles.paragraph}>
        Because the NPV formula multiplies throughput × grade × recovery, capabilities
        that influence these three value drivers have compounding effects. A 1% improvement
        in recovery is worth more when throughput and grade are also above baseline.
      </div>
      <div style={aboutStyles.paragraph}>
        The highest-sensitivity capabilities (Flotation optimization, Grade control,
        Mine planning) all feed into these multiplicative value drivers through
        high-weight edges.
      </div>
    </div>
  );
}

export function ScenarioPanel({
  network,
  panelMode,
  onSetPanelMode,
  activeScenarioData,
  baselineResult,
  forwardResult,
  budgetSegments,
  builderAdjustments,
  builderName,
  onSetBuilderName,
  onAddAdjustment,
  onRemoveAdjustment,
  onSaveScenario,
  onClearBuilder,
  customScenarios,
  onEditCustomScenario,
  onDeleteCustomScenario,
  onApplyScenario,
  onReset,
  onClose,
}: ScenarioPanelProps) {
  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <span style={styles.headerTitle as CSSProperties}>Scenarios</span>
        <div style={{ display: 'flex', gap: '4px' }}>
          <button style={styles.closeButton} onClick={onReset} title="Reset to baseline">
            &#x21ba;
          </button>
          <button style={styles.closeButton} onClick={onClose} title="Close panel">
            &#x2715;
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={styles.tabs}>
        <button
          style={{ ...styles.tab, ...(panelMode === 'info' ? styles.tabActive : {}) }}
          onClick={() => onSetPanelMode('info')}
        >
          Info
        </button>
        <button
          style={{ ...styles.tab, ...(panelMode === 'builder' ? styles.tabActive : {}) }}
          onClick={() => onSetPanelMode('builder')}
        >
          Builder
        </button>
        <button
          style={{ ...styles.tab, ...(panelMode === 'saved' ? styles.tabActive : {}) }}
          onClick={() => onSetPanelMode('saved')}
        >
          Saved ({customScenarios.length})
        </button>
        <button
          style={{ ...styles.tab, ...(panelMode === 'about' ? styles.tabActive : {}) }}
          onClick={() => onSetPanelMode('about')}
        >
          About
        </button>
      </div>

      {/* Body */}
      <div style={styles.body as CSSProperties}>
        {panelMode === 'info' && (
          <InfoTab
            network={network}
            activeScenarioData={activeScenarioData}
            baselineResult={baselineResult}
            forwardResult={forwardResult}
          />
        )}
        {panelMode === 'builder' && (
          <BuilderTab
            network={network}
            builderAdjustments={builderAdjustments}
            builderName={builderName}
            onSetBuilderName={onSetBuilderName}
            onAddAdjustment={onAddAdjustment}
            onRemoveAdjustment={onRemoveAdjustment}
            onSaveScenario={onSaveScenario}
            onClearBuilder={onClearBuilder}
            baselineResult={baselineResult}
            forwardResult={forwardResult}
            budgetSegments={budgetSegments}
          />
        )}
        {panelMode === 'saved' && (
          <SavedTab
            customScenarios={customScenarios}
            onApplyScenario={onApplyScenario}
            onEditCustomScenario={onEditCustomScenario}
            onDeleteCustomScenario={onDeleteCustomScenario}
          />
        )}
        {panelMode === 'about' && <AboutTab />}
      </div>
    </div>
  );
}
