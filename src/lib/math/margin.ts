/**
 * Pure functions for MarginBank margin requirements, ratios, and health classifications.
 */

export type MarginHealthStatus = 'Healthy' | 'MarginCall' | 'PartialLiquidation' | 'CloseOut';

export interface MarginRequirementsInputs {
  notional: bigint;
  effectiveImfBps: bigint;
  maintenanceMarginBps: bigint;
  closeOutMarginBps: bigint;
}

/**
 * Calculates initial, maintenance, and close-out margin requirements for a given notional.
 * Applies ceiling division as implemented on-chain.
 */
export function computeMarginRequirements({
  notional,
  effectiveImfBps,
  maintenanceMarginBps,
  closeOutMarginBps,
}: MarginRequirementsInputs) {
  const ceilDivBps = (val: bigint, bps: bigint) => {
    if (val === 0n || bps === 0n) return 0n;
    const num = val * bps;
    return (num + 9999n) / 10000n;
  };

  return {
    imReq: ceilDivBps(notional, effectiveImfBps),
    mmReq: ceilDivBps(notional, maintenanceMarginBps),
    cmReq: ceilDivBps(notional, closeOutMarginBps),
  };
}

/**
 * Classifies health status based on equity vs margin requirements.
 */
export function classifyMarginStatus(
  equity: bigint,
  imReq: bigint,
  mmReq: bigint,
  cmReq: bigint
): MarginHealthStatus {
  if (equity >= imReq) return 'Healthy';
  if (equity >= mmReq) return 'MarginCall';
  if (equity >= cmReq) return 'PartialLiquidation';
  return 'CloseOut';
}

/**
 * Computes the numeric Health Factor (1.0 = at liquidation threshold).
 * Returns a floating point score where > 1.0 is safe, < 1.0 is liquidatable.
 */
export function computeHealthFactor(equity: bigint, mmReq: bigint): number {
  if (mmReq <= 0n) return 999.0;
  if (equity <= 0n) return 0.0;
  return Number((equity * 10000n) / mmReq) / 10000.0;
}
