import { describe, it, expect } from 'vitest';
import { computeNPV, computeNPVFromRecord } from '../npv.js';

describe('NPV calculation', () => {
  it('computes correct NPV for known base values', () => {
    const npv = computeNPV({
      throughput: 15.0,
      headGrade: 0.45,
      recovery: 88.0,
      miningCost: 120,
      processingCost: 95,
      maintenanceCost: 65,
      gaCost: 90,
    });

    // Revenue = 15 * 1e6 * 0.0045 * 0.88 * 8420 / 1e6 = 500.148 M/yr
    // Cost = 370 M/yr, FCF = 130.148 M/yr
    // Annuity factor at 8% for 20 years = 9.818
    // NPV ≈ 130.148 * 9.818 ≈ 1278 M
    expect(npv).toBeCloseTo(1278, -1);
  });

  it('NPV increases with higher throughput', () => {
    const base = computeNPV({ throughput: 15.0, headGrade: 0.45, recovery: 88.0, miningCost: 120, processingCost: 95, maintenanceCost: 65, gaCost: 90 });
    const higher = computeNPV({ throughput: 16.0, headGrade: 0.45, recovery: 88.0, miningCost: 120, processingCost: 95, maintenanceCost: 65, gaCost: 90 });
    expect(higher).toBeGreaterThan(base);
  });

  it('NPV increases with higher recovery', () => {
    const base = computeNPV({ throughput: 15.0, headGrade: 0.45, recovery: 88.0, miningCost: 120, processingCost: 95, maintenanceCost: 65, gaCost: 90 });
    const higher = computeNPV({ throughput: 15.0, headGrade: 0.45, recovery: 90.0, miningCost: 120, processingCost: 95, maintenanceCost: 65, gaCost: 90 });
    expect(higher).toBeGreaterThan(base);
  });

  it('NPV decreases with higher costs', () => {
    const base = computeNPV({ throughput: 15.0, headGrade: 0.45, recovery: 88.0, miningCost: 120, processingCost: 95, maintenanceCost: 65, gaCost: 90 });
    const higher = computeNPV({ throughput: 15.0, headGrade: 0.45, recovery: 88.0, miningCost: 150, processingCost: 95, maintenanceCost: 65, gaCost: 90 });
    expect(higher).toBeLessThan(base);
  });

  it('computeNPVFromRecord matches computeNPV', () => {
    const direct = computeNPV({ throughput: 15.0, headGrade: 0.45, recovery: 88.0, miningCost: 120, processingCost: 95, maintenanceCost: 65, gaCost: 90 });
    const fromRecord = computeNPVFromRecord({ VD1: 15.0, VD2: 0.45, VD3: 88.0, VD4: 120, VD5: 95, VD6: 65, VD7: 90 });
    expect(fromRecord).toBeCloseTo(direct, 5);
  });

  it('custom Cu price changes NPV proportionally', () => {
    const vd = { throughput: 15.0, headGrade: 0.45, recovery: 88.0, miningCost: 120, processingCost: 95, maintenanceCost: 65, gaCost: 90 };
    const baseNPV = computeNPV(vd);
    const highPrice = computeNPV(vd, { cuPrice: 10000 });
    const lowPrice = computeNPV(vd, { cuPrice: 5000 });
    expect(highPrice).toBeGreaterThan(baseNPV);
    expect(lowPrice).toBeLessThan(baseNPV);
  });

  it('custom discount rate changes NPV', () => {
    const vd = { throughput: 15.0, headGrade: 0.45, recovery: 88.0, miningCost: 120, processingCost: 95, maintenanceCost: 65, gaCost: 90 };
    const baseNPV = computeNPV(vd);
    const lowRate = computeNPV(vd, { discountRate: 0.05 });
    const highRate = computeNPV(vd, { discountRate: 0.12 });
    // Lower discount rate → higher NPV (future cash flows worth more)
    expect(lowRate).toBeGreaterThan(baseNPV);
    expect(highRate).toBeLessThan(baseNPV);
  });

  it('custom years changes NPV', () => {
    const vd = { throughput: 15.0, headGrade: 0.45, recovery: 88.0, miningCost: 120, processingCost: 95, maintenanceCost: 65, gaCost: 90 };
    const baseNPV = computeNPV(vd);
    const moreYears = computeNPV(vd, { years: 30 });
    const fewerYears = computeNPV(vd, { years: 10 });
    // More years → higher NPV (more cash flows), fewer → lower
    expect(moreYears).toBeGreaterThan(baseNPV);
    expect(fewerYears).toBeLessThan(baseNPV);
  });

  it('computeNPVFromRecord passes params through', () => {
    const record = { VD1: 15.0, VD2: 0.45, VD3: 88.0, VD4: 120, VD5: 95, VD6: 65, VD7: 90 };
    const withParams = computeNPVFromRecord(record, { cuPrice: 10000 });
    const direct = computeNPV({ throughput: 15.0, headGrade: 0.45, recovery: 88.0, miningCost: 120, processingCost: 95, maintenanceCost: 65, gaCost: 90 }, { cuPrice: 10000 });
    expect(withParams).toBeCloseTo(direct, 5);
  });
});
