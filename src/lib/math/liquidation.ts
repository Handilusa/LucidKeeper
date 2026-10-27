/**
 * Exact on-chain liquidation price formula.
 * Ports `perpLiquidationPrice` from dreamDEX SDK / MarginBank.sol.
 *
 * Both equity and mmReq move with the mark price.
 * Solving equity(p) == mmReq(p) yields:
 * Long:  p = mark - (equity - mmReq) * oneBase * 10000 / (|size| * (10000 - mmBps))
 * Short: p = mark + (equity - mmReq) * oneBase * 10000 / (|size| * (10000 + mmBps))
 */

export interface LiquidationPriceInputs {
  equity: bigint; // Total account equity across markets (raw collateral units)
  mmReq: bigint; // Aggregate maintenance margin requirement (raw collateral units)
  size: bigint; // Signed position size in this market (raw base units)
  markPrice: bigint; // Current mark price (raw quote units per whole base)
  maintenanceMarginBps: bigint; // Maintenance margin threshold in bps (e.g. 500 = 5%)
  oneBase: bigint; // 10^baseDecimals
}

export function computeLiquidationPrice({
  equity,
  mmReq,
  size,
  markPrice,
  maintenanceMarginBps,
  oneBase,
}: LiquidationPriceInputs): bigint | null {
  if (size === 0n || oneBase === 0n) return null;

  const isLong = size > 0n;
  const absSize = isLong ? size : -size;

  // On a long, if mmBps == 10000 (100%), price cancels out of the inequality
  if (isLong && maintenanceMarginBps >= 10000n) return null;

  const denominatorFactor = isLong ? 10000n - maintenanceMarginBps : 10000n + maintenanceMarginBps;

  const denominator = absSize * denominatorFactor;
  if (denominator <= 0n) return null;

  const numerator = (equity - mmReq) * oneBase * 10000n;
  const priceDelta = numerator / denominator;

  let liqPrice = isLong ? markPrice - priceDelta : markPrice + priceDelta;

  // Price cannot go negative
  if (liqPrice < 0n) liqPrice = 0n;

  return liqPrice;
}
