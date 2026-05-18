import { describe, it, expect } from 'vitest';
import { loadNetwork } from '../network.js';
import {
  buildJointCovariance,
  condition,
  diagnose,
  invertMatrix,
  matMul,
  identity,
} from '../inference.js';

describe('Matrix utilities', () => {
  it('invertMatrix produces identity when multiplied by original', () => {
    const A = [
      [2, 1, 0],
      [1, 3, 1],
      [0, 1, 2],
    ];
    const inv = invertMatrix(A);
    const product = matMul(A, inv);
    const I = identity(3);
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        expect(product[i][j]).toBeCloseTo(I[i][j], 8);
      }
    }
  });

  it('invertMatrix handles 1x1', () => {
    const A = [[4]];
    const inv = invertMatrix(A);
    expect(inv[0][0]).toBeCloseTo(0.25, 8);
  });

  it('invertMatrix throws for singular matrix', () => {
    const A = [
      [1, 2],
      [2, 4],
    ];
    expect(() => invertMatrix(A)).toThrow();
  });
});

describe('Gaussian conditioning', () => {
  const network = loadNetwork();

  it('observing at prior mean produces no shift', () => {
    const { nodeOrder, covariance, means } = buildJointCovariance(network);

    // Observe OM1 at its prior mean
    const om1Idx = nodeOrder.indexOf('OM1');
    const observations = [{ nodeId: 'OM1', value: means[om1Idx] }];

    const results = condition(nodeOrder, covariance, means, observations);
    const capResults = results.filter(r => r.nodeId.startsWith('C'));

    for (const r of capResults) {
      expect(Math.abs(r.shift)).toBeLessThan(1e-8);
    }
  });

  it('conditioning reduces variance', () => {
    const { nodeOrder, covariance, means } = buildJointCovariance(network);

    // Observe OM1 above its prior mean
    const om1Idx = nodeOrder.indexOf('OM1');
    const observations = [{ nodeId: 'OM1', value: means[om1Idx] + 2 }];

    const results = condition(nodeOrder, covariance, means, observations);
    const capResults = results.filter(r => r.nodeId.startsWith('C'));

    // At least some capabilities should have reduced posterior variance
    const anyReduced = capResults.some(r => r.posteriorVariance < r.priorVariance);
    expect(anyReduced).toBe(true);
  });

  it('observing higher OM1 shifts C4 posterior upward', () => {
    const { nodeOrder, covariance, means } = buildJointCovariance(network);

    // C4 is a primary parent of OM1 with positive weight
    const om1Idx = nodeOrder.indexOf('OM1');
    const observations = [{ nodeId: 'OM1', value: means[om1Idx] + 5 }];

    const results = condition(nodeOrder, covariance, means, observations);
    const c4Result = results.find(r => r.nodeId === 'C4');

    expect(c4Result).toBeDefined();
    expect(c4Result!.shift).toBeGreaterThan(0);
  });

  it('diagnose returns capabilities sorted by |shift|', () => {
    const results = diagnose(network, [{ nodeId: 'OM1', value: 95 }]);
    expect(results.length).toBeGreaterThan(0);

    // Check sorted by |shift| descending
    for (let i = 1; i < results.length; i++) {
      expect(Math.abs(results[i - 1].shift)).toBeGreaterThanOrEqual(
        Math.abs(results[i].shift),
      );
    }
  });
});
