import { useState, type CSSProperties } from 'react';
import type { Network, Scenario } from '../engine/types';
import type { ForwardResult } from '../engine/forward';
import type { SensitivityResult } from '../engine/sensitivity';
import type { BuilderAdjustment } from '../views/CircularNPVView';
import type { CapacitySegment } from './CapacityBudgetBar';
import tasksData from '../data/tasks.json';

type PanelMode = 'info' | 'builder' | 'saved' | 'about';

interface ActiveScenarioData {
  name: string;
  description: string;
  detail: string;
  npvImpact: string;
  parameterOverrides: Array<{ nodeId: string; param: string; value: number }>;
}

interface ScenarioPanelProps {
  network: Network;
  panelMode: PanelMode;
  onSetPanelMode: (mode: PanelMode) => void;
  activeScenarioId: string | null;
  activeScenarioData: ActiveScenarioData | null;
  baselineResult: ForwardResult;
  forwardResult: ForwardResult;
  budgetSegments: CapacitySegment[];
  builderAdjustments: BuilderAdjustment[];
  builderName: string;
  onSetBuilderName: (name: string) => void;
  onAddAdjustment: (adj: BuilderAdjustment) => void;
  onRemoveAdjustment: (index: number) => void;
  onSaveScenario: () => void;
  onClearBuilder: () => void;
  customScenarios: Scenario[];
  onEditCustomScenario: (id: string) => void;
  onDeleteCustomScenario: (id: string) => void;
  onApplyScenario: (id: string) => void;
  onReset: () => void;
  onClose: () => void;
  selectedNodeId: string | null;
  sensitivities: SensitivityResult[];
}

interface TaskRecord {
  id: string;
  name: string;
  type: string;
  roleId: string;
  capabilityId: string;
}

const tasksMap = new Map<string, TaskRecord>(
  (tasksData as TaskRecord[]).map(t => [t.id, t])
);

const ROLE_NAMES: Record<string, string> = {
  metallurgist: 'Metallurgist',
  controlRoom: 'Control Room Operator',
  procSupervisor: 'Processing Supervisor',
  gradeGeologist: 'Grade Geologist',
  resourceGeologist: 'Resource Geologist',
  planner: 'Mine Planner',
  dispatcher: 'Dispatcher',
  mineSupervisor: 'Mine Supervisor',
  mainPlanner: 'Maintenance Planner',
  conditionAnalyst: 'Condition Analyst',
  reliabilityEng: 'Reliability Engineer',
  fpAnalyst: 'FP&A Analyst',
  capitalEval: 'Capital Evaluator',
  safetyOfficer: 'Safety Officer',
  itLead: 'IT Lead',
  procurement: 'Procurement',
  hrPartner: 'HR Partner',
  coo: 'COO',
};

const WORK_TYPE_COLORS: Record<string, string> = {
  constraint: '#1D9E75',
  value: '#1D9E75',
  supporting: '#5DCAA5',
  coordination: '#EF9F27',
  local: '#B4B2A9',
};

const VD_NPV_ROLE: Record<string, 'revenue' | 'cost'> = {
  VD1: 'revenue', VD2: 'revenue', VD3: 'revenue',
  VD4: 'cost', VD5: 'cost', VD6: 'cost', VD7: 'cost',
};

const NODE_DESCRIPTIONS: Record<string, string> = {
  NPV: 'The present value of 20 years of discounted free cash flow from the mine at 8% discount rate. Revenue is throughput × grade × recovery × $8,420/t Cu; mining, processing, maintenance, and G&A costs are subtracted before discounting.',
  C1: 'The flotation circuit is the core recovery step where copper minerals separate from waste rock; optimising reagent dosing and circuit configuration directly determines copper recovery and concentrate grade.',
  C2: 'Accurate knowledge of ore grade at blast hole level enables selective mining and maximises the value of material fed to the processing plant.',
  C3: 'Short- and long-term mine plans set the tempo and sequence of ore extraction, controlling both mining cost and the grade profile delivered to the plant.',
  C4: 'The SAG mill, ball mills, and major fixed plant items are the throughput bottleneck; unplanned downtime here directly shrinks annual copper production.',
  C5: 'The haul truck and shovel fleet must be kept running to sustain dig and haul rates; equipment availability sets the ceiling on ore delivery to the ROM pad.',
  C6: 'Real-time sensor data, historian feeds, and shared data platforms are the raw material for every optimisation decision across the mine.',
  C7: 'Choosing where to deploy capital and forecasting accurately determines whether high-return projects get funded and whether cost overruns are avoided.',
  C8: 'Reagents, critical spares, and contractor crews must arrive on time and to spec; supply chain failures halt processing or force costly workarounds.',
  C9: 'Regulatory compliance and safe work practices protect production continuity; lost-time injuries and enforcement actions can curtail operations.',
  C10: 'A skilled workforce reduces error-driven losses and improves the quality of constraint work; training investment compounds across the mine\'s operating life.',
  C11: 'Meetings, handovers, and status reporting are necessary overhead that enables operational coherence but consumes time that could otherwise be spent on value-creating work.',
  C12: 'Local KPI dashboards, filing, and administrative tasks serve internal reporting needs but have no direct path to throughput, grade, or recovery.',
  C13: 'Truck and shovel execution moves ore and waste according to the mine plan; dispatch quality and haul efficiency determine mining cost and ore delivery rate to the ROM pad.',
  C14: 'The SAG and ball mill circuit receives ROM ore and reduces it to target particle size for flotation; operator setpoint quality directly controls throughput and downstream recovery.',
  OM1: 'The proportion of scheduled operating time that the SAG mill is available to run; availability losses directly reduce annual throughput and cannot be recovered.',
  OM2: 'Root-mean-square error between predicted and actual copper grade at the blast hole; lower RMSE means more accurate ore/waste discrimination and less dilution.',
  OM3: 'Standard deviation of flotation recovery across shifts; lower variability indicates consistent reagent management and stable circuit operation.',
  OM4: 'The fraction of haul truck and shovel operating time when equipment is mechanically ready; higher availability sustains the ore delivery rate to the ROM pad.',
  OM5: 'The error in capital and operational cost forecasts; lower RMSE reduces overruns and improves the reliability of investment decisions.',
  OM6: 'The proportion of critical spare parts orders fulfilled on time from inventory; higher fill rates reduce unplanned downtime when equipment fails.',
  OM7: 'A composite measure of regulatory and internal compliance performance; lower non-conformance rates reduce the risk of production curtailment.',
  OM8: 'How close the milling circuit is operating to its design nameplate capacity; reflects operator setpoint quality, feed characteristics, and circuit stability.',
  VD1: 'Tonnes of ore processed per year; the primary volume driver in the NPV formula, multiplied against grade and recovery to determine copper produced.',
  VD2: 'Average copper content of ore fed to the mill; a multiplicative revenue factor — higher grade produces more copper from the same ore volume at no additional processing cost.',
  VD3: 'The fraction of feed copper captured in saleable concentrate; improvements compound with throughput and grade because the NPV formula is multiplicative.',
  VD4: 'Annual direct cost of drilling, blasting, loading, and hauling ore and waste; subtracted from revenue in the discounted cash flow calculation.',
  VD5: 'Annual operating cost of the crushing, grinding, and flotation circuits; subtracted from revenue and sensitive to both throughput rate and mill efficiency.',
  VD6: 'Annual repair and maintenance expenditure across fixed and mobile plant; subtracted from revenue and influenced by equipment reliability and spare parts availability.',
  VD7: 'Combined general, administrative, and capital charge per year; the least NPV-sensitive cost driver but still reduces free cash flow in every period.',
  M1: 'Selecting the optimal reagent blend for current ore mineralogy to maximise copper recovery from the flotation circuit.',
  M2: 'Adjusting flotation cell sequences, air rates, and pulp levels to match circuit performance to the ore being processed.',
  M3: 'Attending meetings and aligning with mine and maintenance teams to share information and coordinate operational decisions.',
  M4: 'Preparing shift and daily reports on flotation performance for plant management and cross-functional distribution.',
  M5: 'Participating in production, planning, and coordination meetings across departments.',
  M6: 'Writing and maintaining standard operating procedures and process change records for flotation operations.',
  M7: 'Tracking and reporting departmental metrics that are visible to management but not directly linked to plant-wide value creation.',
  CR1: 'Setting optimal speed, load, and water addition targets for the SAG and ball mills based on current feed characteristics.',
  CR2: 'Continuously adjusting mill and flotation parameters in response to feed changes, equipment behaviour, and sensor readings.',
  CR3: 'Communicating operational state, outstanding issues, and priorities between incoming and outgoing control room shifts.',
  CR4: 'Responding to and clearing process alarms to prevent equipment trips and maintain stable plant operation.',
  CR5: 'Recording equipment availability, alarm history, and process events in the control system historian.',
  CR6: 'Supporting the development of operator skills through on-the-job coaching and formal training sessions.',
  PS1: 'Making real-time decisions on how to balance plant throughput against copper recovery when processing constraints arise.',
  PS2: 'Organising operator rosters and shift assignments to ensure processing plant coverage across all operating periods.',
  PS3: 'Attending cross-functional production meetings to align on targets, constraints, and priorities for the shift or day.',
  PS4: 'Coordinating the immediate operational response when process upsets, equipment failures, or safety incidents occur in the plant.',
  PS5: 'Developing operator skills through coaching, skills gap identification, and structured training interventions.',
  PS6: 'Confirming that plant operations conform to environmental permits, regulatory conditions, and internal standards.',
  PS7: 'Maintaining shift-level dashboards and performance records for the processing department\'s internal use.',
  J1: 'Measuring and recording copper grade at individual blast holes to build a grade map of the pit face for selective mining.',
  J2: 'Interpreting grade data to define ore and waste boundaries, guiding blast design and selective loading decisions.',
  J3: 'Coordinating with mine planning and processing teams to share grade and geological data for operational decisions.',
  J4: 'Attending mine planning and operational review meetings to provide geological input and align on ore sequencing.',
  J5: 'Preparing and distributing grade control status reports for mine management and downstream data consumers.',
  J6: 'Ensuring sampling protocols, sample preparation, and laboratory submission standards are followed for data integrity.',
  J7: 'Managing and updating the local grade database and geological filing system for the grade control team.',
  RG1: 'Incorporating new drilling, sampling, and assay data into the resource block model used for long-term mine planning.',
  RG2: 'Running geostatistical estimation methods to quantify the mineral resource and assign confidence categories.',
  RG3: 'Coordinating the preparation and review of resource reporting for management, auditors, and regulatory submissions.',
  RG4: 'Providing geological context and structural interpretation to support mine planning and block model development.',
  RG5: 'Maintaining the geological archive including core logs, sample records, and historical field data.',
  RG6: 'Comparing resource estimates against production records and resolving discrepancies for internal reconciliation.',
  RG7: 'Writing technical reports, geological summaries, and documentation for the resource estimation process.',
  MP1: 'Designing the sequence of dig blocks and shovel moves that delivers the target grade profile to the ROM pad at minimum mining cost.',
  MP2: 'Optimising shovel cut locations and timing to maximise both ore selectivity and productivity in the active mining areas.',
  MP3: 'Coordinating the mine plan with processing, maintenance, and logistics to align equipment and resource availability.',
  MP4: 'Attending short-interval control, production review, and strategic planning sessions across mine departments.',
  MP5: 'Aligning short-term mine production targets with plant feed requirements and maintenance windows.',
  MP6: 'Producing written plans, monthly reports, and scheduling documentation for management and regulatory review.',
  MP7: 'Maintaining internal scheduling tools and tracking metrics that serve the mine planning team but do not feed the formal mine plan.',
  D1: 'Allocating haul trucks to shovels in real time to minimise queuing, maximise ore movement, and meet grade blend targets.',
  D2: 'Selecting haul routes that minimise cycle time and tyre wear while accommodating road conditions and traffic.',
  D3: 'Communicating between pit supervisors, maintenance, and control room to coordinate truck movements and resolve conflicts.',
  D4: 'Briefing incoming dispatchers on fleet status, active priorities, and outstanding operational issues at shift change.',
  D5: 'Tracking truck and shovel positions, payloads, and cycle times to support dispatcher decisions and performance reporting.',
  D6: 'Responding to unplanned events such as road closures or breakdowns by rapidly reconfiguring truck assignments and routes.',
  D7: 'Managing the dispatch queue for internally reported metrics that measure dispatcher activity without direct connection to fleet productivity.',
  MS1: 'Supervising shovel and loader operators to ensure dig plans are executed accurately to grade boundaries and safety standards.',
  MS2: 'Monitoring ore and waste classification at the face and intervening when grade boundaries are not being respected during loading.',
  MS3: 'Conducting pre-shift safety checks, toolbox talks, and field observations to confirm safe work practices at the pit face.',
  MS4: 'Attending cross-functional status meetings to report mining progress and receive information from other departments.',
  MS5: 'Conducting start-of-shift briefings with mining crew to communicate priorities, hazards, and plan changes.',
  MS6: 'Managing the immediate response to safety incidents, near-misses, and equipment accidents in the mining area.',
  MS7: 'Preparing and submitting shift production reports covering tonnes moved, ore grade, and equipment performance.',
  P1: 'Scheduling and planning preventive maintenance for throughput-critical equipment such as the SAG mill, crushers, and conveyors.',
  P2: 'Designing and coordinating planned maintenance shutdowns to maximise work scope completion within the minimum production window.',
  P3: 'Managing the backlog of work orders to prioritise high-risk and constraint-linked maintenance activities.',
  P4: 'Attending maintenance planning, production alignment, and work management meetings across departments.',
  P5: 'Monitoring maintenance expenditure against budget and preparing variance reports for departmental management.',
  P6: 'Managing contractor resourcing, scope definition, and on-site supervision for specialised maintenance work.',
  P7: 'Maintaining the maintenance backlog register and internal tracking tools without direct linkage to equipment reliability decisions.',
  T1: 'Analysing rotating equipment vibration signatures to detect developing faults before they cause unplanned failure.',
  T2: 'Interpreting lubricant contamination and wear particle data to identify bearing and gear failure modes in critical equipment.',
  T3: 'Producing and distributing condition monitoring reports to maintenance planners and reliability engineers.',
  T4: 'Entering inspection results, measurement data, and findings into the CMMS and condition monitoring database.',
  T5: 'Maintaining and calibrating vibration probes, temperature sensors, and other condition monitoring instruments.',
  T6: 'Supporting maintenance planners with historical trending data and baseline comparisons for equipment performance reviews.',
  T7: 'Organising and archiving condition monitoring records in the team\'s local filing and tracking system.',
  RE1: 'Applying FMEA and fault tree methods to identify the critical failure modes for constraint equipment.',
  RE2: 'Designing reliability-centred maintenance programmes that target failure modes by consequence and probability.',
  RE3: 'Leading engineering investigations and modifications to address recurring failures and improve mean-time-between-failures.',
  RE4: 'Coordinating with operations, condition monitoring, and maintenance planning to align reliability priorities and share findings.',
  RE5: 'Writing and maintaining technical standards, maintenance procedures, and reliability engineering documentation.',
  RE6: 'Developing strategies to extend the economic life of mobile equipment by managing wear, fatigue, and major component lifecycles.',
  RE7: 'Maintaining the team\'s local equipment register and tracking spreadsheets for internal reliability reporting.',
  S1: 'Analysing the financial return on improvements to throughput, recovery, and grade to prioritise operational investments.',
  S2: 'Evaluating capital project proposals using NPV, IRR, and payback metrics to support investment decisions.',
  S3: 'Preparing financial performance summaries and variance commentary for senior management.',
  S4: 'Attending departmental and cross-functional budget review meetings to report financial performance.',
  S5: 'Building and maintaining financial models that support scenario analysis, forecasting, and decision-making.',
  S6: 'Investigating and explaining differences between budget and actual financial results across cost categories.',
  S7: 'Providing financial risk quantification and sensitivity analysis to support business risk management processes.',
  CE1: 'Building detailed capital cost models for proposed projects, including contingency estimation and phasing plans.',
  CE2: 'Applying systematic benchmarking of similar past projects to calibrate capital cost estimates and reduce optimism bias.',
  CE3: 'Conducting technical and commercial reviews at project stage gates to confirm readiness for the next development phase.',
  CE4: 'Providing financial analysis and presentation materials to support project business cases through approval processes.',
  CE5: 'Preparing materials and coordinating logistics for project steering committee meetings.',
  CE6: 'Reviewing completed projects against original estimates to capture lessons and improve future forecasting accuracy.',
  SO1: 'Identifying and assessing workplace hazards through job safety analyses, inspections, and risk workshops.',
  SO2: 'Designing and delivering safety induction, refresher, and specialist training programmes for site personnel.',
  SO3: 'Conducting scheduled and unannounced audits to verify compliance with legislative requirements and internal standards.',
  SO4: 'Leading or supporting the investigation of safety incidents and near-misses to identify root causes and corrective actions.',
  SO5: 'Developing and running behavioural safety and leadership programmes to improve safety culture across the site.',
  SO6: 'Maintaining the safety team\'s internal inspection records, action tracking logs, and local reporting system.',
  I1: 'Supporting and patching ageing operational technology systems that cannot yet be decommissioned.',
  I2: 'Providing helpdesk and on-site technical support to operational system users across the mine.',
  I3: 'Building and maintaining automated data pipelines that connect operational systems to analytics and reporting platforms.',
  I4: 'Developing and operating the site-wide data platform that makes operational data available to all departments in real time.',
  I5: 'Managing relationships and contracts with technology vendors providing software, hardware, and support services.',
  R1: 'Procuring flotation reagents to specification and on schedule to avoid processing interruptions.',
  R2: 'Managing the inventory of critical spare parts for constraint equipment to minimise lead times when failures occur.',
  R3: 'Maintaining the procurement team\'s internal inventory records and local tracking system.',
  R4: 'Drafting, negotiating, and administering contracts with reagent, materials, and service suppliers.',
  R5: 'Managing day-to-day supplier relationships, delivery schedules, and quality issues for operational materials.',
  H1: 'Handling HR administrative tasks, paperwork, and record-keeping for the site\'s human resources function.',
  H2: 'Analysing workforce demand against supply to identify capability gaps and plan future recruitment and development.',
  H3: 'Designing and coordinating learning and development programmes to build technical and operational skills across the workforce.',
  H4: 'Evaluating employee competency against defined standards to inform training decisions and role progression.',
  COO1: 'Establishing the KPIs and targets that align departmental activity with site-wide production and financial goals.',
  COO2: 'Attending and chairing operational review meetings to align senior leaders on production status and priorities.',
  COO3: 'Making investment decisions on capital projects, equipment replacements, and operational improvements across the mine.',
  COO4: 'Preparing and presenting operational performance updates for the board and executive leadership team.',
  COO5: 'Conducting internal strategy reviews and performance assessments for direct reports and departmental initiatives.',
  COO6: 'Managing relationships with local communities, regulators, and external stakeholders on behalf of the mine operation.',
};

type NodeKind = 'npv' | 'capability' | 'om' | 'vd' | 'task';

function getNodeKind(id: string): NodeKind {
  if (id === 'NPV') return 'npv';
  if (/^C\d+$/.test(id)) return 'capability';
  if (id.startsWith('OM')) return 'om';
  if (id.startsWith('VD')) return 'vd';
  return 'task';
}

function TypeBadge({ type }: { type: string }) {
  const color = WORK_TYPE_COLORS[type] ?? '#888';
  return (
    <span style={{
      display: 'inline-block',
      padding: '1px 6px',
      borderRadius: '3px',
      fontSize: '10px',
      fontWeight: 600,
      textTransform: 'uppercase' as const,
      letterSpacing: '0.5px',
      backgroundColor: `${color}22`,
      color,
      border: `1px solid ${color}44`,
      flexShrink: 0,
    }}>
      {type}
    </span>
  );
}

function DataRow({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '4px' }}>
      <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.45)' }}>{label}</span>
      <span style={{ fontSize: '11px', fontWeight: 500, fontVariantNumeric: 'tabular-nums', color: color ?? '#e5e5e5' }}>{value}</span>
    </div>
  );
}

function NodeDetailView({ nodeId, network, sensitivities }: {
  nodeId: string;
  network: Network;
  sensitivities: SensitivityResult[];
}) {
  const kind = getNodeKind(nodeId);
  const desc = NODE_DESCRIPTIONS[nodeId];
  const sectionStyle: CSSProperties = { padding: '10px 12px' };

  if (kind === 'npv') {
    return (
      <div style={sectionStyle}>
        <div style={{ fontSize: '13px', fontWeight: 600, color: '#B87333', marginBottom: '8px' }}>Net Present Value</div>
        <DataRow label="Baseline NPV" value="~$2,100M" />
        <DataRow label="Ideal-state NPV" value="~$2,423M" />
        <DataRow label="Discount rate" value="8% / 20 yr" />
        {desc && <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.55)', lineHeight: '1.6', marginTop: '10px' }}>{desc}</div>}
      </div>
    );
  }

  if (kind === 'capability') {
    const cap = network.capabilities.get(nodeId);
    if (!cap) return null;
    const sens = sensitivities.find(s => s.capabilityId === nodeId);
    return (
      <div style={sectionStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' as const }}>
          <span style={{ fontSize: '13px', fontWeight: 600, color: '#e5e5e5' }}>{cap.name}</span>
          <TypeBadge type={cap.type} />
        </div>
        <DataRow label="Baseline capacity" value={`${(cap.baselineCapacity * 100).toFixed(0)}%`} />
        <DataRow label="Ideal capacity" value={`${(cap.idealCapacity * 100).toFixed(0)}%`} />
        <DataRow label="Noise σ (baseline)" value={cap.baselineNoiseSigma.toFixed(2)} />
        {sens && Math.abs(sens.capacitySensitivity) > 0.5 && (
          <DataRow
            label="NPV sensitivity"
            value={`${sens.capacitySensitivity > 0 ? '+' : ''}$${Math.round(sens.capacitySensitivity)}M per 1% cap`}
            color={sens.capacitySensitivity > 0 ? 'var(--color-positive)' : 'var(--color-negative)'}
          />
        )}
        {desc && <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.55)', lineHeight: '1.6', marginTop: '10px' }}>{desc}</div>}
      </div>
    );
  }

  if (kind === 'om') {
    const om = network.operationalMetrics.get(nodeId);
    if (!om) return null;
    return (
      <div style={sectionStyle}>
        <div style={{ fontSize: '13px', fontWeight: 600, color: '#e5e5e5', marginBottom: '8px' }}>{om.name}</div>
        <DataRow label="Baseline" value={`${om.baseline.toFixed(2)} ${om.unit}`} />
        <DataRow label="Noise σ" value={om.noiseSigma.toFixed(3)} />
        {desc && <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.55)', lineHeight: '1.6', marginTop: '10px' }}>{desc}</div>}
      </div>
    );
  }

  if (kind === 'vd') {
    const vd = network.valueDrivers.get(nodeId);
    if (!vd) return null;
    const role = VD_NPV_ROLE[nodeId];
    return (
      <div style={sectionStyle}>
        <div style={{ fontSize: '13px', fontWeight: 600, color: '#e5e5e5', marginBottom: '8px' }}>{vd.name}</div>
        <DataRow label="Base value" value={`${vd.baseValue.toFixed(2)} ${vd.unit}`} />
        {role && (
          <DataRow
            label="NPV role"
            value={role === 'revenue' ? 'Multiplicative revenue' : 'Subtracted cost'}
            color={role === 'revenue' ? 'var(--color-positive)' : 'var(--color-negative)'}
          />
        )}
        {desc && <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.55)', lineHeight: '1.6', marginTop: '10px' }}>{desc}</div>}
      </div>
    );
  }

  // task
  const task = tasksMap.get(nodeId);
  if (!task) return null;
  const cap = network.capabilities.get(task.capabilityId);
  return (
    <div style={sectionStyle}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' as const }}>
        <span style={{ fontSize: '13px', fontWeight: 600, color: '#e5e5e5' }}>{task.name}</span>
        <TypeBadge type={task.type} />
      </div>
      <DataRow label="Role" value={ROLE_NAMES[task.roleId] ?? task.roleId} />
      {cap && <DataRow label="Capability" value={cap.name} />}
      {desc && <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.55)', lineHeight: '1.6', marginTop: '10px' }}>{desc}</div>}
    </div>
  );
}

const styles = {
  container: {
    width: '320px',
    flexShrink: 0,
    height: '100%',
    overflowY: 'auto',
    borderLeft: '1px solid rgba(255,255,255,0.1)',
    backgroundColor: '#2a2a30',
    display: 'flex',
    flexDirection: 'column',
  } as CSSProperties,
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 12px',
    borderBottom: '1px solid rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(30,30,36,0.95)',
    position: 'sticky',
    top: 0,
    zIndex: 5,
  } as CSSProperties,
  headerTitle: {
    fontSize: '11px',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.8px',
    color: 'rgba(255,255,255,0.6)',
  } as CSSProperties,
  closeButton: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: '16px',
    color: 'rgba(255,255,255,0.6)',
    padding: '2px 6px',
    borderRadius: '3px',
  } as CSSProperties,
  tabs: {
    display: 'flex',
    borderBottom: '1px solid rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(30,30,36,0.95)',
  } as CSSProperties,
  tab: {
    flex: 1,
    padding: '8px 12px',
    fontSize: '11px',
    fontWeight: 500,
    textAlign: 'center',
    cursor: 'pointer',
    border: 'none',
    background: 'transparent',
    color: 'rgba(255,255,255,0.35)',
    borderBottom: '2px solid transparent',
    transition: 'color 0.15s, border-color 0.15s',
  } as CSSProperties,
  tabActive: {
    color: '#e5e5e5',
    borderBottom: '2px solid #B87333',
  } as CSSProperties,
  section: {
    padding: '10px 12px',
    borderBottom: '1px solid rgba(255,255,255,0.1)',
  } as CSSProperties,
  sectionTitle: {
    fontSize: '10px',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    color: 'rgba(255,255,255,0.35)',
    marginBottom: '6px',
  } as CSSProperties,
  body: {
    flex: 1,
    overflowY: 'auto',
    padding: '0',
  } as CSSProperties,
  badge: {
    display: 'inline-block',
    padding: '2px 8px',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: 600,
    fontVariantNumeric: 'tabular-nums',
  } as CSSProperties,
  input: {
    width: '100%',
    padding: '6px 8px',
    fontSize: '12px',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '4px',
    backgroundColor: 'rgba(255,255,255,0.06)',
    color: '#e5e5e5',
    outline: 'none',
  } as CSSProperties,
  select: {
    width: '100%',
    padding: '5px 8px',
    fontSize: '12px',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '4px',
    backgroundColor: 'rgba(255,255,255,0.06)',
    color: '#e5e5e5',
    cursor: 'pointer',
  } as CSSProperties,
  adjustmentItem: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '4px 8px',
    marginBottom: '4px',
    borderRadius: '4px',
    backgroundColor: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.1)',
    fontSize: '11px',
  } as CSSProperties,
  removeButton: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: 'var(--color-negative)',
    fontSize: '14px',
    padding: '0 4px',
    lineHeight: 1,
  } as CSSProperties,
  actionButton: {
    padding: '6px 12px',
    fontSize: '12px',
    fontWeight: 500,
    borderRadius: '4px',
    border: '1px solid var(--color-constraint)',
    backgroundColor: 'var(--color-constraint)',
    color: '#fff',
    cursor: 'pointer',
  } as CSSProperties,
  secondaryButton: {
    padding: '6px 12px',
    fontSize: '12px',
    fontWeight: 500,
    borderRadius: '4px',
    border: '1px solid rgba(255,255,255,0.1)',
    backgroundColor: 'transparent',
    color: 'rgba(255,255,255,0.6)',
    cursor: 'pointer',
  } as CSSProperties,
  savedItem: {
    padding: '8px 12px',
    borderBottom: '1px solid rgba(255,255,255,0.1)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  } as CSSProperties,
  emptyState: {
    padding: '24px 12px',
    textAlign: 'center',
    color: 'rgba(255,255,255,0.35)',
    fontSize: '12px',
  } as CSSProperties,
  sliderRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '6px',
  } as CSSProperties,
  slider: {
    flex: 1,
    cursor: 'pointer',
  } as CSSProperties,
  sliderLabel: {
    width: '36px',
    fontSize: '11px',
    color: 'rgba(255,255,255,0.35)',
    flexShrink: 0,
  } as CSSProperties,
  sliderValue: {
    width: '44px',
    textAlign: 'right',
    fontVariantNumeric: 'tabular-nums',
    fontSize: '11px',
    color: '#e5e5e5',
  } as CSSProperties,
};

function ImpactSummary({ network, activeScenarioData, baselineResult, forwardResult }: {
  network: Network;
  activeScenarioData: ActiveScenarioData;
  baselineResult: ForwardResult;
  forwardResult: ForwardResult;
}) {
  // Build human-readable impact descriptions
  const impacts: Array<{ description: string; delta: string; isPositive: boolean }> = [];

  // Collect affected OMs and VDs across all overrides
  const affectedOmIds = new Set<string>();
  for (const po of activeScenarioData.parameterOverrides) {
    for (const [omId, om] of network.operationalMetrics) {
      if (om.parents.some(p => p.capabilityId === po.nodeId)) {
        affectedOmIds.add(omId);
      }
    }
  }

  // OM-level impacts
  for (const omId of affectedOmIds) {
    const om = network.operationalMetrics.get(omId);
    if (!om) continue;
    const baseMean = baselineResult.nodeStates.get(omId)?.mean ?? 0;
    const currMean = forwardResult.nodeStates.get(omId)?.mean ?? 0;
    const diff = currMean - baseMean;
    if (Math.abs(diff) < 1e-6) continue;
    const sign = diff > 0 ? '+' : '';
    impacts.push({
      description: om.name,
      delta: `${sign}${diff.toFixed(3)} ${om.unit}`,
      isPositive: diff > 0,
    });
  }

  // VD-level impacts
  const affectedVdIds = new Set<string>();
  for (const [vdId, vd] of network.valueDrivers) {
    if (vd.parents.some(p => affectedOmIds.has(p.omId))) {
      affectedVdIds.add(vdId);
    }
  }
  for (const vdId of affectedVdIds) {
    const vd = network.valueDrivers.get(vdId);
    if (!vd) continue;
    const baseVal = baselineResult.vdValues[vdId] ?? 0;
    const currVal = forwardResult.vdValues[vdId] ?? 0;
    const diff = currVal - baseVal;
    if (Math.abs(diff) < 1e-6) continue;
    const sign = diff > 0 ? '+' : '';
    impacts.push({
      description: vd.name,
      delta: `${sign}${diff.toFixed(2)} ${vd.unit}`,
      isPositive: diff > 0,
    });
  }

  if (impacts.length === 0) return null;

  return (
    <div style={styles.section}>
      <div style={styles.sectionTitle as CSSProperties}>Impact</div>
      {impacts.map((item, i) => (
        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
          <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)' }}>
            {item.description}
          </span>
          <span style={{ fontSize: '11px', fontWeight: 500, fontVariantNumeric: 'tabular-nums', color: item.isPositive ? 'var(--color-positive)' : 'var(--color-negative)' }}>
            {item.delta}
          </span>
        </div>
      ))}
    </div>
  );
}

function formatChangeDescription(network: Network, parameterOverrides: ActiveScenarioData['parameterOverrides']): string[] {
  // Group overrides by capability
  const grouped = new Map<string, Array<{ param: string; value: number }>>();
  for (const po of parameterOverrides) {
    const arr = grouped.get(po.nodeId) ?? [];
    arr.push({ param: po.param, value: po.value });
    grouped.set(po.nodeId, arr);
  }

  const lines: string[] = [];
  for (const [nodeId, changes] of grouped) {
    const cap = network.capabilities.get(nodeId);
    if (!cap) continue;
    const parts: string[] = [];
    for (const ch of changes) {
      if (ch.param === 'capacity') {
        const baselinePct = (cap.baselineCapacity * 100).toFixed(0);
        const newPct = (ch.value * 100).toFixed(0);
        const direction = ch.value > cap.baselineCapacity ? 'increased' : 'reduced';
        parts.push(`capacity ${direction} from ${baselinePct}% to ${newPct}%`);
      } else {
        const direction = ch.value < cap.baselineNoiseSigma ? 'reduced' : 'increased';
        parts.push(`noise ${direction} from ${cap.baselineNoiseSigma.toFixed(2)} to ${ch.value.toFixed(2)}`);
      }
    }
    lines.push(`${cap.name}: ${parts.join(', ')}`);
  }
  return lines;
}

function InfoTab({ network, activeScenarioData, baselineResult, forwardResult, selectedNodeId, sensitivities }: {
  network: Network;
  activeScenarioData: ActiveScenarioData | null;
  baselineResult: ForwardResult;
  forwardResult: ForwardResult;
  selectedNodeId: string | null;
  sensitivities: SensitivityResult[];
}) {
  if (!activeScenarioData) {
    if (selectedNodeId) {
      return <NodeDetailView nodeId={selectedNodeId} network={network} sensitivities={sensitivities} />;
    }
    return (
      <div style={styles.emptyState as CSSProperties}>
        Select a scenario to view details
      </div>
    );
  }

  const npvDelta = forwardResult.npv - baselineResult.npv;
  const isPositive = npvDelta >= 0;
  const changeDescriptions = activeScenarioData.parameterOverrides.length > 0
    ? formatChangeDescription(network, activeScenarioData.parameterOverrides)
    : [];

  return (
    <div>
      <div style={styles.section}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
          <span style={{ fontSize: '13px', fontWeight: 600, color: '#e5e5e5' }}>
            {activeScenarioData.name}
          </span>
          <span style={{
            ...styles.badge,
            color: isPositive ? 'var(--color-positive)' : 'var(--color-negative)',
            backgroundColor: isPositive ? 'rgba(29, 158, 117, 0.1)' : 'rgba(217, 74, 74, 0.1)',
          }}>
            {activeScenarioData.npvImpact}
          </span>
        </div>
        <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)', lineHeight: '1.5' }}>
          {activeScenarioData.description}
        </div>
        {activeScenarioData.detail && (
          <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', lineHeight: '1.5', marginTop: '6px', paddingTop: '6px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
            {activeScenarioData.detail}
          </div>
        )}
      </div>

      {changeDescriptions.length > 0 && (
        <div style={styles.section}>
          <div style={styles.sectionTitle as CSSProperties}>What Changes</div>
          {changeDescriptions.map((line, i) => (
            <div key={i} style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)', lineHeight: '1.6', marginBottom: '4px' }}>
              {line}
            </div>
          ))}
        </div>
      )}

      {activeScenarioData.parameterOverrides.length > 0 && (
        <ImpactSummary
          network={network}
          activeScenarioData={activeScenarioData}
          baselineResult={baselineResult}
          forwardResult={forwardResult}
        />
      )}
    </div>
  );
}

type LayerType = 'capability' | 'om' | 'vd';

function getOMRange(unit: string): { min: number; max: number; step: number } {
  if (unit === '% σ' || unit === '%') return { min: 0, max: 100, step: 0.1 };
  if (unit === '% Cu') return { min: 0, max: 2, step: 0.001 };
  if (unit === 'Mtpa') return { min: 1, max: 50, step: 0.1 };
  return { min: 0, max: 100, step: 0.1 };
}

function getVDRange(unit: string): { min: number; max: number; step: number } {
  if (unit === 'Mtpa') return { min: 1, max: 50, step: 0.1 };
  if (unit === '% Cu') return { min: 0, max: 2, step: 0.001 };
  if (unit === '%') return { min: 0, max: 100, step: 0.1 };
  if (unit === '$M/yr') return { min: 0, max: 500, step: 1 };
  return { min: 0, max: 100, step: 0.1 };
}

function formatAdjustmentDisplay(adj: BuilderAdjustment, network: Network): string {
  if (adj.type === 'capability') {
    const cap = network.capabilities.get(adj.capabilityId);
    const displayValue = adj.param === 'capacity'
      ? `${(adj.value * 100).toFixed(0)}%`
      : adj.value.toFixed(2);
    return `${cap?.name ?? adj.capabilityId} — ${adj.param}: ${displayValue}`;
  }
  if (adj.type === 'om') {
    const om = network.operationalMetrics.get(adj.omId);
    return `${om?.name ?? adj.omId} → target: ${adj.value.toFixed(2)} ${om?.unit ?? ''}`;
  }
  const vd = network.valueDrivers.get(adj.vdId);
  return `${vd?.name ?? adj.vdId} → target: ${adj.value.toFixed(2)} ${vd?.unit ?? ''}`;
}

function BuilderTab({ network, builderAdjustments, builderName, onSetBuilderName, onAddAdjustment, onRemoveAdjustment, onSaveScenario, onClearBuilder, baselineResult, forwardResult, budgetSegments }: {
  network: Network;
  builderAdjustments: BuilderAdjustment[];
  builderName: string;
  onSetBuilderName: (name: string) => void;
  onAddAdjustment: (adj: BuilderAdjustment) => void;
  onRemoveAdjustment: (index: number) => void;
  onSaveScenario: () => void;
  onClearBuilder: () => void;
  baselineResult: ForwardResult;
  forwardResult: ForwardResult;
  budgetSegments: CapacitySegment[];
}) {
  const [layer, setLayer] = useState<LayerType>('capability');
  const [selectedCap, setSelectedCap] = useState('');
  const [selectedParam, setSelectedParam] = useState<'capacity' | 'noiseSigma'>('capacity');
  const [paramValue, setParamValue] = useState(0.10);
  const [selectedOM, setSelectedOM] = useState('');
  const [omValue, setOmValue] = useState(0);
  const [selectedVD, setSelectedVD] = useState('');
  const [vdValue, setVdValue] = useState(0);

  const npvDelta = forwardResult.npv - baselineResult.npv;
  const caps = Array.from(network.capabilities.entries());
  const oms = Array.from(network.operationalMetrics.entries());
  const vds = Array.from(network.valueDrivers.entries());

  const handleAdd = () => {
    if (layer === 'capability') {
      if (!selectedCap) return;
      onAddAdjustment({ type: 'capability', capabilityId: selectedCap, param: selectedParam, value: paramValue });
      setSelectedCap('');
      setParamValue(selectedParam === 'capacity' ? 0.10 : 0.05);
    } else if (layer === 'om') {
      if (!selectedOM) return;
      onAddAdjustment({ type: 'om', omId: selectedOM, value: omValue });
      setSelectedOM('');
      setOmValue(0);
    } else {
      if (!selectedVD) return;
      onAddAdjustment({ type: 'vd', vdId: selectedVD, value: vdValue });
      setSelectedVD('');
      setVdValue(0);
    }
  };

  // When OM selection changes, set slider to baseline
  const handleOMChange = (omId: string) => {
    setSelectedOM(omId);
    if (omId) {
      const om = network.operationalMetrics.get(omId);
      if (om) setOmValue(om.baseline);
    }
  };

  // When VD selection changes, set slider to base value
  const handleVDChange = (vdId: string) => {
    setSelectedVD(vdId);
    if (vdId) {
      const vd = network.valueDrivers.get(vdId);
      if (vd) setVdValue(vd.baseValue);
    }
  };

  // When capability selection changes, set slider to baseline for current param
  const handleCapChange = (capId: string) => {
    setSelectedCap(capId);
    if (capId) {
      const cap = network.capabilities.get(capId);
      if (cap) setParamValue(selectedParam === 'capacity' ? cap.baselineCapacity : cap.baselineNoiseSigma);
    }
  };

  const canAdd = layer === 'capability' ? !!selectedCap
    : layer === 'om' ? !!selectedOM
    : !!selectedVD;

  // Get current OM/VD range
  const currentOMRange = selectedOM ? getOMRange(network.operationalMetrics.get(selectedOM)?.unit ?? '') : null;
  const currentVDRange = selectedVD ? getVDRange(network.valueDrivers.get(selectedVD)?.unit ?? '') : null;

  return (
    <div>
      {/* Name */}
      <div style={styles.section}>
        <div style={styles.sectionTitle as CSSProperties}>Scenario Name</div>
        <input
          type="text"
          style={styles.input}
          placeholder="My custom scenario"
          value={builderName}
          onChange={(e) => onSetBuilderName(e.target.value)}
        />
      </div>

      {/* Current adjustments */}
      <div style={styles.section}>
        <div style={styles.sectionTitle as CSSProperties}>Adjustments ({builderAdjustments.length})</div>
        {builderAdjustments.length === 0 && (
          <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)' }}>No adjustments yet</div>
        )}
        {builderAdjustments.map((adj, i) => (
          <div key={i} style={styles.adjustmentItem}>
            <span style={{ color: '#e5e5e5' }}>
              {formatAdjustmentDisplay(adj, network)}
            </span>
            <button style={styles.removeButton} onClick={() => onRemoveAdjustment(i)}>×</button>
          </div>
        ))}
      </div>

      {/* Add adjustment form */}
      <div style={styles.section}>
        <div style={styles.sectionTitle as CSSProperties}>+ Add Adjustment</div>

        {/* Layer selector */}
        <div style={{ display: 'flex', gap: '4px', marginBottom: '8px' }}>
          {(['capability', 'om', 'vd'] as LayerType[]).map(l => (
            <button
              key={l}
              style={{
                flex: 1,
                padding: '4px 6px',
                fontSize: '10px',
                fontWeight: 500,
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '3px',
                cursor: 'pointer',
                backgroundColor: layer === l ? 'rgba(255,255,255,0.15)' : 'transparent',
                color: layer === l ? '#fff' : 'rgba(255,255,255,0.35)',
              }}
              onClick={() => setLayer(l)}
            >
              {l === 'capability' ? 'Capability' : l === 'om' ? 'Op. Metric' : 'Value Driver'}
            </button>
          ))}
        </div>

        {/* Capability form */}
        {layer === 'capability' && (
          <>
            <select
              style={{ ...styles.select, marginBottom: '6px' }}
              value={selectedCap}
              onChange={(e) => handleCapChange(e.target.value)}
            >
              <option value="" disabled>Select capability...</option>
              {caps.map(([id, cap]) => (
                <option key={id} value={id}>{id} — {cap.name}</option>
              ))}
            </select>

            {selectedCap && (
              <>
                <div style={{ display: 'flex', gap: '6px', marginBottom: '6px' }}>
                  <label style={{ fontSize: '10px', color: 'rgba(255,255,255,0.6)', display: 'flex', alignItems: 'center', gap: '3px', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="param"
                      checked={selectedParam === 'capacity'}
                      onChange={() => { setSelectedParam('capacity'); setParamValue(0.10); }}
                    />
                    capacity
                  </label>
                  <label style={{ fontSize: '10px', color: 'rgba(255,255,255,0.6)', display: 'flex', alignItems: 'center', gap: '3px', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="param"
                      checked={selectedParam === 'noiseSigma'}
                      onChange={() => { setSelectedParam('noiseSigma'); setParamValue(0.05); }}
                    />
                    noise σ
                  </label>
                </div>

                <div style={styles.sliderRow}>
                  <span style={styles.sliderLabel as CSSProperties}>{selectedParam === 'capacity' ? 'cap' : 'σ'}</span>
                  <input
                    type="range"
                    className="sp-slider"
                    style={styles.slider}
                    min={selectedParam === 'capacity' ? 0.01 : 0.01}
                    max={selectedParam === 'capacity' ? 0.50 : 0.30}
                    step={0.01}
                    value={paramValue}
                    onChange={(e) => setParamValue(parseFloat(e.target.value))}
                  />
                  <span style={styles.sliderValue as CSSProperties}>
                    {selectedParam === 'capacity' ? `${(paramValue * 100).toFixed(0)}%` : paramValue.toFixed(2)}
                  </span>
                </div>
              </>
            )}
          </>
        )}

        {/* OM form */}
        {layer === 'om' && (
          <>
            <select
              style={{ ...styles.select, marginBottom: '6px' }}
              value={selectedOM}
              onChange={(e) => handleOMChange(e.target.value)}
            >
              <option value="" disabled>Select operational metric...</option>
              {oms.map(([id, om]) => (
                <option key={id} value={id}>{id} — {om.name} ({om.unit})</option>
              ))}
            </select>

            {selectedOM && currentOMRange && (() => {
              const om = network.operationalMetrics.get(selectedOM)!;
              return (
                <>
                  <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.35)', marginBottom: '4px' }}>
                    Baseline: {om.baseline.toFixed(2)} {om.unit}
                  </div>
                  <div style={styles.sliderRow}>
                    <span style={styles.sliderLabel as CSSProperties}>target</span>
                    <input
                      type="range"
                      className="sp-slider"
                      style={styles.slider}
                      min={currentOMRange.min}
                      max={currentOMRange.max}
                      step={currentOMRange.step}
                      value={omValue}
                      onChange={(e) => setOmValue(parseFloat(e.target.value))}
                    />
                    <span style={styles.sliderValue as CSSProperties}>
                      {omValue.toFixed(2)}
                    </span>
                  </div>
                </>
              );
            })()}
          </>
        )}

        {/* VD form */}
        {layer === 'vd' && (
          <>
            <select
              style={{ ...styles.select, marginBottom: '6px' }}
              value={selectedVD}
              onChange={(e) => handleVDChange(e.target.value)}
            >
              <option value="" disabled>Select value driver...</option>
              {vds.map(([id, vd]) => (
                <option key={id} value={id}>{id} — {vd.name} ({vd.unit})</option>
              ))}
            </select>

            {selectedVD && currentVDRange && (() => {
              const vd = network.valueDrivers.get(selectedVD)!;
              return (
                <>
                  <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.35)', marginBottom: '4px' }}>
                    Base value: {vd.baseValue.toFixed(2)} {vd.unit}
                  </div>
                  <div style={styles.sliderRow}>
                    <span style={styles.sliderLabel as CSSProperties}>target</span>
                    <input
                      type="range"
                      className="sp-slider"
                      style={styles.slider}
                      min={currentVDRange.min}
                      max={currentVDRange.max}
                      step={currentVDRange.step}
                      value={vdValue}
                      onChange={(e) => setVdValue(parseFloat(e.target.value))}
                    />
                    <span style={styles.sliderValue as CSSProperties}>
                      {vdValue.toFixed(2)}
                    </span>
                  </div>
                </>
              );
            })()}
          </>
        )}

        <button
          style={{ ...styles.actionButton, width: '100%', marginTop: '8px', opacity: canAdd ? 1 : 0.5 }}
          onClick={handleAdd}
          disabled={!canAdd}
        >
          Add
        </button>
      </div>

      {/* Live NPV preview */}
      <div style={styles.section}>
        <div style={styles.sectionTitle as CSSProperties}>NPV Preview</div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
          <span style={{ fontSize: '18px', fontWeight: 600, color: '#e5e5e5', fontVariantNumeric: 'tabular-nums' }}>
            ${Math.round(forwardResult.npv).toLocaleString()}M
          </span>
          {Math.abs(npvDelta) > 0.5 && (
            <span style={{
              ...styles.badge,
              color: npvDelta >= 0 ? 'var(--color-positive)' : 'var(--color-negative)',
              backgroundColor: npvDelta >= 0 ? 'rgba(29, 158, 117, 0.1)' : 'rgba(217, 74, 74, 0.1)',
            }}>
              {npvDelta >= 0 ? '+' : ''}{Math.round(npvDelta)}M
            </span>
          )}
        </div>
      </div>

      {/* Budget summary */}
      <div style={styles.section}>
        <div style={styles.sectionTitle as CSSProperties}>Capacity Budget</div>
        {(() => {
          const totals = { value: 0, supporting: 0, coordination: 0, local: 0 };
          for (const seg of budgetSegments) totals[seg.type] += seg.capacity;
          const fmt = (v: number) => (v * 100).toFixed(0);
          return (
            <div style={{ fontSize: '11px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <span style={{ color: '#1D9E75' }}>Value {fmt(totals.value)}%</span>
              <span style={{ color: '#5DCAA5' }}>Support {fmt(totals.supporting)}%</span>
              <span style={{ color: '#EF9F27' }}>Coord {fmt(totals.coordination)}%</span>
              <span style={{ color: '#B4B2A9' }}>Local {fmt(totals.local)}%</span>
            </div>
          );
        })()}
      </div>

      {/* Actions */}
      <div style={{ ...styles.section, display: 'flex', gap: '8px', borderBottom: 'none' }}>
        <button
          style={{ ...styles.actionButton, flex: 1, opacity: builderAdjustments.length > 0 ? 1 : 0.5 }}
          onClick={onSaveScenario}
          disabled={builderAdjustments.length === 0}
        >
          Save Scenario
        </button>
        <button style={{ ...styles.secondaryButton, flex: 1 }} onClick={onClearBuilder}>
          Clear
        </button>
      </div>
    </div>
  );
}

function SavedTab({ customScenarios, onApplyScenario, onEditCustomScenario, onDeleteCustomScenario }: {
  customScenarios: Scenario[];
  onApplyScenario: (id: string) => void;
  onEditCustomScenario: (id: string) => void;
  onDeleteCustomScenario: (id: string) => void;
}) {
  if (customScenarios.length === 0) {
    return (
      <div style={styles.emptyState as CSSProperties}>
        No custom scenarios yet
      </div>
    );
  }

  return (
    <div>
      {customScenarios.map((s) => (
        <div key={s.id} style={styles.savedItem}>
          <div>
            <div style={{ fontSize: '12px', fontWeight: 500, color: '#e5e5e5' }}>
              {s.name}
            </div>
            <div style={{ fontSize: '11px', color: s.npvImpact.startsWith('-') ? 'var(--color-negative)' : 'var(--color-positive)' }}>
              {s.npvImpact}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '4px' }}>
            <button
              style={{ ...styles.secondaryButton, padding: '4px 8px', fontSize: '11px' }}
              onClick={() => onApplyScenario(s.id)}
            >
              Apply
            </button>
            <button
              style={{ ...styles.secondaryButton, padding: '4px 8px', fontSize: '11px' }}
              onClick={() => onEditCustomScenario(s.id)}
            >
              Edit
            </button>
            <button
              style={{ ...styles.removeButton, fontSize: '16px' }}
              onClick={() => onDeleteCustomScenario(s.id)}
              title="Delete scenario"
            >
              ×
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

const aboutStyles = {
  heading: {
    fontSize: '12px',
    fontWeight: 600,
    color: '#e5e5e5',
    marginBottom: '6px',
    marginTop: '14px',
  } as CSSProperties,
  paragraph: {
    fontSize: '11px',
    color: 'rgba(255,255,255,0.6)',
    lineHeight: '1.6',
    marginBottom: '8px',
  } as CSSProperties,
  formula: {
    fontFamily: 'monospace',
    fontSize: '10.5px',
    color: '#e5e5e5',
    backgroundColor: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '4px',
    padding: '8px 10px',
    marginBottom: '8px',
    lineHeight: '1.7',
    whiteSpace: 'pre-wrap',
    overflowX: 'auto',
  } as CSSProperties,
  note: {
    fontSize: '10px',
    color: 'rgba(255,255,255,0.35)',
    fontStyle: 'italic',
    lineHeight: '1.5',
    marginBottom: '8px',
  } as CSSProperties,
};

function AboutTab() {
  return (
    <div style={{ padding: '10px 12px' }}>
      <div style={{ ...aboutStyles.heading, marginTop: '0' }}>Model Structure</div>
      <div style={aboutStyles.paragraph}>
        This tool uses a <strong>Linear Gaussian Bayesian Network</strong> (LGBN) with four layers.
        Each layer feeds the next through weighted linear combinations, until the final NPV
        calculation which is non-linear (multiplicative).
      </div>
      <div style={aboutStyles.paragraph}>
        The network has 14 capabilities → 8 operational metrics → 7 value drivers → 1 NPV node.
      </div>

      <div style={aboutStyles.heading}>Layer 1: Capability Effective Mean</div>
      <div style={aboutStyles.paragraph}>
        Each capability produces a signal based on its allocated capacity and noise level:
      </div>
      <div style={aboutStyles.formula}>
{`effective = capacity × 1/(1 + σ)`}
      </div>
      <div style={aboutStyles.paragraph}>
        More capacity increases output. Lower noise (σ) improves quality. The combined effect
        is the capability's "effective mean" — its contribution strength to downstream metrics.
      </div>

      <div style={aboutStyles.heading}>Layer 2: Operational Metrics</div>
      <div style={aboutStyles.paragraph}>
        Each operational metric is computed as its baseline value plus a weighted sum of
        capability <em>deltas</em> (changes from baseline):
      </div>
      <div style={aboutStyles.formula}>
{`OM_i = baseline_i + Σ w_ij × Δcap_j

where Δcap_j = effective_j − baseline_effective_j`}
      </div>
      <div style={aboutStyles.paragraph}>
        The weights (w) determine how strongly each capability influences each metric.
        Only changes from baseline propagate — at default parameters, all OMs equal their baseline values.
      </div>

      <div style={aboutStyles.heading}>Layer 3: Value Drivers</div>
      <div style={aboutStyles.paragraph}>
        Value drivers follow the same pattern — base value plus weighted OM deltas:
      </div>
      <div style={aboutStyles.formula}>
{`VD_i = baseValue_i + Σ w_ij × ΔOM_j

where ΔOM_j = OM_j − OM_j.baseline`}
      </div>
      <div style={aboutStyles.paragraph}>
        The seven value drivers are: Throughput (Mt/yr), Head Grade (% Cu),
        Recovery (%), Mining Cost ($M/yr), Processing Cost ($M/yr),
        Maintenance Cost ($M/yr), and G&A Cost ($M/yr).
      </div>

      <div style={aboutStyles.heading}>Layer 4: NPV (Non-linear)</div>
      <div style={aboutStyles.paragraph}>
        The final NPV calculation uses a standard discounted cash flow model.
        This step is multiplicative — improvements in throughput, grade, and recovery compound:
      </div>
      <div style={aboutStyles.formula}>
{`Cu produced = Throughput × 10⁶
  × Grade/100 × Recovery/100

Revenue = Cu produced × Cu price / 10⁶

Cost = Mining + Processing
  + Maintenance + G&A

FCF = Revenue − Cost

NPV = Σ(t=1..20) FCF / (1 + 0.08)^t`}
      </div>
      <div style={aboutStyles.note}>
        Cu price = $8,420/t, discount rate = 8%, horizon = 20 years.
      </div>

      <div style={aboutStyles.heading}>Budget Constraint</div>
      <div style={aboutStyles.paragraph}>
        All 12 capability capacities must sum to 100%. This is the mechanism through which
        non-value work (coordination, local optimization) affects NPV — not through direct
        negative edges, but by consuming budget that would otherwise go to value-creating capabilities.
      </div>
      <div style={aboutStyles.paragraph}>
        When a scenario increases coordination capacity, the remaining capabilities are
        proportionally scaled down to maintain the budget. This opportunity cost is why
        scenarios S6 and S7 show negative NPV impact despite having no direct negative connections.
      </div>

      <div style={aboutStyles.heading}>Why Some Capabilities Matter More</div>
      <div style={aboutStyles.paragraph}>
        Because the NPV formula multiplies throughput × grade × recovery, capabilities
        that influence these three value drivers have compounding effects. A 1% improvement
        in recovery is worth more when throughput and grade are also above baseline.
      </div>
      <div style={aboutStyles.paragraph}>
        The highest-sensitivity capabilities (Flotation optimization, Grade control,
        Mine planning) all feed into these multiplicative value drivers through
        high-weight edges.
      </div>
    </div>
  );
}

export function ScenarioPanel({
  network,
  panelMode,
  onSetPanelMode,
  activeScenarioData,
  baselineResult,
  forwardResult,
  budgetSegments,
  builderAdjustments,
  builderName,
  onSetBuilderName,
  onAddAdjustment,
  onRemoveAdjustment,
  onSaveScenario,
  onClearBuilder,
  customScenarios,
  onEditCustomScenario,
  onDeleteCustomScenario,
  onApplyScenario,
  onReset,
  onClose,
  selectedNodeId,
  sensitivities,
}: ScenarioPanelProps) {
  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <span style={styles.headerTitle as CSSProperties}>Scenarios</span>
        <div style={{ display: 'flex', gap: '4px' }}>
          <button style={styles.closeButton} onClick={onReset} title="Reset to baseline">
            &#x21ba;
          </button>
          <button style={styles.closeButton} onClick={onClose} title="Close panel">
            &#x2715;
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={styles.tabs}>
        <button
          style={{ ...styles.tab, ...(panelMode === 'info' ? styles.tabActive : {}) }}
          onClick={() => onSetPanelMode('info')}
        >
          Info
        </button>
        <button
          style={{ ...styles.tab, ...(panelMode === 'builder' ? styles.tabActive : {}) }}
          onClick={() => onSetPanelMode('builder')}
        >
          Builder
        </button>
        <button
          style={{ ...styles.tab, ...(panelMode === 'saved' ? styles.tabActive : {}) }}
          onClick={() => onSetPanelMode('saved')}
        >
          Saved ({customScenarios.length})
        </button>
        <button
          style={{ ...styles.tab, ...(panelMode === 'about' ? styles.tabActive : {}) }}
          onClick={() => onSetPanelMode('about')}
        >
          About
        </button>
      </div>

      {/* Body */}
      <div style={styles.body as CSSProperties}>
        {panelMode === 'info' && (
          <InfoTab
            network={network}
            activeScenarioData={activeScenarioData}
            baselineResult={baselineResult}
            forwardResult={forwardResult}
            selectedNodeId={selectedNodeId}
            sensitivities={sensitivities}
          />
        )}
        {panelMode === 'builder' && (
          <BuilderTab
            network={network}
            builderAdjustments={builderAdjustments}
            builderName={builderName}
            onSetBuilderName={onSetBuilderName}
            onAddAdjustment={onAddAdjustment}
            onRemoveAdjustment={onRemoveAdjustment}
            onSaveScenario={onSaveScenario}
            onClearBuilder={onClearBuilder}
            baselineResult={baselineResult}
            forwardResult={forwardResult}
            budgetSegments={budgetSegments}
          />
        )}
        {panelMode === 'saved' && (
          <SavedTab
            customScenarios={customScenarios}
            onApplyScenario={onApplyScenario}
            onEditCustomScenario={onEditCustomScenario}
            onDeleteCustomScenario={onDeleteCustomScenario}
          />
        )}
        {panelMode === 'about' && <AboutTab />}
      </div>
    </div>
  );
}
