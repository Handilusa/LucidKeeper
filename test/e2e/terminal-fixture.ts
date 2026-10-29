import { expect, type Page } from '@playwright/test';
import {
  decodeFunctionData,
  encodeFunctionResult,
  parseUnits,
  toHex,
  type Abi,
  type Hex,
} from 'viem';
import { erc20Abi, marginBankAbi, perpPoolAbi } from '../../src/chain/abis';
import { ALL_VERIFIED_PERP_MARKETS } from '../../src/lib/data/markets';

// Browser-only transport doubles. No keys, signing, or external RPC sends.
export const ACCOUNT = '0x1420cF8Bb9D92C3fDb674ECc5A57295c59078fDA';
const abi: Abi = [...erc20Abi, ...marginBankAbi, ...perpPoolAbi];
const blockHash = `0x${'aa'.repeat(32)}`;
type RpcRequest = { id?: number; method: string; params?: any[] };

export async function terminalFixture(
  page: Page,
  options: { position?: boolean; wallet?: boolean; wrongChain?: boolean } = {}
) {
  const state = {
    candles: 'ready' as 'ready' | 'empty' | 'error' | 'old',
    orders: 'empty' as 'ready' | 'empty' | 'error',
    blockNumber: 100,
    historyError: false,
    historyCount: 0,
    markError: false,
    markOverride: 0,
    holdCandles: false,
    accountError: false,
    paramsError: false,
    outlier: false,
    simulationError: false,
    fundingWindow: 28800n,
    account: ACCOUNT,
    simulationCalls: [] as string[],
    reads: [] as { functionName: string; block: string }[],
    receiptReady: true,
    revert: '' as '' | 'approve' | 'deposit' | 'placeOrder',
    rejectWallet: false,
    walletAuthorized: false,
    chain: options.wrongChain ? '0x1' : toHex(50383),
    candleRequests: [] as { pool: string; interval: number }[],
    walletCalls: [] as { method: string; params: any[] }[],
    sends: [] as { hash: string; functionName: string; args: readonly unknown[]; tx: any }[],
    unexpected: [] as string[],
    pageErrors: [] as string[],
  };
  page.on('pageerror', (error) => state.pageErrors.push(error.message));
  let releaseCandles: (() => void) | undefined;
  const price = (symbol: string) =>
    symbol === 'BTC' ? state.markOverride || 81000 : symbol === 'ETH' ? 3000 : symbol === 'DOGE' ? 0.08 : 150;
  const resultForCall = (to: string, data: Hex) => {
    const { functionName, args } = decodeFunctionData({ abi, data });
    const market =
      ALL_VERIFIED_PERP_MARKETS.find((m) => m.poolAddress.toLowerCase() === to.toLowerCase()) ||
      ALL_VERIFIED_PERP_MARKETS[0];
    const btc = ALL_VERIFIED_PERP_MARKETS[0];
    if (state.markError && functionName === 'tryGetMarkPrice')
      throw new Error('Fixture mark unavailable');
    if (
      state.accountError &&
      ['getAccountState', 'getAccountHealth', 'getPosition', 'balanceOf'].includes(functionName)
    )
      throw new Error('Fixture account unavailable');
    if (state.paramsError && ['getPerpPoolParameters', 'getFundingParameters'].includes(functionName))
      throw new Error('Fixture parameters unavailable');
    if (functionName === 'placeOrder') {
      state.simulationCalls.push(functionName);
      if (state.simulationError) throw new Error('Fixture simulation reverted');
      return '0x';
    }
    const otherAccount = args?.[0] && String(args[0]).toLowerCase() !== ACCOUNT.toLowerCase();
    const results: Record<string, unknown> = {
      balanceOf: parseUnits(otherAccount ? '3' : '40', 18),
      allowance: 0n,
      decimals: 18,
      getAccountState: {
        unlockedCollateralBalance: parseUnits(otherAccount ? '3' : '12', 18),
        lockedCollateral: 0n,
        activePerpPools: options.position ? [btc.poolAddress] : [],
      },
      getAccountHealth: [parseUnits(otherAccount ? '3' : '12', 18), parseUnits('2', 18), options.position ? parseUnits('1', 18) : 0n, 0n],
      getPosition: {
        size: options.position && String(args?.[1]).toLowerCase() === btc.poolAddress ? 20000n : 0n,
        avgEntryPrice: parseUnits('80000', 18),
        entryFundingIndex: 0n,
        lastUpdatedTimestampNs: 0n,
      },
      tryGetMarkPrice: [true, parseUnits(String(price(market.baseSymbol)), 18)],
      getIndexPrice: [
        parseUnits(String(price(market.baseSymbol) + 0.01), 18),
        BigInt(Math.floor(Date.now() / 1000)),
      ],
      getCurrentFundingRate: parseUnits('.0001', 18),
      getFundingParameters: {
        fundingCalculationWindowSec: state.fundingWindow, fundingSettlementIntervalSec: 3600n,
        interestRatePerWindow: 0n, maxFundingRatePerWindow: 0n, dampener: 0n,
        emaSmoothingAlpha: 0n, maxOracleStalenessSec: 5n,
      },
      getOpenInterest: parseUnits('10', market.baseDecimals),
      getOneBase: 10n ** BigInt(market.baseDecimals),
      getPerpPoolParameters: {
        initialMarginBps: 500,
        maintenanceMarginBps: 300,
        closeOutMarginBps: 100,
        maxOpenInterest: 1000000n,
        maxPositionSize: 1000000n,
        takerFeeBpsTimes1k: 0,
        makerFeeBpsTimes1k: 0,
        insuranceFundShareBps: 0,
      },
      getOrderBookParameters: {
        tickSize: parseUnits(market.tickSize, market.quoteDecimals),
        minQuantity: parseUnits(market.minQuantity, market.baseDecimals),
        lotSize: parseUnits(market.lotSize, market.baseDecimals),
      },
    };
    if (!(functionName in results)) throw new Error(`Unmocked contract read: ${functionName}`);
    return encodeFunctionResult({ abi, functionName, result: results[functionName] });
  };
  const rpc = (request: RpcRequest): any => {
    const params = request.params || [];
    switch (request.method) {
      case 'eth_chainId':
        return toHex(50383);
      case 'eth_blockNumber':
        return toHex(state.blockNumber++);
      case 'eth_getBalance':
        if (state.accountError) throw new Error('Fixture gas unavailable');
        return toHex(parseUnits('1', 18));
      case 'eth_getCode':
        return '0x';
      case 'eth_getLogs':
        return [];
      case 'eth_getTransactionCount':
        return '0x0';
      case 'eth_call':
        state.reads.push({ functionName: decodeFunctionData({ abi, data: params[0].data }).functionName, block: params[1] });
        return resultForCall(params[0].to, params[0].data);
      case 'eth_getTransactionReceipt': {
        const sent = state.sends.find((s) => s.hash === params[0]);
        if (!sent || !state.receiptReady) return null;
        return {
          transactionHash: sent.hash,
          transactionIndex: '0x0',
          blockHash,
          blockNumber: '0x64',
          from: ACCOUNT,
          to: sent.tx.to,
          cumulativeGasUsed: '0x5208',
          gasUsed: '0x5208',
          contractAddress: null,
          logs: [],
          logsBloom: `0x${'00'.repeat(256)}`,
          status: state.revert === sent.functionName ? '0x0' : '0x1',
          effectiveGasPrice: '0x1',
          type: '0x2',
        };
      }
      case 'eth_getTransactionByHash': {
        const sent = state.sends.find((s) => s.hash === params[0]);
        return sent
          ? {
              ...sent.tx,
              input: sent.tx.data,
              hash: sent.hash,
              nonce: '0x0',
              value: '0x0',
              blockHash,
              blockNumber: '0x64',
              transactionIndex: '0x0',
              gas: '0x4c4b40',
              gasPrice: '0x1',
              type: '0x2',
              chainId: toHex(50383),
            }
          : null;
      }
      case 'eth_getBlockByNumber':
        return {
          number: '0x64',
          hash: blockHash,
          parentHash: blockHash,
          timestamp: toHex(Math.floor(Date.now() / 1000)),
          transactions: [],
          gasLimit: '0xffffff',
          gasUsed: '0x0',
          baseFeePerGas: '0x1',
          extraData: '0x',
        };
      default:
        state.unexpected.push(request.method);
        throw new Error(`Unmocked RPC: ${request.method}`);
    }
  };
  await page.route('**/*', async (route) => {
    const url = new URL(route.request().url());
    if (url.hostname === '127.0.0.1') return route.continue();
    if (url.hostname === 'api.hideki2.infra.testnet.somnia.network') {
      const body = route.request().postDataJSON();
      const respond = (request: RpcRequest) => {
        try {
          return { jsonrpc: '2.0', id: request.id, result: rpc(request) };
        } catch (error) {
          return {
            jsonrpc: '2.0',
            id: request.id,
            error: { code: -32000, message: (error as Error).message },
          };
        }
      };
      return route.fulfill({ json: Array.isArray(body) ? body.map(respond) : respond(body) });
    }
    if (url.hostname === 'hideki-dev.smk.somnia.host') {
      const { query, variables } = route.request().postDataJSON();
      if (query.includes('UserActiveOrders'))
        return route.fulfill({
          json:
            state.orders === 'error'
              ? { errors: [{ message: 'Fixture indexer unavailable' }] }
              : { data: { Order: [] } },
        });
      if (query.includes('UserTradeHistory'))
        return route.fulfill({
          json: state.historyError
            ? { errors: [{ message: 'Fixture history unavailable' }] }
            : {
                data: {
                  Fill: Array.from(
                    {
                      length: Math.max(
                        0,
                        Math.min(variables.limit, state.historyCount - variables.offset)
                      ),
                    },
                    (_, index) => ({
                      id: `fixture-fill-${variables.offset + index}`,
                      txHash: blockHash,
                      blockNumber: '100',
                      timestamp: String(Math.floor(Date.now() / 1000) - index),
                      pool: ALL_VERIFIED_PERP_MARKETS[0].poolAddress,
                      fillPrice: parseUnits('81000', 18).toString(),
                      quantity: '13000',
                      taker: ACCOUNT,
                      maker: ACCOUNT,
                      takerIsBid: true,
                    })
                  ),
                  MarginEvent: [],
                },
              },
        });
      if (query.includes('Market24hStats'))
        return route.fulfill({ json: { data: { Candle: [] } } });
      state.candleRequests.push(variables);
      if (state.holdCandles) await new Promise<void>(resolve => { releaseCandles = resolve; });
      if (state.candles === 'error')
        return route.fulfill({
          status: 503,
          json: { errors: [{ message: 'Fixture candle failure' }] },
        });
      const market = ALL_VERIFIED_PERP_MARKETS.find((m) => m.poolAddress === variables.pool)!;
      const interval = variables.interval;
      const end =
        Math.floor(Date.now() / 1000 / interval) * interval -
        (state.candles === 'old' ? interval * 10 : 0);
      const rows = Array.from({ length: 50 }, (_, i) => {
        const open = price(market.baseSymbol) * (1 + Math.sin(i / 5) * 0.005);
        const close = open * (1 + Math.sin(i) * 0.0003);
        const units = (v: number) => parseUnits(v.toFixed(8), market.quoteDecimals).toString();
        return {
          bucketStart: String(end - (49 - i) * interval),
          intervalSeconds: interval,
          openPrice: units(open),
          closePrice: units(close),
          high: units(state.outlier && i === 49 ? 90000 : Math.max(open, close) * 1.001),
          low: units(Math.min(open, close) * 0.999),
          baseVolume: parseUnits('2', market.baseDecimals).toString(),
        };
      });
      return route.fulfill({ json: { data: { Candle: state.candles === 'empty' ? [] : rows } } });
    }
    // Fonts, wallet analytics and any other external request are isolated too.
    return route.fulfill({ status: 200, body: '', contentType: 'text/plain' });
  });
  if (options.wallet) {
    await page.exposeFunction('fixtureWalletRequest', (request: RpcRequest) => {
      const params = request.params || [];
      state.walletCalls.push({ method: request.method, params });
      switch (request.method) {
        case 'eth_accounts':
          return state.walletAuthorized ? [state.account] : [];
        case 'eth_requestAccounts':
          state.walletAuthorized = true;
          return [state.account];
        case 'eth_chainId':
          return state.chain;
        case 'wallet_requestPermissions':
          return [{ parentCapability: 'eth_accounts' }];
        case 'wallet_getCapabilities':
          return {};
        case 'wallet_switchEthereumChain':
          state.chain = params[0].chainId;
          return null;
        case 'eth_sendTransaction': {
          if (state.rejectWallet)
            return { fixtureError: true, code: 4001, message: 'User rejected the request.' };
          const decoded = decodeFunctionData({ abi, data: params[0].data });
          const hash = `0x${(state.sends.length + 1).toString(16).padStart(64, '0')}`;
          state.sends.push({
            hash,
            functionName: decoded.functionName,
            args: decoded.args || [],
            tx: params[0],
          });
          return hash;
        }
        default:
          return rpc(request);
      }
    });
    await page.addInitScript(() => {
      const listeners: Record<string, ((value: unknown) => void)[]> = {};
      (window as any).fixtureChainChanged = (chain: string) =>
        listeners.chainChanged?.forEach((listener) => listener(chain));
      (window as any).fixtureAccountChanged = (account: string) =>
        listeners.accountsChanged?.forEach((listener) => listener([account]));
      const provider = {
        on: (event: string, listener: (value: unknown) => void) => {
          (listeners[event] ||= []).push(listener);
        },
        removeListener: (event: string, listener: (value: unknown) => void) => {
          listeners[event] = (listeners[event] || []).filter((l) => l !== listener);
        },
        request: async (request: { method: string; params?: any[] }) => {
          const result = await (window as any).fixtureWalletRequest(request);
          if (result?.fixtureError)
            throw Object.assign(new Error(result.message), { code: result.code });
          if (request.method === 'wallet_switchEthereumChain')
            listeners.chainChanged?.forEach((l) => l(request.params![0].chainId));
          return result;
        },
      };
      const detail = {
        info: {
          uuid: '778b7471-e0bf-4861-afaf-894ab70310f0',
          name: 'Test Wallet',
          icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg"/>',
          rdns: 'local.test.wallet',
        },
        provider,
      };
      window.addEventListener('eip6963:requestProvider', () =>
        window.dispatchEvent(new CustomEvent('eip6963:announceProvider', { detail }))
      );
      (window as any).ethereum = provider;
      window.dispatchEvent(new CustomEvent('eip6963:announceProvider', { detail }));
    });
  }
  return Object.assign(state, {
    releaseCandles: () => { state.holdCandles = false; releaseCandles?.(); },
    changeAccount: async (account: string) => {
      state.account = account;
      await page.evaluate((value) => (window as any).fixtureAccountChanged(value), account);
    },
    changeChain: async (chain: string) => {
      state.chain = chain;
      await page.evaluate((value) => (window as any).fixtureChainChanged(value), chain);
    },
  });
}

export async function connectFixtureWallet(page: Page) {
  await page
    .getByRole('banner')
    .getByRole('button', { name: 'Connect wallet', exact: true })
    .click();
  const choice = page.getByRole('button', { name: 'Test Wallet', exact: true });
  const connected = page.getByRole('banner').getByRole('button', { name: /0x14|Switch network/ });
  await expect(choice).toBeVisible();
  await choice.click();
  await expect(connected).toBeVisible();
  await expect(page.getByRole('dialog')).toBeHidden();
}
