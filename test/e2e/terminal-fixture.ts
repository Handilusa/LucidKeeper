import { expect, type Page } from '@playwright/test';
import { decodeFunctionData, type Abi, type Hex } from 'viem';
import { erc20Abi, marginBankAbi, perpPoolAbi } from '../../src/chain/abis';

// Real-service observer + write firewall. No fulfill(), injected wallet or fake data.
const abi: Abi = [...erc20Abi, ...marginBankAbi, ...perpPoolAbi];
const readNames = new Set(['balanceOf', 'allowance', 'decimals', 'getAccountState', 'getAccountHealth', 'getPosition', 'tryGetMarkPrice', 'getIndexPrice', 'getCurrentFundingRate', 'getFundingParameters', 'getOpenInterest', 'getOneBase', 'getPerpPoolParameters', 'getOrderBookParameters']);
type RpcRequest = { method: string; params?: unknown[] };
export async function terminalFixture(page: Page) {
  const state = { pageErrors: [] as string[], consoleErrors: [] as string[], blocked: [] as string[], reads: [] as { functionName: string; block: string }[], candleRequests: [] as { pool: string; interval: number }[] };
  page.on('pageerror', error => state.pageErrors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') state.consoleErrors.push(message.text()); });
  await page.route('**/*', async route => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.hostname === 'api.hideki2.infra.testnet.somnia.network') {
      const body = request.postDataJSON();
      for (const call of (Array.isArray(body) ? body : [body]) as RpcRequest[]) {
        if (!['eth_chainId', 'eth_blockNumber', 'eth_getBalance', 'eth_getCode', 'eth_getLogs', 'eth_getTransactionCount', 'eth_getTransactionReceipt', 'eth_getTransactionByHash', 'eth_getBlockByNumber', 'eth_getBlockByHash', 'eth_call'].includes(call.method)) {
          state.blocked.push(call.method); return route.abort('blockedbyclient');
        }
        if (call.method === 'eth_call') {
          try {
            const tx = call.params?.[0] as { data: Hex };
            const { functionName } = decodeFunctionData({ abi, data: tx.data });
            if (!readNames.has(functionName)) throw new Error('Non-read selector');
            state.reads.push({ functionName, block: String(call.params?.[1]) });
          } catch { state.blocked.push('unknown/non-read eth_call'); return route.abort('blockedbyclient'); }
        }
      }
    } else if (url.hostname === 'hideki-dev.smk.somnia.host') {
      const body = request.postDataJSON();
      if (!body || /\bmutation\b/i.test(body.query)) { state.blocked.push('GraphQL mutation'); return route.abort('blockedbyclient'); }
      if (body.query.includes('query Candles')) state.candleRequests.push(body.variables);
    }
    return route.continue();
  });
  return state;
}
export async function assertReadOnly(state: Awaited<ReturnType<typeof terminalFixture>>) {
  expect(state.blocked).toEqual([]);
  expect(state.pageErrors).toEqual([]);
  expect(state.consoleErrors).toEqual([]);
}
