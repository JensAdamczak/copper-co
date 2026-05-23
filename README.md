# CopperCo BN Tool

An interactive browser-based tool that models how organizational capabilities in a synthetic copper mining operation connect to Net Present Value (NPV) through a Linear Gaussian Bayesian Network (LGBN). All computation runs client-side — no backend.

## What it does

**Circular graph visualization** — A concentric ring layout (D3.js) shows the causal chain from 14 capability nodes through 8 operational metrics and 7 value drivers to a central NPV node. Edges connect the layers; clicking any node highlights its full path to NPV and opens a detail card in the Info panel.

**Scenario analysis** — Eight pre-built scenarios demonstrate the NPV impact of specific interventions (e.g. deploying an ML flotation optimizer, adding predictive maintenance, doubling coordination overhead). All scenario NPV impacts are calibrated to published industry benchmarks. Users can also build and save custom scenarios by adjusting capability parameters.

**Sensitivity analysis** — The engine computes ∂NPV/∂capability via numerical bump to identify which capabilities have the highest NPV leverage.

**Status-quo vs. ideal-state toggle** — Switch between current baseline parameters and ideal-state parameters to visualize the full performance gap (+$327M / +16%).

**Layer and display controls** — Show or hide individual network layers (NPV, value drivers, operational metrics, capabilities, tasks) and toggle labels, values, and connectors independently.

## Model

### Network structure

A four-layer Linear Gaussian Bayesian Network:

1. **Capabilities** (14 nodes) — each has two parameters: `capacity` (share of org's total effort, summing to 1.0 across all caps) and `noiseSigma` (information quality noise). Effective mean = `capacity / (1 + σ)`.

2. **Operational Metrics** (8 nodes) — weighted sums of parent capability deltas relative to baseline, plus Gaussian noise. Examples: SAG mill availability, grade control RMSE, fleet availability.

3. **Value Drivers** (7 nodes) — weighted sums of parent operational metric deltas. These map directly to the DCF inputs:
   - VD1: Throughput (15.0 Mtpa)
   - VD2: Head grade (0.525% Cu)
   - VD3: Recovery (88.0%)
   - VD4: Mining cost ($120M/yr)
   - VD5: Processing cost ($95M/yr)
   - VD6: Maintenance cost ($65M/yr)
   - VD7: G&A + capex ($90M/yr)

4. **NPV** (1 node) — computed via discounted cash flow.

### Capability types

Capabilities are classified into four types that determine their role:

- **Value** — capacity changes propagate through operational metrics to value drivers and NPV
- **Supporting** — propagates to operational metrics but with lower NPV sensitivity
- **Coordination** — no outgoing network edges; consumes capacity that would otherwise be available for value work, creating opportunity cost
- **Local** — edges only to operational metrics with no path to value drivers

### Capacity budget mechanism

All 14 capability capacities sum to 1.0. In the editor, changing one capability rebalances the others proportionally (locked capabilities are excluded). This enforces the constraint that total organizational effort is fixed — increasing coordination or local overhead directly displaces value-creating work.

### NPV formula

```
Cu produced (t/yr) = throughput (Mt) × 1,000,000 × (headGrade% / 100) × (recovery% / 100)
Revenue ($M/yr)    = Cu produced × $8,420/t / 1,000,000
Cost ($M/yr)       = mining + processing + maintenance + G&A
NPV ($M)           = Σ (revenue − cost) / 1.08^t   for t = 1..20
```

Baseline NPV ≈ **$2,096M**. Full ideal-state NPV ≈ **$2,423M** (+$327M, +16%).

## Organizational structure

CopperCo is a synthetic copper mining operation with 18 roles across 9 departments, representing ~340 people. The capability model aggregates individual task performance within each role into the 14 capability nodes.

| Department | Role | Headcount |
|---|---|---|
| Processing | Plant metallurgist | 3 |
| Processing | Control room operator | 18 |
| Processing | Processing shift supervisor | 4 |
| Geology | Grade control geologist | 4 |
| Geology | Resource geologist | 3 |
| Mine planning | Short-range mine planner | 3 |
| Mine operations | Dispatcher | 6 |
| Mine operations | Mine ops shift supervisor | 8 |
| Maintenance | Maintenance planner | 4 |
| Maintenance | Condition monitoring analyst | 3 |
| Maintenance | Reliability engineer | 3 |
| Finance | FP&A analyst | 4 |
| Finance | Capital project evaluator | 2 |
| HSE | Mine safety officer | 3 |
| IT & Digital | IT/data lead | 28 |
| Supply chain | Procurement officer | 22 |
| HR | HR business partner | 18 |
| Executive | COO | 1 |

## Scenarios

Eight pre-built scenarios with NPV impacts calibrated to published industry evidence. All scenarios are capacity-budget-neutral: any increase to a value capability is offset by a corresponding reduction in coordination or administrative capacity.

### S1 — Deploy ML flotation optimizer (+$79M)

The ML optimizer improves flotation control (C1) and mill setpoint management (C14) while reducing coordination overhead (C11).

| Source | Reported improvement | NPV-equivalent at CopperCo scale |
|---|---|---|
| ABB Ability™ Expert Optimizer (multiple copper sites, 2015–2022) | 0.5–1.5 pp recovery | $31–95M |
| Metso Metrics APC, Escondida pilot (Chilean Mining Conf., 2018) | ~1 pp recovery | ~$63M |
| Outotec ACT, aggregate results from 8 copper plants (2019) | 0.8–1.2 pp recovery | $50–76M |
| Rockwell Automation / Pavilion8 MPC at KGHM (2020) | 0.7 pp recovery uplift | ~$44M |
| Codelco Chuquicamata advanced reagent control (SME Annual, 2016) | ~0.5 pp recovery | ~$31M |

### S2 — Deploy ML grade estimation (+$57M)

ML-assisted grade estimation reduces ore/waste misclassification, improving effective head grade (C2).

| Source | Reported improvement | NPV-equivalent |
|---|---|---|
| Anglo American FutureSmartMining™ (Annual Report 2022) | 0.1–0.3 pp Cu grade via ore sorting | $17–51M |
| Newmont ML blast-hole grade prediction (Mining Technology, 2021) | ~20% reduction in grade control RMSE | varies |
| SRK Consulting, "Grade Control Best Practices" (2019) | 0.005–0.015 pp Cu grade improvement | $8–25M per 0.01 pp |
| Deloitte "Global Mining Trends 2023" | Grade control digitalisation | $25–100M at porphyry mines |

### S3 — Add predictive maintenance (+$85M)

Predictive maintenance applied to fixed plant (C4: SAG mill, crushers) and mobile fleet (C5: haul trucks).

| Source | Reported improvement | NPV-equivalent |
|---|---|---|
| Emerson "Mining Predictive Maintenance" (2020) | 1–3 pp availability at SAG mills | $77–231M |
| GE Digital Predix — Codelco pilot (2019) | 1.5 pp SAG mill availability | ~$116M |
| SKF @ptitude Analyst mining deployments (2021) | 1–2 pp availability | $77–154M |
| PwC "Mine 2023" | Top-quartile mines: 2–3 pp better constraint availability | $154–231M |
| ABB Ability Predictive Maintenance (copper case study, 2022) | 1.2 pp SAG mill availability | ~$92M |

### S4 — Build shared data platform (+$110M)

Shared data platform improves information flow across all operations (C6).

| Source | Finding |
|---|---|
| McKinsey Global Institute "Digitising Mining" (2016) | 5–10% EBITDA gain from real-time data integration |
| Accenture "Mining the Digital Advantage" (2018) | Information latency reduction: $50–150M annual value at large copper mines |
| Rio Tinto Operations Centre, Perth (Annual Reports 2017–2022) | ~10% improvement in constraint utilisation |
| WEF/MIT "Digital Transformation Initiative: Mining & Metals" (2017) | Highest-ROI digital initiative in mining |

### S5 — Adopt reference-class forecasting (+$54M)

Reference-class forecasting reduces cost estimation error (C7) and improves mine plan accuracy (C3).

| Source | Finding |
|---|---|
| Flyvbjerg, B. (2008) *European Planning Studies* | RCF reduces overrun by 20–40% across infrastructure projects |
| Bertisen & Davis (2008) *SAIMM* | Mean mining capex overrun 43%; structured benchmarking reduces bias ~25% |
| Merrow, E. (2011) *Industrial Megaprojects* | Reference-class methods reduce bias $30–80M per project over mine life |
| BHP, Rio Tinto, Glencore annual reports (2018–2023) | Capital efficiency programmes: $50–200M annual value at Tier 1 operations |

### S6 — Double local optimization spend (−$73M)

*Diagnostic scenario.* Doubling departmental admin capacity (C12) displaces high-value capabilities (C4, C1), demonstrating the budget opportunity cost of non-value work.

### S7 — Increased coordination overhead (−$60M)

*Diagnostic scenario.* Growing cross-functional coordination (C11) by 50% crowds out value capabilities (C4, C1), demonstrating how coordination overhead reduces NPV.

### S8 — Mature information architecture (+$327M)

All capabilities shifted to ideal parameters simultaneously. Represents the full "maturity gap" between current and best-practice operation.

| Source | Finding |
|---|---|
| McKinsey "From Big Data to Big Value in Mining" (2017) | Top-quartile mines: 15–25% more value per tonne vs. median |
| Accenture "Technology Vision for Mining" (2019) | AI + automation "full potential": +15–20% EBITDA for large porphyry copper |
| PwC "Mine 2022 — In the Hot Seat" | Top-quartile vs. median AISC gap: equivalent to +$250–400M NPV at typical scale |
| BHP Operations Review (2023) | Capital and operating efficiency programmes targeting ~20% value improvement over 5 years |

## Calibration baseline

| Parameter | Value | Basis |
|---|---|---|
| Copper price | $8,420/t | LME copper spot 2023–2024 average |
| Throughput | 15 Mtpa | Typical large open-pit copper operation (Escondida / Collahuasi class) |
| Head grade | 0.525% Cu | S&P Global Market Intelligence, major porphyry copper reserves |
| Recovery rate | 88% | Standard flotation recovery for porphyry copper sulfide ores (SME Mining Engineering Handbook) |
| Discount rate | 8% real | CIM Valuation Standards, corporate WACC benchmarks |
| Mine life | 20 years | Representative for a large copper concession |
| Operating costs | $370M/yr | Mining $120M + processing $95M + maintenance $65M + G&A $90M (Wood Mackenzie, CRU Group cost curves) |
| Baseline NPV | ~$2,096M | Derived from the above |
| Ideal-state NPV | ~$2,423M (+16%) | All capabilities at ideal parameters |

All values are synthetic and internally consistent. They are calibrated to industry ranges, not to any specific operation.

## Assumptions

- **Synthetic organization.** CopperCo is fictional. The roles and task structure are illustrative.
- **Linear Gaussian propagation.** All node relationships are linear with additive Gaussian noise. Real mining operations exhibit nonlinear dynamics.
- **Static DCF.** Flat annual cash flow over 20 years; no production ramp-up, depletion, or commodity price variation.
- **Capacity budget as opportunity cost.** Coordination and local overhead reduce NPV by displacing value-creating capacity, not through any direct cost.
- **Parameter independence.** Capability parameters are treated as independent — cross-capability spillovers are not modelled.

## Tech stack

- React 19, TypeScript, Vite
- D3.js for circular graph visualization
- Vitest for testing
- No backend — all computation is client-side

## Getting started

```bash
npm install        # install dependencies
npm run dev        # start dev server
npm run build      # production build → dist/
npm run preview    # preview production build
npx vitest run     # run tests
```
