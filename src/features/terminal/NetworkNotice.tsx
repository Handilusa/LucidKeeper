import { useAccount, useSwitchChain } from 'wagmi';
import { somniaTokyo } from '@/chain/somniaTokyo';
import { walletError } from '@/lib/walletError';

export function NetworkNotice() {
  const { isConnected, chainId } = useAccount();
  // The injected connector handles 4902 by adding this verified chain config.
  const { switchChain, isPending, error } = useSwitchChain();
  if (!isConnected || chainId === somniaTokyo.id) return null;
  return <div className="network-alert" role="alert">
    <span>Wrong network. Trading requires Somnia Tokyo testnet (50383). {error && walletError(error)}</span>
    <button className="button" disabled={isPending} onClick={() => switchChain({ chainId: somniaTokyo.id })}>
      {isPending ? 'Switching network…' : 'Switch to Somnia Tokyo testnet'}
    </button>
  </div>;
}
