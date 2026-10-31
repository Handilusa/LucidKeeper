import { expect, type Page } from '@playwright/test';
import { decodeFunctionData, encodeFunctionResult, erc20Abi, parseAbi, parseUnits, toHex, type Abi, type Hex } from 'viem';
import { CONTRACT_ADDRESSES, marginBankAbi, perpPoolAbi } from '../../src/chain/abis';
import { ALL_VERIFIED_PERP_MARKETS } from '../../src/lib/data/markets';

// Test-only EIP-1193 + local RPC model. No keys, signatures, real wallets or network sends.
export const A = '0x1111111111111111111111111111111111111111';
export const B = '0x2222222222222222222222222222222222222222';
const factory = '0xE631fAEE547baeE07353E290f0562ea67d856560';
const factoryAbi = parseAbi(['function isDeployedByFactory(address) view returns (bool)']);
const profileBankAbi = [...marginBankAbi, ...parseAbi(['function getWithdrawableCollateral(address) view returns (uint256)', 'function getMarginStatus(address) view returns (uint8)'])];
const bank = CONTRACT_ADDRESSES.MARGIN_BANK.toLowerCase();
const token = CONTRACT_ADDRESSES.COLLATERAL_USDSO.toLowerCase();
const pool = CONTRACT_ADDRESSES.BTC_PERP_POOL;
type Tx = { from: Hex; to: Hex; data: Hex; value?: Hex; nonce?: Hex };
type Account = { wallet: bigint; margin: bigint; gas: bigint; allowance: bigint; size: bigint; nonce: number };
export async function mockWallet(page: Page) {
  const accounts: Record<string, Account> = {
    [A]: { wallet: parseUnits('200', 18), margin: parseUnits('20', 18), gas: parseUnits('10', 18), allowance: 0n, size: 0n, nonce: 0 },
    [B]: { wallet: parseUnits('300', 18), margin: parseUnits('70', 18), gas: parseUnits('10', 18), allowance: 0n, size: 0n, nonce: 0 },
  };
  const state = {
    accounts, writes: [] as Tx[], blocked: [] as string[], reads: [] as string[],
    rejectNext: false, revertNext: false, simulationFailure: false, accountFailure: false, feeFailure: false, markFailure: false,
    candleMode: 'loaded' as 'loaded' | 'empty' | 'error' | 'old', historyFailure: false, historyCount: 0,
    historyData: undefined as Record<string, unknown> | undefined,
    activeOrderRows: [] as Record<string, unknown>[], rpcLogsFailure: false,
    profileFailure: false, gasFailure: false, walletFailure: false,
    indexerStatus: 0, indexerRetryAfter: '', candleHang: false, candleCalls: 0, rpcBatches: [] as number[],
    profileRows: { Fill: [] as Record<string, unknown>[], PerpPositionChange: [] as Record<string, unknown>[], FundingPayment: [] as Record<string, unknown>[], PerpFeeRecord: [] as Record<string, unknown>[], MarginEvent: [] as Record<string, unknown>[] },
    contractReads: [] as { name: string; block: unknown; args: readonly unknown[] }[],
    mark: parseUnits('80000', 18), holdReceipts: false, fillOrders: true,
  };
  const transactions = new Map<Hex, { tx: Tx; reverted: boolean; applied: boolean }>();
  const blockHash = `0x${'ab'.repeat(32)}`;
  const block = { number: '0x64', hash: blockHash, parentHash: blockHash, timestamp: toHex(Math.floor(Date.now() / 1000)), baseFeePerGas: '0x165a0bc00', gasLimit: '0x1c9c380', gasUsed: '0x0', transactions: [], extraData: '0x', miner: A, difficulty: '0x0', totalDifficulty: '0x0', size: '0x0', nonce: '0x0000000000000000', sha3Uncles: blockHash, logsBloom: `0x${'00'.repeat(256)}`, receiptsRoot: blockHash, stateRoot: blockHash, transactionsRoot: blockHash, uncles: [] };
  function decode(tx: Tx) {
    const abi = tx.to.toLowerCase() === token ? erc20Abi : tx.to.toLowerCase() === bank ? marginBankAbi : perpPoolAbi;
    return { abi, ...decodeFunctionData({ abi, data: tx.data }) };
  }
  await page.exposeFunction('__mockSend', async (tx: Tx) => {
    if (state.rejectNext) { state.rejectNext = false; return { error: { code: 4001, message: 'User rejected the request' } }; }
    expect([A, B]).toContain(tx.from.toLowerCase());
    expect(BigInt(tx.value || '0x0')).toBe(0n);
    const call = decode(tx);
    expect(['approve', 'deposit', 'withdraw', 'placeOrder', 'cancelOrder']).toContain(call.functionName);
    state.writes.push(tx);
    const hash = toHex(state.writes.length, { size: 32 });
    transactions.set(hash, { tx, reverted: state.revertNext, applied: false });
    state.revertNext = false;
    accounts[tx.from.toLowerCase()].nonce++;
    return { hash };
  });
  await page.addInitScript(({ A }) => {
    let address = A;
    let connected = false;
    let chain = '0xc4cf';
    let added = true;
    const requests: string[] = [];
    const listeners = new Map<string, Set<(...args: unknown[]) => void>>();
    const emit = (name: string, value: unknown) => listeners.get(name)?.forEach(fn => fn(value));
    const provider = {
      isMetaMask: true,
      on(name: string, fn: (...args: unknown[]) => void) { if (!listeners.has(name)) listeners.set(name, new Set()); listeners.get(name)!.add(fn); },
      removeListener(name: string, fn: (...args: unknown[]) => void) { listeners.get(name)?.delete(fn); },
      async request({ method, params }: { method: string; params?: unknown[] }) {
        requests.push(method);
        if (method === 'eth_accounts') return connected ? [address] : [];
        if (method === 'eth_requestAccounts') { connected = true; return [address]; }
        if (method === 'eth_chainId') return chain;
        if (method === 'wallet_getCapabilities') return {};
        if (method === 'wallet_requestPermissions') { connected = true; return [{ parentCapability: 'eth_accounts' }]; }
        if (method === 'wallet_switchEthereumChain') {
          if (!added) throw Object.assign(new Error('Unknown chain'), { code: 4902 });
          chain = (params?.[0] as { chainId: string }).chainId; emit('chainChanged', chain); return null;
        }
        if (method === 'wallet_addEthereumChain') { const config = params?.[0] as { chainId: string; rpcUrls: string[] }; if (config.chainId !== '0xc4cf' || config.rpcUrls[0] !== 'https://api.hideki2.infra.testnet.somnia.network') throw new Error('Unverified add chain'); added = true; chain = config.chainId; emit('chainChanged', chain); return null; }
        if (method === 'eth_sendTransaction') {
          const result = await (window as unknown as { __mockSend: (tx: unknown) => Promise<{ hash?: string; error?: { code: number; message: string } }> }).__mockSend(params?.[0]);
          if (result.error) throw Object.assign(new Error(result.error.message), result.error);
          return result.hash;
        }
        throw new Error(`Test wallet refuses ${method}`);
      },
    };
    Object.assign(window, { ethereum: provider, __wallet: {
      requests,
      account(next: string) { address = next; emit('accountsChanged', connected ? [next] : []); },
      chain(next: string, unknown = false) { chain = next; added = !unknown; emit('chainChanged', next); },
      disconnect() { connected = false; emit('accountsChanged', []); },
    } });
    const announce = () => window.dispatchEvent(new CustomEvent('eip6963:announceProvider', { detail: {
      info: { uuid: '11111111-1111-4111-8111-111111111111', name: 'MetaMask', rdns: 'io.metamask', icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg"/>' }, provider,
    } }));
    window.addEventListener('eip6963:requestProvider', announce);
    announce();
  }, { A });
  await page.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (['127.0.0.1', 'localhost'].includes(url.hostname)) return route.continue();
    if (url.hostname === 'hideki-dev.smk.somnia.host') {
      const { query, variables } = route.request().postDataJSON();
      if (/query Candles/.test(query)) {
        state.candleCalls++;
        if (state.candleHang) return;
        if (state.indexerStatus) return route.fulfill({ status: state.indexerStatus, headers: state.indexerRetryAfter ? { 'Retry-After': state.indexerRetryAfter, 'Access-Control-Expose-Headers': 'Retry-After' } : {}, json: { error: 'Controlled overload' } });
      }
      if (state.profileFailure && /UserFills|PerpPositionChanges|FundingPayments|PerpFees|MarginEvents/.test(query)) return route.fulfill({ status: 503, json: { error: 'Controlled profile source failure' } });
      if ((state.candleMode === 'error' && /Candles/.test(query)) || (state.historyFailure && /UserTradeHistory/.test(query))) return route.fulfill({ status: 503, json: { error: 'Controlled indexer failure' } });
      if (/UserTradeHistory/.test(query) && state.historyData !== undefined) return route.fulfill({ json: { data: state.historyData } });
      if (/UserActiveOrders/.test(query)) return route.fulfill({ json: { data: { Order: state.activeOrderRows } } });
      const interval = variables.interval || 3600;
      const end = Math.floor(Date.now() / 1000 / interval) * interval - (state.candleMode === 'old' ? 10 * interval : 0);
      const Candle = state.candleMode === 'empty' ? [] : Array.from({ length: 30 }, (_, i) => ({ bucketStart: end - i * interval, intervalSeconds: interval, openPrice: state.mark.toString(), high: (state.mark + parseUnits('10', 18)).toString(), low: (state.mark - parseUnits('10', 18)).toString(), closePrice: state.mark.toString(), baseVolume: '10000', quoteVolume: '8000000000000000000', tradeCount: 1 }));
      const MarginEvent = /UserTradeHistory/.test(query) ? Array.from({ length: state.historyCount }, (_, i) => ({ id: `${variables.account}-${i}`, txHash: toHex(i + 100, { size: 32 }), account: variables.account, kind: 'Deposit', amount: parseUnits('1', 18).toString(), timestamp: Math.floor(Date.now() / 1000) - i, blockNumber: 100 })).slice(variables.offset, variables.offset + variables.limit) : [];
      // SDK0.32.1 scopes ended orders through PoolsByType -> Market.poolAddress,
      // not PerpMarket.id. Supply that actual response shape for healthy profile reads.
      const Market = variables.where?.marketType?._eq === 'SPOT' ? [] : ALL_VERIFIED_PERP_MARKETS.map(m => ({ poolAddress: m.poolAddress.toLowerCase(), marketType: 'PERP' }));
      return route.fulfill({ json: { data: { chain_metadata: [{ chain_id: 50383 }], _sdkWatermark: [{ chain_id: 50383, latest_processed_block: 100 }], Market, PerpMarket: ALL_VERIFIED_PERP_MARKETS.map(m => ({ id: m.poolAddress.toLowerCase() })), SpotMarket: [], Candle, Order: [], PerpFill: [], ...state.profileRows, MarginEvent: /UserTradeHistory/.test(query) ? MarginEvent : state.profileRows.MarginEvent } } });
    }
    if (url.hostname !== 'api.hideki2.infra.testnet.somnia.network') { state.blocked.push(url.href); return route.abort(); }
    const request = route.request().postDataJSON();
    state.rpcBatches.push(Array.isArray(request) ? request.length : 1);
    return route.fulfill({ json: Array.isArray(request) ? request.map(reply) : reply(request) });
  });
  await page.routeWebSocket('**/*', socket => {
    const url = new URL(socket.url());
    if (url.hostname !== 'api.hideki2.infra.testnet.somnia.network') { state.blocked.push(socket.url()); socket.close(); return; }
    socket.onMessage(message => {
      const request = JSON.parse(String(message));
      socket.send(JSON.stringify(Array.isArray(request) ? request.map(reply) : reply(request)));
    });
  });
  function reply(rpc: { id: number; method: string; params: unknown[] }) {
      const { method, params } = rpc;
      state.reads.push(method);
      let result: unknown;
      try {
        if (method === 'eth_chainId') result = '0xc4cf';
        else if (method === 'eth_blockNumber') result = '0x64';
        else if (method === 'eth_getBlockByNumber' || method === 'eth_getBlockByHash') result = block;
        else if (method === 'eth_getBalance') {
          if (state.gasFailure) throw new Error('Controlled gas read failure');
          result = toHex(accounts[String(params[0]).toLowerCase()]?.gas || 0n);
        }
        else if (method === 'eth_getTransactionCount') result = toHex(accounts[String(params[0]).toLowerCase()]?.nonce || 0);
        else if (method === 'eth_getCode') result = '0x';
        else if (method === 'eth_gasPrice' || method === 'eth_maxPriorityFeePerGas') result = '0x165a0bc00';
        else if (method === 'eth_getLogs') {
          if (state.rpcLogsFailure) throw new Error('Controlled log read failure');
          result = [];
        }
        else if (method === 'eth_estimateGas') result = '0x2dc6c0';
        else if (method === 'eth_getTransactionReceipt') {
          const record = transactions.get(params[0] as Hex);
          if (!record || state.holdReceipts) result = null;
          else {
            const { tx, reverted } = record;
            const owner = accounts[tx.from.toLowerCase()];
            const call = decode(tx);
            const args = call.args as readonly unknown[];
            if (!record.applied && !reverted) {
              if (call.functionName === 'approve') owner.allowance = args[1] as bigint;
              if (call.functionName === 'deposit') { owner.margin += args[0] as bigint; owner.wallet -= args[0] as bigint; owner.allowance -= args[0] as bigint; }
              if (call.functionName === 'withdraw') { owner.margin -= args[0] as bigint; owner.wallet += args[0] as bigint; }
              if (state.fillOrders && call.functionName === 'placeOrder' && args[5] === 2) owner.size += (args[0] ? 1n : -1n) * (args[3] as bigint);
              record.applied = true;
            }
            result = { transactionHash: params[0], transactionIndex: '0x0', blockHash, blockNumber: '0x64', from: tx.from, to: tx.to, cumulativeGasUsed: '0x2dc6c0', gasUsed: '0x2dc6c0', effectiveGasPrice: '0x165a0bc00', contractAddress: null, logs: [], logsBloom: `0x${'00'.repeat(256)}`, status: reverted ? '0x0' : '0x1', type: '0x2' };
          }
        } else if (method === 'eth_call') {
          const tx = params[0] as Tx;
          const abi: Abi = tx.to.toLowerCase() === factory.toLowerCase() ? factoryAbi : tx.to.toLowerCase() === token ? erc20Abi : tx.to.toLowerCase() === bank ? profileBankAbi : perpPoolAbi;
          const call = decodeFunctionData({ abi, data: tx.data });
          state.contractReads.push({ name: call.functionName, block: params[1], args: call.args || [] });
          const args = call.args || [];
          const owner = accounts[String(args[0]).toLowerCase()] || accounts[A];
          const market = ALL_VERIFIED_PERP_MARKETS.find(m => m.poolAddress.toLowerCase() === tx.to.toLowerCase()) || ALL_VERIFIED_PERP_MARKETS[0];
          if (state.accountFailure && ['getAccountState', 'getAccountHealth', 'getPosition', 'balanceOf'].includes(call.functionName)) throw new Error('Controlled account read failure');
          if (state.walletFailure && call.functionName === 'balanceOf') throw new Error('Controlled wallet balance failure');
          if (state.simulationFailure && call.functionName === 'placeOrder') throw new Error('Controlled order simulation failure');
          if (state.feeFailure && call.functionName === 'getPerpPoolParameters') throw new Error('Controlled fee read failure');
          if (state.markFailure && call.functionName === 'tryGetMarkPrice') throw new Error('Controlled mark read failure');
          let value: unknown;
          switch (call.functionName) {
            case 'getSystemConfig': value = { marginBank: bank, collateralToken: token, perpPoolFactory: factory, liquidationEngine: A, insuranceFund: A, feeRecipient: A, maxLeverageLimit: 20, fullyWired: true }; break;
            case 'getAccountState': value = { unlockedCollateralBalance: owner.margin, lockedCollateral: 0n, activePerpPools: owner.size ? [pool] : [] }; break;
            case 'getAccountHealth': value = [owner.margin, 0n, 0n, 0n]; break;
            case 'getWithdrawableCollateral': value = owner.margin; break;
            case 'getMarginStatus': value = 0; break;
            case 'getPosition': value = { size: String(args[1]).toLowerCase() === pool.toLowerCase() ? owner.size : 0n, avgEntryPrice: parseUnits('80000', 18), entryFundingIndex: 0n, lastUpdatedTimestampNs: 0n }; break;
            case 'balanceOf': value = owner.wallet; break;
            case 'allowance': value = owner.allowance; break;
            case 'decimals': value = 18; break;
            case 'isDeployedByFactory': value = true; break;
            case 'marginBank': value = bank; break;
            case 'tryGetMarkPrice': value = [true, state.mark]; break;
            case 'getIndexPrice': value = [state.mark, BigInt(Math.floor(Date.now() / 1000))]; break;
            case 'getOneBase': value = 10n ** BigInt(market.baseDecimals); break;
            case 'getOpenInterest': value = 0n; break;
            case 'getCurrentFundingRate': value = 0n; break;
            case 'getOrderBookParameters': value = { tickSize: parseUnits(market.tickSize, market.quoteDecimals), minQuantity: parseUnits(market.minQuantity, market.baseDecimals), lotSize: parseUnits(market.lotSize, market.baseDecimals) }; break;
            case 'getPerpPoolParameters': value = { initialMarginBps: 500, maintenanceMarginBps: 250, closeOutMarginBps: 100, maxOpenInterest: 100000000n, maxPositionSize: 10000000n, takerFeeBpsTimes1k: 0, makerFeeBpsTimes1k: 0, insuranceFundShareBps: 0 }; break;
            case 'getFundingParameters': value = { fundingCalculationWindowSec: 14400n, fundingSettlementIntervalSec: 3600n, interestRatePerWindow: 0n, maxFundingRatePerWindow: 0n, dampener: 0n, emaSmoothingAlpha: 0n, maxOracleStalenessSec: 60n }; break;
            case 'placeOrder': case 'deposit': case 'withdraw': case 'cancelOrder': value = undefined; break;
            default: throw new Error(`Unmodelled call ${call.functionName}`);
          }
          result = encodeFunctionResult({ abi, functionName: call.functionName, result: value });
        } else throw new Error(`Unmodelled RPC ${method}; no passthrough`);
        return { jsonrpc: '2.0', id: rpc.id, result };
      } catch (error) { return { jsonrpc: '2.0', id: rpc.id, error: { code: -32000, message: (error as Error).message } }; }
  }
  return state;
}
export async function connectMock(page: Page, tradeEnabled = true) {
  await page.goto('/app');
  await page.getByRole('button', { name: 'Connect wallet', exact: true }).click();
  await page.getByRole('button', { name: /MetaMask/ }).click();
  await expect(page.locator('.account-summary')).toContainText('0x1111');
  if (tradeEnabled) await expect(page.locator('.submit-order')).toBeEnabled();
  else await expect(page.locator('.submit-order')).toBeDisabled();
}
export async function walletEvent(page: Page, kind: 'account' | 'chain' | 'disconnect', value?: string, unknown = false) {
  await page.evaluate(({ kind, value, unknown }) => {
    const wallet = (window as unknown as { __wallet: Record<string, (...args: unknown[]) => void> }).__wallet;
    wallet[kind](value, unknown);
  }, { kind, value, unknown });
}
