import type { CSSProperties } from 'react';
import { DEFAULT_CU_PRICE, DEFAULT_DISCOUNT_RATE, DEFAULT_YEARS } from '../engine/npv';

const styles = {
  card: {
    padding: '10px 10px',
    fontSize: '12px',
    lineHeight: '1.7',
  } as CSSProperties,
  title: {
    fontWeight: 600,
    fontSize: '11px',
    color: 'var(--editor-text-secondary)',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
    marginBottom: '4px',
  } as CSSProperties,
  row: {
    display: 'flex',
    justifyContent: 'space-between',
    color: 'var(--editor-text-muted)',
  } as CSSProperties,
  highlight: {
    display: 'flex',
    justifyContent: 'space-between',
    fontWeight: 600,
    color: 'var(--editor-text)',
  } as CSSProperties,
  divider: {
    borderTop: '1px solid var(--editor-border)',
    margin: '4px 0',
  } as CSSProperties,
  param: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    color: 'var(--editor-text-muted)',
    fontSize: '11px',
  } as CSSProperties,
  editableInput: {
    width: '72px',
    background: 'transparent',
    border: 'none',
    borderBottom: '1px solid var(--editor-border)',
    color: 'var(--editor-text)',
    fontSize: '12px',
    fontVariantNumeric: 'tabular-nums',
    textAlign: 'right' as const,
    padding: '0 2px',
    outline: 'none',
  } as CSSProperties,
};

function valueColor(current: number, baseline: number, higherIsBetter: boolean): string {
  const diff = current - baseline;
  if (Math.abs(diff) < 0.001) return 'var(--editor-text-muted)';
  const improved = higherIsBetter ? diff > 0 : diff < 0;
  return improved ? 'var(--color-positive)' : 'var(--color-negative)';
}

// --- Revenue Card ---

interface RevenueCardProps {
  throughput: number;
  headGrade: number;
  recovery: number;
  baselineThroughput: number;
  baselineHeadGrade: number;
  baselineRecovery: number;
  cuPrice?: number;
  onCuPriceChange?: (v: number) => void;
}

export function RevenueCard({
  throughput, headGrade, recovery,
  baselineThroughput, baselineHeadGrade, baselineRecovery,
  cuPrice, onCuPriceChange,
}: RevenueCardProps) {
  const effectiveCuPrice = cuPrice ?? DEFAULT_CU_PRICE;
  const cuProduced = throughput * 1_000_000 * (headGrade / 100) * (recovery / 100);
  const annualRevenue = cuProduced * effectiveCuPrice / 1_000_000;
  const baselineRevenue = baselineThroughput * 1_000_000 * (baselineHeadGrade / 100) * (baselineRecovery / 100) * effectiveCuPrice / 1_000_000;
  const isModified = cuPrice !== undefined && cuPrice !== DEFAULT_CU_PRICE;

  return (
    <div style={styles.card}>
      <div style={styles.title}>Revenue</div>
      <div style={styles.row}>
        <span>Throughput (VD1)</span>
        <span style={{ color: valueColor(throughput, baselineThroughput, true) }}>
          {throughput.toFixed(2)} Mtpa
        </span>
      </div>
      <div style={styles.row}>
        <span>Head grade (VD2)</span>
        <span style={{ color: valueColor(headGrade, baselineHeadGrade, true) }}>
          {headGrade.toFixed(3)}%
        </span>
      </div>
      <div style={styles.row}>
        <span>Recovery (VD3)</span>
        <span style={{ color: valueColor(recovery, baselineRecovery, true) }}>
          {recovery.toFixed(1)}%
        </span>
      </div>
      <div style={styles.param}>
        <span>Cu price</span>
        {onCuPriceChange ? (
          <span>
            $<input
              type="number"
              value={effectiveCuPrice}
              min={3000}
              max={15000}
              step={10}
              onChange={(e) => onCuPriceChange(Number(e.target.value))}
              onClick={(e) => e.stopPropagation()}
              style={{
                ...styles.editableInput,
                color: isModified ? 'var(--color-coordination)' : 'var(--editor-text)',
              }}
            />/t
          </span>
        ) : (
          <span>${effectiveCuPrice.toLocaleString()}/t</span>
        )}
      </div>
      <div style={styles.divider} />
      <div style={styles.row}>
        <span>Cu produced</span>
        <span style={{ color: valueColor(cuProduced, baselineThroughput * 1_000_000 * (baselineHeadGrade / 100) * (baselineRecovery / 100), true) }}>
          {Math.round(cuProduced).toLocaleString()} t/yr
        </span>
      </div>
      <div style={{ ...styles.highlight, color: valueColor(annualRevenue, baselineRevenue, true) }}>
        <span>Revenue</span>
        <span>${Math.round(annualRevenue)}M/yr</span>
      </div>
    </div>
  );
}

// --- Costs Card ---

interface CostsCardProps {
  miningCost: number;
  processingCost: number;
  maintenanceCost: number;
  gaCost: number;
  baselineMiningCost: number;
  baselineProcessingCost: number;
  baselineMaintenanceCost: number;
  baselineGaCost: number;
}

export function CostsCard({
  miningCost, processingCost, maintenanceCost, gaCost,
  baselineMiningCost, baselineProcessingCost, baselineMaintenanceCost, baselineGaCost,
}: CostsCardProps) {
  const totalCosts = miningCost + processingCost + maintenanceCost + gaCost;
  const baselineTotal = baselineMiningCost + baselineProcessingCost + baselineMaintenanceCost + baselineGaCost;

  return (
    <div style={styles.card}>
      <div style={styles.title}>Costs</div>
      <div style={styles.row}>
        <span>Mining (VD4)</span>
        <span style={{ color: valueColor(miningCost, baselineMiningCost, false) }}>
          ${Math.round(miningCost)}M/yr
        </span>
      </div>
      <div style={styles.row}>
        <span>Processing (VD5)</span>
        <span style={{ color: valueColor(processingCost, baselineProcessingCost, false) }}>
          ${Math.round(processingCost)}M/yr
        </span>
      </div>
      <div style={styles.row}>
        <span>Maintenance (VD6)</span>
        <span style={{ color: valueColor(maintenanceCost, baselineMaintenanceCost, false) }}>
          ${Math.round(maintenanceCost)}M/yr
        </span>
      </div>
      <div style={styles.row}>
        <span>G&A (VD7)</span>
        <span style={{ color: valueColor(gaCost, baselineGaCost, false) }}>
          ${Math.round(gaCost)}M/yr
        </span>
      </div>
      <div style={styles.divider} />
      <div style={{ ...styles.highlight, color: valueColor(totalCosts, baselineTotal, false) }}>
        <span>Total costs</span>
        <span>${Math.round(totalCosts)}M/yr</span>
      </div>
    </div>
  );
}

// --- NPV Summary Card ---

interface NPVSummaryCardProps {
  revenue: number;
  totalCosts: number;
  npv: number;
  baselineRevenue: number;
  baselineTotalCosts: number;
  baselineNPV: number;
  discountRate?: number;
  years?: number;
  onDiscountRateChange?: (v: number) => void;
  onYearsChange?: (v: number) => void;
}

export function NPVSummaryCard({
  revenue,
  totalCosts,
  npv,
  baselineRevenue,
  baselineTotalCosts,
  baselineNPV,
  discountRate,
  years,
  onDiscountRateChange,
  onYearsChange,
}: NPVSummaryCardProps) {
  const effectiveRate = discountRate ?? DEFAULT_DISCOUNT_RATE;
  const effectiveYears = years ?? DEFAULT_YEARS;
  const annualFCF = revenue - totalCosts;
  const baselineFCF = baselineRevenue - baselineTotalCosts;
  const rateModified = discountRate !== undefined && discountRate !== DEFAULT_DISCOUNT_RATE;
  const yearsModified = years !== undefined && years !== DEFAULT_YEARS;

  return (
    <div style={styles.card}>
      <div style={styles.title}>Net Present Value</div>
      <div style={styles.row}>
        <span>Revenue</span>
        <span style={{ color: valueColor(revenue, baselineRevenue, true) }}>
          ${Math.round(revenue)}M/yr
        </span>
      </div>
      <div style={styles.row}>
        <span>Costs</span>
        <span style={{ color: valueColor(totalCosts, baselineTotalCosts, false) }}>
          -${Math.round(totalCosts)}M/yr
        </span>
      </div>
      <div style={styles.divider} />
      <div style={{ ...styles.highlight, color: valueColor(annualFCF, baselineFCF, true) }}>
        <span>Annual FCF</span>
        <span>${Math.round(annualFCF)}M/yr</span>
      </div>
      <div style={{ ...styles.highlight, fontSize: '14px', marginTop: '4px', color: valueColor(npv, baselineNPV, true) }}>
        <span>NPV</span>
        <span>${Math.round(npv).toLocaleString()}M</span>
      </div>
      <div style={styles.divider} />
      <div style={styles.param}>
        <span>Discount rate</span>
        {onDiscountRateChange ? (
          <span>
            <input
              type="number"
              value={+(effectiveRate * 100).toFixed(1)}
              min={1}
              max={20}
              step={0.5}
              onChange={(e) => onDiscountRateChange(Number(e.target.value) / 100)}
              onClick={(e) => e.stopPropagation()}
              style={{
                ...styles.editableInput,
                width: '48px',
                color: rateModified ? 'var(--color-coordination)' : 'var(--editor-text)',
              }}
            />%
          </span>
        ) : (
          <span>{(effectiveRate * 100)}%</span>
        )}
      </div>
      <div style={styles.param}>
        <span>Years</span>
        {onYearsChange ? (
          <input
            type="number"
            value={effectiveYears}
            min={5}
            max={40}
            step={1}
            onChange={(e) => onYearsChange(Number(e.target.value))}
            onClick={(e) => e.stopPropagation()}
            style={{
              ...styles.editableInput,
              width: '48px',
              color: yearsModified ? 'var(--color-coordination)' : 'var(--editor-text)',
            }}
          />
        ) : (
          <span>{effectiveYears}</span>
        )}
      </div>
    </div>
  );
}
