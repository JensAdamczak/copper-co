import { describe, it, expect } from 'vitest';
import { loadNetwork } from '../network.js';
import { computeSensitivities } from '../sensitivity.js';

describe('Sensitivity analysis', () => {
  const network = loadNetwork();

  it('value capabilities have positive capacity sensitivity', () => {
    const results = computeSensitivities(network);
    const valueResults = results.filter(r => r.type === 'value');
    for (const r of valueResults) {
      expect(r.capacitySensitivity).toBeGreaterThan(0);
    }
  });

  it('overhead capabilities have near-zero sensitivity', () => {
    const results = computeSensitivities(network);
    const overheadResults = results.filter(r => r.type === 'coordination' || r.type === 'local');
    for (const r of overheadResults) {
      expect(Math.abs(r.capacitySensitivity)).toBeLessThan(1);
      expect(Math.abs(r.noiseSensitivity)).toBeLessThan(1);
    }
  });

  it('C1 and C4 are in top 5 by capacity sensitivity', () => {
    const results = computeSensitivities(network);
    const top5 = results.slice(0, 5).map(r => r.capabilityId);
    expect(top5).toContain('C1');
    expect(top5).toContain('C4');
  });

  it('noise sensitivity is positive (reducing noise helps)', () => {
    const results = computeSensitivities(network);
    const valueResults = results.filter(r => r.type === 'value');
    for (const r of valueResults) {
      expect(r.noiseSensitivity).toBeGreaterThanOrEqual(0);
    }
  });

  it('returns 14 results (one per capability)', () => {
    const results = computeSensitivities(network);
    expect(results.length).toBe(14);
  });
});
