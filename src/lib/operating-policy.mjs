// Only a new, explicit written user confirmation may release this hold.
// No environment variable, CLI flag, balance increase or signed payload overrides it.
export const MARGIN_HOLD = Object.freeze({
  active: true,
  reason: 'Awaiting written user confirmation that the dreamDEX team permits these funds as margin.',
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
