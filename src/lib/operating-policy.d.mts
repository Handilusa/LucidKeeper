export const MARGIN_HOLD: Readonly<{ active: boolean; reason: string }>;
export const AUTHORIZED_SIGNER: string;
export function assertOnchainActionAllowed(action: string, context?: { chainId: number; wallet: string }): void;
