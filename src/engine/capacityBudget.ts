import type { Network, CapabilityParams } from './types.js';

/**
 * Rebalance capability capacities so they sum to 1.0.
 *
 * When one capability's capacity changes, others are redistributed proportionally.
 * Locked capabilities are not adjusted. The algorithm is the same as the old
 * per-role time budget, but applied across all 14 capabilities.
 *
 * @param network - The loaded network
 * @param changedId - ID of the capability whose capacity was changed
 * @param newCapacity - New capacity value for the changed capability
 * @param currentOverrides - Current capability overrides (to read current capacities)
 * @param lockedIds - Set of capability IDs that should not be adjusted
 * @returns Map of capability IDs to their new capacity values
 */
export function rebalanceCapacity(
  network: Network,
  changedId: string,
  newCapacity: number,
  currentOverrides: Map<string, Partial<CapabilityParams>>,
  lockedIds: Set<string> = new Set(),
): Map<string, number> {
  const result = new Map<string, number>();
  const clampedNew = Math.max(0.01, Math.min(0.90, newCapacity));
  result.set(changedId, clampedNew);

  // Get current capacities for all capabilities
  const currentCapacities = new Map<string, number>();
  for (const [id, cap] of network.capabilities) {
    const override = currentOverrides.get(id);
    currentCapacities.set(id, override?.capacity ?? cap.baselineCapacity);
  }

  // Calculate how much capacity is available for redistribution
  let lockedSum = 0;
  const adjustableIds: string[] = [];

  for (const [id] of network.capabilities) {
    if (id === changedId) continue;
    if (lockedIds.has(id)) {
      lockedSum += currentCapacities.get(id)!;
      result.set(id, currentCapacities.get(id)!);
    } else {
      adjustableIds.push(id);
    }
  }

  const remaining = 1.0 - clampedNew - lockedSum;

  if (remaining <= 0 || adjustableIds.length === 0) {
    // Not enough room; distribute minimum to adjustable, keep locked as-is
    for (const id of adjustableIds) {
      result.set(id, 0.01);
    }
    return result;
  }

  // Redistribute proportionally among adjustable capabilities
  let adjustableSum = 0;
  for (const id of adjustableIds) {
    adjustableSum += currentCapacities.get(id)!;
  }

  if (adjustableSum <= 0) {
    // Equal distribution if all were at 0
    const each = remaining / adjustableIds.length;
    for (const id of adjustableIds) {
      result.set(id, each);
    }
  } else {
    // Proportional redistribution
    const scale = remaining / adjustableSum;
    for (const id of adjustableIds) {
      const scaled = currentCapacities.get(id)! * scale;
      result.set(id, Math.max(0.01, scaled));
    }

    // Correct for minimum clamping: if any were clamped up to 0.01,
    // reduce others proportionally
    let totalAfterClamp = 0;
    for (const id of adjustableIds) {
      totalAfterClamp += result.get(id)!;
    }
    const overshoot = (totalAfterClamp + clampedNew + lockedSum) - 1.0;
    if (Math.abs(overshoot) > 0.001) {
      // Normalize adjustable to exactly fill remaining
      const adjustableTotal = adjustableIds.reduce((s, id) => s + result.get(id)!, 0);
      if (adjustableTotal > 0) {
        const correction = remaining / adjustableTotal;
        for (const id of adjustableIds) {
          result.set(id, Math.max(0.01, result.get(id)! * correction));
        }
      }
    }
  }

  return result;
}
