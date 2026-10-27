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
