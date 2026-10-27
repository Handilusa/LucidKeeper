/**
 * Pure functions for perpetual futures PnL, notional and funding math.
 * Completely decoupled from React.
 */

export interface PositionPnLInputs {
  size: bigint; // Signed: positive = long, negative = short (base atoms)
  avgEntryPrice: bigint; // Quote atoms per whole base
  markPrice: bigint; // Quote atoms per whole base
  oneBase: bigint; // 10^baseDecimals
}

/**
 * Computes price-only mark-to-market unrealized PnL.
 * Matches `PerpMath.unrealizedPnl` with integer truncation toward zero.
 */
export function computeUnrealizedPnl({
  size,
  avgEntryPrice,
  markPrice,
  oneBase,
}: PositionPnLInputs): bigint {
  if (size === 0n || oneBase === 0n) return 0n;
  // Long: (mark - entry) * size / oneBase
  // Short: (entry - mark) * |size| / oneBase = (mark - entry) * size / oneBase (signed)
  return ((markPrice - avgEntryPrice) * size) / oneBase;
}

/**
 * Calculates raw notional value: |size| * markPrice / oneBase
 */
export function computeNotional(size: bigint, markPrice: bigint, oneBase: bigint): bigint {
  if (size === 0n || oneBase === 0n) return 0n;
  const absSize = size < 0n ? -size : size;
  return (absSize * markPrice) / oneBase;
}

/**
 * Accrued funding owed since entry.
 * Ceil toward +infinity (divCeilInt) matching contract.
 */
export function computeAccruedFunding(
  size: bigint,
  projectedCumulativeFunding: bigint,
  entryFundingIndex: bigint,
  oneBase: bigint
): bigint {
  if (size === 0n || oneBase === 0n) return 0n;
  const diff = projectedCumulativeFunding - entryFundingIndex;
  const numerator = size * diff;
  const denominator = 10n ** 18n * oneBase;

  // Ceiling division for integer
  if (numerator % denominator === 0n) {
    return numerator / denominator;
  }
  const quotient = numerator / denominator;
  return numerator > 0n ? quotient + 1n : quotient;
}

/**
 * Return on Margin in basis points (10000 = 100%).
 */
export function computeReturnOnMarginBps(
  equityContribution: bigint,
  initialMarginRequirement: bigint
): number | null {
  if (initialMarginRequirement <= 0n) return null;
  return Number((equityContribution * 10000n) / initialMarginRequirement);
}
