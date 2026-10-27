import { createPublicClient, http, formatUnits, parseAbi } from 'viem';
import { hidekiTestnet } from '@somnia-chain/markets-sdk/chains';

const client = createPublicClient({ chain: hidekiTestnet, transport: http('https://api.hideki2.infra.testnet.somnia.network') });
const EOA = '0x1420cF8Bb9D92C3fDb674ECc5A57295c59078fDA';

const txHashes = [
  { name: 'Approve', hash: '0x50342ddedec388240ce2ee8054c17a694b90ecfcfc0eb779eff8f2975f739a17' },
  { name: 'Deposit', hash: '0xce3214b4a7af9a200d485cc1822a71e4dea13f5bf64399e1de92c0514833399a' },
  { name: 'Order & Fill', hash: '0x8e5f867136920a55b9b93fca85fa7373a386a22158b33c031d0866c24a77a47a' },
];

async function run() {
  console.log('=== VERIFYING ON-CHAIN TRANSACTIONS ON SOMNIA TOKYO ===\n');
  for (const item of txHashes) {
    const tx = await client.getTransaction({ hash: item.hash });
    const receipt = await client.getTransactionReceipt({ hash: item.hash });
    console.log(`Action: ${item.name}`);
    console.log(`  Hash: ${item.hash}`);
    console.log(`  Status: ${receipt.status}`);
    console.log(`  Block: ${receipt.blockNumber}`);
    console.log(`  From (Signer): ${tx.from} (Matches EOA: ${tx.from.toLowerCase() === EOA.toLowerCase()})`);
    console.log(`  To: ${tx.to}`);
    console.log(`  Gas Used: ${receipt.gasUsed.toString()}`);
    console.log('--------------------------------------------------');
  }

  const marginBank = '0x478769E1177C0773c43A593DCCc4Ad15F15F1394';
  const btcPool = '0x4181dd08e73bbcdd1ba3e615a18f6abd941b94c0';
  const abi = parseAbi([
    'function getAccountState(address account) view returns ((int256 unlockedCollateralBalance, uint256 lockedCollateral, address[] activePerpPools))',
    'function getPosition(address account, address perpPool) view returns ((int256 size, uint256 avgEntryPrice, int256 entryFundingIndex, uint256 lastUpdatedTimestampNs))',
  ]);

  const [state, pos] = await Promise.all([
    client.readContract({ address: marginBank, abi, functionName: 'getAccountState', args: [EOA] }),
    client.readContract({ address: marginBank, abi, functionName: 'getPosition', args: [EOA, btcPool] }),
  ]);

  console.log('\n=== VERIFYING ON-CHAIN MARGINBANK STATE & POSITION ===');
  console.log(`Account: ${EOA}`);
  console.log(`Unlocked Margin: ${formatUnits(state.unlockedCollateralBalance, 18)} USDso`);
  console.log(`Locked Margin: ${formatUnits(state.lockedCollateral, 18)} USDso`);
  console.log(`Active Perp Pools: ${JSON.stringify(state.activePerpPools)}`);
  console.log(`Position Size: ${pos.size.toString()} atoms (${formatUnits(pos.size, 8)} BTC)`);
  console.log(`Avg Entry Price: ${formatUnits(pos.avgEntryPrice, 18)} USDso`);
  console.log(`Last Update Timestamp (ns): ${pos.lastUpdatedTimestampNs.toString()}`);
}

run().catch(console.error);
