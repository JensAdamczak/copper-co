import type { Network, CapabilityParams } from './types.js';
import { forwardPass } from './forward.js';

/**
 * Proper Gaussian conditioning for the 26-node LGBN.
 *
 * The BN is: C1..C12 → OM1..OM7 → VD1..VD7 (26 nodes total).
 * Given observations on some subset of nodes (e.g., an OM value),
 * compute posterior shifts on unobserved nodes (e.g., capabilities).
 *
 * Uses the formula:
 *   μ_u|o = μ_u + Σ_uo × Σ_oo⁻¹ × (evidence - μ_o)
 *   Σ_u|o = Σ_uu - Σ_uo × Σ_oo⁻¹ × Σ_ou
 *
 * where Σ is the joint covariance of the full BN.
 */

export interface DiagnosticResult {
  nodeId: string;
  priorMean: number;
  posteriorMean: number;
  shift: number;
  priorVariance: number;
  posteriorVariance: number;
}

export interface Observation {
  nodeId: string;
  value: number;
}

/**
 * Build the joint covariance matrix for the 26-node BN.
 *
 * For a linear Gaussian BN with structure X_i = Σ_j w_ji X_j + ε_i,
 * the joint covariance is: Σ = (I - W)⁻¹ D ((I - W)⁻¹)ᵀ
 * where W is the weight matrix and D = diag(σ²_1, ..., σ²_n).
 */
export function buildJointCovariance(
  network: Network,
  capabilityOverrides?: Map<string, Partial<CapabilityParams>>,
  useIdeal = false,
): { nodeOrder: string[]; covariance: number[][]; means: number[] } {
  // Establish node ordering: capabilities, then OMs, then VDs
  const nodeOrder: string[] = [];
  for (const id of network.capabilities.keys()) nodeOrder.push(id);
  for (const id of network.operationalMetrics.keys()) nodeOrder.push(id);
  for (const id of network.valueDrivers.keys()) nodeOrder.push(id);

  const n = nodeOrder.length;
  const nodeIndex = new Map<string, number>();
  for (let i = 0; i < n; i++) nodeIndex.set(nodeOrder[i], i);

  // Build W matrix (weight matrix): W[i][j] = weight of edge j→i
  const W = zeros(n, n);

  for (const [omId, om] of network.operationalMetrics) {
    const i = nodeIndex.get(omId)!;
    for (const parent of om.parents) {
      const j = nodeIndex.get(parent.capabilityId);
      if (j !== undefined) {
        W[i][j] = parent.weight;
      }
    }
  }

  for (const [vdId, vd] of network.valueDrivers) {
    const i = nodeIndex.get(vdId)!;
    for (const parent of vd.parents) {
      const j = nodeIndex.get(parent.omId);
      if (j !== undefined) {
        W[i][j] = parent.weight;
      }
    }
  }

  // Build D (diagonal noise variance matrix)
  const D = zeros(n, n);
  for (const [id, cap] of network.capabilities) {
    const i = nodeIndex.get(id)!;
    const override = capabilityOverrides?.get(id);
    const sigma = override?.noiseSigma ?? (useIdeal ? cap.idealNoiseSigma : cap.baselineNoiseSigma);
    D[i][i] = sigma * sigma;
  }
  for (const [id, om] of network.operationalMetrics) {
    const i = nodeIndex.get(id)!;
    D[i][i] = om.noiseSigma * om.noiseSigma;
  }
  for (const [id, vd] of network.valueDrivers) {
    const i = nodeIndex.get(id)!;
    D[i][i] = vd.noiseSigma * vd.noiseSigma;
  }

  // Compute (I - W)
  const IminusW = identity(n);
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      IminusW[i][j] -= W[i][j];
    }
  }

  // Compute (I - W)⁻¹
  const IminusWInv = invertMatrix(IminusW);

  // Σ = (I-W)⁻¹ D ((I-W)⁻¹)ᵀ
  const IminusWInvT = transpose(IminusWInv);
  const temp = matMul(IminusWInv, D);
  const covariance = matMul(temp, IminusWInvT);

  // Compute means from forward pass
  const result = forwardPass(network, capabilityOverrides, useIdeal);
  const means: number[] = [];
  for (const id of nodeOrder) {
    const state = result.nodeStates.get(id);
    means.push(state?.mean ?? 0);
  }

  return { nodeOrder, covariance, means };
}

/**
 * Perform Gaussian conditioning: given observations on some nodes,
 * compute posterior means and variances for all unobserved nodes.
 */
export function condition(
  nodeOrder: string[],
  covariance: number[][],
  means: number[],
  observations: Observation[],
): DiagnosticResult[] {
  const n = nodeOrder.length;
  const nodeIndex = new Map<string, number>();
  for (let i = 0; i < n; i++) nodeIndex.set(nodeOrder[i], i);

  // Partition into observed (o) and unobserved (u) indices
  const observedIndices: number[] = [];
  const unobservedIndices: number[] = [];
  const obsSet = new Set(observations.map(o => o.nodeId));

  for (let i = 0; i < n; i++) {
    if (obsSet.has(nodeOrder[i])) {
      observedIndices.push(i);
    } else {
      unobservedIndices.push(i);
    }
  }

  if (observedIndices.length === 0) {
    // No observations, return priors
    return nodeOrder.map((id, i) => ({
      nodeId: id,
      priorMean: means[i],
      posteriorMean: means[i],
      shift: 0,
      priorVariance: covariance[i][i],
      posteriorVariance: covariance[i][i],
    }));
  }

  // Extract sub-matrices
  const Σ_uu = subMatrix(covariance, unobservedIndices, unobservedIndices);
  const Σ_uo = subMatrix(covariance, unobservedIndices, observedIndices);
  const Σ_oo = subMatrix(covariance, observedIndices, observedIndices);

  // Compute Σ_oo⁻¹
  const Σ_oo_inv = invertMatrix(Σ_oo);

  // Evidence vector: (observed_value - prior_mean) for each observed node
  const evidence: number[] = observations.map(obs => {
    const idx = nodeIndex.get(obs.nodeId)!;
    return obs.value - means[idx];
  });

  // μ_u|o = μ_u + Σ_uo × Σ_oo⁻¹ × evidence
  const Σ_oo_inv_e = matVecMul(Σ_oo_inv, evidence);
  const shift_u = matVecMul(Σ_uo, Σ_oo_inv_e);

  // Σ_u|o = Σ_uu - Σ_uo × Σ_oo⁻¹ × Σ_ou
  const Σ_ou = transpose(Σ_uo);
  const temp = matMul(Σ_uo, Σ_oo_inv);
  const correction = matMul(temp, Σ_ou);

  const results: DiagnosticResult[] = [];

  for (let ui = 0; ui < unobservedIndices.length; ui++) {
    const globalIdx = unobservedIndices[ui];
    const id = nodeOrder[globalIdx];
    results.push({
      nodeId: id,
      priorMean: means[globalIdx],
      posteriorMean: means[globalIdx] + shift_u[ui],
      shift: shift_u[ui],
      priorVariance: covariance[globalIdx][globalIdx],
      posteriorVariance: Σ_uu[ui][ui] - correction[ui][ui],
    });
  }

  // Also include observed nodes (variance = 0, mean = observed)
  for (const obs of observations) {
    const globalIdx = nodeIndex.get(obs.nodeId)!;
    results.push({
      nodeId: obs.nodeId,
      priorMean: means[globalIdx],
      posteriorMean: obs.value,
      shift: obs.value - means[globalIdx],
      priorVariance: covariance[globalIdx][globalIdx],
      posteriorVariance: 0,
    });
  }

  return results;
}

/**
 * High-level diagnostic: given an observed OM or VD value,
 * return posterior shifts for all capabilities (ranked by |shift|).
 */
export function diagnose(
  network: Network,
  observations: Observation[],
  capabilityOverrides?: Map<string, Partial<CapabilityParams>>,
  useIdeal = false,
): DiagnosticResult[] {
  const { nodeOrder, covariance, means } = buildJointCovariance(
    network, capabilityOverrides, useIdeal,
  );

  const allResults = condition(nodeOrder, covariance, means, observations);

  // Filter to capabilities only, sort by |shift| descending
  const capResults = allResults
    .filter(r => r.nodeId.startsWith('C'))
    .sort((a, b) => Math.abs(b.shift) - Math.abs(a.shift));

  return capResults;
}

/**
 * Given observations on OM/VD nodes, infer the capability parameter overrides
 * (capacity + noiseSigma) that would produce those observations.
 *
 * Uses Gaussian conditioning to get posterior means and variances for capabilities,
 * then converts them to (capacity, noiseSigma) pairs and rebalances the capacity budget.
 */
export function inferCapabilityOverrides(
  network: Network,
  observations: Observation[],
  currentOverrides: Map<string, Partial<CapabilityParams>>,
  lockedIds: Set<string>,
): Map<string, Partial<CapabilityParams>> {
  const { nodeOrder, covariance, means } = buildJointCovariance(network, currentOverrides);
  const allResults = condition(nodeOrder, covariance, means, observations);

  const result = new Map<string, Partial<CapabilityParams>>();

  // Build a lookup for posterior results
  const posteriorByNode = new Map<string, DiagnosticResult>();
  for (const r of allResults) {
    posteriorByNode.set(r.nodeId, r);
  }

  // For each capability, compute new (capacity, noiseSigma) from posterior
  for (const [capId, cap] of network.capabilities) {
    if (lockedIds.has(capId)) {
      // Keep locked capabilities at their current override values
      const existing = currentOverrides.get(capId);
      result.set(capId, {
        capacity: existing?.capacity ?? cap.baselineCapacity,
        noiseSigma: existing?.noiseSigma ?? cap.baselineNoiseSigma,
      });
      continue;
    }

    const posterior = posteriorByNode.get(capId);
    if (!posterior) {
      // Shouldn't happen, but fall back to current
      const existing = currentOverrides.get(capId);
      result.set(capId, {
        capacity: existing?.capacity ?? cap.baselineCapacity,
        noiseSigma: existing?.noiseSigma ?? cap.baselineNoiseSigma,
      });
      continue;
    }

    // Convert posterior variance → noiseSigma
    const newSigma = Math.max(0.01, Math.min(0.30, Math.sqrt(Math.max(0, posterior.posteriorVariance))));
    // Convert posterior mean → capacity: mean = capacity / (1 + sigma), so capacity = mean * (1 + sigma)
    const newCapacity = Math.max(0.01, Math.min(0.50, posterior.posteriorMean * (1 + newSigma)));

    result.set(capId, { capacity: newCapacity, noiseSigma: newSigma });
  }

  // Normalize unlocked capacities so all 12 sum to 1.0
  let lockedSum = 0;
  const unlockedIds: string[] = [];
  for (const [capId] of network.capabilities) {
    if (lockedIds.has(capId)) {
      lockedSum += result.get(capId)!.capacity!;
    } else {
      unlockedIds.push(capId);
    }
  }

  const target = Math.max(0, 1.0 - lockedSum);
  let unlockedSum = 0;
  for (const id of unlockedIds) {
    unlockedSum += result.get(id)!.capacity!;
  }

  if (unlockedSum > 0 && unlockedIds.length > 0) {
    const scale = target / unlockedSum;
    for (const id of unlockedIds) {
      const params = result.get(id)!;
      const scaled = Math.max(0.01, params.capacity! * scale);
      result.set(id, { ...params, capacity: scaled });
    }

    // Correct for min-clamping: normalize again if needed
    let correctedSum = 0;
    for (const id of unlockedIds) {
      correctedSum += result.get(id)!.capacity!;
    }
    if (Math.abs(correctedSum - target) > 0.001 && correctedSum > 0) {
      const correction = target / correctedSum;
      for (const id of unlockedIds) {
        const params = result.get(id)!;
        result.set(id, { ...params, capacity: Math.max(0.01, params.capacity! * correction) });
      }
    }
  }

  return result;
}

// --- Matrix utilities (for small 26×26 matrices, no external deps needed) ---

export function zeros(rows: number, cols: number): number[][] {
  return Array.from({ length: rows }, () => new Array(cols).fill(0));
}

export function identity(n: number): number[][] {
  const m = zeros(n, n);
  for (let i = 0; i < n; i++) m[i][i] = 1;
  return m;
}

export function transpose(A: number[][]): number[][] {
  const rows = A.length;
  const cols = A[0].length;
  const result = zeros(cols, rows);
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      result[j][i] = A[i][j];
    }
  }
  return result;
}

export function matMul(A: number[][], B: number[][]): number[][] {
  const m = A.length;
  const n = B[0].length;
  const p = B.length;
  const result = zeros(m, n);
  for (let i = 0; i < m; i++) {
    for (let j = 0; j < n; j++) {
      let sum = 0;
      for (let k = 0; k < p; k++) {
        sum += A[i][k] * B[k][j];
      }
      result[i][j] = sum;
    }
  }
  return result;
}

export function matVecMul(A: number[][], v: number[]): number[] {
  const m = A.length;
  const n = v.length;
  const result = new Array(m).fill(0);
  for (let i = 0; i < m; i++) {
    for (let j = 0; j < n; j++) {
      result[i] += A[i][j] * v[j];
    }
  }
  return result;
}

export function subMatrix(M: number[][], rowIndices: number[], colIndices: number[]): number[][] {
  const result = zeros(rowIndices.length, colIndices.length);
  for (let i = 0; i < rowIndices.length; i++) {
    for (let j = 0; j < colIndices.length; j++) {
      result[i][j] = M[rowIndices[i]][colIndices[j]];
    }
  }
  return result;
}

/**
 * Invert a square matrix using Gauss-Jordan elimination.
 * For small matrices (up to 26×26), this is adequate.
 */
export function invertMatrix(M: number[][]): number[][] {
  const n = M.length;
  // Augment with identity
  const aug = zeros(n, 2 * n);
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      aug[i][j] = M[i][j];
    }
    aug[i][n + i] = 1;
  }

  // Forward elimination with partial pivoting
  for (let col = 0; col < n; col++) {
    // Find pivot
    let maxVal = Math.abs(aug[col][col]);
    let maxRow = col;
    for (let row = col + 1; row < n; row++) {
      if (Math.abs(aug[row][col]) > maxVal) {
        maxVal = Math.abs(aug[row][col]);
        maxRow = row;
      }
    }

    // Swap rows
    if (maxRow !== col) {
      [aug[col], aug[maxRow]] = [aug[maxRow], aug[col]];
    }

    const pivot = aug[col][col];
    if (Math.abs(pivot) < 1e-12) {
      throw new Error(`Matrix is singular (pivot near zero at col ${col})`);
    }

    // Scale pivot row
    for (let j = 0; j < 2 * n; j++) {
      aug[col][j] /= pivot;
    }

    // Eliminate column in other rows
    for (let row = 0; row < n; row++) {
      if (row === col) continue;
      const factor = aug[row][col];
      for (let j = 0; j < 2 * n; j++) {
        aug[row][j] -= factor * aug[col][j];
      }
    }
  }

  // Extract inverse from augmented matrix
  const inv = zeros(n, n);
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      inv[i][j] = aug[i][n + j];
    }
  }

  return inv;
}
