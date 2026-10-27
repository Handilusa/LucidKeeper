// Released by explicit written user confirmation on 27 October 2026.
// The user confirmed that dreamDEX permits these testnet funds as perps margin.
export const MARGIN_HOLD = Object.freeze({
  active: false,
  reason: 'Released: user confirmed dreamDEX permits these funds as margin (27 Oct 2026).',
});

export function assertOnchainActionAllowed(action) {
  if (!['approve', 'deposit', 'order'].includes(action)) {
    throw new Error('Action is outside the bounty allowlist');
  }
  // Owner placeOrder can auto-pull approved wallet collateral into margin.
  // Blocking it too prevents an order from bypassing the funding hold.
  if (MARGIN_HOLD.active) {
    throw new Error(`HOLD: ${action} preparation/broadcast is disabled. ${MARGIN_HOLD.reason}`);
  }
}
