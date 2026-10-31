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

export const VERIFIED_PROOF_CLOSES = [
  {
    market: 'BTC',
    label: 'BTC short close — verified',
    value: '0.00093 BTC',
    hash: '0x948dc39bc4e32e0a5f6246b50d243813ea42cc6c398c9a7c746c1b8af027b0b4',
    detail: '31 Oct 2026 20:39:52 UTC · IOC orderType=2 buy closed the later BTC short at 77,654.2 USDso; 72.218406 USDso notional (not margin). Fully filled, zero order remainder and zero position after close. Independently verified read-only; still flat at snapshot block 38261043. Separate from the earlier historical BTC close.',
  },
  {
    market: 'DOGE',
    label: 'DOGE short close — verified',
    value: '120 DOGE',
    hash: '0xb7ae27d709d13cdea7bba3dac928b5392865b0852e6835081a401fd62d32311e',
    detail: '31 Oct 2026 20:40:11 UTC · IOC orderType=2 buy closed the DOGE short at 0.07574 USDso; 9.0888 USDso notional (not margin). Fully filled, zero order remainder and zero position after close. Independently verified read-only; still flat at snapshot block 38261043. The opening remains owner-relayed FOK.',
  },
  {
    market: 'AVAX',
    label: 'AVAX long close — verified',
    value: '4.8 AVAX',
    hash: '0xae9b6862f47f9e27a4f4cfa335e4b9cde4ff44018dea33a289a901237b3e8b34',
    detail: '31 Oct 2026 20:40:30 UTC · IOC orderType=2 sell closed the AVAX long at 8.565 USDso; 41.112 USDso notional (not margin). Fully filled, zero order remainder and zero position after close. Independently verified read-only; still flat at snapshot block 38261043. The opening is owner-confirmed current-product execution.',
  },
] as const;

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
    label: 'AVAX long fully filled',
    value: '4.8 AVAX',
    hash: '0x9be2d311c11b274a49d75000d694f664e2fc9076ea74584b39b338a42f3f049e',
    detail:
      '31 Oct 2026 18:26:46 UTC · IOC orderType=2, fully filled at 8.588 USDso; 41.2224 USDso notional (not margin), zero remaining quantity. Owner-confirmed execution through the current product flow; independently verified read-only by receipt, fill, account events and a later position snapshot.',
  },
  {
    label: 'Earlier BTC close',
    value: 'Close → settlement',
    hash: '0x1cb959157297e2bfb7ee3c8f8b8a53e6b460d3d0f0be20b8f41785f8f69587f6',
    detail: 'Historical BTC close recorded in STATE.md. This is neither the AVAX close nor the DOGE close.',
  },
  ...VERIFIED_PROOF_CLOSES,
] as const;

export const PENDING_PROOF_CLOSES: readonly string[] = [];

export const SOMNIA_SOURCES = {
  overview: 'https://docs.somnia.network/readme',
  consensus: 'https://docs.somnia.network/concepts/somnia-blockchain/multistream-consensus',
  execution:
    'https://docs.somnia.network/concepts/somnia-blockchain/accelerated-sequential-execution',
  fees: 'https://docs.somnia.network/concepts/tokenomics/gas-fees',
};
