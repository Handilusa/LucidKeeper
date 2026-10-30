/** Same integer order as the EVM: multiply, divide (truncate), then floor to tick.
 * Display strings/Number rounding must never enter the execution price path.
 */
export function iocPrice(mark: bigint, tick: bigint, isBid: boolean): bigint {
  if (mark <= 0n || tick <= 0n) throw new Error('Current mark and tick must be positive');
  const buffered = mark * (isBid ? 102n : 98n) / 100n;
  const price = buffered / tick * tick;
  if (price <= 0n) throw new Error('IOC price is below one market tick');
  return price;
}
