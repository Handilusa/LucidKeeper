/** Display-only standalone sizing scenario; it does not allocate cross collateral. */
export function sizingLiquidation({
  price, quantity, leverage, isLong, maintenanceBps, feeRate,
}: {
  price: number; quantity: number; leverage: number; isLong: boolean;
  maintenanceBps: number; feeRate: number;
}): number | null {
  if (![price, quantity, leverage, maintenanceBps, feeRate].every(Number.isFinite) ||
    price <= 0 || quantity <= 0 || leverage < 1 || maintenanceBps < 0 || maintenanceBps >= 10000 || feeRate < 0)
    return null;
  const notional = price * quantity;
  const equity = notional / leverage - notional * feeRate;
  const maintenance = notional * maintenanceBps / 10000;
  const delta = (equity - maintenance) / (quantity * (1 + (isLong ? -1 : 1) * maintenanceBps / 10000));
  const result = Math.max(0, price + (isLong ? -delta : delta));
  return Number.isFinite(result) ? result : null;
}

/** Contract rate is 1e18-scaled per calculation window, not per settlement interval. */
export function normalizedFunding8h(rate: bigint, windowSeconds: bigint): number | null {
  if (windowSeconds <= 0n) return null;
  return Number(rate * 28800n / windowSeconds) / 1e18;
}
