export function walletError(error: unknown): string {
  const e = error as { code?: number; shortMessage?: string; message?: string; cause?: { code?: number } };
  const detail = e?.shortMessage || e?.message || 'Request failed.';
  if (e?.code === 4001 || e?.cause?.code === 4001 || /reject|denied|declined/i.test(detail)) return 'Request declined. Nothing further was submitted; retry when ready.';
  if (/insufficient.*fund|insufficient.*STT/i.test(detail)) return 'Insufficient Tokyo STT for gas. Get STT on chain 50383 from official dreamDEX support, then refresh.';
  if (/InsufficientMargin|insufficient.*margin/i.test(detail)) return 'Insufficient available margin. Deposit USDso, reduce order size or free collateral, then refresh.';
  if (/allowance/i.test(detail)) return 'USDso allowance is insufficient. Confirm the exact-amount approval before depositing.';
  if (/timeout|timed out|429|rate.limit/i.test(detail)) return 'Network busy or slow. Check any submitted hash before retrying; a timeout does not prove failure.';
  return detail;
}
