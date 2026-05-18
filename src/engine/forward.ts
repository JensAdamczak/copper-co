import type { Network, NodeState, CapabilityParams, ModelOverrides } from './types.js';
import { computeNPVFromRecord } from './npv.js';

export interface ForwardResult {
  nodeStates: Map<string, NodeState>;
  npv: number;
  vdValues: Record<string, number>;
}

/**
 * Compute the effective mean for a capability.
 * Effective mean = capacity × qualityFactor, where qualityFactor = 1 / (1 + σ).
 * Lower noise → higher quality → higher effective mean.
 */
function capabilityMean(capacity: number, noiseSigma: number): number {
  return capacity * (1 / (1 + noiseSigma));
}

/**
 * Run forward propagation through the simplified LGBN.
 *
 * Flow: Capabilities → Operational Metrics → Value Drivers → NPV
 *
 * At baseline params, OM deltas are 0 and VD values equal their base values (by construction).
 * Changes in capability params produce non-zero deltas that propagate through the network.
 *
 * @param network - The loaded network
 * @param capabilityOverrides - Optional overrides for capability parameters
 * @param useIdeal - If true, use ideal-state parameters as baseline
 * @param modelOverrides - Optional overrides for OM baselines, VD base values, and NPV params
 */
export function forwardPass(
  network: Network,
  capabilityOverrides?: Map<string, Partial<CapabilityParams>>,
  useIdeal = false,
  modelOverrides?: ModelOverrides,
): ForwardResult {
  const nodeStates = new Map<string, NodeState>();

  // Step 1: Compute capability means
  const capMeans = new Map<string, number>();
  const baselineMeans = new Map<string, number>();

  for (const [id, cap] of network.capabilities) {
    // Baseline mean (always from baseline params — this is the reference point)
    const bMean = capabilityMean(cap.baselineCapacity, cap.baselineNoiseSigma);
    baselineMeans.set(id, bMean);

    // Current params
    const override = capabilityOverrides?.get(id);
    let capacity: number;
    let sigma: number;

    if (useIdeal && !override) {
      capacity = cap.idealCapacity;
      sigma = cap.idealNoiseSigma;
    } else {
      capacity = override?.capacity ?? (useIdeal ? cap.idealCapacity : cap.baselineCapacity);
      sigma = override?.noiseSigma ?? (useIdeal ? cap.idealNoiseSigma : cap.baselineNoiseSigma);
    }

    const mean = capabilityMean(capacity, sigma);
    capMeans.set(id, mean);

    const variance = sigma * sigma;
    nodeStates.set(id, { id, mean, variance });
  }

  // Step 2: Compute operational metrics
  // OM_i = effectiveBaseline + Σ(w_ij × (C_j.mean - C_j.baselineMean)) + ε
  for (const [id, om] of network.operationalMetrics) {
    const effectiveBaseline = modelOverrides?.omBaselines?.get(id) ?? om.baseline;
    let value = effectiveBaseline;
    for (const parent of om.parents) {
      const currentMean = capMeans.get(parent.capabilityId) ?? 0;
      const baseMean = baselineMeans.get(parent.capabilityId) ?? 0;
      value += parent.weight * (currentMean - baseMean);
    }
    let variance = om.noiseSigma * om.noiseSigma;
    for (const parent of om.parents) {
      const capState = nodeStates.get(parent.capabilityId);
      if (capState) {
        variance += parent.weight * parent.weight * capState.variance;
      }
    }
    nodeStates.set(id, { id, mean: value, variance });
  }

  // Step 3: Compute value drivers
  // VD_i = effectiveBaseValue + Σ(w_ij × (OM_j.mean - effectiveOMBaseline_j)) + ε
  const vdValues: Record<string, number> = {};

  for (const [id, vd] of network.valueDrivers) {
    const effectiveBaseValue = modelOverrides?.vdBaseValues?.get(id) ?? vd.baseValue;
    let value = effectiveBaseValue;
    for (const parent of vd.parents) {
      const omState = nodeStates.get(parent.omId);
      const om = network.operationalMetrics.get(parent.omId);
      if (omState && om) {
        // Use the original baseline as the reference point so that OM baseline
        // overrides produce a non-zero delta that propagates to VDs and NPV.
        value += parent.weight * (omState.mean - om.baseline);
      }
    }
    let variance = vd.noiseSigma * vd.noiseSigma;
    for (const parent of vd.parents) {
      const omState = nodeStates.get(parent.omId);
      if (omState) {
        variance += parent.weight * parent.weight * omState.variance;
      }
    }
    nodeStates.set(id, { id, mean: value, variance });
    vdValues[id] = value;
  }

  // Step 4: Compute NPV
  const npv = computeNPVFromRecord(vdValues, modelOverrides?.npvParams);

  return { nodeStates, npv, vdValues };
}
