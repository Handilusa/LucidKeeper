# ORDER_TYPE enum exports MARKET instead of IMMEDIATE_OR_CANCEL / IOC

Severity: normal
Area: SDK / Documentation

## Steps to reproduce

1. Install `@somnia-chain/markets-sdk@0.32.1`.
2. In TypeScript or JavaScript, import `ORDER_TYPE` and attempt to construct an IOC order following the official dreamDEX developer documentation ("Taker loops / IOC"):

```javascript
import { ORDER_TYPE } from '@somnia-chain/markets-sdk';

console.log('ORDER_TYPE keys:', Object.keys(ORDER_TYPE));
// -> ['LIMIT', 'FILL_OR_KILL', 'MARKET', 'POST_ONLY']

console.log('ORDER_TYPE.IOC:', ORDER_TYPE.IOC);
// -> undefined

console.log('ORDER_TYPE.IMMEDIATE_OR_CANCEL:', ORDER_TYPE.IMMEDIATE_OR_CANCEL);
// -> undefined

console.log('ORDER_TYPE.MARKET:', ORDER_TYPE.MARKET);
// -> 2
```

3. Passing `orderType: ORDER_TYPE.IOC` or `orderType: ORDER_TYPE.IMMEDIATE_OR_CANCEL` to `placeOrder` passes `undefined`, which silently falls back to `0` (`LIMIT` / NormalOrder) or causes runtime type failures.

## Expected

The `ORDER_TYPE` enum exported by the SDK should provide `IOC` and/or `IMMEDIATE_OR_CANCEL` as valid constant keys mapping to value `2`, matching:
- The on-chain contract terminology and error name: `ImmediateOrCancelNoFill()` (in `contractErrorsAbi.d.ts:596`).
- The SDK's own JSDoc comments in `trade.d.ts`:
  > *"0 NormalOrder (rest), 1 FillOrKill, 2 ImmediateOrCancel, 3 PostOnly."*
- The official dreamDEX documentation at `https://app.testnet.dreamdex.io/docs/developers/perps-testnet` under "Taker loops / IOC".

Ideally:
```typescript
export const ORDER_TYPE = {
  LIMIT: 0,
  FILL_OR_KILL: 1,
  FOK: 1,
  IMMEDIATE_OR_CANCEL: 2,
  IOC: 2,
  MARKET: 2,
  POST_ONLY: 3,
} as const;
```

## Actual

`ORDER_TYPE` only defines `MARKET: 2`:
```typescript
export declare const ORDER_TYPE: {
    readonly LIMIT: 0;
    readonly FILL_OR_KILL: 1;
    readonly MARKET: 2;
    readonly POST_ONLY: 3;
};
```
There is no `ORDER_TYPE.IOC` or `ORDER_TYPE.IMMEDIATE_OR_CANCEL`.

This creates several developer frictions:
1. **Semantic contradiction:** A market IOC order in CLOB perps requires an explicit limit price (`price` parameter) to define crossing slippage. Calling it exclusively `MARKET` obscures the limit floor/ceiling requirement.
2. **Missing property:** Developers writing automated bot/maker-taker loops following protocol documentation look for `ORDER_TYPE.IOC` or `ORDER_TYPE.IMMEDIATE_OR_CANCEL`. It evaluates to `undefined`, which places a resting limit order (`0`) instead of crossing and canceling remainder.
3. **Index confusion:** Seeing `FILL_OR_KILL: 1` alongside an absent `IOC` key leads developers to confuse numeric indices (e.g. assuming `1` is IOC, which actually submits a Fill-or-Kill order).

## Evidence

- **Package:** `@somnia-chain/markets-sdk@0.32.1`
- **File:** `node_modules/@somnia-chain/markets-sdk/dist/trade.d.ts`, lines 380–388:
  ```typescript
  export declare const ORDER_TYPE: {
      readonly LIMIT: 0;
      readonly FILL_OR_KILL: 1;
      readonly MARKET: 2;
      readonly POST_ONLY: 3;
  };
  ```
- **Docstrings in SDK:**
  - `dist/trade.d.ts` lines 196–200: *"OrderBook OrderType (see ORDER_TYPE): 0 NormalOrder (rest), 1 FillOrKill, 2 ImmediateOrCancel, 3 PostOnly. Defaults to 0. A market order is an IOC (2)..."*
  - `src/unified/exchange.ts` line 5124: `else if (params.timeInForce === "IOC") orderType = Trade.ORDER_TYPE.MARKET;`
- **Contract Error ABI:** `dist/contractErrorsAbi.d.ts` line 596: `readonly name: "ImmediateOrCancelNoFill"`
- **Developer Documentation:** `https://app.testnet.dreamdex.io/docs/developers/perps-testnet` (sections "Taker loops" and "IOC (Immediate-Or-Cancel)").
- **Reproduction verified:** Node.js v24.19.0 directly inspecting `@somnia-chain/markets-sdk@0.32.1`:
  `ORDER_TYPE keys: [ 'LIMIT', 'FILL_OR_KILL', 'MARKET', 'POST_ONLY' ]`
  `ORDER_TYPE.IOC: undefined`
  `ORDER_TYPE.IMMEDIATE_OR_CANCEL: undefined`

## Environment

- SDK: `@somnia-chain/markets-sdk@0.32.1`
- Network: Somnia Tokyo / Hideki v2 testnet, chain ID 50383
- Wallet: Read-only SDK inspection; no wallet required for reproduction
- Runtime: Node.js 24.19.0 / TypeScript 5.8
- Status: Prepared locally, verified against installed SDK package
