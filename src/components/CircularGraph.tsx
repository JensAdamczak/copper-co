import { useMemo, useState, useCallback, useRef, useEffect, type CSSProperties } from 'react';
import type { Network } from '../engine/types';
import type { ForwardResult } from '../engine/forward';
import tasksData from '../data/tasks.json';
import rolesData from '../data/roles.json';

interface CircularGraphProps {
  network: Network;
  highlightConnectedNodes: Set<string>;
  combinedHighlight: Set<string>;
  selectedNodeId: string | null;
  onNodeClick: (nodeId: string) => void;
  onTaskClick: (taskId: string, capabilityId: string) => void;
  activeScenarioId: string | null;
  scenarios: { id: string; name: string; npvImpact: string; isCustom: boolean }[];
  onApplyScenario: (scenarioId: string) => void;
  onReset: () => void;
  forwardResult: ForwardResult;
  baselineResult: ForwardResult;
}

interface NodePosition {
  id: string;
  x: number;
  y: number;
  angle: number;
}

interface TaskPosition {
  id: string;
  x: number;
  y: number;
  capabilityId: string;
  name: string;
}

// Layer visibility keys
type Layer = 'npv' | 'vd' | 'om' | 'cap' | 'tasks' | 'labels' | 'values' | 'connectors';

const NODE_LAYERS: { key: Layer; label: string; color: string }[] = [
  { key: 'npv', label: 'NPV', color: '#E6B3E6' },
  { key: 'vd', label: 'Value Drivers', color: '#F4C2D7' },
  { key: 'om', label: 'Oper. Metrics', color: '#A6A1D6' },
  { key: 'cap', label: 'Capabilities', color: '#D1C6E7' },
  { key: 'tasks', label: 'Tasks', color: '#F7E1E1' },
];

const DISPLAY_LAYERS: { key: Layer; label: string; color: string }[] = [
  { key: 'labels', label: 'Labels', color: '#ffffff' },
  { key: 'values', label: 'Values', color: '#88ccff' },
  { key: 'connectors', label: 'Connectors', color: '#ddd2f0' },
];

// Layout constants
const CX = 550;
const CY = 550;
const R_VD = 90;
const R_OM = 190;
const R_CAP = 300;
const R_TASK = 450;
const VIEWBOX_SIZE = 1100;

// Node sizes
const NPV_R = 8;
const VD_R = 6;
const OM_R = 5;
const CAP_R = 4;
const TASK_R = 3;

// Dark warm background
const BG_COLOR = '#2a2a30';

// Zone boundaries — centered on node rings (midpoints between adjacent rings)
const ZONE_NPV_OUTER = 45;   // mid(0, 90)
const ZONE_VD_OUTER = 140;   // mid(90, 190)
const ZONE_OM_OUTER = 245;   // mid(190, 300)
const ZONE_CAP_OUTER = 375;  // mid(300, 450)
const ZONE_TASK_OUTER = 560;  // 450 + room for radial task labels
const DEPT_LABEL_R = 578;     // department labels outside task zone
const VB_PAD = 40;            // extra viewbox padding for department labels

// Ring boundary orbits — pastel palette, full opacity, no zone fills
const STROKE_NPV = '#E6B3E6';   // mauve
const STROKE_VD = '#F4C2D7';    // pink
const STROKE_OM = '#A6A1D6';    // blue-purple
const STROKE_CAP = '#D1C6E7';   // lavender
const STROKE_TASK = '#F7E1E1';   // peach

// Node colors — uniform light blue
const NODE_COLOR = '#88ccff';
const NODE_DIM = 'rgba(140, 160, 180, 0.6)';

// Edge color — bright warm white, clearly visible
const EDGE_COLOR = '220, 210, 240';

// Value change colors
const VALUE_UP = '#4ade80';    // green
const VALUE_DOWN = '#f87171';  // red
const VALUE_NEUTRAL = 'rgba(136,204,255,0.8)'; // default blue

// Fixed angles
const VD_ANGLES = [340, 20, 70, 120, 270, 225, 175];
const OM_ANGLES = [310, 15, 65, 120, 170, 210, 260, 340];

function valueFill(current: number, baseline: number, hasScenario: boolean): string {
  if (!hasScenario) return VALUE_NEUTRAL;
  const diff = current - baseline;
  if (Math.abs(diff) < 1e-6) return VALUE_NEUTRAL;
  return diff > 0 ? VALUE_UP : VALUE_DOWN;
}

// Fixed capability angles — ordered by average task angular position
// to minimize connector crossings (C1→0°, C4→30°, C3→60°, C2→90°, ...)
const CAP_ANGLES: Record<string, number> = {
  C1: 0, C14: 15, C4: 30, C3: 60, C13: 75, C2: 90, C5: 120, C6: 150,
  C7: 180, C8: 210, C9: 240, C10: 270, C11: 300, C12: 330,
};

function polar(cx: number, cy: number, r: number, angleDeg: number): { x: number; y: number } {
  const rad = (angleDeg - 90) * Math.PI / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function describeArc(cx: number, cy: number, r: number, startAngle: number, endAngle: number, flip: boolean): string {
  if (flip) {
    const s = polar(cx, cy, r, endAngle);
    const e = polar(cx, cy, r, startAngle);
    const span = endAngle - startAngle;
    const largeArc = span > 180 ? 1 : 0;
    return `M ${s.x},${s.y} A ${r},${r} 0 ${largeArc},0 ${e.x},${e.y}`;
  }
  const s = polar(cx, cy, r, startAngle);
  const e = polar(cx, cy, r, endAngle);
  const span = endAngle - startAngle;
  const largeArc = span > 180 ? 1 : 0;
  return `M ${s.x},${s.y} A ${r},${r} 0 ${largeArc},1 ${e.x},${e.y}`;
}

// Layer selector styles
const panelStyles = {
  container: {
    position: 'absolute',
    left: 12,
    top: '50%',
    transform: 'translateY(-50%)',
    zIndex: 10,
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    background: 'rgba(30, 30, 36, 0.85)',
    borderRadius: '8px',
    padding: '8px',
    border: '1px solid rgba(255,255,255,0.1)',
    backdropFilter: 'blur(8px)',
  } as CSSProperties,
  button: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '5px 10px',
    border: 'none',
    borderRadius: '5px',
    cursor: 'pointer',
    fontSize: '11px',
    fontWeight: 500,
    letterSpacing: '0.3px',
    transition: 'background 0.15s',
    textAlign: 'left',
  } as CSSProperties,
  dot: {
    width: 10,
    height: 10,
    borderRadius: '50%',
    flexShrink: 0,
  } as CSSProperties,
};

export function CircularGraph({
  network,
  highlightConnectedNodes,
  combinedHighlight,
  selectedNodeId,
  onNodeClick,
  onTaskClick,
  activeScenarioId,
  scenarios,
  onApplyScenario,
  onReset,
  forwardResult,
  baselineResult,
}: CircularGraphProps) {
  // Layer visibility state — all on by default except values
  const [layers, setLayers] = useState<Set<Layer>>(
    () => new Set<Layer>(['npv', 'vd', 'om', 'cap', 'tasks', 'labels', 'connectors']),
  );
  const [layersOpen, setLayersOpen] = useState(false);
  const [scenariosOpen, setScenariosOpen] = useState(false);

  const toggleLayer = useCallback((layer: Layer) => {
    setLayers(prev => {
      const next = new Set(prev);
      if (next.has(layer)) next.delete(layer);
      else next.add(layer);
      return next;
    });
  }, []);

  const handleScenarioClick = useCallback((scenarioId: string) => {
    if (activeScenarioId === scenarioId) {
      onReset();
    } else {
      onApplyScenario(scenarioId);
    }
  }, [activeScenarioId, onApplyScenario, onReset]);

  // Dynamic node sizing based on forward result vs baseline
  const nodeSizeMultipliers = useMemo(() => {
    const multipliers = new Map<string, number>();
    const clamp = (v: number) => {
      if (!Number.isFinite(v)) return 1;
      return Math.max(0.6, Math.min(2.0, v));
    };

    // NPV node
    if (baselineResult.npv > 0) {
      multipliers.set('NPV', clamp(forwardResult.npv / baselineResult.npv));
    }

    // VD nodes
    for (const vdId of Object.keys(baselineResult.vdValues)) {
      const base = baselineResult.vdValues[vdId];
      const curr = forwardResult.vdValues[vdId];
      if (base && base !== 0 && curr !== undefined) {
        multipliers.set(vdId, clamp(curr / base));
      }
    }

    // OM and Capability nodes (skip VD ids already handled above)
    for (const [id, baseState] of baselineResult.nodeStates) {
      if (multipliers.has(id)) continue;
      if (baseState.mean !== 0) {
        const currState = forwardResult.nodeStates.get(id);
        if (currState) {
          multipliers.set(id, clamp(currState.mean / baseState.mean));
        }
      }
    }

    return multipliers;
  }, [forwardResult, baselineResult]);

  // Zoom/pan state
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const containerRef = useRef<HTMLDivElement>(null);
  const isPanning = useRef(false);
  const panStart = useRef({ x: 0, y: 0 });

  // Wheel zoom
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    function handleWheel(e: WheelEvent) {
      e.preventDefault();
      const scaleFactor = e.deltaY > 0 ? 0.92 : 1.08;
      setTransform(prev => {
        const newScale = Math.min(5, Math.max(0.3, prev.scale * scaleFactor));
        const rect = container!.getBoundingClientRect();
        const cx = e.clientX - rect.left;
        const cy = e.clientY - rect.top;
        const dx = cx - rect.width / 2;
        const dy = cy - rect.height / 2;
        return {
          scale: newScale,
          x: prev.x + dx * (1 - scaleFactor) * 0.3,
          y: prev.y + dy * (1 - scaleFactor) * 0.3,
        };
      });
    }

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    const target = e.target as SVGElement;
    if (target.tagName === 'circle' || target.closest('[data-interactive]')) return;
    isPanning.current = true;
    panStart.current = { x: e.clientX - transform.x, y: e.clientY - transform.y };
  }, [transform]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isPanning.current) return;
    setTransform(prev => ({
      ...prev,
      x: e.clientX - panStart.current.x,
      y: e.clientY - panStart.current.y,
    }));
  }, []);

  const handleMouseUp = useCallback(() => {
    isPanning.current = false;
  }, []);

  // Touch zoom/pan
  const touchState = useRef<{
    startDist: number;
    startScale: number;
    startMid: { x: number; y: number };
    startTransform: { x: number; y: number };
  } | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    function getTouchDist(t1: Touch, t2: Touch): number {
      const dx = t1.clientX - t2.clientX;
      const dy = t1.clientY - t2.clientY;
      return Math.sqrt(dx * dx + dy * dy);
    }

    function getTouchMid(t1: Touch, t2: Touch): { x: number; y: number } {
      return { x: (t1.clientX + t2.clientX) / 2, y: (t1.clientY + t2.clientY) / 2 };
    }

    function handleTouchStart(e: TouchEvent) {
      const target = e.target as Element;
      // Don't intercept touches on overlay UI panels (layers, scenarios)
      if (!target.closest('svg')) return;
      if (target.tagName === 'circle' || target.closest('[data-interactive]')) return;

      if (e.touches.length === 1) {
        // Single finger — start pan (cancel any pinch state)
        touchState.current = null;
        isPanning.current = true;
        panStart.current = {
          x: e.touches[0].clientX - transform.x,
          y: e.touches[0].clientY - transform.y,
        };
        e.preventDefault();
      } else if (e.touches.length === 2) {
        // Two fingers — start pinch (cancel any pan)
        isPanning.current = false;
        touchState.current = {
          startDist: getTouchDist(e.touches[0], e.touches[1]),
          startScale: transform.scale,
          startMid: getTouchMid(e.touches[0], e.touches[1]),
          startTransform: { x: transform.x, y: transform.y },
        };
        e.preventDefault();
      }
    }

    function handleTouchMove(e: TouchEvent) {
      if (e.touches.length === 1 && isPanning.current) {
        // Single finger pan
        const newX = e.touches[0].clientX - panStart.current.x;
        const newY = e.touches[0].clientY - panStart.current.y;
        setTransform(prev => ({ ...prev, x: newX, y: newY }));
        e.preventDefault();
      } else if (e.touches.length === 2 && touchState.current) {
        // Pinch zoom + pan
        const ts = touchState.current;
        const newDist = getTouchDist(e.touches[0], e.touches[1]);
        const ratio = newDist / ts.startDist;
        const newScale = Math.min(5, Math.max(0.3, ts.startScale * ratio));

        const newMid = getTouchMid(e.touches[0], e.touches[1]);
        const panDx = newMid.x - ts.startMid.x;
        const panDy = newMid.y - ts.startMid.y;

        setTransform({
          scale: newScale,
          x: ts.startTransform.x + panDx,
          y: ts.startTransform.y + panDy,
        });
        e.preventDefault();
      }
    }

    function handleTouchEnd(e: TouchEvent) {
      if (e.touches.length < 2) {
        touchState.current = null;
      }
      if (e.touches.length === 0) {
        isPanning.current = false;
      }
      // If going from 2 → 1 finger, start a fresh pan from the remaining finger
      if (e.touches.length === 1) {
        isPanning.current = true;
        setTransform(prev => {
          panStart.current = {
            x: e.touches[0].clientX - prev.x,
            y: e.touches[0].clientY - prev.y,
          };
          return prev;
        });
      }
    }

    container.addEventListener('touchstart', handleTouchStart, { passive: false });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd, { passive: false });
    container.addEventListener('touchcancel', handleTouchEnd, { passive: false });
    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
      container.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [transform]);

  // Node positions
  const vdPositions = useMemo((): NodePosition[] => {
    const vds = Array.from(network.valueDrivers.entries());
    return vds.map(([id], i) => {
      const angle = VD_ANGLES[i] ?? (360 / vds.length) * i;
      const pos = polar(CX, CY, R_VD, angle);
      return { id, x: pos.x, y: pos.y, angle };
    });
  }, [network]);

  const omPositions = useMemo((): NodePosition[] => {
    const oms = Array.from(network.operationalMetrics.entries());
    return oms.map(([id], i) => {
      const angle = OM_ANGLES[i] ?? (360 / oms.length) * i;
      const pos = polar(CX, CY, R_OM, angle);
      return { id, x: pos.x, y: pos.y, angle };
    });
  }, [network]);

  const capPositions = useMemo((): NodePosition[] => {
    const caps = Array.from(network.capabilities.entries());
    return caps.map(([id]) => {
      const angle = CAP_ANGLES[id] ?? 0;
      const pos = polar(CX, CY, R_CAP, angle);
      return { id, x: pos.x, y: pos.y, angle };
    });
  }, [network]);

  const taskPositions = useMemo(() => {
    const tasks: TaskPosition[] = [];

    const totalTasks = rolesData.reduce((s: number, r: { tasks: string[] }) => s + r.tasks.length, 0);
    const deptGap = 7;
    const roleGap = 3;
    const depts = [...new Set(rolesData.map((r: { department: string }) => r.department))];
    const totalGaps = (depts.length * deptGap) + ((rolesData.length - depts.length) * roleGap);
    const availableAngle = 360 - totalGaps;
    const anglePerTask = availableAngle / totalTasks;

    let currentAngle = 0;
    let prevDept: string | null = null;

    rolesData.forEach((role: { id: string; name: string; department: string; tasks: string[] }) => {
      if (prevDept && prevDept !== role.department) {
        currentAngle += deptGap;
      } else if (prevDept === role.department) {
        currentAngle += roleGap;
      }

      role.tasks.forEach((taskId: string, ti: number) => {
        const taskData = tasksData.find((t: { id: string }) => t.id === taskId);
        const a = currentAngle + ti * anglePerTask;
        const p = polar(CX, CY, R_TASK, a);
        tasks.push({
          id: taskId,
          x: p.x,
          y: p.y,
          capabilityId: taskData?.capabilityId ?? '',
          name: taskData?.name ?? taskId,
        });
        if (ti === role.tasks.length - 1) {
          currentAngle = a + anglePerTask;
        }
      });

      prevDept = role.department;
    });

    return tasks;
  }, []);

  // Department arc spans (same angle logic as taskPositions)
  const departmentArcs = useMemo(() => {
    const arcs: { name: string; startAngle: number; endAngle: number }[] = [];
    const totalTasks = rolesData.reduce((s: number, r: { tasks: string[] }) => s + r.tasks.length, 0);
    const deptGap = 7;
    const roleGap = 3;
    const depts = [...new Set(rolesData.map((r: { department: string }) => r.department))];
    const totalGaps = (depts.length * deptGap) + ((rolesData.length - depts.length) * roleGap);
    const availableAngle = 360 - totalGaps;
    const anglePerTask = availableAngle / totalTasks;

    let currentAngle = 0;
    let prevDept: string | null = null;
    let deptStartAngle = 0;
    let deptLastTaskAngle = 0;

    rolesData.forEach((role: { department: string; tasks: string[] }) => {
      if (prevDept && prevDept !== role.department) {
        arcs.push({ name: prevDept, startAngle: deptStartAngle, endAngle: deptLastTaskAngle });
        currentAngle += deptGap;
        deptStartAngle = currentAngle;
      } else if (prevDept === role.department) {
        currentAngle += roleGap;
      }

      role.tasks.forEach((_: string, ti: number) => {
        const a = currentAngle + ti * anglePerTask;
        deptLastTaskAngle = a;
        if (ti === role.tasks.length - 1) {
          currentAngle = a + anglePerTask;
        }
      });

      prevDept = role.department;
    });

    if (prevDept) {
      arcs.push({ name: prevDept, startAngle: deptStartAngle, endAngle: deptLastTaskAngle });
    }

    return arcs;
  }, []);

  // Edges
  const capToOmEdges = useMemo(() => {
    const edges: { from: NodePosition; to: NodePosition }[] = [];
    for (const om of omPositions) {
      const omData = network.operationalMetrics.get(om.id);
      if (!omData) continue;
      for (const parent of omData.parents) {
        const capNode = capPositions.find(c => c.id === parent.capabilityId);
        if (capNode) edges.push({ from: capNode, to: om });
      }
    }
    return edges;
  }, [network, capPositions, omPositions]);

  const omToVdEdges = useMemo(() => {
    const edges: { from: NodePosition; to: NodePosition }[] = [];
    for (const vd of vdPositions) {
      const vdData = network.valueDrivers.get(vd.id);
      if (!vdData) continue;
      for (const parent of vdData.parents) {
        const omNode = omPositions.find(o => o.id === parent.omId);
        if (omNode) edges.push({ from: omNode, to: vd });
      }
    }
    return edges;
  }, [network, omPositions, vdPositions]);

  const taskToCapEdges = useMemo(() => {
    const edges: { from: TaskPosition; to: NodePosition }[] = [];
    for (const task of taskPositions) {
      if (!task.capabilityId) continue;
      const capNode = capPositions.find(c => c.id === task.capabilityId);
      if (capNode) edges.push({ from: task, to: capNode });
    }
    return edges;
  }, [taskPositions, capPositions]);

  // Highlight
  const hasHighlight = combinedHighlight.size > 0;

  // Node name lookups
  const capNames = useMemo(() => {
    const map = new Map<string, string>();
    for (const [id, cap] of network.capabilities) map.set(id, cap.name);
    return map;
  }, [network]);

  const omNames = useMemo(() => {
    const map = new Map<string, string>();
    for (const [id, om] of network.operationalMetrics) map.set(id, om.name);
    return map;
  }, [network]);

  const vdNames = useMemo(() => {
    const map = new Map<string, string>();
    for (const [id, vd] of network.valueDrivers) map.set(id, vd.name);
    return map;
  }, [network]);

  // Node unit lookups
  const omUnits = useMemo(() => {
    const map = new Map<string, string>();
    for (const [id, om] of network.operationalMetrics) map.set(id, om.unit);
    return map;
  }, [network]);

  const vdUnits = useMemo(() => {
    const map = new Map<string, string>();
    for (const [id, vd] of network.valueDrivers) map.set(id, vd.unit);
    return map;
  }, [network]);

  const containerStyle: CSSProperties = {
    position: 'relative',
    flex: 1,
    overflow: 'hidden',
    backgroundColor: BG_COLOR,
    cursor: isPanning.current ? 'grabbing' : 'grab',
    touchAction: 'none',
  };

  const svgTransform = `translate(${transform.x}, ${transform.y}) scale(${transform.scale})`;

  // Which edge groups to show — only if both endpoints' layers are visible and connectors is on
  const showConnectors = layers.has('connectors');
  const showTaskCapEdges = showConnectors && layers.has('tasks') && layers.has('cap');
  const showCapOmEdges = showConnectors && layers.has('cap') && layers.has('om');
  const showOmVdEdges = showConnectors && layers.has('om') && layers.has('vd');
  const showVdNpvEdges = showConnectors && layers.has('vd') && layers.has('npv');

  return (
    <div
      ref={containerRef}
      style={containerStyle}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Left panel column — layers + scenarios stacked vertically */}
      <div style={{
        position: 'absolute',
        left: 12,
        top: 12,
        bottom: 12,
        zIndex: 10,
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        pointerEvents: 'none',
      }}>
        {/* Branding */}
        <div style={{ pointerEvents: 'auto', padding: '2px 10px' }}>
          <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '1.5px', color: 'rgba(255,255,255,0.35)' }}>COPPER</span>
          <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '1.5px', color: '#B87333' }}>CO</span>
        </div>

        {/* Layer selector panel */}
        <div style={{ ...panelStyles.container, position: 'relative', left: 'auto', top: 'auto', transform: 'none', pointerEvents: 'auto' }}>
          <div
            style={{ fontSize: '10px', fontWeight: 600, color: 'rgba(255,255,255,0.6)', padding: '2px 10px', letterSpacing: '0.5px', textTransform: 'uppercase', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
            onClick={() => setLayersOpen(p => !p)}
          >
            Layers
            <span style={{ fontSize: '8px', opacity: 0.5 }}>{layersOpen ? '\u25B2' : '\u25BC'}</span>
          </div>
          {layersOpen && (<>
            {NODE_LAYERS.map(({ key, label, color }) => {
              const active = layers.has(key);
              return (
                <button
                  key={key}
                  style={{
                    ...panelStyles.button,
                    background: active ? 'rgba(255,255,255,0.12)' : 'transparent',
                    color: active ? '#fff' : 'rgba(255,255,255,0.35)',
                  }}
                  onClick={() => toggleLayer(key)}
                >
                  <span
                    style={{
                      ...panelStyles.dot,
                      background: active ? color : 'transparent',
                      border: `2px solid ${active ? color : 'rgba(255,255,255,0.2)'}`,
                    }}
                  />
                  {label}
                </button>
              );
            })}
            <div style={{ height: '1px', background: 'rgba(255,255,255,0.12)', margin: '2px 6px' }} />
            {DISPLAY_LAYERS.map(({ key, label, color }) => {
              const active = layers.has(key);
              return (
                <button
                  key={key}
                  style={{
                    ...panelStyles.button,
                    background: active ? 'rgba(255,255,255,0.12)' : 'transparent',
                    color: active ? '#fff' : 'rgba(255,255,255,0.35)',
                  }}
                  onClick={() => toggleLayer(key)}
                >
                  <span
                    style={{
                      ...panelStyles.dot,
                      background: active ? color : 'transparent',
                      border: `2px solid ${active ? color : 'rgba(255,255,255,0.2)'}`,
                    }}
                  />
                  {label}
                </button>
              );
            })}
          </>)}
        </div>

        {/* Scenario selector panel */}
        <div style={{ ...panelStyles.container, position: 'relative', left: 'auto', top: 'auto', transform: 'none', pointerEvents: 'auto', flex: scenariosOpen ? '1 1 auto' : '0 0 auto', minHeight: 0 }}>
          <div
            style={{ fontSize: '10px', fontWeight: 600, color: 'rgba(255,255,255,0.6)', padding: '2px 10px', letterSpacing: '0.5px', textTransform: 'uppercase', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
            onClick={() => setScenariosOpen(p => !p)}
          >
            Scenarios
            <span style={{ fontSize: '8px', opacity: 0.5 }}>{scenariosOpen ? '\u25B2' : '\u25BC'}</span>
          </div>
          {scenariosOpen && (
          <div style={{ overflowY: 'auto', flex: '1 1 0', minHeight: 0, display: 'flex', flexDirection: 'column', gap: '4px' }}><>
            {scenarios.filter(s => !s.isCustom).map((s) => {
              const isActive = activeScenarioId === s.id;
              return (
                <button
                  key={s.id}
                  style={{
                    ...panelStyles.button,
                    background: isActive ? 'rgba(255,255,255,0.12)' : 'transparent',
                    color: isActive ? '#fff' : 'rgba(255,255,255,0.35)',
                  }}
                  onClick={() => handleScenarioClick(s.id)}
                >
                  <span
                    style={{
                      ...panelStyles.dot,
                      background: isActive ? '#88ccff' : 'transparent',
                      border: `2px solid ${isActive ? '#88ccff' : 'rgba(255,255,255,0.2)'}`,
                    }}
                  />
                  {s.name}
                </button>
              );
            })}
            {scenarios.some(s => s.isCustom) && (
              <>
                <div style={{ height: '1px', background: 'rgba(255,255,255,0.12)', margin: '4px 6px' }} />
                <div style={{ fontSize: '9px', fontWeight: 600, color: 'rgba(255,255,255,0.4)', padding: '2px 10px', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                  Custom
                </div>
                {scenarios.filter(s => s.isCustom).map((s) => {
                  const isActive = activeScenarioId === s.id;
                  return (
                    <button
                      key={s.id}
                      style={{
                        ...panelStyles.button,
                        background: isActive ? 'rgba(255,255,255,0.12)' : 'transparent',
                        color: isActive ? '#fff' : 'rgba(255,255,255,0.35)',
                      }}
                      onClick={() => handleScenarioClick(s.id)}
                    >
                      <span
                        style={{
                          ...panelStyles.dot,
                          background: isActive ? '#a0e0a0' : 'transparent',
                          border: `2px solid ${isActive ? '#a0e0a0' : 'rgba(255,255,255,0.2)'}`,
                        }}
                      />
                      {s.name}
                    </button>
                  );
                })}
              </>
            )}
            <button
              style={{
                ...panelStyles.button,
                background: activeScenarioId ? 'rgba(255,255,255,0.08)' : 'transparent',
                color: activeScenarioId ? 'rgba(255,150,150,0.8)' : 'rgba(255,255,255,0.25)',
                justifyContent: 'center',
                marginTop: '2px',
              }}
              onClick={onReset}
            >
              Reset
            </button>
          </></div>)}
        </div>
      </div>

      <svg
        viewBox={`${-VB_PAD} ${-VB_PAD} ${VIEWBOX_SIZE + 2 * VB_PAD} ${VIEWBOX_SIZE + 2 * VB_PAD}`}
        style={{ width: '100%', height: '100%' }}
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <filter id="glow" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
          <filter id="glow-strong" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        <g transform={svgTransform} style={{ transformOrigin: `${CX}px ${CY}px` }}>
          {/* Background */}
          <rect x={-400} y={-400} width={VIEWBOX_SIZE + 800} height={VIEWBOX_SIZE + 800} fill={BG_COLOR} />

          {/* Ring boundary orbits — only shown with their zone */}
          {layers.has('npv') && <circle cx={CX} cy={CY} r={ZONE_NPV_OUTER} fill="none" stroke={STROKE_NPV} strokeWidth={1.5} />}
          {layers.has('vd') && <circle cx={CX} cy={CY} r={ZONE_VD_OUTER} fill="none" stroke={STROKE_VD} strokeWidth={1.5} />}
          {layers.has('om') && <circle cx={CX} cy={CY} r={ZONE_OM_OUTER} fill="none" stroke={STROKE_OM} strokeWidth={1.5} />}
          {layers.has('cap') && <circle cx={CX} cy={CY} r={ZONE_CAP_OUTER} fill="none" stroke={STROKE_CAP} strokeWidth={1.5} />}
          {layers.has('tasks') && departmentArcs.map((dept, i) => (
            <path
              key={`zone-task-${i}`}
              d={describeArc(CX, CY, ZONE_TASK_OUTER, dept.startAngle - 1, dept.endAngle + 1, false)}
              fill="none"
              stroke={STROKE_TASK}
              strokeWidth={1.5}
            />
          ))}

          {/* === EDGES === */}

          {/* Task → Capability */}
          {showTaskCapEdges && taskToCapEdges.map((edge, i) => {
            const taskHighlighted = highlightConnectedNodes.has(edge.from.id);
            const capHighlighted = highlightConnectedNodes.has(edge.to.id);
            // If a specific task is highlighted, only show that task's edge
            // Otherwise fall back to showing all edges to highlighted capabilities
            const onPath = taskHighlighted || capHighlighted;
            if (hasHighlight && !onPath) return null;
            return (
              <line
                key={`tc-${i}`}
                x1={edge.from.x} y1={edge.from.y}
                x2={edge.to.x} y2={edge.to.y}
                stroke={`rgba(${EDGE_COLOR},${hasHighlight ? 0.9 : 0.7})`}
                strokeWidth={hasHighlight ? 1.5 : 1}
              />
            );
          })}

          {/* Capability → OM */}
          {showCapOmEdges && capToOmEdges.map((edge, i) => {
            const onPath = highlightConnectedNodes.has(edge.from.id) && highlightConnectedNodes.has(edge.to.id);
            if (hasHighlight && !onPath) return null;
            return (
              <line
                key={`co-${i}`}
                x1={edge.from.x} y1={edge.from.y}
                x2={edge.to.x} y2={edge.to.y}
                stroke={`rgba(${EDGE_COLOR},${hasHighlight ? 0.9 : 0.7})`}
                strokeWidth={hasHighlight ? 1.5 : 1}
              />
            );
          })}

          {/* OM → VD */}
          {showOmVdEdges && omToVdEdges.map((edge, i) => {
            const onPath = highlightConnectedNodes.has(edge.from.id) && highlightConnectedNodes.has(edge.to.id);
            if (hasHighlight && !onPath) return null;
            return (
              <line
                key={`ov-${i}`}
                x1={edge.from.x} y1={edge.from.y}
                x2={edge.to.x} y2={edge.to.y}
                stroke={`rgba(${EDGE_COLOR},${hasHighlight ? 0.9 : 0.7})`}
                strokeWidth={hasHighlight ? 1.5 : 1}
              />
            );
          })}

          {/* VD → NPV */}
          {showVdNpvEdges && vdPositions.map((vd, i) => {
            const onPath = highlightConnectedNodes.has(vd.id);
            if (hasHighlight && !onPath) return null;
            return (
              <line
                key={`vn-${i}`}
                x1={vd.x} y1={vd.y}
                x2={CX} y2={CY}
                stroke={`rgba(${EDGE_COLOR},${hasHighlight ? 0.9 : 0.7})`}
                strokeWidth={hasHighlight ? 1.5 : 1}
              />
            );
          })}

          {/* === NODES === */}

          {/* Task dots */}
          {layers.has('tasks') && taskPositions.map((task) => {
            const onPath = highlightConnectedNodes.has(task.id) || highlightConnectedNodes.has(task.capabilityId);
            const dimmed = hasHighlight && !onPath;
            return (
              <circle
                key={`t-${task.id}`}
                cx={task.x} cy={task.y}
                r={TASK_R}
                fill={dimmed ? NODE_DIM : NODE_COLOR}
                filter={dimmed ? undefined : 'url(#glow)'}
                opacity={dimmed ? 0.3 : 0.9}
                style={{ cursor: 'pointer' }}
                onClick={() => onTaskClick(task.id, task.capabilityId)}
              />
            );
          })}

          {/* Capability nodes */}
          {layers.has('cap') && capPositions.map((node) => {
            const dimmed = hasHighlight && !highlightConnectedNodes.has(node.id);
            const isSelected = selectedNodeId === node.id;
            const sizeMultiplier = nodeSizeMultipliers.get(node.id) ?? 1;
            const baseR = CAP_R * sizeMultiplier;
            return (
              <circle
                key={`c-${node.id}`}
                cx={node.x} cy={node.y}
                r={isSelected ? baseR + 1.5 : baseR}
                fill={dimmed ? NODE_DIM : NODE_COLOR}
                filter={dimmed ? undefined : 'url(#glow)'}
                opacity={dimmed ? 0.4 : 1}
                style={{ cursor: 'pointer' }}
                data-interactive="true"
                onClick={() => onNodeClick(node.id)}
              />
            );
          })}

          {/* OM nodes */}
          {layers.has('om') && omPositions.map((node) => {
            const dimmed = hasHighlight && !highlightConnectedNodes.has(node.id);
            const isSelected = selectedNodeId === node.id;
            const sizeMultiplier = nodeSizeMultipliers.get(node.id) ?? 1;
            const baseR = OM_R * sizeMultiplier;
            return (
              <circle
                key={`o-${node.id}`}
                cx={node.x} cy={node.y}
                r={isSelected ? baseR + 2 : baseR}
                fill={dimmed ? NODE_DIM : NODE_COLOR}
                filter={dimmed ? undefined : 'url(#glow)'}
                opacity={dimmed ? 0.4 : 1}
                style={{ cursor: 'pointer' }}
                data-interactive="true"
                onClick={() => onNodeClick(node.id)}
              />
            );
          })}

          {/* VD nodes */}
          {layers.has('vd') && vdPositions.map((node) => {
            const dimmed = hasHighlight && !highlightConnectedNodes.has(node.id);
            const isSelected = selectedNodeId === node.id;
            const sizeMultiplier = nodeSizeMultipliers.get(node.id) ?? 1;
            const baseR = VD_R * sizeMultiplier;
            return (
              <circle
                key={`v-${node.id}`}
                cx={node.x} cy={node.y}
                r={isSelected ? baseR + 2 : baseR}
                fill={dimmed ? NODE_DIM : NODE_COLOR}
                filter={dimmed ? undefined : 'url(#glow-strong)'}
                opacity={dimmed ? 0.4 : 1}
                style={{ cursor: 'pointer' }}
                data-interactive="true"
                onClick={() => onNodeClick(node.id)}
              />
            );
          })}

          {/* NPV center */}
          {layers.has('npv') && (
            <circle
              cx={CX} cy={CY}
              r={NPV_R * (nodeSizeMultipliers.get('NPV') ?? 1)}
              fill={NODE_COLOR}
              filter="url(#glow-strong)"
              style={{ cursor: 'pointer' }}
              data-interactive="true"
              onClick={() => onNodeClick('NPV')}
            />
          )}

          {/* === LABELS (positioned above each node) === */}
          {layers.has('labels') && (
            <>
              {/* NPV label */}
              {layers.has('npv') && (
                <text x={CX} y={CY - (NPV_R * (nodeSizeMultipliers.get('NPV') ?? 1)) - 4} textAnchor="middle" dominantBaseline="auto" fill="#fff" fontSize="5" fontWeight={600}>NPV</text>
              )}

              {/* VD labels */}
              {layers.has('vd') && vdPositions.map((node) => {
                const name = vdNames.get(node.id) ?? node.id;
                const r = VD_R * (nodeSizeMultipliers.get(node.id) ?? 1);
                return (
                  <text
                    key={`lv-${node.id}`}
                    x={node.x} y={node.y - r - 3}
                    textAnchor="middle"
                    dominantBaseline="auto"
                    fill="rgba(255,255,255,0.8)"
                    fontSize="5"
                  >
                    {name}
                  </text>
                );
              })}

              {/* OM labels */}
              {layers.has('om') && omPositions.map((node) => {
                const name = omNames.get(node.id) ?? node.id;
                const r = OM_R * (nodeSizeMultipliers.get(node.id) ?? 1);
                return (
                  <text
                    key={`lo-${node.id}`}
                    x={node.x} y={node.y - r - 3}
                    textAnchor="middle"
                    dominantBaseline="auto"
                    fill="rgba(255,255,255,0.7)"
                    fontSize="5"
                  >
                    {name}
                  </text>
                );
              })}

              {/* Capability labels */}
              {layers.has('cap') && capPositions.map((node) => {
                const name = capNames.get(node.id) ?? node.id;
                const r = CAP_R * (nodeSizeMultipliers.get(node.id) ?? 1);
                return (
                  <text
                    key={`lc-${node.id}`}
                    x={node.x} y={node.y - r - 2}
                    textAnchor="middle"
                    dominantBaseline="auto"
                    fill="rgba(255,255,255,0.6)"
                    fontSize="5"
                  >
                    {name}
                  </text>
                );
              })}

              {/* Task labels — rotated radially outward */}
              {layers.has('tasks') && taskPositions.map((task) => {
                const radialAngle = Math.atan2(task.y - CY, task.x - CX) * 180 / Math.PI;
                const onLeftHalf = radialAngle > 90 || radialAngle < -90;
                const rotation = onLeftHalf ? radialAngle + 180 : radialAngle;
                const anchor = onLeftHalf ? 'end' : 'start';
                const offset = TASK_R + 3;
                const ox = task.x + Math.cos(radialAngle * Math.PI / 180) * offset;
                const oy = task.y + Math.sin(radialAngle * Math.PI / 180) * offset;
                return (
                  <text
                    key={`lt-${task.id}`}
                    x={ox} y={oy}
                    textAnchor={anchor}
                    dominantBaseline="central"
                    fill="rgba(255,255,255,0.45)"
                    fontSize="5"
                    transform={`rotate(${rotation}, ${ox}, ${oy})`}
                  >
                    {task.name}
                  </text>
                );
              })}
            </>
          )}

          {/* === VALUES (positioned below each node) === */}
          {layers.has('values') && (
            <>
              {/* NPV value */}
              {layers.has('npv') && (
                <text x={CX} y={CY + (NPV_R * (nodeSizeMultipliers.get('NPV') ?? 1)) + 8} textAnchor="middle" dominantBaseline="hanging" fill={valueFill(forwardResult.npv, baselineResult.npv, activeScenarioId !== null)} fontSize="5" fontWeight={600}>
                  ${Math.round(forwardResult.npv).toLocaleString()}M
                </text>
              )}

              {/* VD values */}
              {layers.has('vd') && vdPositions.map((node) => {
                const val = forwardResult.vdValues[node.id];
                if (val === undefined) return null;
                const baseVal = baselineResult.vdValues[node.id] ?? val;
                const r = VD_R * (nodeSizeMultipliers.get(node.id) ?? 1);
                const unit = vdUnits.get(node.id) ?? '';
                return (
                  <text
                    key={`vv-${node.id}`}
                    x={node.x} y={node.y + r + 2}
                    textAnchor="middle"
                    dominantBaseline="hanging"
                    fill={valueFill(val, baseVal, activeScenarioId !== null)}
                    fontSize="5"
                  >
                    {val.toFixed(2)} {unit}
                  </text>
                );
              })}

              {/* OM values */}
              {layers.has('om') && omPositions.map((node) => {
                const state = forwardResult.nodeStates.get(node.id);
                if (!state) return null;
                const baseState = baselineResult.nodeStates.get(node.id);
                const baseMean = baseState?.mean ?? state.mean;
                const r = OM_R * (nodeSizeMultipliers.get(node.id) ?? 1);
                const unit = omUnits.get(node.id) ?? '';
                return (
                  <text
                    key={`vo-${node.id}`}
                    x={node.x} y={node.y + r + 2}
                    textAnchor="middle"
                    dominantBaseline="hanging"
                    fill={valueFill(state.mean, baseMean, activeScenarioId !== null)}
                    fontSize="5"
                  >
                    {state.mean.toFixed(3)} {unit}
                  </text>
                );
              })}

              {/* Capability values */}
              {layers.has('cap') && capPositions.map((node) => {
                const state = forwardResult.nodeStates.get(node.id);
                if (!state) return null;
                const baseState = baselineResult.nodeStates.get(node.id);
                const baseMean = baseState?.mean ?? state.mean;
                const r = CAP_R * (nodeSizeMultipliers.get(node.id) ?? 1);
                return (
                  <text
                    key={`vc-${node.id}`}
                    x={node.x} y={node.y + r + 1.5}
                    textAnchor="middle"
                    dominantBaseline="hanging"
                    fill={valueFill(state.mean, baseMean, activeScenarioId !== null)}
                    fontSize="5"
                  >
                    {state.mean.toFixed(3)}
                  </text>
                );
              })}
            </>
          )}

          {/* === DEPARTMENT LABELS (curved text along outer ring) === */}
          {layers.has('labels') && layers.has('tasks') && departmentArcs.map((dept, i) => {
            const mid = (((dept.startAngle + dept.endAngle) / 2) % 360 + 360) % 360;
            const flip = mid > 100 && mid < 260;
            return (
              <g key={`dept-${i}`}>
                <path
                  id={`dept-arc-${i}`}
                  d={describeArc(CX, CY, DEPT_LABEL_R, dept.startAngle - 2, dept.endAngle + 2, flip)}
                  fill="none"
                  stroke="none"
                />
                <text
                  fill={STROKE_TASK}
                  fontSize="8"
                  fontWeight={500}
                  letterSpacing="1.5"
                >
                  <textPath
                    href={`#dept-arc-${i}`}
                    startOffset="50%"
                    textAnchor="middle"
                  >
                    {dept.name}
                  </textPath>
                </text>
              </g>
            );
          })}
        </g>
      </svg>
    </div>
  );
}
