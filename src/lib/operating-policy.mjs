// Current owner authorization (30 October 2026) is conditional, not a HOLD release.
// No CLI/env/signer override: release requires explicit written team-margin permission.
export const MARGIN_HOLD = Object.freeze({
  active: true,
  reason: 'Awaiting written confirmation that dreamDEX permits these funds as margin.',
});

export const AUTHORIZED_SIGNER = '0x1420cF8Bb9D92C3fDb674ECc5A57295c59078fDA';
export function assertOnchainActionAllowed(action, context) {
  if (!['approve', 'deposit', 'order'].includes(action)) {
    throw new Error('Action is outside the bounty allowlist');
  }
  // Owner placeOrder can auto-pull approved wallet collateral into margin.
  // Blocking it too prevents an order from bypassing the funding hold.
  if (MARGIN_HOLD.active) {
    throw new Error(`HOLD: ${action} preparation/broadcast is disabled. ${MARGIN_HOLD.reason}`);
  }
  if (context && (context.chainId !== 50383 || context.wallet?.toLowerCase() !== AUTHORIZED_SIGNER.toLowerCase())) {
    throw new Error('Only the authorized bounty EOA on Tokyo 50383 may sign');
  }
}
