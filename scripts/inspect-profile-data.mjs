import { SomniaMarkets, SOMNIA_HIDEKI_TESTNET_ADDRESSES } from '@somnia-chain/markets-sdk';
import { hidekiTestnet } from '@somnia-chain/markets-sdk/chains';
import { mkdir, writeFile } from 'node:fs/promises';

const client = new SomniaMarkets({
  chain: hidekiTestnet,
  indexerUrl: 'https://hideki-dev.smk.somnia.host/v1/graphql',
  addresses: SOMNIA_HIDEKI_TESTNET_ADDRESSES,
}).client;
const account = '0x1420cF8Bb9D92C3fDb674ECc5A57295c59078fDA';
const calls = {
  margin: () => client.getMarginAccount('0x478769E1177C0773c43A593DCCc4Ad15F15F1394', account),
  changes: () => client.listPerpPositionChanges({ account, limit: 1000 }),
  fills: () => client.getUserFills(account, { limit: 1000 }),
  orders: () => client.listPerpOrderHistory(account, { limit: 1000 }),
  transfers: () =>
    client.getMarginEvents(account, { kinds: ['Deposit', 'Withdraw', 'Credited'], limit: 1000 }),
  funding: () => client.getFundingPayments(account, { limit: 1000 }),
  fees: () => client.listPerpFees({ account, limit: 1000 }),
};
const result = Object.fromEntries(
  await Promise.all(
    Object.entries(calls).map(async ([name, call]) => {
      try {
        return [name, { ok: true, data: await call() }];
      } catch (error) {
        return [name, { ok: false, error: error.message }];
      }
    })
  )
);
const output = '.git/lucidkeeper-audit/landing-profile';
await mkdir(output, { recursive: true });
await writeFile(
  `${output}/sdk-reads.json`,
  JSON.stringify(
    { observedAt: new Date().toISOString(), account, chain: 50383, sdk: '0.32.1', result },
    (_, v) => (typeof v === 'bigint' ? v.toString() : v),
    2
  )
);
console.log(
  JSON.stringify(
    Object.fromEntries(
      Object.entries(result).map(([k, v]) => [
        k,
        v.ok
          ? {
              count: Array.isArray(v.data) ? v.data.length : null,
              sample: Array.isArray(v.data) ? v.data[0] : v.data,
            }
          : v,
      ])
    ),
    (_, v) => (typeof v === 'bigint' ? v.toString() : v),
    2
  )
);
// SDK background caches keep Node alive after the read-only report is flushed.
process.exit(Object.values(result).every((value) => value.ok) ? 0 : 1);
