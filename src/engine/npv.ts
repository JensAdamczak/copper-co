/**
 * DCF-based NPV calculation for the copper mining operation.
 *
 * Cu produced (t/yr) = throughput (Mt) × 1,000,000 × (headGrade% / 100) × (recovery% / 100)
 * Revenue ($M/yr) = Cu produced × $8,420/t ÷ 1,000,000
 * Cost ($M/yr) = mining + processing + maintenance + G&A
 * Annual FCF ($M) = revenue − cost
 * NPV ($M) = Σ FCF / 1.08^t for t = 1..20
 */

import type { NPVParams } from './types.js';

export const DEFAULT_CU_PRICE = 8420; // $/t Cu
export const DEFAULT_DISCOUNT_RATE = 0.08;
export const DEFAULT_YEARS = 20;

export interface VDValues {
  throughput: number;   // Mtpa (VD1)
  headGrade: number;    // % Cu (VD2)
  recovery: number;     // % (VD3)
  miningCost: number;   // $M/yr (VD4)
  processingCost: number; // $M/yr (VD5)
  maintenanceCost: number; // $M/yr (VD6)
  gaCost: number;       // $M/yr (VD7)
}

export function computeNPV(vd: VDValues, params?: Partial<NPVParams>): number {
  const cuPrice = params?.cuPrice ?? DEFAULT_CU_PRICE;
  const discountRate = params?.discountRate ?? DEFAULT_DISCOUNT_RATE;
  const years = params?.years ?? DEFAULT_YEARS;

  const cuProduced = vd.throughput * 1_000_000 * (vd.headGrade / 100) * (vd.recovery / 100);
  const revenue = cuProduced * cuPrice / 1_000_000; // $M/yr

  const cost = vd.miningCost + vd.processingCost + vd.maintenanceCost + vd.gaCost;
  const annualFCF = revenue - cost;

  let npv = 0;
  for (let t = 1; t <= years; t++) {
    npv += annualFCF / Math.pow(1 + discountRate, t);
  }
  return npv; // $M
}

/**
 * Compute NPV from a record keyed by value driver IDs.
 */
export function computeNPVFromRecord(vdValues: Record<string, number>, params?: Partial<NPVParams>): number {
  return computeNPV({
    throughput: vdValues['VD1'],
    headGrade: vdValues['VD2'],
    recovery: vdValues['VD3'],
    miningCost: vdValues['VD4'],
    processingCost: vdValues['VD5'],
    maintenanceCost: vdValues['VD6'],
    gaCost: vdValues['VD7'],
  }, params);
}
