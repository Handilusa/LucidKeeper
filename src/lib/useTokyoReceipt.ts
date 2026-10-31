import { useQuery } from '@tanstack/react-query';
import { usePublicClient } from 'wagmi';
import type { Hash } from 'viem';

/** Preserve the canonical status: wagmi's receipt action throws on reverted receipts. */
export function useTokyoReceipt(hash?: Hash) {
  const client = usePublicClient({ chainId: 50383 });
  return useQuery({
    queryKey: ['canonical-receipt', 50383, hash],
    enabled: !!client && !!hash,
    queryFn: () => client!.waitForTransactionReceipt({ hash: hash!, timeout: 120_000 }),
    retry: 1,
    staleTime: Infinity,
  });
}
