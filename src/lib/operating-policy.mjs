export const AUTHORIZED_SIGNER = '0x1420cF8Bb9D92C3fDb674ECc5A57295c59078fDA';
// Owner explicitly confirmed dreamDEX margin-use permission in writing on 30 October.
// Owner-reported permission, not independent verification of funding/wallet history.
// No CLI/env/signer override; the release is scoped, never permission for other wallets.
export const MARGIN_HOLD = Object.freeze({
  active: false,
  releasedFor: AUTHORIZED_SIGNER,
  chainId: 50383,
  confirmedAt: '2026-10-30',
  reason: 'Owner explicitly confirmed dreamDEX permits these funds as margin for the bounty EOA on Tokyo only.',
});

export function assertOnchainActionAllowed(action, context) {
  if (!['approve', 'deposit', 'order'].includes(action)) {
    throw new Error('Action is outside the bounty allowlist');
  }
  // A future funding HOLD must also stop orders that could auto-pull collateral.
  if (MARGIN_HOLD.active) {
    throw new Error(`HOLD: ${action} preparation/broadcast is disabled. ${MARGIN_HOLD.reason}`);
  }
  // Mandatory even for CLI/broadcast callers: omission must never widen the release.
  if (!context || context.chainId !== MARGIN_HOLD.chainId || typeof context.wallet !== 'string' || context.wallet.toLowerCase() !== MARGIN_HOLD.releasedFor.toLowerCase()) {
    throw new Error('Only the authorized bounty EOA on Tokyo 50383 may sign');
  }
}
