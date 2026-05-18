import type { Capability, OperationalMetric, ValueDriver, Scenario, Network } from './types.js';

import capabilitiesData from '../data/capabilities.json';
import operationalMetricsData from '../data/operationalMetrics.json';
import valueDriversData from '../data/valueDrivers.json';
import scenariosData from '../data/scenarios.json';

/**
 * Load the simplified LGBN network from JSON data files.
 * Topological order: C1..C12, OM1..OM7, VD1..VD7
 */
export function loadNetwork(): Network {
  const capabilities = new Map<string, Capability>();
  for (const c of capabilitiesData as Capability[]) {
    capabilities.set(c.id, { ...c });
  }

  const operationalMetrics = new Map<string, OperationalMetric>();
  for (const om of operationalMetricsData as OperationalMetric[]) {
    operationalMetrics.set(om.id, { ...om });
  }

  const valueDrivers = new Map<string, ValueDriver>();
  for (const vd of valueDriversData as ValueDriver[]) {
    valueDrivers.set(vd.id, { ...vd });
  }

  const scenarios = new Map<string, Scenario>();
  for (const s of scenariosData as Scenario[]) {
    scenarios.set(s.id, { ...s });
  }

  // Topological order: capabilities first (roots), then OMs, then VDs
  const topoOrder: string[] = [];
  for (const id of capabilities.keys()) topoOrder.push(id);
  for (const id of operationalMetrics.keys()) topoOrder.push(id);
  for (const id of valueDrivers.keys()) topoOrder.push(id);

  return {
    capabilities,
    operationalMetrics,
    valueDrivers,
    scenarios,
    topoOrder,
  };
}
