/** Fail closed if the reviewed signed position has changed; never size an exit
 * from a display-rounded number or silently change sides after a refresh.
 */
export function closeQuantity(reviewedSize: bigint, currentSize: bigint, percent: number, lot: bigint): bigint {
  if (reviewedSize === 0n || currentSize !== reviewedSize) throw new Error('Position changed; refresh and review the close again');
  if (!Number.isInteger(percent) || percent < 1 || percent > 100 || lot <= 0n) throw new Error('Invalid close percentage or lot');
  const full = currentSize < 0n ? -currentSize : currentSize;
  const quantity = (full * BigInt(percent) / 100n) / lot * lot;
  if (quantity <= 0n) throw new Error('Position is too small to split; choose a larger percentage');
  if (quantity > full) throw new Error('Close quantity exceeds current position');
  return quantity;
}

/** Store only identity in dialog state; resolve the newest parent query item. */
export function positionByPool<T extends { poolAddress: string }>(positions: T[], pool: string | null): T | null {
  return pool ? positions.find(pos => pos.poolAddress.toLowerCase() === pool.toLowerCase()) ?? null : null;
}
