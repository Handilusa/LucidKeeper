export const marginBankAbi = [
  {
    type: 'function',
    name: 'deposit',
    inputs: [{ name: 'amount', type: 'uint256' }],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'withdraw',
    inputs: [{ name: 'amount', type: 'uint256' }],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'getSystemConfig',
    inputs: [],
    outputs: [
      {
        type: 'tuple',
        name: 'config',
        components: [
          { name: 'marginBank', type: 'address' },
          { name: 'collateralToken', type: 'address' },
          { name: 'perpPoolFactory', type: 'address' },
          { name: 'liquidationEngine', type: 'address' },
          { name: 'insuranceFund', type: 'address' },
          { name: 'feeRecipient', type: 'address' },
          { name: 'maxLeverageLimit', type: 'uint16' },
          { name: 'fullyWired', type: 'bool' },
        ],
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getAccountState',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [
      {
        type: 'tuple',
        name: 'state',
        components: [
          { name: 'unlockedCollateralBalance', type: 'int256' },
          { name: 'lockedCollateral', type: 'uint256' },
          { name: 'activePerpPools', type: 'address[]' },
        ],
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getPosition',
    inputs: [
      { name: 'account', type: 'address' },
      { name: 'perpPool', type: 'address' },
    ],
    outputs: [
      {
        type: 'tuple',
        name: 'position',
        components: [
          { name: 'size', type: 'int256' },
          { name: 'avgEntryPrice', type: 'uint256' },
          { name: 'entryFundingIndex', type: 'uint256' },
        ],
      },
    ],
    stateMutability: 'view',
  },
] as const;

export const perpPoolAbi = [
  {
    type: 'function',
    name: 'placeOrder',
    inputs: [
      { name: 'isBid', type: 'bool' },
      { name: 'userData', type: 'uint64' },
      { name: 'price', type: 'uint256' },
      { name: 'quantity', type: 'uint256' },
      { name: 'expireTimestampNs', type: 'uint64' },
      { name: 'orderType', type: 'uint8' },
      { name: 'selfMatchingOption', type: 'uint8' },
      { name: 'builder', type: 'address' },
      { name: 'builderFeeBpsTimes1k', type: 'uint96' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'cancelOrder',
    inputs: [{ name: 'orderId', type: 'uint128' }],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'getPerpPoolParameters',
    inputs: [],
    outputs: [
      {
        type: 'tuple',
        name: 'parameters',
        components: [
          { name: 'initialMarginBps', type: 'uint16' },
          { name: 'maintenanceMarginBps', type: 'uint16' },
          { name: 'closeOutMarginBps', type: 'uint16' },
          { name: 'maxOpenInterest', type: 'uint64' },
          { name: 'maxPositionSize', type: 'uint64' },
          { name: 'takerFeeBpsTimes1k', type: 'uint32' },
          { name: 'makerFeeBpsTimes1k', type: 'int32' },
          { name: 'insuranceFundShareBps', type: 'uint16' },
        ],
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'marginBank',
    inputs: [],
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getOneBase',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getOrderBookParameters',
    inputs: [],
    outputs: [
      {
        type: 'tuple',
        name: 'parameters',
        components: [
          { name: 'tickSize', type: 'uint256' },
          { name: 'minQuantity', type: 'uint256' },
          { name: 'lotSize', type: 'uint256' },
        ],
      },
    ],
    stateMutability: 'view',
  },
] as const;

export const erc20Abi = [
  {
    type: 'function',
    name: 'approve',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'allowance',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'balanceOf',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'decimals',
    inputs: [],
    outputs: [{ name: '', type: 'uint8' }],
    stateMutability: 'view',
  },
] as const;

export const CONTRACT_ADDRESSES = {
  MARGIN_BANK: '0x478769E1177C0773c43A593DCCc4Ad15F15F1394' as const,
  COLLATERAL_USDSO: '0xed7993A74dAe1e6656B704A424DcD8711aAf4F72' as const,
  BTC_PERP_POOL: '0x4181dd08e73bbcdd1ba3e615a18f6abd941b94c0' as const,
};
