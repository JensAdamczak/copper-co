import { describe, it, expect } from 'vitest';
import { loadNetwork } from '../network.js';
import { forwardPass } from '../forward.js';
import type { CapabilityParams } from '../types.js';

describe('Scenarios', () => {
  const network = loadNetwork();
  const baselineNPV = forwardPass(network).npv;

  function applyScenario(scenarioId: string): number {
    const scenario = network.scenarios.get(scenarioId);
    if (!scenario) throw new Error(`Scenario ${scenarioId} not found`);

    if (scenario.parameterOverrides.length === 0 && scenarioId === 'S8') {
      // S8 = full ideal state
      return forwardPass(network, undefined, true).npv;
    }

    if (scenario.parameterOverrides.length === 0) {
      // No overrides — just highlighting
      return baselineNPV;
    }

    const overrides = new Map<string, Partial<CapabilityParams>>();
    for (const po of scenario.parameterOverrides) {
      const existing = overrides.get(po.nodeId) ?? {};
      if (po.param === 'capacity') {
        existing.capacity = po.value;
      } else if (po.param === 'noiseSigma') {
        existing.noiseSigma = po.value;
      }
      overrides.set(po.nodeId, existing);
    }

    // Enforce capacity budget: rebalance unspecified capabilities
    const specifiedCapIds = new Set<string>();
    let specifiedSum = 0;
    for (const [id, ov] of overrides) {
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
        const existing = overrides.get(id) ?? {};
        existing.capacity = Math.max(0.01, cap.baselineCapacity * scale);
        overrides.set(id, existing);
      }
    }

    return forwardPass(network, overrides).npv;
  }

  it('S1 (Recovery path) improves NPV', () => {
    const npv = applyScenario('S1');
    expect(npv).toBeGreaterThan(baselineNPV);
  });

  it('S2 (Grade path) improves NPV', () => {
    const npv = applyScenario('S2');
    expect(npv).toBeGreaterThan(baselineNPV);
  });

  it('S3 (Maintenance path) improves NPV', () => {
    const npv = applyScenario('S3');
    expect(npv).toBeGreaterThan(baselineNPV);
  });

  it('S4 (Information architecture) improves NPV', () => {
    const npv = applyScenario('S4');
    expect(npv).toBeGreaterThan(baselineNPV);
  });

  it('S5 (Capital accuracy) improves NPV', () => {
    const npv = applyScenario('S5');
    expect(npv).toBeGreaterThan(baselineNPV);
  });

  it('S6 (Dead ends) reduces NPV when local optimization capacity doubled', () => {
    const npv = applyScenario('S6');
    expect(npv).toBeLessThan(baselineNPV);
  });

  it('S7 (Coordination overhead) reduces NPV when overhead grows', () => {
    const npv = applyScenario('S7');
    expect(npv).toBeLessThan(baselineNPV);
  });

  it('S8 (Full architecture shift) provides large NPV improvement', () => {
    const npv = applyScenario('S8');
    const uplift = npv - baselineNPV;
    expect(uplift).toBeGreaterThan(150); // At least $150M uplift
  });
});
