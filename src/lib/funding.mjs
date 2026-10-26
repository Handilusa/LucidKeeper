import assert from 'node:assert/strict';
import { encodeFunctionData, erc20Abi } from 'viem';
import { marginBankWriteAbi } from '@somnia-chain/markets-sdk';
import { bountyAddress } from './dreamdex.mjs';

// ABI and spender checked against SDK 0.32.1 src/perp/margin.ts: the bank pulls USDso.
// Pure encoding only. No signer, approval helper, voucher, transfer or send method.
export function buildUnsignedMarginDeposit({ address, system, amount, allowance, balance }) {
  const from = bountyAddress(address);
  assert(typeof amount === 'bigint' && amount > 0n, 'Deposit amount must be a positive bigint');
  assert(typeof balance === 'bigint' && balance >= amount, 'Insufficient wallet USDso; request bounty funds');
  assert(typeof allowance === 'bigint' && allowance >= 0n, 'Invalid allowance');
  const common = { chainId: 50383, from, value: 0n };
  const approval = allowance < amount ? {
    ...common,
    to: system.collateralToken,
    functionName: 'approve',
    args: [system.marginBank, amount],
    data: encodeFunctionData({ abi: erc20Abi, functionName: 'approve', args: [system.marginBank, amount] }),
  } : null;
  const deposit = {
    ...common,
    to: system.marginBank,
    functionName: 'deposit',
    args: [amount],
    data: encodeFunctionData({ abi: marginBankWriteAbi, functionName: 'deposit', args: [amount] }),
  };
  return { approval, deposit };
}
