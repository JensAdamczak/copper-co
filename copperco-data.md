# CopperCo Bayesian Network — data specification

This document contains all data needed to populate the JSON files for the BN tool: roles, tasks, intermediate outcomes, value drivers, edges, and scenarios. See `plan.md` for the implementation architecture.

---

## 1. Departments and roles

18 roles across 9 departments. Total represented headcount: 340 people.

| Department | Role | Headcount | Description |
|---|---|---|---|
| Processing | Plant metallurgist | 3 | Tunes flotation reagent recipes and monitors recovery performance at the constraint |
| Processing | Control room operator | 18 | Manages DCS setpoints, mill feed rate, and alarm response at the constraint |
| Processing | Processing shift supervisor | 4 | Makes throughput-vs-recovery tradeoff decisions and manages constraint crew |
| Geology | Grade control geologist | 4 | Maps ore/waste at the pit face and maintains the short-term grade model |
| Geology | Resource geologist | 3 | Builds the block model using geostatistics — the foundational input to the entire org |
| Mine planning | Short-range mine planner | 3 | Creates weekly dig plans from the block model and optimizes shovel positions |
| Mine operations | Dispatcher | 6 | Assigns trucks to shovels against grade and tonnage targets |
| Mine operations | Mine ops shift supervisor | 8 | Executes the dig plan in real-time, responds to ground conditions |
| Maintenance | Maintenance planner | 4 | Schedules maintenance work, prioritizes constraint-critical equipment |
| Maintenance | Condition monitoring analyst | 3 | Monitors vibration, oil, thermography data on critical assets |
| Maintenance | Reliability engineer | 3 | Analyzes failure modes, sets condition thresholds, develops improvement plans |
| Finance | FP&A analyst | 4 | Assembles financial reports, builds forecasts, analyzes constraint economics |
| Finance | Capital project evaluator | 2 | Estimates capex, builds NPV models, applies reference-class benchmarking |
| HSE | Mine safety officer | 3 | Conducts inspections, manages permits, investigates incidents |
| IT & Digital | IT/data lead | 28 | Builds data pipelines, manages shared platform, responds to ad-hoc requests |
| Supply chain | Procurement officer | 22 | Sources reagents, critical spares, and general consumables |
| HR | HR business partner | 18 | Manages workforce planning, restructures, skills development |
| Executive | COO | 1 | Sets operational KPIs, arbitrates resources, inputs on capital allocation |

---

## 2. Tasks

Four work types:
- **Constraint** — has edges to intermediate outcomes that reach NPV. Directly or indirectly drives value.
- **Supporting** — has edges to outcomes but through cost-side or threshold paths with lower NPV sensitivity.
- **Coordination** — NO outgoing edges. Only consumes time within the role's time budget.
- **Local** — edges only to dead-end outcome nodes (no path to value drivers).

Time allocations are shown for current state and ideal state (with AI + data). Time allocations within each role sum to 1.0.

### Processing — plant metallurgist

| ID | Task | Type | Time (cur) | Time (ideal) | σ (cur) | σ (ideal) |
|---|---|---|---|---|---|---|
| M1 | Reagent recipe optimization for each ore type | Constraint | 0.25 | 0.40 | 0.15 | 0.05 |
| M2 | Recovery monitoring and deviation investigation | Constraint | 0.15 | 0.20 | 0.10 | 0.04 |
| M3 | Production alignment meeting | Coordination | 0.18 | 0.05 | 0.03 | 0.03 |
| M4 | Calling dispatch about incoming ore quality | Coordination | 0.12 | 0.00 | 0.05 | — |
| M5 | Weekly recovery report assembly | Coordination | 0.15 | 0.03 | 0.04 | 0.02 |
| M6 | Safety briefing and lab QA review | Supporting | 0.10 | 0.10 | 0.02 | 0.02 |
| M7 | Departmental best-practices documentation | Local | 0.05 | 0.02 | 0.02 | 0.02 |

Info quality parents for M1: IO3 (ore grade at ROM), IO7 (information timeliness)
Info quality parents for M2: IO7 (information timeliness)

### Processing — control room operator

| ID | Task | Type | Time (cur) | Time (ideal) | σ (cur) | σ (ideal) |
|---|---|---|---|---|---|---|
| CR1 | Mill feed rate and setpoint management | Constraint | 0.30 | 0.35 | 0.12 | 0.04 |
| CR2 | Alarm response and circuit troubleshooting | Constraint | 0.20 | 0.20 | 0.10 | 0.06 |
| CR3 | Shift handover (verbal briefing to next operator) | Coordination | 0.12 | 0.03 | 0.15 | 0.04 |
| CR4 | Manual data logging into historian | Coordination | 0.15 | 0.02 | 0.04 | 0.01 |
| CR5 | Phone calls to field operators for isolations | Coordination | 0.13 | 0.05 | 0.06 | 0.03 |
| CR6 | End-of-shift production summary | Supporting | 0.10 | 0.05 | 0.03 | 0.02 |

Info quality parents for CR1: IO3 (ore grade at ROM), IO7 (information timeliness)

### Processing — processing shift supervisor

| ID | Task | Type | Time (cur) | Time (ideal) | σ (cur) | σ (ideal) |
|---|---|---|---|---|---|---|
| PS1 | Throughput vs. recovery tradeoff decisions | Constraint | 0.25 | 0.35 | 0.12 | 0.06 |
| PS2 | Crew allocation across plant areas | Supporting | 0.15 | 0.12 | 0.05 | 0.05 |
| PS3 | Pre-shift safety briefing | Supporting | 0.10 | 0.10 | 0.02 | 0.02 |
| PS4 | Emergency response and escalation decisions | Constraint | 0.10 | 0.15 | 0.15 | 0.08 |
| PS5 | Coordination calls with mine ops about incoming ore | Coordination | 0.15 | 0.03 | 0.08 | 0.03 |
| PS6 | Shift reports and paperwork | Coordination | 0.15 | 0.05 | 0.03 | 0.02 |
| PS7 | Departmental improvement initiative tracking | Local | 0.10 | 0.05 | 0.02 | 0.02 |

Info quality parents for PS1: IO3 (ore grade at ROM), IO7 (information timeliness)

### Geology — grade control geologist

| ID | Task | Type | Time (cur) | Time (ideal) | σ (cur) | σ (ideal) |
|---|---|---|---|---|---|---|
| J1 | Pit-face ore/waste mapping and classification | Constraint | 0.22 | 0.25 | 0.12 | 0.06 |
| J2 | Short-term grade model update | Constraint | 0.18 | 0.25 | 0.18 | 0.08 |
| J3 | Data cleaning and QA/QC validation | Coordination | 0.20 | 0.05 | 0.05 | 0.02 |
| J4 | Emailing/calling mine planner with grade updates | Coordination | 0.10 | 0.00 | 0.08 | — |
| J5 | Waiting for resource geologist validation | Coordination | 0.10 | 0.03 | 0.10 | 0.03 |
| J6 | Core photo documentation and filing | Supporting | 0.12 | 0.10 | 0.02 | 0.02 |
| J7 | Departmental skills matrix documentation | Local | 0.08 | 0.02 | 0.02 | 0.02 |

### Geology — resource geologist

| ID | Task | Type | Time (cur) | Time (ideal) | σ (cur) | σ (ideal) |
|---|---|---|---|---|---|---|
| RG1 | Block model building (kriging, simulation) | Constraint | 0.30 | 0.35 | 0.20 | 0.08 |
| RG2 | Geological domain definition | Constraint | 0.15 | 0.18 | 0.22 | 0.10 |
| RG3 | Reserve classification and reporting | Supporting | 0.15 | 0.12 | 0.05 | 0.04 |
| RG4 | Peer review of grade control model | Coordination | 0.12 | 0.05 | 0.08 | 0.03 |
| RG5 | Exploration data interpretation | Local | 0.10 | 0.08 | 0.06 | 0.06 |
| RG6 | Conference and industry benchmarking | Local | 0.08 | 0.05 | 0.02 | 0.02 |
| RG7 | Model documentation and methodology write-up | Supporting | 0.10 | 0.07 | 0.03 | 0.02 |

RG1 has the highest noise in the network (σ=0.20), representing the documented 10-20% inter-geologist spread on block model estimates.

### Mine planning — short-range mine planner

| ID | Task | Type | Time (cur) | Time (ideal) | σ (cur) | σ (ideal) |
|---|---|---|---|---|---|---|
| MP1 | Weekly dig plan creation from block model | Constraint | 0.25 | 0.30 | 0.10 | 0.05 |
| MP2 | Shovel position optimization | Constraint | 0.15 | 0.20 | 0.08 | 0.04 |
| MP3 | Plan vs. actual reconciliation | Coordination | 0.15 | 0.05 | 0.06 | 0.02 |
| MP4 | Coordination meetings with geology and dispatch | Coordination | 0.20 | 0.05 | 0.05 | 0.03 |
| MP5 | Production reports for mine management | Coordination | 0.12 | 0.03 | 0.03 | 0.02 |
| MP6 | Equipment availability integration into plan | Supporting | 0.08 | 0.10 | 0.06 | 0.03 |
| MP7 | Mine planning KPI tracking | Local | 0.05 | 0.02 | 0.02 | 0.02 |

Info quality parents for MP1: IO1 (block model accuracy)

### Mine operations — dispatcher

| ID | Task | Type | Time (cur) | Time (ideal) | σ (cur) | σ (ideal) |
|---|---|---|---|---|---|---|
| D1 | Truck-to-shovel assignment against grade targets | Constraint | 0.20 | 0.35 | 0.15 | 0.05 |
| D2 | Radio coordination with truck operators | Coordination | 0.28 | 0.08 | 0.08 | 0.03 |
| D3 | Real-time re-routing for breakdowns/weather | Constraint | 0.15 | 0.20 | 0.12 | 0.06 |
| D4 | Reconciling tonnage with belt scales and plan | Coordination | 0.12 | 0.02 | 0.06 | 0.02 |
| D5 | Shift production logging | Supporting | 0.10 | 0.05 | 0.03 | 0.02 |
| D6 | Handover briefing to next shift dispatcher | Coordination | 0.08 | 0.03 | 0.10 | 0.03 |
| D7 | Fleet utilization report for mine manager | Local | 0.07 | 0.02 | 0.02 | 0.02 |

Info quality parents for D1: IO1 (block model accuracy, via dig plan), IO7 (information timeliness)

### Mine operations — mine ops shift supervisor

| ID | Task | Type | Time (cur) | Time (ideal) | σ (cur) | σ (ideal) |
|---|---|---|---|---|---|---|
| MS1 | Dig plan execution and in-shift adjustments | Constraint | 0.25 | 0.30 | 0.12 | 0.06 |
| MS2 | Ground condition response (water, instability) | Constraint | 0.10 | 0.12 | 0.10 | 0.08 |
| MS3 | Pre-shift toolbox talk and crew assignment | Supporting | 0.10 | 0.10 | 0.02 | 0.02 |
| MS4 | Shift handover to incoming supervisor | Coordination | 0.10 | 0.03 | 0.14 | 0.04 |
| MS5 | Equipment breakdown coordination with maintenance | Coordination | 0.15 | 0.05 | 0.08 | 0.03 |
| MS6 | Radio coordination with dispatch and operators | Coordination | 0.15 | 0.05 | 0.06 | 0.03 |
| MS7 | Shift production report writing | Coordination | 0.10 | 0.03 | 0.03 | 0.02 |

### Maintenance — maintenance planner

| ID | Task | Type | Time (cur) | Time (ideal) | σ (cur) | σ (ideal) |
|---|---|---|---|---|---|---|
| P1 | Constraint-equipment maintenance planning (SAG, flotation) | Constraint | 0.12 | 0.30 | 0.12 | 0.05 |
| P2 | General work order scheduling (non-constraint) | Supporting | 0.15 | 0.12 | 0.08 | 0.04 |
| P3 | Approval chasing across departments | Coordination | 0.18 | 0.03 | 0.06 | 0.02 |
| P4 | CMMS reconciliation (planned vs. executed) | Coordination | 0.15 | 0.03 | 0.05 | 0.02 |
| P5 | Multi-department planning alignment meetings | Coordination | 0.20 | 0.08 | 0.04 | 0.04 |
| P6 | Shutdown coordination paperwork | Supporting | 0.10 | 0.08 | 0.03 | 0.03 |
| P7 | Maintenance KPI dashboard updates | Local | 0.10 | 0.06 | 0.02 | 0.02 |

### Maintenance — condition monitoring analyst

| ID | Task | Type | Time (cur) | Time (ideal) | σ (cur) | σ (ideal) |
|---|---|---|---|---|---|---|
| T1 | SAG mill and flotation cell vibration monitoring | Constraint | 0.22 | 0.35 | 0.15 | 0.05 |
| T2 | Mobile fleet condition assessment | Supporting | 0.15 | 0.12 | 0.10 | 0.05 |
| T3 | Briefing reliability engineer (verbal, informal) | Coordination | 0.15 | 0.03 | 0.12 | 0.03 |
| T4 | Writing condition reports for management | Coordination | 0.18 | 0.05 | 0.05 | 0.02 |
| T5 | Routine inspection walk-around | Supporting | 0.15 | 0.15 | 0.03 | 0.03 |
| T6 | Sensor calibration and data validation | Supporting | 0.08 | 0.08 | 0.02 | 0.02 |
| T7 | Monthly equipment health scorecard | Local | 0.07 | 0.02 | 0.02 | 0.02 |

### Maintenance — reliability engineer

| ID | Task | Type | Time (cur) | Time (ideal) | σ (cur) | σ (ideal) |
|---|---|---|---|---|---|---|
| RE1 | Failure mode analysis on constraint equipment | Constraint | 0.25 | 0.35 | 0.10 | 0.05 |
| RE2 | Condition threshold setting and calibration | Constraint | 0.15 | 0.20 | 0.12 | 0.05 |
| RE3 | Root cause analysis documentation | Supporting | 0.15 | 0.12 | 0.06 | 0.04 |
| RE4 | Cross-departmental reliability review meetings | Coordination | 0.20 | 0.08 | 0.04 | 0.04 |
| RE5 | MTBF/MTTR reporting and benchmarking | Supporting | 0.10 | 0.08 | 0.03 | 0.02 |
| RE6 | Reliability improvement program management | Constraint | 0.10 | 0.15 | 0.05 | 0.04 |
| RE7 | Vendor technical liaison | Local | 0.05 | 0.02 | 0.03 | 0.03 |

RE2 output feeds the condition monitoring analyst's T1 info quality (better thresholds → more effective monitoring).

### Finance — FP&A analyst

| ID | Task | Type | Time (cur) | Time (ideal) | σ (cur) | σ (ideal) |
|---|---|---|---|---|---|---|
| S1 | Constraint economics analysis (recovery value, sensitivity) | Constraint | 0.08 | 0.35 | 0.10 | 0.05 |
| S2 | Monthly report assembly from 8 systems | Coordination | 0.30 | 0.03 | 0.08 | 0.02 |
| S3 | Ad-hoc data requests from executives | Coordination | 0.15 | 0.02 | 0.10 | 0.02 |
| S4 | Budget variance analysis | Supporting | 0.15 | 0.12 | 0.06 | 0.03 |
| S5 | Board deck financial slides | Coordination | 0.12 | 0.05 | 0.04 | 0.02 |
| S6 | Capital project NPV modeling | Constraint | 0.10 | 0.18 | 0.15 | 0.06 |
| S7 | Monthly close reconciliation support | Supporting | 0.10 | 0.05 | 0.03 | 0.02 |

### Finance — capital project evaluator

| ID | Task | Type | Time (cur) | Time (ideal) | σ (cur) | σ (ideal) |
|---|---|---|---|---|---|---|
| CE1 | Capex estimation for feasibility studies | Constraint | 0.25 | 0.25 | 0.20 | 0.08 |
| CE2 | NPV/IRR financial modeling | Constraint | 0.20 | 0.20 | 0.12 | 0.06 |
| CE3 | Reference-class benchmarking against past projects | Constraint | 0.10 | 0.20 | 0.06 | 0.04 |
| CE4 | Post-investment performance review | Supporting | 0.10 | 0.15 | 0.05 | 0.04 |
| CE5 | Stage-gate documentation and committee presentations | Coordination | 0.20 | 0.08 | 0.04 | 0.03 |
| CE6 | Stakeholder alignment on project scope | Coordination | 0.15 | 0.07 | 0.06 | 0.04 |

CE1 has the second-highest noise (σ=0.20): documented 37% mean overrun, 44% inter-analyst spread.
CE3 output feeds CE1 info quality (reference-class anchoring reduces estimation noise).

### HSE — mine safety officer

| ID | Task | Type | Time (cur) | Time (ideal) | σ (cur) | σ (ideal) |
|---|---|---|---|---|---|---|
| SO1 | Workplace inspections | Supporting | 0.20 | 0.18 | 0.04 | 0.03 |
| SO2 | Job safety analysis for non-routine work | Supporting | 0.15 | 0.12 | 0.08 | 0.04 |
| SO3 | Incident investigation | Supporting | 0.15 | 0.15 | 0.06 | 0.05 |
| SO4 | Permit-to-work processing and management | Coordination | 0.20 | 0.05 | 0.05 | 0.02 |
| SO5 | Safety inductions and toolbox talks | Supporting | 0.15 | 0.12 | 0.03 | 0.03 |
| SO6 | Regulatory interaction and reporting | Supporting | 0.10 | 0.08 | 0.03 | 0.02 |
| SO7 | Safety KPI dashboard maintenance | Local | 0.05 | 0.02 | 0.02 | 0.02 |

SO4 has a special blocking effect: slow permit processing delays constraint maintenance work (inversely affects IO5).

### IT & Digital — IT/data lead

| ID | Task | Type | Time (cur) | Time (ideal) | σ (cur) | σ (ideal) |
|---|---|---|---|---|---|---|
| I1 | Building department-specific dashboards | Local | 0.25 | 0.05 | 0.03 | 0.03 |
| I2 | Maintaining OT-to-IT data pipeline | Supporting | 0.15 | 0.15 | 0.04 | 0.04 |
| I3 | Responding to ad-hoc data extraction requests | Coordination | 0.25 | 0.05 | 0.05 | 0.02 |
| I4 | Shared data platform development and maintenance | Constraint | 0.15 | 0.40 | 0.08 | 0.04 |
| I5 | Infrastructure and service desk oversight | Supporting | 0.20 | 0.15 | 0.03 | 0.03 |

I4 is the architectural investment: its output (IO7 information timeliness) improves info quality inputs across multiple constraint tasks org-wide.

### Supply chain — procurement officer

| ID | Task | Type | Time (cur) | Time (ideal) | σ (cur) | σ (ideal) |
|---|---|---|---|---|---|---|
| R1 | Reagent and grinding media sourcing | Supporting | 0.25 | 0.30 | 0.06 | 0.04 |
| R2 | Critical spares procurement for constraint equipment | Supporting | 0.20 | 0.25 | 0.08 | 0.04 |
| R3 | General consumables purchasing | Supporting | 0.20 | 0.18 | 0.04 | 0.04 |
| R4 | Office supplies and services optimization | Local | 0.10 | 0.05 | 0.02 | 0.02 |
| R5 | Supplier evaluation and RFP management | Coordination | 0.15 | 0.10 | 0.06 | 0.04 |
| R6 | PO approval chasing | Coordination | 0.10 | 0.02 | 0.04 | 0.02 |

### HR — HR business partner

| ID | Task | Type | Time (cur) | Time (ideal) | σ (cur) | σ (ideal) |
|---|---|---|---|---|---|---|
| H1 | Onboarding portal improvement project | Local | 0.25 | 0.10 | 0.03 | 0.03 |
| H2 | Restructure transition management | Coordination | 0.30 | 0.15 | 0.08 | 0.04 |
| H3 | Skills gap analysis and training coordination | Supporting | 0.20 | 0.25 | 0.05 | 0.04 |
| H4 | Constraint-role competency assessment | Supporting | 0.10 | 0.20 | 0.06 | 0.04 |
| H5 | Employee relations casework | Supporting | 0.15 | 0.15 | 0.05 | 0.05 |

### Executive — COO

| ID | Task | Type | Time (cur) | Time (ideal) | σ (cur) | σ (ideal) |
|---|---|---|---|---|---|---|
| COO1 | Operational KPI setting and performance review | Constraint | 0.15 | 0.25 | 0.10 | 0.05 |
| COO2 | Cross-departmental resource arbitration | Coordination | 0.20 | 0.10 | 0.12 | 0.06 |
| COO3 | Capital allocation input and project prioritization | Constraint | 0.15 | 0.20 | 0.10 | 0.05 |
| COO4 | Weekly operational review meetings | Coordination | 0.25 | 0.10 | 0.04 | 0.04 |
| COO5 | Strategy alignment and board preparation | Local | 0.15 | 0.10 | 0.05 | 0.05 |
| COO6 | Site visits and stakeholder engagement | Supporting | 0.10 | 0.10 | 0.03 | 0.03 |

---

## 3. Intermediate outcomes

### Constraint-path outcomes

| ID | Name | Parent tasks (with weights) | Parent outcomes (with weights) | σ |
|---|---|---|---|---|
| IO1 | Block model accuracy | J1 (0.7), J2 (0.9), RG1 (0.9), RG2 (0.7) | — | 0.05 |
| IO2 | Dig plan quality | MP1 (0.9), MP2 (0.5) | IO1 (0.8) | 0.04 |
| IO3 | Ore grade at ROM pad | D1 (0.6), D3 (0.3), MS1 (0.6), MS2 (0.2) | IO2 (0.7), IO14 (0.2) | 0.05 |
| IO4 | Flotation circuit stability | M1 (0.9), M2 (0.5), CR1 (0.8), PS1 (0.5) | IO3 (0.4), IO9 (0.3), IO14 (0.3) | 0.04 |
| IO5 | Constraint equipment availability | P1 (0.8), T1 (0.7), RE1 (0.6), RE6 (0.3), CR2 (0.3), PS4 (0.4) | IO10 (0.4) | 0.03 |
| IO14 | Shift continuity | CR3 (−0.5), MS4 (−0.4), D6 (−0.3) | — | 0.06 |

Note: IO14 parent weights are negative because higher handover noise *reduces* shift continuity. IO14 value represents continuity quality — a higher value means better continuity.

### Non-constraint outcomes

| ID | Name | Parent tasks (with weights) | Parent outcomes | σ |
|---|---|---|---|---|
| IO6 | Fleet equipment availability | P2 (0.6), T2 (0.5) | — | 0.04 |
| IO7 | Information timeliness | I4 (0.8), I2 (0.5) | — | 0.05 |
| IO8 | Forecast accuracy | S1 (0.6), S6 (0.5), CE1 (0.7), CE2 (0.5), COO3 (0.3) | — | 0.06 |
| IO9 | Supply chain reliability (reagents) | R1 (0.7), R2 (0.3) | — | 0.03 |
| IO10 | Critical spares availability | R2 (0.6) | — | 0.04 |
| IO11 | Compliance status | SO1 (0.4), SO2 (0.3), SO3 (0.2), SO5 (0.1), SO6 (0.2) | — | 0.02 |
| IO12 | Workforce readiness | H3 (0.4), H4 (0.5), H5 (0.1) | — | 0.03 |

### Dead-end outcomes (no path to value drivers)

| ID | Name | Parent tasks (with weights) |
|---|---|---|
| DE1 | Internal reporting quality | P7 (0.3), T7 (0.3), D7 (0.3), MP7 (0.2), SO7 (0.2), PS7 (0.2) |
| DE2 | Internal capability development | J7 (0.3), H1 (0.4), RG6 (0.2), RE7 (0.3) |
| DE3 | Internal strategy alignment | COO5 (0.5), RG5 (0.4), I1 (0.3), R4 (0.2) |

---

## 4. Value drivers

| ID | Name | Constraint path | Base value | Unit | Parent outcomes (with weights) |
|---|---|---|---|---|---|
| VD1 | Throughput | yes | 15.0 | Mtpa | IO5 (0.9), IO11 (threshold) |
| VD2 | Head grade | yes | 0.45 | % Cu | IO3 (0.9) |
| VD3 | Recovery | yes | 88.0 | % | IO4 (0.9), IO3 (0.3) |
| VD4 | Mining cost | no | 120 | $M/yr | IO6 (0.5) |
| VD5 | Processing cost | no | 95 | $M/yr | IO7 (0.2), IO9 (0.2) |
| VD6 | Maintenance cost | no | 65 | $M/yr | IO5 (0.6), IO6 (0.3), IO10 (0.2) |
| VD7 | G&A + capex | no | 90 | $M/yr | IO8 (0.7), IO7 (0.2), IO12 (0.1) |

All value drivers connect to NPV with weight 1.0 (NPV computation uses the financial formula, not weights).

IO11 → VD1 has threshold behavior: normally weight 0, but if IO11 drops below 0.5, weight spikes (representing license-to-operate risk shutting down the operation).

### NPV formula

```
Cu produced (t/yr) = throughput (Mt) × 1,000,000 × (headGrade% / 100) × (recovery% / 100)
Revenue ($M/yr) = Cu produced × $8,420/t ÷ 1,000,000
Cost ($M/yr) = mining + processing + maintenance + G&A
Annual FCF ($M) = revenue − cost
NPV ($M) = Σ FCF / 1.08^t for t = 1..20
```

Baseline NPV ≈ $2,100M.

---

## 5. Additional edge: info quality dependencies

Some tasks receive information quality from intermediate outcomes. These are edges from outcomes back to tasks, representing the quality of input data available:

| Task | Info quality parent | Weight | Meaning |
|---|---|---|---|
| M1 | IO3 (ore grade at ROM) | 0.4 | Better ore data → better reagent decisions |
| M1 | IO7 (info timeliness) | 0.3 | Faster data → more responsive adjustments |
| M2 | IO7 (info timeliness) | 0.3 | Faster lab data → quicker deviation investigation |
| CR1 | IO3 (ore grade at ROM) | 0.3 | Knowing incoming grade → better setpoints |
| CR1 | IO7 (info timeliness) | 0.3 | Real-time data on DCS screens |
| PS1 | IO3 (ore grade at ROM) | 0.3 | Grade knowledge → better tradeoff calls |
| PS1 | IO7 (info timeliness) | 0.2 | Timely info → informed decisions |
| MP1 | IO1 (block model accuracy) | 0.5 | Better block model → better dig plan |
| D1 | IO7 (info timeliness) | 0.3 | Real-time grade data → better truck assignments |
| T1 | RE2 output (via IO5 proxy) | 0.4 | Better thresholds → more effective monitoring |
| CE1 | CE3 output (via IO8 proxy) | 0.5 | Reference-class benchmarking → better estimation |

These create the feedback loops that make the information architecture story work: improving IO7 (via I4) improves info quality at multiple constraint tasks simultaneously.

---

## 6. Scenarios

### Scenario 1: Recovery path
- **Description:** ML flotation optimizer reduces shift-to-shift reagent dosing noise. The constraint's most valuable chain.
- **Highlight nodes:** M1, M2, CR1, PS1 → IO4 → VD3 → NPV
- **Parameter overrides:** M1 noise 0.15→0.05, CR1 noise 0.12→0.04, PS1 noise 0.12→0.06
- **Expected NPV impact:** +$180M

### Scenario 2: Grade path
- **Description:** ML-assisted grade estimation and real-time grade tracking from pit to crusher.
- **Highlight nodes:** J1, J2, RG1, RG2 → IO1 → IO2 → IO3 → VD2, VD3 → NPV
- **Parameter overrides:** RG1 noise 0.20→0.08, RG2 noise 0.22→0.10, J2 noise 0.18→0.08
- **Expected NPV impact:** +$40M

### Scenario 3: Maintenance path
- **Description:** Predictive maintenance with sensor fusion catches failures weeks early, protects constraint uptime.
- **Highlight nodes:** T1, RE1, RE2, P1 → IO5 → VD1, VD6 → NPV
- **Parameter overrides:** T1 noise 0.15→0.05, P1 time 0.12→0.30 (with coordination compressed: P3 0.18→0.03, P4 0.15→0.03, P5 0.20→0.08)
- **Expected NPV impact:** +$80M

### Scenario 4: Information architecture
- **Description:** Shared data platform eliminates need for human information brokering across the org.
- **Highlight nodes:** I4 → IO7 → (info quality edges to M1, CR1, PS1, D1, MP1) → multiple outcomes → NPV
- **Parameter overrides:** I4 time 0.15→0.40, I1 time 0.25→0.05, I3 time 0.25→0.05. Then compress coordination time across all roles: M4→0.00, J4→0.00, J5 0.10→0.03, MP3 0.15→0.05, MP4 0.20→0.05, CR3 0.12→0.03, CR4 0.15→0.02, D2 0.28→0.08, D4 0.12→0.02, D6 0.08→0.03, MS4 0.10→0.03, MS5 0.15→0.05, P3 0.18→0.03, P4 0.15→0.03, T3 0.15→0.03, T4 0.18→0.05, S2 0.30→0.03, S3 0.15→0.02, S5 0.12→0.05, CE5 0.20→0.08, CE6 0.15→0.07, RE4 0.20→0.08, COO4 0.25→0.10, SO4 0.20→0.05, R5 0.15→0.10, R6 0.10→0.02, H2 0.30→0.15. Freed time redistributed proportionally to non-coordination tasks within each role.
- **Expected NPV impact:** +$100M

### Scenario 5: Capital accuracy
- **Description:** Reference-class forecasting and ML capex models reduce capital project overruns.
- **Highlight nodes:** CE1, CE2, CE3, S1, S6 → IO8 → VD7 → NPV
- **Parameter overrides:** CE1 noise 0.20→0.08, CE3 time 0.10→0.20, CE5 time 0.20→0.08 (freed to CE3), S1 time 0.08→0.35 (freed from S2/S3)
- **Expected NPV impact:** +$55M

### Scenario 6: Dead ends
- **Description:** All locally-optimized work flows to dead-end outcome nodes that have no path to any value driver.
- **Highlight nodes:** M7, PS7, J7, RG5, RG6, MP7, D7, P7, T7, RE7, SO7, I1, R4, H1, COO5 → DE1, DE2, DE3
- **Parameter overrides:** none (this is diagnostic, not an intervention)
- **Expected NPV impact:** $0 (that's the point)

### Scenario 7: Coordination overhead
- **Description:** All coordination tasks consume time but have no outgoing edges to any outcome.
- **Highlight nodes:** M3, M4, M5, CR3, CR4, CR5, PS5, PS6, J3, J4, J5, RG4, MP3, MP4, MP5, D2, D4, D6, MS4, MS5, MS6, MS7, P3, P4, P5, T3, T4, S2, S3, S5, CE5, CE6, SO4, I3, R5, R6, H2, COO2, COO4
- **Parameter overrides:** none (diagnostic)
- **Expected NPV impact:** $0 direct (but these tasks consume ~34% of total org capacity)

### Scenario 8: Full architecture shift
- **Description:** All interventions combined: AI at constraint + shared data platform + coordination compression + noise reduction everywhere.
- **Highlight nodes:** all nodes (show full ideal-state transition)
- **Parameter overrides:** set ALL tasks to their ideal-state time allocations and noise values
- **Expected NPV impact:** +$450M (super-additive: exceeds sum of scenarios 1-5 by ~15%)

---

## 7. Calibration notes

All parameters are synthetic and illustrative, calibrated to produce plausible directional effects. Key calibration targets:

- Baseline NPV should compute to approximately $2,100M
- Scenario 8 (full shift) should produce NPV ≈ $2,550M (+21%)
- Constraint tasks should rank highest in sensitivity analysis (top 10: M1, CR1, RG1, RG2, T1, P1, MP1, D1, PS1, RE1)
- Increasing any local task's time should decrease NPV (via time budget competition with constraint tasks)
- Increasing any coordination task's time should decrease NPV (same mechanism)
- Reducing all coordination to minimum and redistributing should yield ~14% NPV uplift
- Dropping SO1/SO2/SO3 to near-zero should eventually trigger compliance threshold collapse

Edge weights and noise values may need adjustment during implementation to achieve these targets. This is expected — treat Phase 1 testing as the calibration phase.
