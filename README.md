# CopperCo BN Tool

An interactive browser-based tool that models how organizational capabilities in a synthetic copper mining operation connect to Net Present Value (NPV) through a Linear Gaussian Bayesian Network (LGBN). All computation runs client-side.

## Functionality

**Circular graph visualization** — A concentric ring layout (D3.js) shows the causal chain from ~12 capability nodes through ~15 operational metrics and 7 value drivers to a central NPV node. Edges are drawn between connected layers, and clicking any node highlights its full path to NPV.

**Scenario analysis** — Eight pre-built scenarios demonstrate the NPV impact of interventions such as deploying an ML flotation optimizer (+$180M), adding predictive maintenance (+$80M), or increasing coordination overhead (-$62M). Users can also build custom scenarios by adjusting capability parameters and saving them.

**Sensitivity analysis** — The engine computes partial derivatives (dNPV/dCapability) via numerical bump to identify which capabilities have the highest NPV leverage.

**Status-quo vs. ideal-state toggle** — Switch between current baseline parameters and ideal-state parameters to visualize the gap.

**Time-budget mechanism** — Each role's task allocations sum to 1.0. Coordination and local tasks consume capacity that would otherwise be available for value-creating work, creating an opportunity cost that propagates through the network to reduce NPV.

## Model Description

### Network structure

The model is a four-layer Linear Gaussian Bayesian Network:

1. **Capabilities** (~12 nodes) — each with two parameters: `capacity` (time allocation, 0-1) and `noiseSigma` (information quality noise). The effective mean of a capability is `capacity / (1 + noiseSigma)`.

2. **Operational Metrics** (~15 nodes) — weighted sums of parent capability deltas relative to baseline, plus Gaussian noise. Examples: equipment availability, grade control RMSE, flotation variability.

3. **Value Drivers** (7 nodes) — weighted sums of parent operational metric deltas. These map directly to the DCF inputs:
   - VD1: Throughput (15.0 Mtpa)
   - VD2: Head grade (0.525% Cu)
   - VD3: Recovery (88.0%)
   - VD4: Mining cost ($120M/yr)
   - VD5: Processing cost ($95M/yr)
   - VD6: Maintenance cost ($65M/yr)
   - VD7: G&A + capex ($90M/yr)

4. **NPV** (1 node) — computed via discounted cash flow.

### NPV formula

```
Cu produced (t/yr) = throughput (Mt) x 1,000,000 x (headGrade% / 100) x (recovery% / 100)
Revenue ($M/yr)    = Cu produced x $8,420/t / 1,000,000
Cost ($M/yr)       = mining + processing + maintenance + G&A
NPV ($M)           = Sum of (revenue - cost) / 1.08^t for t = 1..20
```

### Capability types

Capabilities are classified into four work types that determine their role in the network:

- **Value** — direct edges to operational metrics that propagate to value drivers and NPV
- **Supporting** — edges to operational metrics but with lower NPV sensitivity
- **Coordination** — no outgoing edges; only consumes time budget from value-creating work
- **Local** — edges only to dead-end operational metrics with no path to value drivers

## Assumptions

- **Synthetic organization**: CopperCo is a fictional copper mining operation. The organizational structure, roles, and task decomposition are illustrative, not based on a specific real mine.
- **Linear Gaussian propagation**: All relationships between nodes are linear with additive Gaussian noise. This is a simplifying assumption — real mining operations exhibit nonlinear dynamics.
- **Static DCF**: The NPV calculation uses a flat annual cash flow over 20 years with a constant discount rate. There is no production ramp-up, mine life depletion, or commodity price variation.
- **Time-budget as opportunity cost**: The model assumes coordination and local optimization work reduce NPV solely through displacement of value-creating work, not through any direct cost.
- **Parameter independence**: Capability parameters (capacity, noise) are treated as independent. In practice, increasing capacity for one capability may have spillover effects on others.

## Calibration Sources

The model's baseline parameters are calibrated to produce plausible outputs for a large-scale open-pit copper mine. Key benchmarks:

| Parameter | Baseline Value | Source / Basis |
|---|---|---|
| Copper price | $8,420/t | LME copper spot price range (2023-2024 average) |
| Throughput | 15 Mtpa | Typical for a large open-pit copper operation (comparable to Escondida, Collahuasi class) |
| Head grade | 0.525% Cu | Consistent with published reserve grades for major porphyry copper deposits (S&P Global Market Intelligence, company annual reports) |
| Recovery rate | 88% | Standard flotation circuit recovery for porphyry copper sulfide ores (SME Mining Engineering Handbook) |
| Discount rate | 8% real | Industry standard for mining project evaluation (CIM Valuation Standards, corporate WACC benchmarks) |
| Mine life | 20 years | Representative for a large copper concession |
| Baseline NPV | ~$2,100M | Derived from the above parameters |
| Ideal-state NPV | ~$2,550M (+21%) | All capabilities shifted to ideal parameters |
| Operating costs | $370M/yr total | Broken down as mining $120M, processing $95M, maintenance $65M, G&A $90M — calibrated to industry cost curve data (Wood Mackenzie, CRU Group copper cost reports) |

**Note**: All values are synthetic and for demonstration purposes. They are calibrated to be internally consistent and representative of industry ranges, not to match any specific operation.

## Tech Stack

- React 19, TypeScript, Vite
- D3.js for circular graph visualization
- Vitest for testing
- No backend — all computation is client-side

## Getting Started

```bash
npm install        # install dependencies
npm run dev        # start dev server
npm run build      # production build
npm run preview    # preview production build
npx vitest run     # run tests
```
