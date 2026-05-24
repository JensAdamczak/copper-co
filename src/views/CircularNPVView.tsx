import { useState, useMemo, useCallback, useEffect, type CSSProperties } from 'react';
import type { Network, CapabilityParams, Scenario } from '../engine/types';
import type { ScenarioOption } from '../components/NPVDisplay';
import { loadNetwork } from '../engine/network';
import { forwardPass } from '../engine/forward';
import { computeSensitivities } from '../engine/sensitivity';
import { inferCapabilityOverrides, type Observation } from '../engine/inference';
import { CircularGraph } from '../components/CircularGraph';
import { ScenarioPanel } from '../components/ScenarioPanel';

interface Edge {
  from: string;
  to: string;
}

export type BuilderAdjustment =
  | { type: 'capability'; capabilityId: string; param: 'capacity' | 'noiseSigma'; value: number }
  | { type: 'om'; omId: string; value: number }
  | { type: 'vd'; vdId: string; value: number };

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
  edges.push({ from: 'VD1', to: 'NPV' });
  edges.push({ from: 'VD2', to: 'NPV' });
  edges.push({ from: 'VD3', to: 'NPV' });
  edges.push({ from: 'VD4', to: 'NPV' });
  edges.push({ from: 'VD5', to: 'NPV' });
  edges.push({ from: 'VD6', to: 'NPV' });
  edges.push({ from: 'VD7', to: 'NPV' });
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

const SCENARIO_DETAILS: Record<string, string> = {
  S1: 'A machine learning optimizer is deployed across the processing plant, managing SAG mill setpoints (feed rate, water addition, power draw) and continuously adjusting flotation reagent dosages, air flow, and cell levels based on real-time feed characteristics.',
  S2: 'ML-assisted grade estimation replaces or augments manual blast hole sampling and geological block modeling.',
  S3: 'Predictive maintenance is introduced for the SAG mill and other constraint equipment. The extra capacity comes from reducing coordination overhead.',
  S4: 'A shared data platform replaces siloed spreadsheets and disconnected systems. Better information flow improves multiple metrics simultaneously.',
  S5: 'Reference-class forecasting is adopted for capital project estimation, reducing cost overruns and re-planning overhead.',
  S6: 'Local optimization has no path to any operational metric. Doubling its capacity forces value capabilities to shrink — NPV drops through opportunity cost.',
  S7: 'Coordination overhead has no path to operational metrics. Growing it from 10% to 15% starves value-creating capabilities of budget.',
  S8: 'Every capability is simultaneously shifted to its ideal parameters — more capacity for value work, less for overhead/local, and reduced noise everywhere.',
};

const styles = {
  main: {
    display: 'flex',
    height: '100vh',
    overflow: 'hidden',
  } as CSSProperties,
  loading: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100vh',
    fontSize: '16px',
    color: 'var(--editor-text-secondary)',
  } as CSSProperties,
  toggleButton: {
    position: 'fixed',
    right: 0,
    top: '50%',
    transform: 'translateY(-50%) rotate(180deg)',
    transformOrigin: 'center center',
    writingMode: 'vertical-rl',
    zIndex: 20,
    background: 'rgba(30,30,36,0.95)',
    border: 'none',
    borderRight: '2px solid #B87333',
    borderRadius: '0 0 4px 4px',
    padding: '10px 5px',
    cursor: 'pointer',
    fontSize: '10px',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '1.5px',
    color: 'rgba(255,255,255,0.6)',
  } as CSSProperties,
};

export function CircularNPVView() {
  const [network, setNetwork] = useState<Network | null>(null);
  const [overrides, setOverrides] = useState<Map<string, Partial<CapabilityParams>>>(new Map());
  const [scenarioHighlight, setScenarioHighlight] = useState<Set<string>>(new Set());
  const [inferenceHighlight, setInferenceHighlight] = useState<Set<string>>(new Set());
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  // New state for scenario panel
  const [activeScenarioId, setActiveScenarioId] = useState<string | null>(null);
  const [customScenarios, setCustomScenarios] = useState<Scenario[]>([]);
  const [customScenarioAdjustments, setCustomScenarioAdjustments] = useState<Map<string, BuilderAdjustment[]>>(new Map());
  const [panelMode, setPanelMode] = useState<'info' | 'builder' | 'saved' | 'about'>('about');
  const [builderAdjustments, setBuilderAdjustments] = useState<BuilderAdjustment[]>([]);
  const [builderName, setBuilderName] = useState('');

  useEffect(() => {
    setNetwork(loadNetwork());
  }, []);

  const baselineResult = useMemo(() => {
    if (!network) return null;
    return forwardPass(network);
  }, [network]);

  const sensitivities = useMemo(() => {
    if (!network) return [];
    return computeSensitivities(network);
  }, [network]);

  const forwardResult = useMemo(() => {
    if (!network) return null;
    const hasCapOverrides = overrides.size > 0;
    return forwardPass(
      network,
      hasCapOverrides ? overrides : undefined,
    );
  }, [network, overrides]);

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
    const result = new Set(combinedHighlight);
    // Always include NPV so VD→NPV edges render when a VD is highlighted
    result.add('NPV');
    return result;
  }, [combinedHighlight]);

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

  // Builder live preview: when adjustments change, apply them to overrides
  useEffect(() => {
    if (!network) return;
    if (builderAdjustments.length === 0) {
      // Only clear if we're not in an active scenario
      if (!activeScenarioId) {
        setOverrides(new Map());
        setScenarioHighlight(new Set());
      }
      return;
    }

    const capAdjs = builderAdjustments.filter((a): a is Extract<BuilderAdjustment, { type: 'capability' }> => a.type === 'capability');
    const omAdjs = builderAdjustments.filter((a): a is Extract<BuilderAdjustment, { type: 'om' }> => a.type === 'om');
    const vdAdjs = builderAdjustments.filter((a): a is Extract<BuilderAdjustment, { type: 'vd' }> => a.type === 'vd');

    // Build observations for inference
    const observations: Observation[] = [
      ...omAdjs.map(a => ({ nodeId: a.omId, value: a.value })),
      ...vdAdjs.map(a => ({ nodeId: a.vdId, value: a.value })),
    ];

    let newOverrides: Map<string, Partial<CapabilityParams>>;

    if (observations.length > 0) {
      // Run backward inference to get implied capability params
      const directOverrides = new Map<string, Partial<CapabilityParams>>();
      for (const adj of capAdjs) {
        const existing = directOverrides.get(adj.capabilityId) ?? {};
        existing[adj.param] = adj.value;
        directOverrides.set(adj.capabilityId, existing);
      }
      // Lock directly-specified capabilities so inference doesn't move them
      const lockedIds = new Set(capAdjs.map(a => a.capabilityId));
      newOverrides = inferCapabilityOverrides(network, observations, directOverrides, lockedIds);
      // Apply direct capability overrides on top (ensure exact values)
      for (const adj of capAdjs) {
        const existing = newOverrides.get(adj.capabilityId) ?? {};
        existing[adj.param] = adj.value;
        newOverrides.set(adj.capabilityId, existing);
      }
    } else {
      // Capability-only path (existing logic)
      newOverrides = new Map<string, Partial<CapabilityParams>>();
      for (const adj of capAdjs) {
        const existing = newOverrides.get(adj.capabilityId) ?? {};
        if (adj.param === 'capacity') {
          existing.capacity = adj.value;
        } else {
          existing.noiseSigma = adj.value;
        }
        newOverrides.set(adj.capabilityId, existing);
      }

      // Enforce capacity budget
      const specifiedCapIds = new Set<string>();
      let specifiedSum = 0;
      for (const [id, ov] of newOverrides) {
        if (ov.capacity !== undefined) {
          specifiedCapIds.add(id);
          specifiedSum += ov.capacity;
        }
      }
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
    }

    setOverrides(newOverrides);
    // Trace full causal path from adjusted nodes (downstream for caps, both for OM/VD)
    const seedIds = new Set([
      ...capAdjs.map(a => a.capabilityId),
      ...omAdjs.map(a => a.omId),
      ...vdAdjs.map(a => a.vdId),
    ]);
    const fullPath = new Set<string>();
    for (const id of seedIds) {
      for (const n of getConnectedNodes(id, allEdges)) {
        fullPath.add(n);
      }
    }
    setScenarioHighlight(fullPath);
    setActiveScenarioId(null);
  }, [builderAdjustments, network, allEdges]);

  const handleReset = useCallback(() => {
    setOverrides(new Map());
    setScenarioHighlight(new Set());
    setInferenceHighlight(new Set());
    setSelectedNodeId(null);
    setActiveScenarioId(null);
    setBuilderAdjustments([]);
    setBuilderName('');
    setPanelMode('builder');
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
    const scenario = network.scenarios.get(scenarioId)
      ?? customScenarios.find(s => s.id === scenarioId);
    if (!scenario) return;

    setActiveScenarioId(scenarioId);
    setPanelMode('info');
    setBuilderAdjustments([]);
    setBuilderName('');

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
      setScenarioHighlight(highlight);
      return;
    }

    if (scenario.parameterOverrides.length === 0) {
      setOverrides(new Map());
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

    // Enforce capacity budget
    const specifiedCapIds = new Set<string>();
    let specifiedSum = 0;
    for (const [id, ov] of newOverrides) {
      if (ov.capacity !== undefined) {
        specifiedCapIds.add(id);
        specifiedSum += ov.capacity;
      }
    }
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
    setScenarioHighlight(highlight);
  }, [network, customScenarios]);

  const handleNodeClick = useCallback((nodeId: string) => {
    const isDeselecting = selectedNodeId === nodeId;
    setSelectedNodeId(isDeselecting ? null : nodeId);
    setScenarioHighlight(new Set());
    setInferenceHighlight(isDeselecting ? new Set() : getConnectedNodes(nodeId, allEdges));
  }, [selectedNodeId, allEdges]);

  const handleTaskClick = useCallback((taskId: string, capabilityId: string) => {
    const isDeselecting = selectedNodeId === taskId;
    setSelectedNodeId(isDeselecting ? null : taskId);
    setScenarioHighlight(new Set());
    if (isDeselecting) {
      setInferenceHighlight(new Set());
    } else {
      const capPath = getConnectedNodes(capabilityId, allEdges);
      capPath.add(taskId);
      setInferenceHighlight(capPath);
    }
  }, [selectedNodeId, allEdges]);

  // Builder handlers
  const handleAddAdjustment = useCallback((adj: BuilderAdjustment) => {
    setBuilderAdjustments(prev => {
      const isDuplicate = (existing: BuilderAdjustment) => {
        if (adj.type === 'capability' && existing.type === 'capability')
          return existing.capabilityId === adj.capabilityId && existing.param === adj.param;
        if (adj.type === 'om' && existing.type === 'om')
          return existing.omId === adj.omId;
        if (adj.type === 'vd' && existing.type === 'vd')
          return existing.vdId === adj.vdId;
        return false;
      };
      const filtered = prev.filter(e => !isDuplicate(e));
      return [...filtered, adj];
    });
  }, []);

  const handleRemoveAdjustment = useCallback((index: number) => {
    setBuilderAdjustments(prev => prev.filter((_, i) => i !== index));
  }, []);

  const handleClearBuilder = useCallback(() => {
    setBuilderAdjustments([]);
    setBuilderName('');
  }, []);

  const handleSaveCustomScenario = useCallback(() => {
    if (!network || !forwardResult || !baselineResult) return;
    if (builderAdjustments.length === 0) return;

    const npvDelta = forwardResult.npv - baselineResult.npv;
    const impact = npvDelta >= 0 ? `+$${Math.round(npvDelta)}M` : `-$${Math.round(Math.abs(npvDelta))}M`;

    // Store resolved capability overrides so re-apply doesn't need inference
    const resolvedOverrides: Array<{ nodeId: string; param: 'capacity' | 'noiseSigma'; value: number }> = [];
    for (const [id, ov] of overrides) {
      if (ov.capacity !== undefined) resolvedOverrides.push({ nodeId: id, param: 'capacity', value: ov.capacity });
      if (ov.noiseSigma !== undefined) resolvedOverrides.push({ nodeId: id, param: 'noiseSigma', value: ov.noiseSigma });
    }

    // Build description from original builder adjustments
    const description = builderAdjustments.map(a => {
      if (a.type === 'capability') {
        const cap = network.capabilities.get(a.capabilityId);
        const displayValue = a.param === 'capacity' ? `${(a.value * 100).toFixed(0)}%` : a.value.toFixed(2);
        return `${cap?.name ?? a.capabilityId}: ${a.param} → ${displayValue}`;
      }
      if (a.type === 'om') {
        const om = network.operationalMetrics.get(a.omId);
        return `${om?.name ?? a.omId} target: ${a.value.toFixed(2)}`;
      }
      const vd = network.valueDrivers.get(a.vdId);
      return `${vd?.name ?? a.vdId} target: ${a.value.toFixed(2)}`;
    }).join('; ');

    // Trace full causal path for highlight (same logic as builder useEffect)
    const seedIds = new Set<string>();
    for (const a of builderAdjustments) {
      if (a.type === 'capability') seedIds.add(a.capabilityId);
      else if (a.type === 'om') seedIds.add(a.omId);
      else seedIds.add(a.vdId);
    }
    const fullPath = new Set<string>();
    for (const id of seedIds) {
      for (const n of getConnectedNodes(id, allEdges)) {
        fullPath.add(n);
      }
    }

    const scenarioId = `CUSTOM_${Date.now()}`;
    const newScenario: Scenario = {
      id: scenarioId,
      name: builderName || `Custom ${customScenarios.length + 1}`,
      description,
      npvImpact: impact,
      highlightNodeIds: [...fullPath],
      parameterOverrides: resolvedOverrides,
    };
    setCustomScenarios(prev => [...prev, newScenario]);
    setCustomScenarioAdjustments(prev => new Map(prev).set(scenarioId, [...builderAdjustments]));
    setBuilderAdjustments([]);
    setBuilderName('');
    // Auto-apply the new scenario
    setActiveScenarioId(scenarioId);
    setPanelMode('info');
  }, [builderAdjustments, builderName, forwardResult, baselineResult, customScenarios, network, overrides, allEdges]);

  const handleDeleteCustomScenario = useCallback((id: string) => {
    setCustomScenarios(prev => prev.filter(s => s.id !== id));
    setCustomScenarioAdjustments(prev => {
      const next = new Map(prev);
      next.delete(id);
      return next;
    });
    if (activeScenarioId === id) {
      handleReset();
    }
  }, [activeScenarioId, handleReset]);

  const handleEditCustomScenario = useCallback((id: string) => {
    const adjs = customScenarioAdjustments.get(id);
    const scenario = customScenarios.find(s => s.id === id);
    if (adjs && scenario) {
      setBuilderAdjustments(adjs);
      setBuilderName(scenario.name);
      setPanelMode('builder');
      setActiveScenarioId(null);
    }
  }, [customScenarioAdjustments, customScenarios]);

  // Merged scenario list for CircularGraph
  const allScenarioOptions = useMemo(() => {
    const prebuilt = scenarioOptions.map(s => ({
      id: s.id, name: s.name, npvImpact: s.npvImpact, isCustom: false,
    }));
    const custom = customScenarios.map(s => ({
      id: s.id, name: s.name, npvImpact: s.npvImpact, isCustom: true,
    }));
    return [...prebuilt, ...custom];
  }, [scenarioOptions, customScenarios]);

  // Active scenario data for info panel
  const activeScenarioData = useMemo(() => {
    if (!activeScenarioId || !network) return null;
    const scenario = network.scenarios.get(activeScenarioId)
      ?? customScenarios.find(s => s.id === activeScenarioId);
    if (!scenario) return null;
    return {
      name: scenario.name,
      description: scenario.description,
      detail: SCENARIO_DETAILS[activeScenarioId] ?? '',
      npvImpact: scenario.npvImpact,
      parameterOverrides: scenario.parameterOverrides,
    };
  }, [activeScenarioId, network, customScenarios]);

  const budgetSegments = useMemo(() => {
    if (!network) return [];
    return Array.from(network.capabilities.entries()).map(([id, cap]) => {
      const params = getEffectiveParams(id);
      return { id, capacity: params.capacity, type: cap.type };
    });
  }, [network, getEffectiveParams]);

  if (!network || !forwardResult || !baselineResult) {
    return <div style={styles.loading}>Loading network...</div>;
  }

  return (
    <div style={styles.main}>
      <CircularGraph
        network={network}
        highlightConnectedNodes={highlightConnectedNodes}
        combinedHighlight={combinedHighlight}
        selectedNodeId={selectedNodeId}
        onNodeClick={handleNodeClick}
        onTaskClick={handleTaskClick}
        activeScenarioId={activeScenarioId}
        scenarios={allScenarioOptions}
        onApplyScenario={handleApplyScenario}
        onReset={handleReset}
        forwardResult={forwardResult}
        baselineResult={baselineResult}
      />

      {sidebarOpen && (
        <ScenarioPanel
          network={network}
          panelMode={panelMode}
          onSetPanelMode={setPanelMode}
          activeScenarioId={activeScenarioId}
          activeScenarioData={activeScenarioData}
          baselineResult={baselineResult}
          forwardResult={forwardResult}
          budgetSegments={budgetSegments}
          builderAdjustments={builderAdjustments}
          builderName={builderName}
          onSetBuilderName={setBuilderName}
          onAddAdjustment={handleAddAdjustment}
          onRemoveAdjustment={handleRemoveAdjustment}
          onSaveScenario={handleSaveCustomScenario}
          onClearBuilder={handleClearBuilder}
          customScenarios={customScenarios}
          onEditCustomScenario={handleEditCustomScenario}
          onDeleteCustomScenario={handleDeleteCustomScenario}
          onApplyScenario={handleApplyScenario}
          onReset={handleReset}
          onClose={() => setSidebarOpen(false)}
          selectedNodeId={selectedNodeId}
          sensitivities={sensitivities}
        />
      )}

      {!sidebarOpen && (
        <button
          style={styles.toggleButton as CSSProperties}
          onClick={() => setSidebarOpen(true)}
          title="Open builder panel"
        >
          BUILDER
        </button>
      )}
    </div>
  );
}
