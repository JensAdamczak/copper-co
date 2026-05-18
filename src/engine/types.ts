export type CapabilityType = 'value' | 'supporting' | 'coordination' | 'local';

export interface Capability {
  id: string;
  name: string;
  type: CapabilityType;
  baselineCapacity: number;
  idealCapacity: number;
  baselineNoiseSigma: number;
  idealNoiseSigma: number;
  aggregatedTasks: string[];
}

export interface OMParent {
  capabilityId: string;
  weight: number;
}

export interface OperationalMetric {
  id: string;
  name: string;
  unit: string;
  baseline: number;
  noiseSigma: number;
  parents: OMParent[];
}

export interface VDParent {
  omId: string;
  weight: number;
}

export interface ValueDriver {
  id: string;
  name: string;
  baseValue: number;
  unit: string;
  noiseSigma: number;
  parents: VDParent[];
}

export interface Scenario {
  id: string;
  name: string;
  description: string;
  npvImpact: string;
  highlightNodeIds: string[];
  parameterOverrides: Array<{
    nodeId: string;
    param: 'capacity' | 'noiseSigma';
    value: number;
  }>;
}

export interface CapabilityParams {
  capacity: number;
  noiseSigma: number;
}

export interface NodeState {
  id: string;
  mean: number;
  variance: number;
}

export interface Network {
  capabilities: Map<string, Capability>;
  operationalMetrics: Map<string, OperationalMetric>;
  valueDrivers: Map<string, ValueDriver>;
  scenarios: Map<string, Scenario>;
  topoOrder: string[];
}

export interface NPVParams {
  cuPrice: number;       // default 8420
  discountRate: number;  // default 0.08
  years: number;         // default 20
}

export interface ModelOverrides {
  npvParams?: Partial<NPVParams>;
  omBaselines?: Map<string, number>;
  vdBaseValues?: Map<string, number>;
}
