import { expect, type Page } from '@playwright/test';
import { decodeFunctionData, decodeFunctionResult, formatUnits, type Abi, type Hex } from 'viem';
import { CONTRACT_ADDRESSES, erc20Abi, marginBankAbi, perpPoolAbi } from '../../src/chain/abis';
import { ALL_VERIFIED_PERP_MARKETS } from '../../src/lib/data/markets';

// Real-service observer + write firewall. No fulfill(), injected wallet or fake data.
const abi: Abi = [...erc20Abi, ...marginBankAbi, ...perpPoolAbi];
const readNames = new Set(['balanceOf', 'allowance', 'decimals', 'getAccountState', 'getAccountHealth', 'getPosition', 'tryGetMarkPrice', 'getIndexPrice', 'getCurrentFundingRate', 'getFundingParameters', 'getOpenInterest', 'getOneBase', 'getPerpPoolParameters', 'getOrderBookParameters']);
type RpcRequest = { id: number | string; method: string; params?: unknown[] };
type ObservedPortfolio = {
  block: string;
  activePools?: readonly string[];
  health?: { equity: string; maintenance: string };
  positions: Record<string, string>;
};
const bountyAccount = '0x1420cf8bb9d92c3fdb674ecc5a57295c59078fda';
export async function terminalFixture(page: Page) {
  const state = { pageErrors: [] as string[], consoleErrors: [] as string[], blocked: [] as string[], reads: [] as { functionName: string; block: string }[], candleRequests: [] as { pool: string; interval: number }[], portfolios: {} as Record<string, ObservedPortfolio>, observationErrors: [] as string[] };
  page.on('pageerror', error => state.pageErrors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') state.consoleErrors.push(message.text()); });
  page.on('response', async response => {
    if (new URL(response.url()).hostname !== 'api.hideki2.infra.testnet.somnia.network') return;
    try {
      const body = response.request().postDataJSON();
      const calls: RpcRequest[] = Array.isArray(body) ? body : [body];
      const pinned = calls.filter(call => call?.method === 'eth_call' && /^0x[0-9a-f]+$/i.test(String(call.params?.[1])));
      if (!pinned.length) return;
      const payload = await response.json();
      const results: { id: number | string; result?: Hex }[] = Array.isArray(payload) ? payload : [payload];
      for (const call of pinned) {
        const tx = call.params![0] as { to: string; data: Hex };
        if (tx.to.toLowerCase() !== CONTRACT_ADDRESSES.MARGIN_BANK.toLowerCase()) continue;
        const { functionName, args } = decodeFunctionData({ abi: marginBankAbi, data: tx.data });
        if (typeof args?.[0] !== 'string' || args[0].toLowerCase() !== bountyAccount) continue;
        const data = results.find(result => result.id === call.id)?.result;
        if (!data) continue; // Failed reads cannot manufacture a complete snapshot.
        const block = String(call.params![1]);
        const portfolio = state.portfolios[block] ??= { block, positions: {} };
        if (functionName === 'getAccountState') {
          portfolio.activePools = decodeFunctionResult({ abi: marginBankAbi, functionName, data }).activePerpPools.map(pool => pool.toLowerCase());
        } else if (functionName === 'getAccountHealth') {
          const health = decodeFunctionResult({ abi: marginBankAbi, functionName, data });
          portfolio.health = { equity: health[0].toString(), maintenance: health[2].toString() };
        } else if (functionName === 'getPosition') {
          portfolio.positions[args[1].toLowerCase()] = decodeFunctionResult({ abi: marginBankAbi, functionName, data }).size.toString();
        }
      }
    } catch (error) {
      state.observationErrors.push((error as Error).message);
    }
  });
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
  expect(state.observationErrors).toEqual([]);
}

// Assert against decoded responses seen by this browser, grouped by the exact block.
// No extra RPC calls, response replacement, historical balance or assumed flatness.
export async function assertObservedPortfolio(page: Page, state: Awaited<ReturnType<typeof terminalFixture>>, positionsVisible = true) {
  const complete = () => Object.values(state.portfolios)
    .filter(item => item.health && item.activePools && Object.keys(item.positions).length > 0 && item.activePools.every(pool => pool in item.positions))
    .sort((a, b) => BigInt(a.block) > BigInt(b.block) ? -1 : 1)[0];
  await expect.poll(complete, { message: 'A complete real pinned portfolio must be observed', timeout: 30000 }).toBeTruthy();
  const snapshot = complete();
  const equity = BigInt(snapshot.health!.equity);
  const maintenance = BigInt(snapshot.health!.maintenance);
  const status = maintenance === 0n ? 'No maintenance exposure' : equity <= maintenance ? 'Below maintenance' : equity * 2n < maintenance * 3n ? 'Low margin buffer' : 'Margin buffer';
  await expect(page.locator('.guardian-identity h2')).toHaveText(status);
  await expect(page.locator('.guardian-health dd').nth(0)).toHaveText(`${Number(formatUnits(equity, 18)).toFixed(2)} USDso`);
  await expect(page.locator('.guardian-health dd').nth(1)).toHaveText(`${Number(formatUnits(maintenance, 18)).toFixed(2)} USDso`);
  if (positionsVisible) {
    const positions = Object.entries(snapshot.positions).filter(([, size]) => BigInt(size) !== 0n);
    await expect(page.getByRole('tab', { name: `Positions (${positions.length})`, exact: true })).toBeVisible();
    await expect(page.locator('[role="tabpanel"] tbody tr')).toHaveCount(positions.length);
    if (!positions.length) await expect(page.getByText('No open positions', { exact: true })).toBeVisible();
    for (const [pool, size] of positions) {
      const market = ALL_VERIFIED_PERP_MARKETS.find(item => item.poolAddress.toLowerCase() === pool);
      expect(market, `Observed pool ${pool} must have verified units`).toBeTruthy();
      const row = page.getByRole('row').filter({ has: page.getByRole('button', { name: `${market!.baseSymbol}-PERP`, exact: true }) });
      await expect(row).toHaveCount(1);
      await expect(row.locator('td').nth(0)).toContainText(BigInt(size) > 0n ? 'Long' : 'Short');
      await expect(row.locator('td').nth(1)).toHaveText(`${Math.abs(Number(formatUnits(BigInt(size), market!.baseDecimals)))}${market!.baseSymbol}`);
    }
  }
  return snapshot;
}
