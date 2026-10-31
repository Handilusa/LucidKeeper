import type { BrowserAction } from './browser-intent';

export interface TransactionReviewEnvelope {
  action: BrowserAction;
  market: string;
  size: string;
  chainId: number;
  from: `0x${string}`;
  to: `0x${string}`;
  value: string;
  data: `0x${string}`;
  nonce: number;
  gas: string;
  fees: {
    maxFeePerGas: string;
    maxPriorityFeePerGas: string;
  };
  description: string;
  warning?: string;
}

export interface TransactionReviewRequest {
  id: string;
  envelope: TransactionReviewEnvelope;
  rawJson: string;
  resolve: (approved: boolean) => void;
}

export interface PreflightState {
  active: boolean;
  market?: string;
  description?: string;
}

type ReviewListener = (request: TransactionReviewRequest | null) => void;
type PreflightListener = (state: PreflightState | null) => void;

let activeListener: ReviewListener | null = null;
let preflightListener: PreflightListener | null = null;
let currentRequest: TransactionReviewRequest | null = null;

/** Register the UI review modal listener */
export function registerTransactionReviewer(listener: ReviewListener): () => void {
  activeListener = listener;
  if (currentRequest) {
    listener(currentRequest);
  }
  return () => {
    if (activeListener === listener) {
      activeListener = null;
    }
  };
}

/** Register pre-flight verification loading listener */
export function registerPreflightListener(listener: PreflightListener): () => void {
  preflightListener = listener;
  return () => {
    if (preflightListener === listener) {
      preflightListener = null;
    }
  };
}

/** Set pre-flight verification loading state */
export function setPreflightLoading(active: boolean, market?: string, description?: string) {
  if (preflightListener) {
    preflightListener(active ? { active: true, market, description } : null);
  }
}

/** Check if an active UI review listener is registered */
export function hasTransactionReviewer(): boolean {
  return activeListener !== null;
}

/**
 * Request an explicit transaction review from the UI modal.
 * Returns a Promise that resolves to true if authorized by user, false if cancelled/aborted.
 */
export function requestTransactionReview(
  envelope: TransactionReviewEnvelope,
  rawJson: string
): Promise<boolean> {
  // Clear any preflight loading state once the actual review is ready
  setPreflightLoading(false);

  return new Promise((resolve) => {
    if (currentRequest) {
      currentRequest.resolve(false);
    }

    const request: TransactionReviewRequest = {
      id: Math.random().toString(36).slice(2, 9),
      envelope,
      rawJson,
      resolve: (approved: boolean) => {
        currentRequest = null;
        if (activeListener) {
          activeListener(null);
        }
        resolve(approved);
      },
    };

    currentRequest = request;
    if (activeListener) {
      activeListener(request);
    } else {
      resolve(false);
    }
  });
}
