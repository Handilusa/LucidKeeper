import { formatUnits } from 'viem';

/**
 * Format numeric tokens and prices with proper decimal precision and tabular alignment.
 */

export function formatPrice(
  price: bigint | number | string,
  decimals = 2,
  options: { showSign?: boolean } = {}
): string {
  const val = typeof price === 'bigint' ? Number(price) : Number(price);
  if (isNaN(val)) return '0.00';

  const sign = options.showSign && val > 0 ? '+' : '';
  return (
    sign +
    val.toLocaleString('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    })
  );
}

export function formatDynamicPrice(price: number | string | bigint): string {
  const val = typeof price === 'bigint' ? Number(price) : Number(price);
  if (!Number.isFinite(val)) return '—';
  if (val === 0) return '0.00';
  if (Math.abs(val) < 0.0001) return val.toLocaleString('en-US', { minimumFractionDigits: 6, maximumFractionDigits: Math.min(18, Math.max(6, Math.ceil(-Math.log10(Math.abs(val))) + 2)) });
  if (val < 1) return val.toFixed(4);
  if (val < 10) return val.toFixed(3);
  return val.toLocaleString('en-US', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 2,
  });
}

export function formatTokenAmount(amount: bigint, decimals: number, displayDecimals = 4): string {
  const formatted = formatUnits(amount, decimals);
  const num = parseFloat(formatted);
  if (isNaN(num)) return '0';

  return num.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: displayDecimals,
  });
}

export function formatPercent(value: number, options: { showSign?: boolean } = {}): string {
  const sign = options.showSign && value > 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}

export function shortenAddress(address: string, chars = 4): string {
  if (!address || address.length < 10) return address;
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`;
}

/**
 * Quantize a raw bigint value (price or quantity in token atoms) to exact grid step (tickSize or lotSize).
 * Guarantees rawVal % step === 0n, preventing EVM revert 0xaf608abb (InvalidPrice/InvalidQuantity).
 */
export function quantizeToGrid(
  value: bigint,
  step: bigint,
  mode: 'floor' | 'ceil' | 'round' = 'round'
): bigint {
  if (step <= 1n) return value;
  const remainder = value % step;
  if (remainder === 0n) return value;

  if (mode === 'floor') {
    return value - remainder;
  }
  if (mode === 'ceil') {
    return value + (step - remainder);
  }
  // round to nearest
  if (remainder >= step / 2n) {
    return value + (step - remainder);
  }
  return value - remainder;
}
