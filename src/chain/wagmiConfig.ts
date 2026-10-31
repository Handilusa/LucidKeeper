import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { somniaTokyo } from './somniaTokyo';
import { http } from 'wagmi';
import { TOKYO_HTTP_OPTIONS } from './readTransport';

// LucidKeeper's public Reown project; deployment configuration may override it.
const projectId =
  import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || '006c638cc6ec95a3982952a1ee86aa05';

export const wagmiConfig = getDefaultConfig({
  appName: 'LucidKeeper',
  projectId,
  chains: [somniaTokyo],
  transports: {
    [somniaTokyo.id]: http(somniaTokyo.rpcUrls.default.http[0], TOKYO_HTTP_OPTIONS),
  },
  ssr: false,
});
