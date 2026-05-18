import type { Network, CapabilityParams } from './types.js';
import { forwardPass } from './forward.js';

export interface SensitivityResult {
  capabilityId: string;
  capacitySensitivity: number;   // ΔNPV for +0.01 capacity bump
  noiseSensitivity: number;      // ΔNPV for -0.01 noise bump
  type: string;
}

/**
 * Compute NPV sensitivity for all capabilities by:
 * 1. Bumping capacity by +0.01 and measuring ΔNPV
 * 2. Bumping noise sigma by -0.01 and measuring ΔNPV
 *
 * @param network - The loaded network
 * @param capabilityOverrides - Optional baseline parameter overrides
 * @param useIdeal - If true, use ideal-state as baseline
 * @returns Array of sensitivity results, sorted by |capacitySensitivity| descending
 */
export function computeSensitivities(
  network: Network,
  capabilityOverrides?: Map<string, Partial<CapabilityParams>>,
  useIdeal = false,
): SensitivityResult[] {
  const baseline = forwardPass(network, capabilityOverrides, useIdeal);
  const baselineNPV = baseline.npv;

  const results: SensitivityResult[] = [];
  const bump = 0.01;

  for (const [capId, cap] of network.capabilities) {
    // Get current params
    const override = capabilityOverrides?.get(capId);
    const currentCapacity = override?.capacity ?? (useIdeal ? cap.idealCapacity : cap.baselineCapacity);
    const currentNoise = override?.noiseSigma ?? (useIdeal ? cap.idealNoiseSigma : cap.baselineNoiseSigma);

    // Bump capacity +0.01
    const capOverrides = new Map(capabilityOverrides ?? []);
    capOverrides.set(capId, {
      ...capOverrides.get(capId),
      capacity: currentCapacity + bump,
    });
    const capBumped = forwardPass(network, capOverrides, useIdeal);
    const capacitySensitivity = capBumped.npv - baselineNPV;

    // Bump noise -0.01
    const noiseOverrides = new Map(capabilityOverrides ?? []);
    const newNoise = Math.max(0.001, currentNoise - bump);
    noiseOverrides.set(capId, {
      ...noiseOverrides.get(capId),
      noiseSigma: newNoise,
    });
    const noiseBumped = forwardPass(network, noiseOverrides, useIdeal);
    const noiseSensitivity = noiseBumped.npv - baselineNPV;

    results.push({
      capabilityId: capId,
      capacitySensitivity,
      noiseSensitivity,
      type: cap.type,
    });
  }

  // Sort by absolute capacity sensitivity, descending
  results.sort((a, b) => Math.abs(b.capacitySensitivity) - Math.abs(a.capacitySensitivity));

  return results;
}
