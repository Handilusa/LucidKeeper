import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import * as Dialog from '@radix-ui/react-dialog';
import { 
  X, 
  AlertTriangle, 
  Check, 
  Copy, 
  ExternalLink,
  ArrowRight,
  LoaderCircle
} from 'lucide-react';
import { formatUnits } from 'viem';
import { 
  registerTransactionReviewer, 
  registerPreflightListener,
  type TransactionReviewRequest,
  type PreflightState
} from '@/lib/transactionReview';
import '@/styles/transaction-review.css';

export const TransactionReviewModal: React.FC = () => {
  const [request, setRequest] = useState<TransactionReviewRequest | null>(null);
  const [preflight, setPreflight] = useState<PreflightState | null>(null);
  const [activeTab, setActiveTab] = useState<'details' | 'json'>('details');
  const [copiedJson, setCopiedJson] = useState(false);
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);

  useEffect(() => {
    const unregisterReviewer = registerTransactionReviewer((incoming) => {
      setRequest(incoming);
      setActiveTab('details');
      setCopiedJson(false);
      setCopiedAddress(null);
    });

    const unregisterPreflight = registerPreflightListener((state) => {
      setPreflight(state);
    });

    return () => {
      unregisterReviewer();
      unregisterPreflight();
    };
  }, []);

  // Keyboard shortcut listener (Enter = Confirm, Escape = Abort)
  useEffect(() => {
    if (!request) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey && !e.metaKey && !e.ctrlKey) {
        if (document.activeElement?.tagName !== 'TEXTAREA') {
          e.preventDefault();
          request.resolve(true);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        request.resolve(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [request]);

  const isBuy = request ? /buy|long/i.test(request.envelope.description) || /buy/i.test(request.envelope.action) : false;
  const isSell = request ? /sell|short|close|cancel/i.test(request.envelope.description) || /cancel/i.test(request.envelope.action) : false;

  const getActionBadgeClass = () => {
    if (!request) return 'tx-badge-default';
    if (request.envelope.action === 'deposit' || (request.envelope.action === 'order' && isBuy)) return 'tx-badge-buy';
    if (request.envelope.action === 'cancel' || (request.envelope.action === 'order' && isSell)) return 'tx-badge-sell';
    return 'tx-badge-default';
  };

  const getActionLabel = () => {
    if (!request) return '';
    switch (request.envelope.action) {
      case 'order':
        return isBuy ? 'BUY IOC' : isSell ? 'SELL IOC' : 'ORDER IOC';
      case 'deposit':
        return 'DEPOSIT USDSO';
      case 'withdraw':
        return 'WITHDRAW USDSO';
      case 'approve':
        return 'APPROVE ALLOWANCE';
      case 'cancel':
        return 'CANCEL ORDER';
      default:
        return String(request.envelope.action).toUpperCase();
    }
  };

  const handleCopyJson = async () => {
    if (!request) return;
    try {
      await navigator.clipboard.writeText(request.rawJson);
      setCopiedJson(true);
      setTimeout(() => setCopiedJson(false), 2000);
    } catch {
      // ignore
    }
  };

  const handleCopyAddress = async (addr: string) => {
    try {
      await navigator.clipboard.writeText(addr);
      setCopiedAddress(addr);
      setTimeout(() => setCopiedAddress(null), 1500);
    } catch {
      // ignore
    }
  };

  const formatShortAddress = (addr: string) => {
    if (!addr || addr.length < 12) return addr;
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const formatGwei = (weiStr: string) => {
    try {
      const gwei = formatUnits(BigInt(weiStr), 9);
      const num = parseFloat(gwei);
      return num < 0.001 ? '< 0.001 Gwei' : `${num.toFixed(3)} Gwei`;
    } catch {
      return `${weiStr} wei`;
    }
  };

  return (
    <>
      {/* 1. Pre-flight verification loading animation while on-chain simulation runs */}
      {preflight && !request && typeof document !== 'undefined' && createPortal(
        <div className="tx-preflight-overlay" role="status" aria-live="polite">
          <div className="tx-preflight-card">
            <div className="tx-preflight-header">
              <div className="tx-header-left">
                <div className="tx-status-beacon" />
                <span className="tx-protocol-tag">PRE-FLIGHT VERIFICATION</span>
              </div>
              <span className="tx-chain-pill">TOKYO 50383</span>
            </div>
            <div className="tx-preflight-body">
              <div className="tx-preflight-spinner-ring">
                <LoaderCircle size={22} className="tx-preflight-spinner" />
              </div>
              <div className="tx-preflight-content">
                <strong>Verifying on-chain parameters…</strong>
                <p>
                  {preflight.market
                    ? `Simulating execution for ${preflight.market} & estimating gas`
                    : 'Reading MarginBank state, tick/lot grid & gas estimates'}
                </p>
              </div>
            </div>
            <div className="tx-preflight-track">
              <div className="tx-preflight-bar" />
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* 2. Review Modal when parameters are confirmed */}
      {request && (
        <Dialog.Root
          open={!!request}
          onOpenChange={(open) => {
            if (!open && request) {
              request.resolve(false);
            }
          }}
        >
          <Dialog.Portal>
            <Dialog.Overlay className="tx-review-overlay" />
            <Dialog.Content className="tx-review-content" aria-describedby="tx-review-description">
              {/* Header */}
              <div className="tx-header">
                <div className="tx-header-left">
                  <div className="tx-status-beacon" />
                  <Dialog.Title className="tx-protocol-tag">
                    TRANSACTION REVIEW
                  </Dialog.Title>
                  <span className="tx-chain-pill">TOKYO 50383</span>
                </div>
                <Dialog.Close 
                  className="tx-close-btn" 
                  aria-label="Cancel"
                  onClick={() => request.resolve(false)}
                >
                  <X size={15} />
                </Dialog.Close>
              </div>

              {/* Body Content */}
              <div className="tx-body">
                {/* Action Card */}
                <div className="tx-hero-card">
                  <div className="tx-hero-top">
                    <span className={`tx-action-badge ${getActionBadgeClass()}`}>
                      {getActionLabel()}
                    </span>
                    <span className="tx-chain-pill">NONCE #{request.envelope.nonce}</span>
                  </div>
                  <div className="tx-hero-size">
                    <span>{request.envelope.size}</span>
                    <span className="tx-hero-asset">{request.envelope.market}</span>
                  </div>
                  <p className="tx-hero-desc" id="tx-review-description">
                    {request.envelope.description}
                  </p>
                </div>

                {/* Warning notice if present */}
                {request.envelope.warning && (
                  <div className="tx-warning-banner">
                    <AlertTriangle size={15} className="tx-warning-icon" />
                    <div>{request.envelope.warning}</div>
                  </div>
                )}

                {/* View Mode Tabs */}
                <div className="tx-tabs">
                  <button
                    type="button"
                    className="tx-tab-btn"
                    data-active={activeTab === 'details'}
                    onClick={() => setActiveTab('details')}
                  >
                    Details
                  </button>
                  <button
                    type="button"
                    className="tx-tab-btn"
                    data-active={activeTab === 'json'}
                    onClick={() => setActiveTab('json')}
                  >
                    Raw JSON
                  </button>
                </div>

                {activeTab === 'details' ? (
                  /* Telemetry Grid */
                  <div className="tx-grid">
                    <div className="tx-cell">
                      <span className="tx-cell-label">Signer (From)</span>
                      <div className="tx-cell-value">
                        <span title={request.envelope.from}>{formatShortAddress(request.envelope.from)}</span>
                        <button
                          type="button"
                          className="tx-copy-inline"
                          onClick={() => handleCopyAddress(request.envelope.from)}
                          title="Copy Address"
                        >
                          {copiedAddress === request.envelope.from ? <Check size={11} color="#60cf9f" /> : <Copy size={11} />}
                        </button>
                      </div>
                    </div>

                    <div className="tx-cell">
                      <span className="tx-cell-label">Contract (To)</span>
                      <div className="tx-cell-value">
                        <span title={request.envelope.to}>{formatShortAddress(request.envelope.to)}</span>
                        <a
                          href={`https://explorer.testnet.somnia.network/tokyo/address/${request.envelope.to}`}
                          target="_blank"
                          rel="noreferrer"
                          className="tx-copy-inline"
                          title="View on Explorer"
                        >
                          <ExternalLink size={11} />
                        </a>
                      </div>
                    </div>

                    <div className="tx-cell">
                      <span className="tx-cell-label">Est. Gas Limit</span>
                      <div className="tx-cell-value">
                        <span>{Number(request.envelope.gas).toLocaleString()} units</span>
                      </div>
                    </div>

                    <div className="tx-cell">
                      <span className="tx-cell-label">Max Fee Per Gas</span>
                      <div className="tx-cell-value">
                        <span>{formatGwei(request.envelope.fees.maxFeePerGas)}</span>
                      </div>
                    </div>

                    <div className="tx-cell">
                      <span className="tx-cell-label">Priority Fee</span>
                      <div className="tx-cell-value">
                        <span>{formatGwei(request.envelope.fees.maxPriorityFeePerGas)}</span>
                      </div>
                    </div>

                    <div className="tx-cell">
                      <span className="tx-cell-label">Value</span>
                      <div className="tx-cell-value">
                        <span>0 STT (Nonpayable)</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Raw JSON Block */
                  <div className="tx-raw-block">
                    <button
                      type="button"
                      className="tx-copy-payload-btn"
                      onClick={handleCopyJson}
                    >
                      {copiedJson ? (
                        <>
                          <Check size={11} color="#60cf9f" />
                          <span>Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy size={11} />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                    <pre>{request.rawJson}</pre>
                  </div>
                )}
              </div>

              {/* Action Controls */}
              <div className="tx-footer">
                <button
                  type="button"
                  className="tx-btn-abort"
                  onClick={() => request.resolve(false)}
                >
                  <span>Cancel</span>
                  <span className="tx-key-hint">ESC</span>
                </button>

                <button
                  type="button"
                  className="tx-btn-confirm"
                  onClick={() => request.resolve(true)}
                >
                  <span>Confirm & Sign</span>
                  <ArrowRight size={13} className="tx-btn-arrow" />
                  <span className="tx-key-hint">ENTER ↵</span>
                </button>
              </div>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      )}
    </>
  );
};
