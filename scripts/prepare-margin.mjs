import assert from 'node:assert/strict';
import { parseArgs } from 'node:util';
import { fileURLToPath } from 'node:url';
import { erc20Abi, formatUnits } from 'viem';
import {
  openTokyo, verifyNetwork, verifiedMarket, readAccount, bountyAddress,
  exactUnits, saveEvidence, json,
} from '../src/lib/dreamdex.mjs';
import { buildUnsignedMarginDeposit } from '../src/lib/funding.mjs';
import { assertOnchainActionAllowed } from '../src/lib/operating-policy.mjs';

assertOnchainActionAllowed('deposit');

const { values } = parseArgs({ options: {
  address: { type: 'string' }, amount: { type: 'string' }, market: { type: 'string', default: 'BTC' },
} });
const address = bountyAddress(values.address);
const { exchange, rpc } = openTokyo();
try {
  const network = await verifyNetwork(rpc);
  const markets = await exchange.client.listPerpMarkets();
  const verified = await verifiedMarket(exchange, rpc, markets, values.market);
  const amount = exactUnits(values.amount, verified.market.quoteDecimals, 'Deposit');
  const account = await readAccount(exchange, rpc, verified.system, address);
  assert(!account.accountHasCode, 'Expected the authorized EOA without delegated or contract code');
  assert(account.gas > 0n, 'No Tokyo STT for gas');
  const allowance = await rpc.readContract({
    address: verified.system.collateralToken, abi: erc20Abi, functionName: 'allowance',
    args: [address, verified.system.marginBank], blockNumber: account.blockNumber,
  });
  const calls = buildUnsignedMarginDeposit({ address, system: verified.system, amount, allowance, balance: account.walletCollateral });
  const first = calls.approval ?? calls.deposit;
  const gasPrice = await rpc.getGasPrice();
  // Only estimate the immediately executable call. A deposit cannot be estimated
  // as successful until its required allowance actually exists on chain.
  const gasEstimate = await rpc.estimateGas({ account: address, to: first.to, data: first.data, value: first.value });
  const firstCallEstimate = {
    functionName: first.functionName, gas: gasEstimate, gasPrice,
    costAtCurrentGasPriceSTT: formatUnits(gasEstimate * gasPrice, 18),
    note: 'Read-only estimate, not a fee cap. Re-estimate before user approval and sending.',
  };
  assert(account.gas >= gasEstimate * gasPrice, 'Insufficient Tokyo STT for the estimated first call');
  const plan = {
    kind: 'unsigned-margin-deposit', network, account, amount,
    amountUSDso: formatUnits(amount, verified.market.quoteDecimals),
    collateralToken: verified.system.collateralToken, marginBank: verified.system.marginBank,
    allowance, ...calls, firstCallEstimate,
    depositStatus: calls.approval ? 'Awaiting separate approval transaction; not yet simulated' : 'Gas estimation succeeded',
    transactionHash: null,
    note: 'Preview only. Approve exactly the deposit amount if needed, then deposit to this EOA margin. Each call requires separate user approval and verified signing context. Recheck balances/allowance after each receipt. No claims, wallet-to-wallet transfers or automated signing.',
  };
  console.log(json(plan));
  console.log(`Evidence: ${fileURLToPath(await saveEvidence('prepared-margin', plan))}`);
} catch (error) {
  console.error(`Margin preparation failed: ${error.shortMessage ?? error.message}`);
  process.exitCode = 1;
} finally {
  await exchange.close();
}
