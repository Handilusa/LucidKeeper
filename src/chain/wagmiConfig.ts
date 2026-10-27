import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { somniaTokyo } from './somniaTokyo';

// Fallback WalletConnect project ID for testnet development
const projectId =
  import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || '3fcc6bba2d1de962d911bb5b5c3dba68';

export const wagmiConfig = getDefaultConfig({
  appName: 'LucidKeeper DreamSentinel',
  projectId,
  chains: [somniaTokyo],
  ssr: false,
});
