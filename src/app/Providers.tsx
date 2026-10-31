import React from 'react';
import { WagmiProvider, useAccount } from 'wagmi';
import { observeAccount } from '@/lib/data/observedAccounts';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RainbowKitProvider, darkTheme } from '@rainbow-me/rainbowkit';
import { Toaster } from 'sonner';
import { TooltipProvider } from '@radix-ui/react-tooltip';
import { wagmiConfig } from '@/chain/wagmiConfig';
import { queryRetryDelay } from '@/lib/data/readResilience';
import '@rainbow-me/rainbowkit/styles.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 5000,
      gcTime: 300000,
      retry: 1,
      retryDelay: queryRetryDelay,
      refetchIntervalInBackground: false,
    },
  },
});

export const Providers: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <WagmiProvider config={wagmiConfig}>
      <ObservedAccountRegistry />
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          theme={darkTheme({
            accentColor: 'var(--color-violet)',
            accentColorForeground: 'var(--text)',
            borderRadius: 'medium',
            fontStack: 'system',
            overlayBlur: 'none',
          })}
        >
          <TooltipProvider delayDuration={200}>{children}</TooltipProvider>
          <Toaster
            position="bottom-right"
            theme="dark"
            richColors
            toastOptions={{
              style: {
                background: 'var(--bg-panel)',
                border: '1px solid var(--border-highlight)',
                color: 'var(--text)',
                boxShadow: 'var(--shadow-panel)',
                fontFamily: 'var(--font-mono)',
              },
            }}
          />
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
};

function ObservedAccountRegistry() {
  const { address, isConnected, chainId } = useAccount();
  React.useEffect(() => {
    if (isConnected && address && chainId === 50383) observeAccount(localStorage, address);
  }, [address, isConnected, chainId]);
  return null;
}
