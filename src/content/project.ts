// Historical facts, not live account state. Sources are recorded in docs/LANDING_SOURCES.md.
export const PROJECT = {
  github: 'https://github.com/Handilusa/LucidKeeper',
  demo: 'https://lucid-keeper.vercel.app',
  dreamdex: 'https://app.testnet.dreamdex.io',
  explorer: 'https://explorer.testnet.somnia.network/tokyo',
  somnia: 'https://docs.somnia.network',
  sdk: 'https://app.testnet.dreamdex.io/docs/developers/perps-testnet',
  account: '0x1420cF8Bb9D92C3fDb674ECc5A57295c59078fDA',
} as const;

export const LIVE_TEST_ACCOUNT_PATH = `/app/profile/${PROJECT.account}`;
export const BOUNTY_FUNDING = 'Trading on Tokyo testnet needs STT (gas) and USDso collateral distributed by the bounty program to whitelisted wallets. Any wallet holding those funds can connect and trade with LucidKeeper. Wallets without funds can explore in read-only mode.';

export const PROOF = [
  {
    label: 'Collateral deposited',
    value: '2 USDso',
    hash: '0xf0308d749b0401b9fa0f31149af3dbbaaf9ff5e22ff6d25cf056819d01b89fc9',
    detail: '30 Oct 2026 · Transfer + Deposited events. Test collateral reached MarginBank.',
  },
  {
    label: 'Short filled',
    value: '120 DOGE',
    hash: '0x023d5bc0ab40df5a96ae322b36115b1889847ed4112c031be4077c862cab4e4c',
    detail:
      '30 Oct 2026 · Filled at 0.07525 USDso. FOK execution; owner-relayed, independently audited.',
  },
  {
    label: 'Earlier BTC close',
    value: 'Close → settlement',
    hash: '0x1cb959157297e2bfb7ee3c8f8b8a53e6b460d3d0f0be20b8f41785f8f69587f6',
    detail: 'Historical BTC close recorded in STATE.md. This is not a DOGE close.',
  },
] as const;

export const SOMNIA_SOURCES = {
  overview: 'https://docs.somnia.network/readme',
  consensus: 'https://docs.somnia.network/concepts/somnia-blockchain/multistream-consensus',
  execution:
    'https://docs.somnia.network/concepts/somnia-blockchain/accelerated-sequential-execution',
  fees: 'https://docs.somnia.network/concepts/tokenomics/gas-fees',
};
