# Mixed candle intervals distort chart aggregation

- **Severity:** High
- **Area:** Frontend / OHLCV mapping
- **Environment:** LucidKeeper React SPA; markets SDK 0.32.1; Lightweight Charts 4.2.3; Somnia Tokyo 50383; public bounty EOA `0x1420cF8Bb9D92C3fDb674ECc5A57295c59078fDA` (read-only context).
- **Reproduction:** Request the most recent 2,000 `Candle` rows for the BTC pool without filtering `intervalSeconds`, as the baseline `fetchMarketCandles` does. Sort by bucketStart and aggregate them again.
- **Expected:** One native interval per chart request, unique chronological timestamps, base volume converted using the selected market's decimals.
- **Actual:** 28 October 2026 22:47 UTC: six intervals and 447 duplicate timestamps; overlapping volume gets summed. Non-BTC volume always divided by 1e8.
- **Evidence:** See `docs/LUCIDKEEPER_UX_AUDIT.md`. The 90,000 USDso high also exists in native 60s Candle and indexed Fill records; it is not itself evidence of a chart-scale defect.
- **Resolution:** Filter exact native interval, validate OHLC/seconds, use verified market decimals; mark price drawn separately from execution candles. No alteration or clipping of valid extremes.
