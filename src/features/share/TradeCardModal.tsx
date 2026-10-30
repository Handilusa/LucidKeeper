import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import type { PositionItem } from '../portfolio/PositionsTable';
import { Modal } from '@/components/Modal';
import { formatDynamicPrice } from '@/lib/math/format';

export function TradeCardModal({
  isOpen,
  onClose,
  position,
}: {
  isOpen: boolean;
  onClose: () => void;
  position: PositionItem | null;
}) {
  const [canvas, setCanvas] = useState<HTMLCanvasElement | null>(null);
  const [copied, setCopied] = useState(false);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const hasHash = !!position?.openTxHash && /^0x[0-9a-fA-F]{64}$/.test(position.openTxHash);
  useEffect(() => {
    if (!isOpen || !position || !canvas) return;
    let active = true;
    const draw = () => {
      if (!active) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const foreground = theme === 'dark' ? '#e6e6e6' : '#111111';
      const muted = theme === 'dark' ? '#a8a8a8' : '#4c4c4c';
      ctx.fillStyle = theme === 'dark' ? '#111111' : '#f5f5f5';
      ctx.fillRect(0, 0, 1200, 675);
      ctx.fillStyle = theme === 'dark' ? '#bc93f3' : '#771be8';
      ctx.fillRect(0, 0, 8, 675);
      ctx.fillStyle = foreground;
      ctx.font = 'bold 40px Syne, sans-serif';
      ctx.fillText('LucidKeeper', 60, 84);
      ctx.fillStyle = muted;
      ctx.font = '18px "JetBrains Mono", monospace';
      ctx.fillText('SOMNIA TOKYO TESTNET · 50383', 60, 126);
      ctx.fillText('POSITION SNAPSHOT', 840, 84);
      ctx.fillStyle = foreground;
      ctx.font = 'bold 60px "Plus Jakarta Sans", sans-serif';
      ctx.fillText(`${position.marketSymbol}-PERP`, 60, 242);
      ctx.fillStyle = position.isLong ? '#60cf9f' : '#f4808b';
      ctx.font = '26px "JetBrains Mono", monospace';
      ctx.fillText(`${position.isLong ? 'LONG' : 'SHORT'} · CROSS MARGIN`, 60, 290);
      const metrics = [
        ['ENTRY PRICE', `${formatDynamicPrice(position.entryPrice)} USDso`],
        ['QUANTITY', `${position.size} ${position.marketSymbol}`],
        [
          'MARK PRICE',
          position.markPrice > 0
            ? `${formatDynamicPrice(position.markPrice)} USDso`
            : 'Unavailable',
        ],
      ];
      metrics.forEach(([label, value], index) => {
        const x = 60 + index * 380;
        ctx.fillStyle = muted;
        ctx.font = '18px "JetBrains Mono", monospace';
        ctx.fillText(label, x, 370);
        ctx.fillStyle = foreground;
        ctx.font = 'bold 25px "JetBrains Mono", monospace';
        ctx.fillText(value, x, 417);
      });
      ctx.strokeStyle = theme === 'dark' ? '#252525' : '#e6e6e6';
      ctx.beginPath();
      ctx.moveTo(60, 475);
      ctx.lineTo(1140, 475);
      ctx.stroke();
      ctx.fillStyle = muted;
      ctx.font = '16px "JetBrains Mono", monospace';
      ctx.fillText(
        hasHash
          ? 'RELATED TRANSACTION · VERIFY EXECUTION IN EXPLORER'
          : 'PERP POOL · NO LINKED TRANSACTION',
        60,
        530
      );
      ctx.font = '15px "JetBrains Mono", monospace';
      ctx.fillText(hasHash ? position.openTxHash : position.poolAddress, 60, 568);
      ctx.fillText('dreamDEX Perps Builder Bounty · Snapshot, not proof of realized PnL', 60, 627);
    };
    draw();
    void document.fonts.ready.then(draw);
    return () => {
      active = false;
    };
  }, [isOpen, position, canvas, theme, hasHash]);

  const download = () => {
    if (!canvas || !position) return;
    const link = document.createElement('a');
    link.download = `LucidKeeper-${position.marketSymbol}-Position.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    toast.success('Position card downloaded');
  };
  const copy = async () => {
    try {
      if (!canvas) return;
      const blob = await new Promise<Blob>((resolve, reject) =>
        canvas.toBlob(
          (value) => (value ? resolve(value) : reject(new Error('Image unavailable'))),
          'image/png'
        )
      );
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
      setCopied(true);
      toast.success('Position card copied');
    } catch {
      toast.error('Clipboard unavailable. Download the PNG instead.');
    }
  };
  const text = position
    ? `My ${position.isLong ? 'long' : 'short'} ${position.marketSymbol}-PERP position on @DreamDEXSomnia, Somnia Tokyo testnet, viewed with LucidKeeper.${hasHash ? `\nRelated transaction: https://explorer.testnet.somnia.network/tokyo/tx/${position.openTxHash}` : ''}\n#dreamDEX #SomniaTokyo #LucidKeeper`
    : '';
  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title="Share position"
      description="Export the current position snapshot. A related transaction link does not independently verify the position or its performance."
    >
      <div className="order-types" role="group" aria-label="Position card theme">
        {(['dark', 'light'] as const).map((value) => (
          <button key={value} aria-pressed={theme === value} onClick={() => setTheme(value)}>
            {value === 'dark' ? 'Dark' : 'Light'}
          </button>
        ))}
      </div>
      <canvas
        ref={setCanvas}
        width={1200}
        height={675}
        className="w-full h-auto"
        role="img"
        aria-label={`${position?.marketSymbol || ''} position snapshot with entry, quantity, mark price and related transaction`}
      />
      <div className="flex flex-wrap gap-2 mt-5">
        <button className="button" onClick={download}>
          Download PNG
        </button>
        <button className="button" onClick={() => void copy()}>
          {copied ? 'Copied' : 'Copy image'}
        </button>
        <a
          className="button button-primary"
          href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`}
          target="_blank"
          rel="noreferrer"
        >
          Share on X ↗
        </a>
      </div>
    </Modal>
  );
}
