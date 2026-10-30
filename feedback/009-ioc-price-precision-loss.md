# Six-decimal conversion changes IOC prices by multiple market ticks

Severity: Medium — reproduced price-encoding error affecting execution bounds; no live trade was attempted.
Area: App / order math / close / Guardian

## Reproduction
1. Read official 1000PEPE pool `0xfa9b9e50cc1745113d57893991af200a74c86b6f` at Tokyo block `37084078`.
2. `tryGetMarkPrice` returns raw mark `5205531797000000`; tick size is `100000000000` (18 quote decimals).
3. Compare the actual-source sequence in `TradingBox.tsx:258-264`: `Number(formatUnits(mark, 18))`, `toFixed(6)`, `parseUnits`, integer 98/102 percent multiplication, then floor-to-tick.
4. Compare with integer 98/102 percent multiplication directly on the raw mark, then the same floor-to-tick. This is arithmetic only, not transaction preparation.

## Expected
Use on-chain integer precision through slippage and quantization. Presentation rounding must not change execution parameters.

## Actual
| Direction | Current-source price atoms | Exact-integer price atoms | Difference |
| --- | --- | --- | --- |
| Sell IOC | 5101800000000000 | 5101400000000000 | +4 ticks |
| Buy IOC | 5310100000000000 | 5309600000000000 | +5 ticks |

Both results are on-grid, so tick validation alone will not catch the error. The same six-decimal conversion appears in `PositionsTable.tsx:137-149` and `RiskGuardian.tsx:297-305`. Guardian default/preset trigger prices also use four decimals below one dollar; their live impact was not exercised without a position.

## Evidence
Real mark/grid reads and actual-source arithmetic on 30 October 2026, starting 12:00 UTC. `.git/lucidkeeper-audit/completion-2026-10-30/report.json`, `markets[].priceEncoding`. No calldata/envelope prepared, simulation, signature or transaction send.

## Environment
- SDK: `@somnia-chain/markets-sdk` 0.32.1
- Network: Somnia Tokyo testnet, chain 50383
- Public bounty account: `0x1420cF8Bb9D92C3fDb674ECc5A57295c59078fDA`; public reads only
- Runtime / OS: Node 24.19.0 / Windows
- Status: Fixed locally 2026-10-30; no live execution, not submitted

## Recommended next action
Retain raw bigint mark/size and use market tick precision for controls and display. Test exact arithmetic across all verified markets without mocked transport. This review did not fix the conversion.

## Fix — 2026-10-30
`src/lib/math/ioc.ts` now retains raw bigint through multiply/divide/tick floor. Trade, close and Guardian use it; the limit Use mark control also snaps raw atoms. `test/ioc.test.mjs` uses sourced block 37084078 and all 21 captured grids. Exact sell/buy prices are 5101400000000000 / 5309600000000000 atoms. HOLD remains separate; no live transaction executed.
