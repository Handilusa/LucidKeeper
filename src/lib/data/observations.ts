import { formatUnits } from 'viem';

// Absence is not zero. Validate at the read boundary before making display values.
export function observationRecord(value: unknown, field: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${field} unavailable`);
  return value as Record<string, unknown>;
}

export function observationArray(value: unknown, field: string): unknown[] {
  if (!Array.isArray(value)) throw new Error(`${field} response unavailable`);
  return value;
}

export function observationText(value: unknown, field: string): string {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${field} unavailable`);
  return value;
}

export function observationHex(value: unknown, bytes: number, field: string): string {
  const text = observationText(value, field);
  if (!new RegExp(`^0x[0-9a-fA-F]{${bytes * 2}}$`).test(text)) throw new Error(`${field} unavailable`);
  return text;
}

export function observationBoolean(value: unknown, field: string): boolean {
  if (typeof value !== 'boolean') throw new Error(`${field} unavailable`);
  return value;
}

export function observationUint(value: unknown, field: string): bigint {
  if (!(typeof value === 'bigint' || (typeof value === 'string' && /^\d+$/.test(value)) ||
    (typeof value === 'number' && Number.isSafeInteger(value)))) throw new Error(`${field} unavailable`);
  const atoms = BigInt(value);
  if (atoms < 0n) throw new Error(`${field} unavailable`);
  return atoms;
}

export function observationUnits(value: unknown, decimals: number, field: string): number {
  const atoms = observationUint(value, field);
  const number = Number(formatUnits(atoms, decimals));
  if (!Number.isFinite(number) || (atoms > 0n && number === 0)) throw new Error(`${field} unavailable`);
  return number;
}

export function observationInteger(value: unknown, field: string): number {
  const number = Number(observationUint(value, field));
  if (!Number.isSafeInteger(number)) throw new Error(`${field} unavailable`);
  return number;
}

export function observationTimestamp(value: unknown, field: string): number {
  // Selected indexer timestamp fields are Unix seconds, as in the captured reads.
  const milliseconds = observationInteger(value, field) * 1000;
  if (!Number.isSafeInteger(milliseconds) || !Number.isFinite(new Date(milliseconds).getTime()))
    throw new Error(`${field} unavailable`);
  return milliseconds;
}
