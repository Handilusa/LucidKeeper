import assert from 'node:assert/strict';
import { createPublicClient, erc20Abi, http, parseAbi } from 'viem';
import { hidekiTestnet } from '@somnia-chain/markets-sdk/chains';
import { BOUNTY_EOA, saveEvidence } from './dreamdex.mjs';
import { assertOnchainActionAllowed } from './operating-policy.mjs';
import {
  COLLATERAL, MARGIN_BANK, envelopeTransaction, validateSignedTransaction,
} from './offline-transactions.mjs';

export const TOKYO_RPC = 'https://api.hideki2.infra.testnet.somnia.network';
const sameAddress = (a, b) => typeof a === 'string' && a.toLowerCase() === b.toLowerCase();
// Read ABIs are not root exports; signatures checked in SDK 0.32.1 readsAbi.ts.
const marginBankReadAbi = parseAbi([
  'function getSystemConfig() view returns ((address marginBank, address collateralToken, address perpPoolFactory, address liquidationEngine, address insuranceFund, address feeRecipient, uint16 maxLeverageLimit, bool fullyWired))',
  'function getAccountState(address account) view returns ((int256 unlockedCollateralBalance, uint256 lockedCollateral, address[] activePerpPools))',
]);
const perpPoolFactoryReadAbi = parseAbi(['function isDeployedByFactory(address perpPool) view returns (bool)']);
const poolReadAbi = parseAbi([
  'function marginBank() view returns (address)',
  'function getOrderBookParameters() view returns ((uint256 tickSize, uint256 minQuantity, uint256 lotSize))',
]);

function assertFresh(expiresAt, intent, timestamp = BigInt(Math.floor(Date.now() / 1000))) {
  assert(Number.isSafeInteger(expiresAt) && BigInt(expiresAt) > timestamp && BigInt(expiresAt) <= timestamp + 300n, 'Review expired or outside the five-minute validity window');
  if (intent.action === 'order') {
    const expiry = BigInt(intent.expireTimestampNs);
    assert(expiry > timestamp * 1_000_000_000n && expiry <= (timestamp + 300n) * 1_000_000_000n, 'Order expired or expiry exceeds five minutes');
  }
}

async function preflight(rpc, envelope, intent, expiresAt) {
  assert.equal(await rpc.getChainId(), 50383, 'RPC is not Tokyo');
  const block = await rpc.getBlock({ blockTag: 'latest' });
  assertFresh(expiresAt, intent, block.timestamp);
  assert.equal(await rpc.getTransactionCount({ address: BOUNTY_EOA, blockTag: 'pending' }), envelope.nonce, 'Pending nonce changed; review a new envelope');
  const code = await rpc.getCode({ address: BOUNTY_EOA, blockTag: 'pending' });
  assert(!code || code === '0x', 'Authorized account must remain an undelegated EOA');
  const tx = envelopeTransaction(envelope);
  assert(block.baseFeePerGas != null && block.baseFeePerGas <= tx.maxFeePerGas, 'Reviewed fee cap is below current base fee');
  assert(await rpc.getBalance({ address: BOUNTY_EOA, blockTag: 'pending' }) >= tx.gas * tx.maxFeePerGas, 'Insufficient Tokyo STT for gas');
  const read = (contract, abi, functionName, args = []) => rpc.readContract({ address: contract, abi, functionName, args, blockTag: 'pending' });
  const system = await read(MARGIN_BANK, marginBankReadAbi, 'getSystemConfig');
  assert(system.fullyWired && sameAddress(system.marginBank, MARGIN_BANK) && sameAddress(system.collateralToken, COLLATERAL), 'MarginBank system differs from the allowlist');
  assert.equal(await read(COLLATERAL, erc20Abi, 'decimals'), 18, 'Unexpected USDso decimals');
  const allowance = await read(COLLATERAL, erc20Abi, 'allowance', [BOUNTY_EOA, MARGIN_BANK]);
  if (intent.action === 'order') {
    assert(await read(system.perpPoolFactory, perpPoolFactoryReadAbi, 'isDeployedByFactory', [intent.pool]), 'Order pool is not deployed by the official factory');
    assert(sameAddress(await read(intent.pool, poolReadAbi, 'marginBank'), MARGIN_BANK), 'Order pool uses a different MarginBank');
    const grid = await read(intent.pool, poolReadAbi, 'getOrderBookParameters');
    assert(grid.tickSize > 0n && grid.lotSize > 0n && grid.minQuantity > 0n, 'Invalid live market grid');
    assert(BigInt(intent.price) % grid.tickSize === 0n && BigInt(intent.quantity) % grid.lotSize === 0n && BigInt(intent.quantity) >= grid.minQuantity, 'Order no longer fits the live market grid');
    const margin = await read(MARGIN_BANK, marginBankReadAbi, 'getAccountState', [BOUNTY_EOA]);
    assert(margin.unlockedCollateralBalance > 0n, 'No usable deposited margin');
    assert.equal(allowance, 0n, 'Test order requires zero allowance to prevent collateral auto-pull');
  } else {
    assert(await read(COLLATERAL, erc20Abi, 'balanceOf', [BOUNTY_EOA]) >= BigInt(intent.amount), 'Insufficient bounty USDso');
    if (intent.action === 'deposit') assert(allowance >= BigInt(intent.amount), 'Deposit requires confirmed allowance');
    else assert.equal(allowance, 0n, 'Approval requires zero existing allowance; review current state');
  }
  const estimate = await rpc.estimateGas({ ...tx, account: BOUNTY_EOA, blockTag: 'pending' });
  assert(estimate > 0n && estimate <= tx.gas, 'Reviewed gas limit is insufficient');
  return block.number;
}

// No caller-supplied transport, policy override, signer or live CLI.
export async function broadcastSignedTransaction(request) {
  // First gate: HOLD or absent/foreign wallet context stops before transport/evidence.
  assertOnchainActionAllowed('approve', { chainId: request?.envelope?.chainId, wallet: request?.envelope?.from });
  const { raw, envelope, intent, expiresAt } = structuredClone(request);
  const validated = await validateSignedTransaction(raw, envelope, intent);
  const context = { chainId: envelope.chainId, wallet: validated.from };
  assertOnchainActionAllowed(validated.action, context);
  assertFresh(expiresAt, intent);
  const rpc = createPublicClient({ chain: hidekiTestnet, transport: http(TOKYO_RPC, { retryCount: 0, timeout: 15_000 }) });
  // Sanitize upstream errors: RPC implementations can include raw payloads in messages.
  let checkedBlock;
  try {
    checkedBlock = await preflight(rpc, envelope, intent, expiresAt);
  } catch {
    throw new Error('Broadcast preflight failed; refresh public state and review the envelope');
  }
  const evidence = { chainId: 50383, from: BOUNTY_EOA, action: intent.action, hash: validated.hash, checkedBlock };
  // Persist the computed hash before a send, without the raw payload or signature.
  await saveEvidence('broadcast', { ...evidence, state: 'validated-not-sent' });
  assertOnchainActionAllowed(validated.action, context);
  assertFresh(expiresAt, intent);
  assert.equal(await rpc.getTransactionCount({ address: BOUNTY_EOA, blockTag: 'pending' }), envelope.nonce, 'Pending nonce changed before send');
  assertOnchainActionAllowed(validated.action, context);
  assertFresh(expiresAt, intent);
  let state = 'submitted';
  try {
    const hash = await rpc.sendRawTransaction({ serializedTransaction: raw });
    if (!sameAddress(hash, validated.hash)) state = 'send-uncertain';
  } catch {
    state = 'send-uncertain';
  }
  await saveEvidence('broadcast', { ...evidence, state });
  // Never retry a send. A timeout/mismatched response is resolved only by the same hash.
  let receipt;
  try {
    receipt = await rpc.getTransactionReceipt({ hash: validated.hash });
  } catch {
    const pending = { ...evidence, state: state === 'submitted' ? 'pending' : 'send-uncertain' };
    await saveEvidence('broadcast', pending);
    return pending;
  }
  let canonical;
  try {
    canonical = await rpc.getBlock({ blockNumber: receipt.blockNumber });
  } catch {
    const pending = { ...evidence, state: 'receipt-unverified' };
    await saveEvidence('broadcast', pending);
    return pending;
  }
  assert(sameAddress(receipt.transactionHash, validated.hash) && sameAddress(canonical.hash, receipt.blockHash), 'Receipt is not canonical for the submitted hash');
  assert(sameAddress(receipt.from, BOUNTY_EOA) && sameAddress(receipt.to, envelope.to), 'Receipt account or destination mismatch');
  assert(['success', 'reverted'].includes(receipt.status), 'Unknown receipt status');
  const result = { ...evidence, state: receipt.status === 'success' ? 'confirmed' : 'reverted', receipt, fillVerified: false };
  await saveEvidence('broadcast', result);
  return result;
}
