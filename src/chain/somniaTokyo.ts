import { defineChain } from 'viem';

export const somniaTokyo = defineChain({
  id: 50383,
  name: 'Somnia Tokyo Testnet',
  nativeCurrency: {
    name: 'Somnia Token',
    symbol: 'STT',
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ['https://api.hideki2.infra.testnet.somnia.network'],
      webSocket: ['wss://api.hideki2.infra.testnet.somnia.network/ws'],
    },
    public: {
      http: ['https://api.hideki2.infra.testnet.somnia.network'],
      webSocket: ['wss://api.hideki2.infra.testnet.somnia.network/ws'],
    },
  },
  blockExplorers: {
    default: {
      name: 'Somnia Tokyo Explorer',
      url: 'https://explorer.testnet.somnia.network/tokyo',
    },
  },
  testnet: true,
});
