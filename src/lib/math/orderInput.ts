import { parseUnits } from 'viem';

/** Reject incomplete/ambiguous decimal inputs before calculating or constructing an order. */
export function positiveDecimal(value: string): number | null {
  if (!/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(value)) return null;
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : null;
}

export function validateOrderInput({
  quantity,
  limitPrice,
  margin,
  orderType,
  baseDecimals,
  quoteDecimals,
  minQuantity,
  lotSize,
  tickSize,
}: {
  quantity: string;
  limitPrice: string;
  margin: string;
  orderType: 'market' | 'limit';
  baseDecimals: number;
  quoteDecimals: number;
  minQuantity: string;
  lotSize: string;
  tickSize: string;
}): { field: 'quantity' | 'price' | 'margin'; message: string } | null {
  if (positiveDecimal(quantity) == null)
    return { field: 'quantity', message: 'Enter a quantity greater than zero.' };
  if ((quantity.split('.')[1]?.length || 0) > baseDecimals)
    return {
      field: 'quantity',
      message: `Use at most ${baseDecimals} decimal places for quantity.`,
    };
  try {
    const amount = parseUnits(quantity, baseDecimals);
    if (amount < parseUnits(minQuantity, baseDecimals))
      return { field: 'quantity', message: `Minimum quantity is ${minQuantity}.` };
    if (amount % parseUnits(lotSize, baseDecimals) !== 0n)
      return { field: 'quantity', message: `Quantity must use increments of ${lotSize}.` };
    if (orderType === 'limit') {
      if (positiveDecimal(limitPrice) == null)
        return { field: 'price', message: 'Enter a limit price greater than zero.' };
      if (
        (limitPrice.split('.')[1]?.length || 0) > quoteDecimals ||
        parseUnits(limitPrice, quoteDecimals) % parseUnits(tickSize, quoteDecimals) !== 0n
      )
        return { field: 'price', message: `Limit price must use increments of ${tickSize} USDso.` };
    }
  } catch {
    return { field: 'quantity', message: 'Check quantity and market precision.' };
  }
  if (positiveDecimal(margin) == null)
    return { field: 'margin', message: 'Enter a margin budget greater than zero.' };
  return null;
}
