import { useState, useMemo, useCallback, useEffect, type CSSProperties } from 'react';
import type { Network, CapabilityParams, ModelOverrides } from '../engine/types';
import { loadNetwork } from '../engine/network';
import { forwardPass } from '../engine/forward';
import { rebalanceCapacity } from '../engine/capacityBudget';
import { inferCapabilityOverrides } from '../engine/inference';
import { NPVDisplay, type ScenarioOption } from '../components/NPVDisplay';
import { CapabilityCard } from '../components/CapabilityCard';
import { OMCard } from '../components/OMCard';
import { ValueDriverCard } from '../components/ValueDriverCard';
import { RevenueCard, CostsCard, NPVSummaryCard } from '../components/NPVCard';
import { CapacityBudgetBar } from '../components/CapacityBudgetBar';
import { DEFAULT_CU_PRICE, DEFAULT_DISCOUNT_RATE, DEFAULT_YEARS } from '../engine/npv';

const COLUMN_GAP = '10px';
const ROW_GAP = '8px';

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: 'var(--editor-bg)',
  } as CSSProperties,
  columns: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr 1fr 1fr',
    gap: COLUMN_GAP,
    padding: `${ROW_GAP} ${COLUMN_GAP}`,
    alignItems: 'start',
  } as CSSProperties,
  column: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: ROW_GAP,
  } as CSSProperties,
  columnHeader: {
    padding: '8px 10px',
    fontSize: '11px',
    fontWeight: 600,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.8px',
    color: 'var(--editor-text-secondary)',
    backgroundColor: 'var(--editor-surface)',
    borderRadius: '4px',
  } as CSSProperties,
  loading: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100vh',
    fontSize: '16px',
    color: 'var(--editor-text-secondary)',
  } as CSSProperties,
};

function capabilityMean(capacity: number, noiseSigma: number): number {
  return capacity * (1 / (1 + noiseSigma));
}

interface Edge {
  from: string;
  to: string;
}

function getAllEdges(network: Network): Edge[] {
  const edges: Edge[] = [];
  for (const [omId, om] of network.operationalMetrics) {
    for (const parent of om.parents) {
      edges.push({ from: parent.capabilityId, to: omId });
    }
  }
  for (const [vdId, vd] of network.valueDrivers) {
    for (const parent of vd.parents) {
      edges.push({ from: parent.omId, to: vdId });
    }
  }
  // Revenue VDs (VD1, VD2, VD3) → Revenue node
  edges.push({ from: 'VD1', to: 'Revenue' });
  edges.push({ from: 'VD2', to: 'Revenue' });
  edges.push({ from: 'VD3', to: 'Revenue' });
  // Cost VDs (VD4, VD5, VD6, VD7) → Costs node
  edges.push({ from: 'VD4', to: 'Costs' });
  edges.push({ from: 'VD5', to: 'Costs' });
  edges.push({ from: 'VD6', to: 'Costs' });
  edges.push({ from: 'VD7', to: 'Costs' });
  // Revenue + Costs → NPV
  edges.push({ from: 'Revenue', to: 'NPV' });
  edges.push({ from: 'Costs', to: 'NPV' });
  return edges;
}

function getConnectedNodes(selectedId: string, allEdges: Edge[]): Set<string> {
  const connected = new Set<string>();
  connected.add(selectedId);

  const downQueue = [selectedId];
  while (downQueue.length > 0) {
    const current = downQueue.shift()!;
    for (const e of allEdges) {
      if (e.from === current && !connected.has(e.to)) {
        connected.add(e.to);
        downQueue.push(e.to);
      }
    }
  }

  const upQueue = [selectedId];
  while (upQueue.length > 0) {
    const current = upQueue.shift()!;
    for (const e of allEdges) {
      if (e.to === current && !connected.has(e.from)) {
        connected.add(e.from);
        upQueue.push(e.from);
      }
    }
  }

  return connected;
}

function getOMConstraints(unit: string): { min: number; max: number; step: number } {
  if (unit === '%' || unit === '% σ') return { min: 0, max: 100, step: 0.1 };
  if (unit === '% Cu') return { min: 0, max: 2, step: 0.001 };
  return { min: 0, max: 100, step: 0.1 };
}

function getVDConstraints(unit: string): { min: number; max: number; step: number } {
  if (unit === 'Mtpa') return { min: 1, max: 50, step: 0.1 };
  if (unit === '%') return { min: 0, max: 100, step: 0.1 };
  if (unit === '% Cu') return { min: 0, max: 2, step: 0.001 };
  if (unit === '$M/yr') return { min: 0, max: 500, step: 1 };
  return { min: 0, max: 100, step: 0.1 };
}

const SCENARIO_DETAILS: Record<string, string> = {
  S1: 'A machine learning flotation optimizer is deployed on the processing plant. It continuously adjusts reagent dosages, air flow, and cell levels based on real-time feed characteristics. This reduces variability in flotation recovery, meaning the plant consistently achieves closer to its theoretical recovery ceiling rather than swinging between good and bad days.',
  S2: 'ML-assisted grade estimation replaces or augments manual blast hole sampling and geological block modeling. Less grade variability means the plant can be tuned for a narrower operating window, reducing wasted effort processing low-grade material mistakenly identified as high-grade.',
  S3: 'Predictive maintenance is introduced for the SAG mill and other constraint equipment. More time is spent on proactive maintenance and that work is done more effectively. The extra capacity comes from reducing coordination overhead \u2014 fewer status meetings and handoff delays free up wrench time.',
  S4: 'A shared data platform (historian, real-time dashboards, integrated planning tools) replaces siloed spreadsheets and disconnected systems. Better information flow improves mill availability, grade control, recovery, fleet availability, and forecast accuracy simultaneously. The capacity comes from reduced coordination overhead, because the data platform replaces meetings and manual reporting.',
  S5: 'Reference-class forecasting is adopted for capital project estimation. This means fewer cost overruns and more realistic budgeting, reducing the overhead of constant re-planning and emergency funding requests. Capacity is freed from coordination overhead.',
  S6: 'Local optimization (department KPI chasing, local inventory hoarding, siloed scheduling) has no path to any operational metric. Doubling its capacity from 6% to 12% forces value capabilities to shrink proportionally \u2014 NPV drops purely through opportunity cost.',
  S7: 'Coordination overhead (status meetings, cross-department handoffs, reporting chains) has no path to operational metrics. Growing it from 10% to 15% starves value-creating capabilities of budget. This is why scenarios S3\u2013S5 fund their improvements by cutting coordination.',
  S8: 'Every capability is simultaneously shifted to its ideal parameters \u2014 more capacity for value work, less for overhead/local, and reduced noise everywhere. This represents a complete organizational redesign: better tools, better processes, less bureaucracy, more consistent execution across the board.',
};

export function NetworkView() {
  const [network, setNetwork] = useState<Network | null>(null);
  const [overrides, setOverrides] = useState<Map<string, Partial<CapabilityParams>>>(new Map());
  const [lockedCaps, setLockedCaps] = useState<Set<string>>(new Set());
  const [scenarioHighlight, setScenarioHighlight] = useState<Set<string>>(new Set());
  const [inferenceHighlight, setInferenceHighlight] = useState<Set<string>>(new Set());
  const [modelOverrides, setModelOverrides] = useState<ModelOverrides>({});

  useEffect(() => {
    setNetwork(loadNetwork());
  }, []);

  const baselineResult = useMemo(() => {
    if (!network) return null;
    return forwardPass(network);
  }, [network]);

  const baselineNPV = baselineResult?.npv ?? 0;

  const forwardResult = useMemo(() => {
    if (!network) return null;
    const hasCapOverrides = overrides.size > 0;
    const hasModelOverrides = modelOverrides.npvParams;
    return forwardPass(
      network,
      hasCapOverrides ? overrides : undefined,
      false,
      hasModelOverrides ? modelOverrides : undefined,
    );
  }, [network, overrides, modelOverrides]);

  const currentNPV = forwardResult?.npv ?? 0;

  const allEdges = useMemo(() => {
    if (!network) return [];
    return getAllEdges(network);
  }, [network]);

  const combinedHighlight = useMemo(() => {
    if (scenarioHighlight.size === 0 && inferenceHighlight.size === 0) return new Set<string>();
    return new Set([...scenarioHighlight, ...inferenceHighlight]);
  }, [scenarioHighlight, inferenceHighlight]);

  const highlightConnectedNodes = useMemo(() => {
    if (combinedHighlight.size === 0) return new Set<string>();
    const combined = new Set<string>();
    for (const nodeId of combinedHighlight) {
      for (const n of getConnectedNodes(nodeId, allEdges)) {
        combined.add(n);
      }
    }
    return combined;
  }, [combinedHighlight, allEdges]);

  const getEffectiveParams = useCallback(
    (capId: string): { capacity: number; noiseSigma: number } => {
      if (!network) return { capacity: 0, noiseSigma: 0 };
      const cap = network.capabilities.get(capId)!;
      const ov = overrides.get(capId);
      return {
        capacity: ov?.capacity ?? cap.baselineCapacity,
        noiseSigma: ov?.noiseSigma ?? cap.baselineNoiseSigma,
      };
    },
    [network, overrides],
  );

  const handleCapacityChange = useCallback(
    (capId: string, newValue: number) => {
      if (!network) return;
      const newAllocations = rebalanceCapacity(network, capId, newValue, overrides, lockedCaps);
      setOverrides((prev) => {
        const next = new Map(prev);
        for (const [id, alloc] of newAllocations) {
          const existing = next.get(id) ?? {};
          next.set(id, { ...existing, capacity: alloc });
        }
        return next;
      });
    },
    [network, overrides, lockedCaps],
  );

  const handleNoiseChange = useCallback(
    (capId: string, newValue: number) => {
      setOverrides((prev) => {
        const next = new Map(prev);
        const existing = next.get(capId) ?? {};
        next.set(capId, { ...existing, noiseSigma: newValue });
        return next;
      });
    },
    [],
  );

  const handleToggleLock = useCallback((capId: string) => {
    setLockedCaps((prev) => {
      const next = new Set(prev);
      if (next.has(capId)) next.delete(capId);
      else next.add(capId);
      return next;
    });
  }, []);

  const handleReset = useCallback(() => {
    setOverrides(new Map());
    setLockedCaps(new Set());
    setScenarioHighlight(new Set());
    setInferenceHighlight(new Set());
    setModelOverrides({});
  }, []);

  const handleOMValueChange = useCallback((omId: string, targetValue: number) => {
    if (!network) return;
    const result = inferCapabilityOverrides(
      network,
      [{ nodeId: omId, value: targetValue }],
      overrides,
      lockedCaps,
    );
    setOverrides(result);
    setInferenceHighlight(new Set([omId]));
  }, [network, overrides, lockedCaps]);

  const handleVDValueChange = useCallback((vdId: string, targetValue: number) => {
    if (!network) return;
    const result = inferCapabilityOverrides(
      network,
      [{ nodeId: vdId, value: targetValue }],
      overrides,
      lockedCaps,
    );
    setOverrides(result);
    setInferenceHighlight(new Set([vdId]));
  }, [network, overrides, lockedCaps]);

  const handleNPVParamChange = useCallback((param: 'cuPrice' | 'discountRate' | 'years', value: number) => {
    setModelOverrides((prev) => ({
      ...prev,
      npvParams: { ...prev.npvParams, [param]: value },
    }));
  }, []);

  const scenarioOptions: ScenarioOption[] = useMemo(() => {
    if (!network) return [];
    return Array.from(network.scenarios.values()).map((s) => ({
      id: s.id,
      name: s.name,
      description: s.description,
      detail: SCENARIO_DETAILS[s.id] ?? '',
      npvImpact: s.npvImpact,
    }));
  }, [network]);

  const handleApplyScenario = useCallback((scenarioId: string) => {
    if (!network) return;
    const scenario = network.scenarios.get(scenarioId);
    if (!scenario) return;

    const highlight = new Set(scenario.highlightNodeIds);

    // S8 = full ideal state
    if (scenario.parameterOverrides.length === 0 && scenarioId === 'S8') {
      const newOverrides = new Map<string, Partial<CapabilityParams>>();
      for (const [id, cap] of network.capabilities) {
        newOverrides.set(id, {
          capacity: cap.idealCapacity,
          noiseSigma: cap.idealNoiseSigma,
        });
      }
      setOverrides(newOverrides);
      setLockedCaps(new Set());
      setScenarioHighlight(highlight);
      return;
    }

    // Diagnostic scenarios (no overrides) — just highlight
    if (scenario.parameterOverrides.length === 0) {
      setOverrides(new Map());
      setLockedCaps(new Set());
      setScenarioHighlight(highlight);
      return;
    }

    // Build overrides from scenario parameter overrides
    const newOverrides = new Map<string, Partial<CapabilityParams>>();
    for (const po of scenario.parameterOverrides) {
      const existing = newOverrides.get(po.nodeId) ?? {};
      if (po.param === 'capacity') {
        existing.capacity = po.value;
      } else if (po.param === 'noiseSigma') {
        existing.noiseSigma = po.value;
      }
      newOverrides.set(po.nodeId, existing);
    }

    // Enforce capacity budget: if scenario-specified capacities change the total,
    // proportionally adjust unspecified capabilities to maintain sum = 1.0
    const specifiedCapIds = new Set<string>();
    let specifiedSum = 0;
    for (const [id, ov] of newOverrides) {
      if (ov.capacity !== undefined) {
        specifiedCapIds.add(id);
        specifiedSum += ov.capacity;
      }
    }
    // Add baseline capacities for capabilities not specified in scenario
    let unspecifiedSum = 0;
    const unspecifiedIds: string[] = [];
    for (const [id, cap] of network.capabilities) {
      if (!specifiedCapIds.has(id)) {
        unspecifiedSum += cap.baselineCapacity;
        unspecifiedIds.push(id);
      }
    }
    const target = 1.0 - specifiedSum;
    if (unspecifiedIds.length > 0 && unspecifiedSum > 0 && Math.abs(target - unspecifiedSum) > 0.001) {
      const scale = target / unspecifiedSum;
      for (const id of unspecifiedIds) {
        const cap = network.capabilities.get(id)!;
        const existing = newOverrides.get(id) ?? {};
        existing.capacity = Math.max(0.01, cap.baselineCapacity * scale);
        newOverrides.set(id, existing);
      }
    }

    setOverrides(newOverrides);
    setLockedCaps(new Set());
    setScenarioHighlight(highlight);
  }, [network]);

  const handleCardClick = useCallback((_nodeId: string) => {
    setScenarioHighlight(new Set());
    setInferenceHighlight(new Set());
  }, []);

  const budgetSegments = useMemo(() => {
    if (!network) return [];
    return Array.from(network.capabilities.entries()).map(([id, cap]) => {
      const params = getEffectiveParams(id);
      return { id, capacity: params.capacity, type: cap.type };
    });
  }, [network, getEffectiveParams]);

  if (!network || !forwardResult) {
    return <div style={styles.loading}>Loading network...</div>;
  }

  const { nodeStates, vdValues } = forwardResult;

  const effectiveCuPrice = modelOverrides.npvParams?.cuPrice ?? DEFAULT_CU_PRICE;
  const effectiveDiscountRate = modelOverrides.npvParams?.discountRate ?? DEFAULT_DISCOUNT_RATE;
  const effectiveYears = modelOverrides.npvParams?.years ?? DEFAULT_YEARS;

  const cardStyle = (nodeId: string): CSSProperties => {
    const hasHighlight = combinedHighlight.size > 0;
    const isConnected = hasHighlight ? highlightConnectedNodes.has(nodeId) : true;
    const isScenarioRoot = combinedHighlight.has(nodeId);

    return {
      borderRadius: '6px',
      border: isScenarioRoot
        ? '2px solid var(--color-constraint)'
        : isConnected && hasHighlight
          ? '2px solid rgba(29, 158, 117, 0.5)'
          : '1px solid var(--editor-border)',
      backgroundColor: 'var(--editor-surface)',
      opacity: isConnected || !hasHighlight ? 1 : 0.35,
      transition: 'opacity 0.15s ease, border-color 0.15s ease',
      cursor: 'pointer',
      overflow: 'hidden',
    };
  };

  return (
    <div style={styles.container}>
      <NPVDisplay
        npv={currentNPV}
        baselineNPV={baselineNPV}
        onReset={handleReset}
        scenarios={scenarioOptions}
        onApplyScenario={handleApplyScenario}
      >
        <CapacityBudgetBar segments={budgetSegments} />
      </NPVDisplay>

      <div style={styles.columns}>
        {/* CAPABILITIES COLUMN */}
        <div style={styles.column}>
          <div style={styles.columnHeader}>Capabilities</div>
          {Array.from(network.capabilities.entries()).map(([capId, cap]) => {
            const params = getEffectiveParams(capId);
            const effectiveMean = capabilityMean(params.capacity, params.noiseSigma);

            return (
              <div
                key={capId}
                style={cardStyle(capId)}
                onClick={() => handleCardClick(capId)}
              >
                <CapabilityCard
                  capId={capId}
                  name={cap.name}
                  type={cap.type}
                  capacity={params.capacity}
                  noiseSigma={params.noiseSigma}
                  baselineCapacity={cap.baselineCapacity}
                  baselineNoiseSigma={cap.baselineNoiseSigma}
                  effectiveMean={effectiveMean}
                  isLocked={lockedCaps.has(capId)}
                  onCapacityChange={(v) => handleCapacityChange(capId, v)}
                  onNoiseChange={(v) => handleNoiseChange(capId, v)}
                  onToggleLock={() => handleToggleLock(capId)}
                />
              </div>
            );
          })}
        </div>

        {/* OPERATIONAL METRICS COLUMN */}
        <div style={styles.column}>
          <div style={styles.columnHeader}>Operational Metrics</div>
          {Array.from(network.operationalMetrics.entries()).map(([omId, om]) => {
            const state = nodeStates.get(omId);
            const value = state?.mean ?? om.baseline;
            const isInPath = combinedHighlight.size > 0 && highlightConnectedNodes.has(omId);
            const constraints = getOMConstraints(om.unit);

            return (
              <div
                key={omId}
                style={cardStyle(omId)}
                onClick={() => handleCardClick(omId)}
              >
                <OMCard
                  omId={omId}
                  name={om.name}
                  unit={om.unit}
                  value={value}
                  baseline={om.baseline}
                  parents={om.parents}
                  showDetail={isInPath}
                  onValueChange={(v) => handleOMValueChange(omId, v)}
                  valueMin={constraints.min}
                  valueMax={constraints.max}
                  valueStep={constraints.step}
                />
              </div>
            );
          })}
        </div>

        {/* VALUE DRIVERS COLUMN */}
        <div style={styles.column}>
          <div style={styles.columnHeader}>Value Drivers</div>
          {Array.from(network.valueDrivers.entries()).map(([vdId, vd]) => {
            const value = vdValues[vdId] ?? vd.baseValue;
            const isInPath = combinedHighlight.size > 0 && highlightConnectedNodes.has(vdId);
            const constraints = getVDConstraints(vd.unit);

            return (
              <div
                key={vdId}
                style={cardStyle(vdId)}
                onClick={() => handleCardClick(vdId)}
              >
                <ValueDriverCard
                  vdId={vdId}
                  name={vd.name}
                  value={value}
                  baseValue={vd.baseValue}
                  unit={vd.unit}
                  parents={vd.parents}
                  showDetail={isInPath}
                  onValueChange={(v) => handleVDValueChange(vdId, v)}
                  valueMin={constraints.min}
                  valueMax={constraints.max}
                  valueStep={constraints.step}
                />
              </div>
            );
          })}
        </div>

        {/* NPV COLUMN */}
        <div style={styles.column}>
          <div style={styles.columnHeader}>NPV</div>
          <div
            style={cardStyle('Revenue')}
            onClick={() => handleCardClick('Revenue')}
          >
            <RevenueCard
              throughput={vdValues['VD1'] ?? 0}
              headGrade={vdValues['VD2'] ?? 0}
              recovery={vdValues['VD3'] ?? 0}
              baselineThroughput={baselineResult?.vdValues['VD1'] ?? 0}
              baselineHeadGrade={baselineResult?.vdValues['VD2'] ?? 0}
              baselineRecovery={baselineResult?.vdValues['VD3'] ?? 0}
              cuPrice={effectiveCuPrice}
              onCuPriceChange={(v) => handleNPVParamChange('cuPrice', v)}
            />
          </div>
          <div
            style={cardStyle('Costs')}
            onClick={() => handleCardClick('Costs')}
          >
            <CostsCard
              miningCost={vdValues['VD4'] ?? 0}
              processingCost={vdValues['VD5'] ?? 0}
              maintenanceCost={vdValues['VD6'] ?? 0}
              gaCost={vdValues['VD7'] ?? 0}
              baselineMiningCost={baselineResult?.vdValues['VD4'] ?? 0}
              baselineProcessingCost={baselineResult?.vdValues['VD5'] ?? 0}
              baselineMaintenanceCost={baselineResult?.vdValues['VD6'] ?? 0}
              baselineGaCost={baselineResult?.vdValues['VD7'] ?? 0}
            />
          </div>
          <div
            style={cardStyle('NPV')}
            onClick={() => handleCardClick('NPV')}
          >
            <NPVSummaryCard
              revenue={(() => {
                const t = vdValues['VD1'] ?? 0;
                const g = vdValues['VD2'] ?? 0;
                const r = vdValues['VD3'] ?? 0;
                return t * 1_000_000 * (g / 100) * (r / 100) * effectiveCuPrice / 1_000_000;
              })()}
              totalCosts={(vdValues['VD4'] ?? 0) + (vdValues['VD5'] ?? 0) + (vdValues['VD6'] ?? 0) + (vdValues['VD7'] ?? 0)}
              npv={currentNPV}
              baselineRevenue={(() => {
                const t = baselineResult?.vdValues['VD1'] ?? 0;
                const g = baselineResult?.vdValues['VD2'] ?? 0;
                const r = baselineResult?.vdValues['VD3'] ?? 0;
                return t * 1_000_000 * (g / 100) * (r / 100) * effectiveCuPrice / 1_000_000;
              })()}
              baselineTotalCosts={(baselineResult?.vdValues['VD4'] ?? 0) + (baselineResult?.vdValues['VD5'] ?? 0) + (baselineResult?.vdValues['VD6'] ?? 0) + (baselineResult?.vdValues['VD7'] ?? 0)}
              baselineNPV={baselineNPV}
              discountRate={effectiveDiscountRate}
              years={effectiveYears}
              onDiscountRateChange={(v) => handleNPVParamChange('discountRate', v)}
              onYearsChange={(v) => handleNPVParamChange('years', v)}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
