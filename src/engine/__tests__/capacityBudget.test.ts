import { describe, it, expect } from 'vitest';
import { loadNetwork } from '../network.js';
import { rebalanceCapacity } from '../capacityBudget.js';

describe('Capacity budget rebalancing', () => {
  const network = loadNetwork();

  it('sum is preserved at 1.0 after rebalancing', () => {
    const overrides = new Map<string, { capacity?: number; noiseSigma?: number }>();
    const locked = new Set<string>();

    const result = rebalanceCapacity(network, 'C1', 0.20, overrides, locked);

    let total = 0;
    for (const [id] of network.capabilities) {
      total += result.get(id) ?? network.capabilities.get(id)!.baselineCapacity;
    }
    expect(total).toBeCloseTo(1.0, 4);
  });

  it('respects locked capabilities', () => {
    const overrides = new Map<string, { capacity?: number; noiseSigma?: number }>();
    const locked = new Set(['C2', 'C3']);

    const result = rebalanceCapacity(network, 'C1', 0.20, overrides, locked);

    // Locked capabilities should keep their baseline values
    expect(result.get('C2')).toBeCloseTo(0.10, 4);
    expect(result.get('C3')).toBeCloseTo(0.10, 4);
  });

  it('proportional redistribution preserves relative proportions', () => {
    const overrides = new Map<string, { capacity?: number; noiseSigma?: number }>();
    const locked = new Set<string>();

    const result = rebalanceCapacity(network, 'C1', 0.20, overrides, locked);

    // C4 and C1 had same baseline (0.12); C4 should have been scaled down
    const c4 = result.get('C4')!;
    const c5 = result.get('C5')!;
    // C4 baseline = 0.12, C5 baseline = 0.08
    // Their ratio should be preserved: C4/C5 ~ 0.12/0.08 = 1.5
    expect(c4 / c5).toBeCloseTo(1.5, 1);
  });

  it('changed capability gets the requested value', () => {
    const overrides = new Map<string, { capacity?: number; noiseSigma?: number }>();
    const locked = new Set<string>();

    const result = rebalanceCapacity(network, 'C1', 0.25, overrides, locked);
    expect(result.get('C1')).toBeCloseTo(0.25, 4);
  });

  it('clamps minimum capacity at 0.01', () => {
    const overrides = new Map<string, { capacity?: number; noiseSigma?: number }>();
    const locked = new Set<string>();

    // Set C1 very high — others should still be >= 0.01
    const result = rebalanceCapacity(network, 'C1', 0.85, overrides, locked);

    for (const [id] of network.capabilities) {
      if (id === 'C1') continue;
      expect(result.get(id)!).toBeGreaterThanOrEqual(0.01);
    }
  });
});
