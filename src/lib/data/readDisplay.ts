export interface ReadDisplay {
  value: number | null;
  updatedAt: number;
  stale: boolean;
}

/** Query data is retained on a failed refresh and scoped by chain/account in its key. */
export function readDisplay(
  value: number | null | undefined,
  updatedAt: number,
  failed: boolean,
  now: number,
  maxAge: number
): ReadDisplay {
  return {
    value: value != null && Number.isFinite(value) ? value : null,
    updatedAt,
    stale: failed || updatedAt === 0 || now - updatedAt >= maxAge,
  };
}
