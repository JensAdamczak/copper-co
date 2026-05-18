import { describe, it, expect } from 'vitest';
import { loadNetwork } from '../network.js';
import { forwardPass } from '../forward.js';
import { computeSensitivities } from '../sensitivity.js';

describe('Calibration targets', () => {
  const network = loadNetwork();

  it('baseline NPV ≈ $2,100M (±15%)', () => {
    const result = forwardPass(network);
    console.log('Baseline NPV:', result.npv.toFixed(1), '$M');
    expect(result.npv).toBeGreaterThan(2100 * 0.85); // > $1,785M
    expect(result.npv).toBeLessThan(2100 * 1.15);    // < $2,415M
  });

  it('ideal-state NPV ≈ $2,270M (±15%)', () => {
    const result = forwardPass(network, undefined, true);
    console.log('Ideal NPV:', result.npv.toFixed(1), '$M');
    expect(result.npv).toBeGreaterThan(2270 * 0.85); // > $1,930M
    expect(result.npv).toBeLessThan(2270 * 1.15);    // < $2,611M
  });

  it('uplift baseline→ideal is 5-30%', () => {
    const baseline = forwardPass(network);
    const ideal = forwardPass(network, undefined, true);
    const uplift = (ideal.npv - baseline.npv) / baseline.npv;
    console.log('Uplift:', (uplift * 100).toFixed(1), '%');
    expect(uplift).toBeGreaterThan(0.05);
    expect(uplift).toBeLessThan(0.30);
  });

  it('overhead capability sensitivity < $1M', () => {
    const results = computeSensitivities(network);
    const overheadResults = results.filter(r => r.type === 'coordination' || r.type === 'local');
    for (const r of overheadResults) {
      expect(Math.abs(r.capacitySensitivity)).toBeLessThan(1);
    }
  });

  it('baseline OM values = baselines exactly', () => {
    const result = forwardPass(network);
    for (const [id, om] of network.operationalMetrics) {
      const state = result.nodeStates.get(id);
      expect(state!.mean).toBeCloseTo(om.baseline, 8);
    }
  });

  it('baseline VD values = base values exactly', () => {
    const result = forwardPass(network);
    for (const [id, vd] of network.valueDrivers) {
      expect(result.vdValues[id]).toBeCloseTo(vd.baseValue, 8);
    }
  });
});
