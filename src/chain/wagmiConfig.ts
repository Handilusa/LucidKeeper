import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { somniaTokyo } from './somniaTokyo';

// LucidKeeper's public Reown project; deployment configuration may override it.
const projectId =
  import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || '006c638cc6ec95a3982952a1ee86aa05';

export const wagmiConfig = getDefaultConfig({
  appName: 'LucidKeeper DreamSentinel',
  projectId,
  chains: [somniaTokyo],
  ssr: false,
});
