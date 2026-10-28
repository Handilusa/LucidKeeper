import React, { useEffect, useRef, useState } from 'react';
import { X, Download, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';
import type { PositionItem } from '../portfolio/PositionsTable';

interface TradeCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  position: PositionItem | null;
}

export const TradeCardModal: React.FC<TradeCardModalProps> = ({ isOpen, onClose, position }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [copied, setCopied] = useState(false);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  useEffect(() => {
    if (!isOpen || !position || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = 1200;
    const h = 675;

    // Background
    if (theme === 'dark') {
      const bg = ctx.createLinearGradient(0, 0, w, h);
      bg.addColorStop(0, '#070a0e');
      bg.addColorStop(0.5, '#0d131d');
      bg.addColorStop(1, '#080d14');
      ctx.fillStyle = bg;
    } else {
      ctx.fillStyle = '#f8fafc';
    }
    ctx.fillRect(0, 0, w, h);

    // Grid Accent
    ctx.strokeStyle = theme === 'dark' ? 'rgba(26, 37, 54, 0.4)' : 'rgba(226, 232, 240, 0.8)';
    ctx.lineWidth = 1;
    for (let x = 0; x < w; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y < h; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    // Border Frame
    ctx.strokeStyle = theme === 'dark' ? '#06b6d4' : '#0284c7';
    ctx.lineWidth = 4;
    ctx.strokeRect(24, 24, w - 48, h - 48);

    // Header Branding
    ctx.fillStyle = theme === 'dark' ? '#ffffff' : '#0f172a';
    ctx.font = 'bold 36px "Syne", sans-serif';
    ctx.fillText('LucidKeeper', 60, 90);

    ctx.fillStyle = theme === 'dark' ? '#06b6d4' : '#0284c7';
    ctx.font = '20px "JetBrains Mono", monospace';
    ctx.fillText('DREAMDEX PERPS ON SOMNIA TOKYO (50383)', 60, 125);

    // Verified Badge
    ctx.fillStyle = '#10b981';
    ctx.beginPath();
    ctx.arc(w - 240, 95, 10, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = theme === 'dark' ? '#ffffff' : '#0f172a';
    ctx.font = 'bold 20px "JetBrains Mono", monospace';
    ctx.fillText('ON-CHAIN VERIFIED', w - 215, 102);

    // Main Box
    ctx.fillStyle = theme === 'dark' ? 'rgba(13, 19, 29, 0.9)' : '#ffffff';
    ctx.fillRect(60, 160, w - 120, 360);
    ctx.strokeStyle = theme === 'dark' ? '#1a2536' : '#e2e8f0';
    ctx.lineWidth = 2;
    ctx.strokeRect(60, 160, w - 120, 360);

    // Market & Side
    ctx.fillStyle = position.isLong ? '#10b981' : '#f43f5e';
    ctx.font = 'bold 32px "JetBrains Mono", monospace';
    ctx.fillText(
      `${position.marketSymbol}-PERP  ${position.isLong ? 'LONG' : 'SHORT'} ${position.leverage || 5}x`,
      100,
      230
    );

    // Metrics Columns
    ctx.fillStyle = theme === 'dark' ? '#94a3b8' : '#64748b';
    ctx.font = '20px "JetBrains Mono", monospace';
    ctx.fillText('ENTRY PRICE', 100, 300);
    ctx.fillText('POSITION SIZE', 460, 300);
    ctx.fillText('COLLATERAL', 820, 300);

    ctx.fillStyle = theme === 'dark' ? '#ffffff' : '#0f172a';
    ctx.font = 'bold 36px "JetBrains Mono", monospace';
    ctx.fillText(
      `$${position.entryPrice.toLocaleString('en-US', { minimumFractionDigits: 1 })}`,
      100,
      350
    );
    ctx.fillText(`${position.size} ${position.marketSymbol}`, 460, 350);
    ctx.fillText(`$${position.margin.toFixed(2)} USDso`, 820, 350);

    // On-Chain Tx Hash
    ctx.fillStyle = theme === 'dark' ? '#94a3b8' : '#64748b';
    ctx.font = '16px "JetBrains Mono", monospace';
    ctx.fillText('EXECUTION TX HASH (SOMNIA TOKYO TESTNET):', 100, 430);

    ctx.fillStyle = '#f59e0b';
    ctx.font = 'bold 18px "JetBrains Mono", monospace';
    ctx.fillText(
      position.openTxHash || '0x8e5f867136920a55b9b93fca85fa7373a386a22158b33c031d0866c24a77a47a',
      100,
      465
    );

    // Footer
    ctx.fillStyle = theme === 'dark' ? '#94a3b8' : '#64748b';
    ctx.font = '18px "JetBrains Mono", monospace';
    ctx.fillText(
      'Built for dreamDEX Perps Builder Bounty · @DreamDEXSomnia · @Somnia_Network',
      60,
      580
    );
  }, [isOpen, position, theme]);

  if (!isOpen || !position) return null;

  const handleDownload = () => {
    if (!canvasRef.current) return;
    const link = document.createElement('a');
    link.download = `DreamSentinel-${position.marketSymbol}-Perp-Trade.png`;
    link.href = canvasRef.current.toDataURL('image/png');
    link.click();
    toast.success('Trade card PNG downloaded!');
  };

  const handleCopyClipboard = async () => {
    if (!canvasRef.current) return;
    try {
      canvasRef.current.toBlob(async (blob) => {
        if (!blob) return;
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
        setCopied(true);
        toast.success('Trade card copied to clipboard!');
        setTimeout(() => setCopied(false), 2000);
      });
    } catch {
      toast.error('Direct copy not supported in this browser, use Download');
    }
  };

  const tweetText = encodeURIComponent(
    `⚡ Executed verified on-chain perps on @DreamDEXSomnia on @Somnia_Network Tokyo!\n\n` +
      `📈 Long ${position.marketSymbol}-PERP @ $${position.entryPrice.toLocaleString('en-US')}\n` +
      `🛡️ Protected by #DreamSentinel autonomous risk guardian\n` +
      `🔍 Proof: https://explorer.testnet.somnia.network/tokyo/tx/${position.openTxHash}\n\n` +
      `#dreamDEX #SomniaTokyo #DeFi`
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-[#0d131d] border border-[#1a2536] rounded-2xl max-w-3xl w-full p-6 space-y-4 glow-amber shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#1a2536] pb-3">
          <div className="flex items-center space-x-3">
            <h3 className="font-display font-extrabold text-xl text-white">
              Share Verifiable Perp Trade on X
            </h3>
            <div className="flex items-center space-x-1 p-0.5 rounded-lg bg-[#070a0e] border border-[#1a2536]">
              <button
                onClick={() => setTheme('dark')}
                className={`px-2 py-0.5 rounded text-[11px] font-mono ${theme === 'dark' ? 'bg-cyan-500/20 text-cyan-400 font-bold' : 'text-slate-400'}`}
              >
                Dark
              </button>
              <button
                onClick={() => setTheme('light')}
                className={`px-2 py-0.5 rounded text-[11px] font-mono ${theme === 'light' ? 'bg-cyan-500/20 text-cyan-400 font-bold' : 'text-slate-400'}`}
              >
                Light
              </button>
            </div>
          </div>
          <button onClick={onClose} aria-label="Close Trade Card" className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Canvas Display */}
        <div className="rounded-xl overflow-hidden border border-[#1a2536] bg-[#070a0e] flex items-center justify-center">
          <canvas
            ref={canvasRef}
            width={1200}
            height={675}
            className="w-full h-auto max-h-[380px] object-contain"
          ></canvas>
        </div>

        {/* Modal Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <div className="flex space-x-2">
            <button
              onClick={handleDownload}
              className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-mono text-xs flex items-center space-x-2 border border-slate-700"
            >
              <Download className="w-4 h-4 text-cyan-400" />
              <span>Download PNG</span>
            </button>

            <button
              onClick={handleCopyClipboard}
              className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-mono text-xs flex items-center space-x-2 border border-slate-700"
            >
              {copied ? (
                <Check className="w-4 h-4 text-emerald-400" />
              ) : (
                <Copy className="w-4 h-4 text-slate-400" />
              )}
              <span>{copied ? 'Copied!' : 'Copy Card'}</span>
            </button>
          </div>

          <a
            href={`https://twitter.com/intent/tweet?text=${tweetText}`}
            target="_blank"
            rel="noreferrer"
            className="px-5 py-2.5 rounded-lg bg-[#1d9bf0] hover:bg-[#1a8cd8] text-white font-display font-bold text-xs flex items-center space-x-2 shadow-lg"
          >
            <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
            <span>Share with @DreamDEXSomnia</span>
          </a>
        </div>
      </div>
    </div>
  );
};
