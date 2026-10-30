import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { formatUnits, formatEther, erc20Abi, parseAbi } from 'viem';
import { openTokyo, verifyNetwork, verifiedMarket, readAccount, BOUNTY_EOA } from '../src/lib/dreamdex.mjs';
import { MARGIN_BANK, COLLATERAL } from '../src/lib/offline-transactions.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const distDir = path.resolve(projectRoot, 'dist');
const publicDir = path.resolve(projectRoot, 'public');
const staticDir = fs.existsSync(distDir) ? distDir : publicDir;

const PORT = Number(process.env.PORT) || 3000;

// Cache for market data to keep responses lightning fast
let cachedMarkets = null;
let lastMarketFetch = 0;

async function getLiveMarketData() {
  const now = Date.now();
  if (cachedMarkets && now - lastMarketFetch < 5000) {
    return cachedMarkets;
  }
  const { exchange, rpc } = openTokyo();
  try {
    const markets = await exchange.client.listPerpMarkets();
    const btcMarket = markets.find(m => m.baseSymbol === 'BTC');
    let btcBook = null;
    let btcFeed = null;
    if (btcMarket) {
      const [book, feed] = await Promise.all([
        exchange.client.getBookTopsOnchain([btcMarket]).catch(() => null),
        exchange.client.getPerpFeedStatus(btcMarket.poolAddress).catch(() => null),
      ]);
      const top = book?.tops ? book.tops[btcMarket.id.toLowerCase()] : null;
      btcBook = {
        bestBid: top?.bestBid ? formatUnits(BigInt(top.bestBid), btcMarket.quoteDecimals) : null,
        bestAsk: top?.bestAsk ? formatUnits(BigInt(top.bestAsk), btcMarket.quoteDecimals) : null,
        mid: top?.mid ? formatUnits(BigInt(top.mid), btcMarket.quoteDecimals) : null,
      };
      btcFeed = {
        markPrice: feed?.markPriceOk ? formatUnits(BigInt(feed.markPrice), btcMarket.quoteDecimals) : null,
        markPriceOk: !!feed?.markPriceOk,
      };
    }
    cachedMarkets = { markets, btcMarket, btcBook, btcFeed, timestamp: now };
    lastMarketFetch = now;
    return cachedMarkets;
  } finally {
    await exchange.close();
  }
}

async function getAccountData(address = BOUNTY_EOA) {
  const { exchange, rpc } = openTokyo();
  try {
    const marginBankReadAbi = parseAbi([
      'function getAccountState(address account) view returns ((int256 unlockedCollateralBalance, uint256 lockedCollateral, address[] activePerpPools))',
    ]);
    const blockNumber = await rpc.getBlockNumber();
    const [gas, walletCollateral, marginState] = await Promise.all([
      rpc.getBalance({ address, blockNumber }),
      rpc.readContract({ address: COLLATERAL, abi: erc20Abi, functionName: 'balanceOf', args: [address], blockNumber }),
      rpc.readContract({ address: MARGIN_BANK, abi: marginBankReadAbi, functionName: 'getAccountState', args: [address], blockNumber }),
    ]);

    return {
      address,
      blockNumber: blockNumber.toString(),
      sttBalance: formatEther(gas),
      walletUsdso: formatUnits(walletCollateral, 18),
      unlockedMarginUsdso: formatUnits(marginState.unlockedCollateralBalance, 18),
      lockedMarginUsdso: formatUnits(marginState.lockedCollateral, 18),
      activePools: marginState.activePerpPools,
    };
  } finally {
    await exchange.close();
  }
}

function serveStatic(req, res, filePath) {
  const mimeTypes = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.mjs': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.ico': 'image/x-icon',
  };

  const ext = path.extname(filePath).toLowerCase();
  const contentType = mimeTypes[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('404 Not Found');
    } else {
      res.writeHead(200, { 'Content-Type': contentType, 'Cache-Control': 'no-cache' });
      res.end(data);
    }
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = url.pathname;

  // CORS headers for local dev flexibility
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // API endpoints
  if (pathname === '/api/status') {
    try {
      const address = url.searchParams.get('address') || BOUNTY_EOA;
      const [account, marketData] = await Promise.all([
        getAccountData(address).catch(e => ({ error: e.message })),
        getLiveMarketData().catch(e => ({ error: e.message })),
      ]);

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        network: {
          chainId: 50383,
          name: 'Somnia Tokyo Testnet',
          explorer: 'https://explorer.testnet.somnia.network/tokyo',
        },
        account,
        market: marketData,
      }));
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: e.message }));
    }
    return;
  }

  if (pathname === '/api/evidence') {
    try {
      const pubEvidencePath = path.resolve(projectRoot, 'evidence/public/execution-2026-10-27.json');
      if (fs.existsSync(pubEvidencePath)) {
        const content = fs.readFileSync(pubEvidencePath, 'utf8');
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(content);
      } else {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Evidence record not found' }));
      }
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: e.message }));
    }
    return;
  }

  // Static files from dist/ (built React app) or fallback to public/
  let filePath = path.join(staticDir, pathname === '/' ? 'index.html' : pathname);
  if (!fs.existsSync(filePath)) {
    // SPA fallback
    filePath = path.join(staticDir, 'index.html');
  }

  serveStatic(req, res, filePath);
});

server.listen(PORT, () => {
  console.log(`\n🪐 LucidKeeper Terminal server running on http://localhost:${PORT}`);
  console.log(`   Connected to Somnia Tokyo testnet (chain 50383)\n`);
});
