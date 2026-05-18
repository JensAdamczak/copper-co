import { describe, it, expect } from 'vitest';
import { loadNetwork } from '../network.js';
import { forwardPass } from '../forward.js';
import type { ModelOverrides } from '../types.js';

describe('Forward pass', () => {
  const network = loadNetwork();

  it('produces baseline NPV in target range (~$2,100M ± 15%)', () => {
    const result = forwardPass(network);
    expect(result.npv).toBeGreaterThan(2100 * 0.85);
    expect(result.npv).toBeLessThan(2100 * 1.15);
  });

  it('ideal state NPV > baseline NPV', () => {
    const baseline = forwardPass(network);
    const ideal = forwardPass(network, undefined, true);
    expect(ideal.npv).toBeGreaterThan(baseline.npv);
  });

  it('ideal state NPV in target range (~$2,270M ± 15%)', () => {
    const ideal = forwardPass(network, undefined, true);
    expect(ideal.npv).toBeGreaterThan(2270 * 0.85);
    expect(ideal.npv).toBeLessThan(2270 * 1.15);
  });

  it('at baseline, OM values equal their baselines (by construction)', () => {
    const result = forwardPass(network);
    for (const [id, om] of network.operationalMetrics) {
      const state = result.nodeStates.get(id);
      expect(state).toBeDefined();
      expect(state!.mean).toBeCloseTo(om.baseline, 8);
    }
  });

  it('at baseline, VD values equal their base values (by construction)', () => {
    const result = forwardPass(network);
    for (const [id, vd] of network.valueDrivers) {
      expect(result.vdValues[id]).toBeCloseTo(vd.baseValue, 8);
    }
  });

  it('increasing a value capability capacity increases NPV', () => {
    const baseline = forwardPass(network);
    const overrides = new Map([['C1', { capacity: 0.20 }]]);
    const bumped = forwardPass(network, overrides);
    expect(bumped.npv).toBeGreaterThan(baseline.npv);
  });

  it('overhead capabilities have no outgoing edges (no OM/VD change)', () => {
    const baseline = forwardPass(network);
    // Change C11 (overhead) — should not affect OMs or VDs
    const overrides = new Map([['C11', { capacity: 0.20 }]]);
    const bumped = forwardPass(network, overrides);
    // NPV should be identical because C11 has no edges to OMs
    expect(bumped.npv).toBeCloseTo(baseline.npv, 5);
  });

  it('reducing noise on a value capability increases NPV', () => {
    const baseline = forwardPass(network);
    const overrides = new Map([['C1', { noiseSigma: 0.02 }]]);
    const bumped = forwardPass(network, overrides);
    expect(bumped.npv).toBeGreaterThan(baseline.npv);
  });

  it('capability variance is just σ² (root node)', () => {
    const result = forwardPass(network);
    const cap = network.capabilities.get('C1')!;
    const state = result.nodeStates.get('C1')!;
    expect(state.variance).toBeCloseTo(cap.baselineNoiseSigma ** 2, 8);
  });

  it('OM variance includes parent contributions (> own noise)', () => {
    const result = forwardPass(network);
    const om1 = network.operationalMetrics.get('OM1')!;
    const state = result.nodeStates.get('OM1')!;
    const ownNoise = om1.noiseSigma * om1.noiseSigma;
    // OM1 has parents with nonzero variance, so total variance > own noise
    expect(state.variance).toBeGreaterThan(ownNoise);
  });

  it('VD variance includes parent contributions (> own noise)', () => {
    const result = forwardPass(network);
    // Find a VD with parents that have nonzero variance
    for (const [id, vd] of network.valueDrivers) {
      if (vd.parents.length > 0) {
        const state = result.nodeStates.get(id)!;
        const ownNoise = vd.noiseSigma * vd.noiseSigma;
        expect(state.variance).toBeGreaterThan(ownNoise);
        break;
      }
    }
  });

  it('all node states are populated', () => {
    const result = forwardPass(network);
    // 12 capabilities + 7 OMs + 7 VDs = 26 nodes
    expect(result.nodeStates.size).toBe(26);
  });

  it('custom OM baseline shifts OM value and downstream VD', () => {
    const baseline = forwardPass(network);
    // Increase OM1 baseline from 92 to 95 — should shift OM1 value up by 3
    const overrides: ModelOverrides = {
      omBaselines: new Map([['OM1', 95.0]]),
    };
    const result = forwardPass(network, undefined, false, overrides);
    const om1Baseline = result.nodeStates.get('OM1')!;
    const om1Base = baseline.nodeStates.get('OM1')!;
    expect(om1Baseline.mean).toBeCloseTo(om1Base.mean + 3.0, 5);

    // VD1 (Throughput) depends on OM1 with weight 0.10
    // OM1 value = 95 (shifted baseline, no cap changes), original OM1 baseline = 92
    // VD delta = 0.10 × (95 - 92) = 0.3
    // VD1 = baseValue + 0.3 = 15.0 + 0.3 = 15.3
    const vd1Base = network.valueDrivers.get('VD1')!.baseValue;
    expect(result.vdValues['VD1']).toBeCloseTo(vd1Base + 0.3, 5);

    // Higher throughput → higher NPV
    expect(result.npv).toBeGreaterThan(baseline.npv);
  });

  it('custom VD base value shifts VD and NPV', () => {
    const baseline = forwardPass(network);
    // Increase VD1 (Throughput) base from 15.0 to 16.0
    const overrides: ModelOverrides = {
      vdBaseValues: new Map([['VD1', 16.0]]),
    };
    const result = forwardPass(network, undefined, false, overrides);
    // At baseline caps, OM deltas are 0, so VD1 = effective base = 16.0
    expect(result.vdValues['VD1']).toBeCloseTo(16.0, 5);
    // Higher throughput → higher NPV
    expect(result.npv).toBeGreaterThan(baseline.npv);
  });

  it('custom NPV params propagate through forward pass', () => {
    const baseline = forwardPass(network);
    const overrides: ModelOverrides = {
      npvParams: { cuPrice: 10000 },
    };
    const result = forwardPass(network, undefined, false, overrides);
    // Higher Cu price → higher NPV
    expect(result.npv).toBeGreaterThan(baseline.npv);
    // VD values should be unchanged (NPV params don't affect VD computation)
    expect(result.vdValues['VD1']).toBeCloseTo(baseline.vdValues['VD1'], 5);
  });

  it('model overrides with no values produces same result as no overrides', () => {
    const baseline = forwardPass(network);
    const result = forwardPass(network, undefined, false, {});
    expect(result.npv).toBeCloseTo(baseline.npv, 5);
    for (const [id] of network.valueDrivers) {
      expect(result.vdValues[id]).toBeCloseTo(baseline.vdValues[id], 8);
    }
  });
});
