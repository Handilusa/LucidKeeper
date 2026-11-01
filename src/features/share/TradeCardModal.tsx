import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Download, Copy } from 'lucide-react';
import type { PositionItem } from '../portfolio/PositionsTable';
import { Modal } from '@/components/Modal';
import { formatDynamicPrice } from '@/lib/math/format';
import './share.css';

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  if (typeof ctx.roundRect === 'function') {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
  } else {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }
}

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
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [brandImg, setBrandImg] = useState<HTMLImageElement | null>(null);

  // Preload official LucidKeeper logo asset
  useEffect(() => {
    const img = new Image();
    img.src = '/assets/brand/lucidkeeper-neon.png';
    img.onload = () => {
      setBrandImg(img);
    };
  }, []);

  const hasHash = !!position?.openTxHash && /^0x[0-9a-fA-F]{64}$/.test(position.openTxHash);
  const entryPrice = position ? `${formatDynamicPrice(position.entryPrice)} USDso` : 'Unavailable';
  const quantity = position ? `${position.size} ${position.marketSymbol}` : 'Unavailable';
  const markPrice =
    position && position.markPrice > 0
      ? `${formatDynamicPrice(position.markPrice)} USDso`
      : 'Unavailable';

  // Derived metrics
  const pnl =
    position && position.markPrice > 0
      ? (position.markPrice - position.entryPrice) * position.size * (position.isLong ? 1 : -1)
      : null;
  const notional = position
    ? position.size * (position.markPrice > 0 ? position.markPrice : position.entryPrice)
    : null;
  const leverage = position?.initialMarginBps ? Math.round(10000 / position.initialMarginBps) : 10;
  const margin = notional !== null && leverage ? notional / leverage : null;
  const roe = pnl !== null && margin && margin > 0 ? (pnl / margin) * 100 : null;

  const liqPrice =
    position?.liquidationPrice && position.liquidationPrice > 0
      ? `${formatDynamicPrice(position.liquidationPrice)} USDso`
      : leverage === 1
        ? 'Safe (1x)'
        : '—';
  const openedAt = position?.readBlock ? `Block #${position.readBlock}` : '—';
  const posId = position?.id
    ? position.id.length > 12
      ? `${position.id.slice(0, 6)}...${position.id.slice(-4)}`
      : position.id
    : '—';

  useEffect(() => {
    if (!isOpen || !position || !canvas) return;
    let active = true;

    const draw = () => {
      if (!active) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const isDark = theme === 'dark';
      const width = 1200;
      const height = 675;

      // Color scheme
      const textFg = isDark ? '#ffffff' : '#0f0e17';
      const textMuted = isDark ? '#8e87a2' : '#6e6784';
      const textSub = isDark ? '#9c94b2' : '#6e6784';
      const divColor = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)';
      const reticleColor = isDark ? '#9333ea' : '#771be8';

      // 1. Background gradient
      const bg = ctx.createLinearGradient(0, 0, width, height);
      if (isDark) {
        bg.addColorStop(0, '#0e0b19');
        bg.addColorStop(0.5, '#0a0913');
        bg.addColorStop(1, '#080710');
      } else {
        bg.addColorStop(0, '#fdfcfe');
        bg.addColorStop(0.5, '#f7f5fc');
        bg.addColorStop(1, '#f0edf8');
      }
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, width, height);

      // 2. Radial purple glow behind radar reticle
      const cx = 960;
      const cy = 155;
      const radial = ctx.createRadialGradient(cx, cy, 10, cx, cy, 270);
      if (isDark) {
        radial.addColorStop(0, 'rgba(168, 85, 247, 0.22)');
        radial.addColorStop(0.5, 'rgba(124, 58, 237, 0.08)');
        radial.addColorStop(1, 'rgba(14, 11, 25, 0)');
      } else {
        radial.addColorStop(0, 'rgba(168, 85, 247, 0.12)');
        radial.addColorStop(0.6, 'rgba(124, 58, 237, 0.04)');
        radial.addColorStop(1, 'rgba(240, 237, 248, 0)');
      }
      ctx.fillStyle = radial;
      ctx.beginPath();
      ctx.arc(cx, cy, 270, 0, Math.PI * 2);
      ctx.fill();

      // 3. Left glowing accent pill bar
      const accent = ctx.createLinearGradient(16, 32, 16, height - 32);
      accent.addColorStop(0, '#c084fc');
      accent.addColorStop(0.5, '#9333ea');
      accent.addColorStop(1, '#771be8');
      ctx.fillStyle = accent;
      drawRoundedRect(ctx, 16, 28, 8, height - 56, 4);
      ctx.fill();

      // 4. Subtle outer card border
      ctx.strokeStyle = isDark ? 'rgba(168, 85, 247, 0.22)' : 'rgba(119, 27, 232, 0.16)';
      ctx.lineWidth = 1;
      drawRoundedRect(ctx, 1, 1, width - 2, height - 2, 16);
      ctx.stroke();

      // 5. Radar reticle on the right
      ctx.save();
      ctx.strokeStyle = isDark ? 'rgba(168, 85, 247, 0.35)' : 'rgba(119, 27, 232, 0.25)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(cx, cy, 112, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = isDark ? 'rgba(168, 85, 247, 0.22)' : 'rgba(119, 27, 232, 0.15)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(cx, cy, 78, 0, Math.PI * 2);
      ctx.stroke();

      // Crosshair tick marks
      ctx.strokeStyle = isDark ? 'rgba(168, 85, 247, 0.65)' : 'rgba(119, 27, 232, 0.55)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      // Top tick
      ctx.moveTo(cx, cy - 128);
      ctx.lineTo(cx, cy - 96);
      // Bottom tick
      ctx.moveTo(cx, cy + 96);
      ctx.lineTo(cx, cy + 128);
      // Left tick
      ctx.moveTo(cx - 128, cy);
      ctx.lineTo(cx - 96, cy);
      // Right tick
      ctx.moveTo(cx + 96, cy);
      ctx.lineTo(cx + 128, cy);
      ctx.stroke();

      // Center LucidKeeper LK Emblem in reticle
      if (brandImg && brandImg.complete) {
        ctx.save();
        ctx.shadowColor = isDark ? 'rgba(168, 85, 247, 0.55)' : 'rgba(119, 27, 232, 0.3)';
        ctx.shadowBlur = 16;
        ctx.drawImage(brandImg, cx - 52, cy - 42, 104, 84);
        ctx.restore();
      } else {
        // Fallback vector shield
        ctx.strokeStyle = reticleColor;
        ctx.lineWidth = 2;
        ctx.strokeRect(cx - 24, cy - 24, 48, 48);
      }
      ctx.restore();

      // 6. Top-Left Brand Section
      if (brandImg && brandImg.complete) {
        ctx.drawImage(brandImg, 56, 44, 38, 31);
      }
      ctx.fillStyle = textFg;
      ctx.font = 'bold 24px Syne, "Plus Jakarta Sans", sans-serif';
      ctx.fillText('LucidKeeper', 104, 62);

      ctx.fillStyle = textSub;
      ctx.font = '600 11px "JetBrains Mono", monospace';
      ctx.fillText('SOMNIA · TESTNET', 104, 78);

      // 7. Position Title
      ctx.fillStyle = textMuted;
      ctx.font = '600 12px "JetBrains Mono", monospace';
      ctx.fillText('PERPETUALS POSITION', 56, 138);

      ctx.fillStyle = textFg;
      ctx.font = 'bold 48px Syne, "Plus Jakarta Sans", sans-serif';
      ctx.fillText(`${position.marketSymbol}-PERP`, 56, 196);

      // 8. Badges: SHORT/LONG + CROSS MARGIN
      const sideLabel = position.isLong ? 'LONG' : 'SHORT';
      const sideW = position.isLong ? 76 : 82;
      const sideBg = position.isLong
        ? (isDark ? 'rgba(34, 197, 94, 0.16)' : '#dcfce7')
        : (isDark ? 'rgba(239, 68, 68, 0.16)' : '#fee2e2');
      const sideBorder = position.isLong
        ? (isDark ? 'rgba(34, 197, 94, 0.4)' : '#86efac')
        : (isDark ? 'rgba(239, 68, 68, 0.4)' : '#fca5a5');
      const sideText = position.isLong
        ? (isDark ? '#4ade80' : '#15803d')
        : (isDark ? '#f87171' : '#b91c1c');

      // Side badge box
      ctx.fillStyle = sideBg;
      drawRoundedRect(ctx, 56, 222, sideW, 28, 6);
      ctx.fill();
      ctx.strokeStyle = sideBorder;
      ctx.lineWidth = 1;
      drawRoundedRect(ctx, 56, 222, sideW, 28, 6);
      ctx.stroke();

      ctx.fillStyle = sideText;
      ctx.font = 'bold 13px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(sideLabel, 56 + sideW / 2, 241);

      // Cross margin badge box
      const crossX = 56 + sideW + 10;
      const crossW = 136;
      ctx.fillStyle = isDark ? 'rgba(168, 85, 247, 0.18)' : '#f3e8ff';
      drawRoundedRect(ctx, crossX, 222, crossW, 28, 6);
      ctx.fill();
      ctx.strokeStyle = isDark ? 'rgba(168, 85, 247, 0.4)' : '#d8b4fe';
      ctx.lineWidth = 1;
      drawRoundedRect(ctx, crossX, 222, crossW, 28, 6);
      ctx.stroke();

      ctx.fillStyle = isDark ? '#c084fc' : '#7e22ce';
      ctx.font = 'bold 13px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText('CROSS MARGIN', crossX + crossW / 2, 241);
      ctx.textAlign = 'left';

      // 9. Primary Stats Row
      // Metric 1: ENTRY PRICE
      ctx.fillStyle = textMuted;
      ctx.font = '600 12px "JetBrains Mono", monospace';
      ctx.fillText('ENTRY PRICE', 56, 308);

      ctx.fillStyle = textFg;
      ctx.font = 'bold 26px "JetBrains Mono", monospace';
      const entryNum = formatDynamicPrice(position.entryPrice);
      ctx.fillText(entryNum, 56, 348);
      const entryNumW = ctx.measureText(entryNum).width;
      ctx.fillStyle = textSub;
      ctx.font = '16px "JetBrains Mono", monospace';
      ctx.fillText(' USDso', 56 + entryNumW, 348);

      // Metric 2: QUANTITY
      ctx.fillStyle = textMuted;
      ctx.font = '600 12px "JetBrains Mono", monospace';
      ctx.fillText('QUANTITY', 380, 308);

      ctx.fillStyle = textFg;
      ctx.font = 'bold 26px "JetBrains Mono", monospace';
      const qtyNum = `${position.size}`;
      ctx.fillText(qtyNum, 380, 348);
      const qtyNumW = ctx.measureText(qtyNum).width;
      ctx.fillStyle = textSub;
      ctx.font = '16px "JetBrains Mono", monospace';
      ctx.fillText(` ${position.marketSymbol}`, 380 + qtyNumW, 348);

      // Vertical separator
      ctx.strokeStyle = divColor;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(680, 305);
      ctx.lineTo(680, 355);
      ctx.stroke();

      // Metric 3: MARK PRICE
      ctx.fillStyle = textMuted;
      ctx.font = '600 12px "JetBrains Mono", monospace';
      ctx.fillText('MARK PRICE', 720, 308);

      ctx.fillStyle = textFg;
      ctx.font = 'bold 26px "JetBrains Mono", monospace';
      const markNum =
        position.markPrice > 0 ? formatDynamicPrice(position.markPrice) : 'Unavailable';
      ctx.fillText(markNum, 720, 348);
      if (position.markPrice > 0) {
        const markNumW = ctx.measureText(markNum).width;
        ctx.fillStyle = textSub;
        ctx.font = '16px "JetBrains Mono", monospace';
        ctx.fillText(' USDso', 720 + markNumW, 348);
      }

      // 10. Horizontal separator line
      ctx.strokeStyle = divColor;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(56, 388);
      ctx.lineTo(1144, 388);
      ctx.stroke();

      // 11. Secondary Telemetry Grid (5 columns, 2 rows)
      const cols = [56, 240, 420, 600, 800];

      // Grid Row 1 (y labels: 422, y values: 452)
      // Col 1: UNREALIZED PnL
      ctx.fillStyle = textMuted;
      ctx.font = '600 11px "JetBrains Mono", monospace';
      ctx.fillText('UNREALIZED PnL', cols[0], 422);
      if (pnl !== null) {
        ctx.fillStyle = pnl >= 0 ? '#4ade80' : '#f87171';
        ctx.font = 'bold 16px "JetBrains Mono", monospace';
        ctx.fillText(`${pnl >= 0 ? '+' : ''}${pnl.toFixed(2)} USDso`, cols[0], 452);
      } else {
        ctx.fillStyle = textMuted;
        ctx.font = '16px "JetBrains Mono", monospace';
        ctx.fillText('—', cols[0], 452);
      }

      // Col 2: ROE
      ctx.fillStyle = textMuted;
      ctx.font = '600 11px "JetBrains Mono", monospace';
      ctx.fillText('ROE', cols[1], 422);
      if (roe !== null) {
        ctx.fillStyle = roe >= 0 ? '#4ade80' : '#f87171';
        ctx.font = 'bold 16px "JetBrains Mono", monospace';
        ctx.fillText(`${roe >= 0 ? '+' : ''}${roe.toFixed(2)}%`, cols[1], 452);
      } else {
        ctx.fillStyle = textMuted;
        ctx.font = '16px "JetBrains Mono", monospace';
        ctx.fillText('—', cols[1], 452);
      }

      // Col 3: LEVERAGE
      ctx.fillStyle = textMuted;
      ctx.font = '600 11px "JetBrains Mono", monospace';
      ctx.fillText('LEVERAGE', cols[2], 422);
      ctx.fillStyle = textFg;
      ctx.font = 'bold 16px "JetBrains Mono", monospace';
      ctx.fillText(leverage ? `${leverage}x` : '—', cols[2], 452);

      // Col 4: MARGIN
      ctx.fillStyle = textMuted;
      ctx.font = '600 11px "JetBrains Mono", monospace';
      ctx.fillText('MARGIN', cols[3], 422);
      ctx.fillStyle = textFg;
      ctx.font = 'bold 16px "JetBrains Mono", monospace';
      ctx.fillText(margin !== null ? `${margin.toFixed(2)} USDso` : '—', cols[3], 452);

      // Col 5: LIQUIDATION PRICE
      ctx.fillStyle = textMuted;
      ctx.font = '600 11px "JetBrains Mono", monospace';
      ctx.fillText('LIQUIDATION PRICE', cols[4], 422);
      ctx.fillStyle = textFg;
      ctx.font = 'bold 16px "JetBrains Mono", monospace';
      ctx.fillText(liqPrice, cols[4], 452);

      // Grid Row 2 (y labels: 506, y values: 536)
      // Col 1: NOTIONAL VALUE
      ctx.fillStyle = textMuted;
      ctx.font = '600 11px "JetBrains Mono", monospace';
      ctx.fillText('NOTIONAL VALUE', cols[0], 506);
      ctx.fillStyle = textFg;
      ctx.font = 'bold 16px "JetBrains Mono", monospace';
      ctx.fillText(notional !== null ? `${notional.toFixed(2)} USDso` : '—', cols[0], 536);

      // Col 2: TP / SL
      ctx.fillStyle = textMuted;
      ctx.font = '600 11px "JetBrains Mono", monospace';
      ctx.fillText('TP / SL', cols[1], 506);
      ctx.fillStyle = textMuted;
      ctx.font = '16px "JetBrains Mono", monospace';
      ctx.fillText('—', cols[1], 536);

      // Col 3: OPENED AT
      ctx.fillStyle = textMuted;
      ctx.font = '600 11px "JetBrains Mono", monospace';
      ctx.fillText('OPENED AT', cols[2], 506);
      ctx.fillStyle = textFg;
      ctx.font = 'bold 16px "JetBrains Mono", monospace';
      ctx.fillText(openedAt, cols[2], 536);

      // Col 4: POSITION ID
      ctx.fillStyle = textMuted;
      ctx.font = '600 11px "JetBrains Mono", monospace';
      ctx.fillText('POSITION ID', cols[3], 506);
      ctx.fillStyle = textFg;
      ctx.font = 'bold 16px "JetBrains Mono", monospace';
      ctx.fillText(posId, cols[3], 536);

      // Col 5: Disclaimers / Status
      // Line 1: (i) Snapshot • not proof of realized PnL
      const iconX1 = cols[4] + 8;
      const iconY1 = 502;
      ctx.strokeStyle = textMuted;
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.arc(iconX1, iconY1, 6.5, 0, Math.PI * 2);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(iconX1, iconY1 - 2.8, 0.75, 0, Math.PI * 2);
      ctx.fillStyle = textMuted;
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(iconX1, iconY1 - 1);
      ctx.lineTo(iconX1, iconY1 + 3.2);
      ctx.stroke();

      ctx.fillStyle = textMuted;
      ctx.font = '11px "JetBrains Mono", monospace';
      ctx.fillText('Snapshot • not proof of realized PnL', iconX1 + 14, 506);

      // Line 2: (/) No linked transaction OR linked transaction
      const iconX2 = cols[4] + 8;
      const iconY2 = 532;
      ctx.strokeStyle = textMuted;
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.arc(iconX2, iconY2, 6.5, 0, Math.PI * 2);
      ctx.stroke();

      if (hasHash) {
        // Link icon diagonal
        ctx.beginPath();
        ctx.moveTo(iconX2 - 3.5, iconY2 + 3.5);
        ctx.lineTo(iconX2 + 3.5, iconY2 - 3.5);
        ctx.stroke();
        ctx.fillStyle = textMuted;
        ctx.font = '11px "JetBrains Mono", monospace';
        ctx.fillText(
          `Tx: ${position.openTxHash.slice(0, 10)}...${position.openTxHash.slice(-8)}`,
          iconX2 + 14,
          536
        );
      } else {
        // Slash circle
        ctx.beginPath();
        ctx.moveTo(iconX2 - 4.2, iconY2 - 4.2);
        ctx.lineTo(iconX2 + 4.2, iconY2 + 4.2);
        ctx.stroke();
        ctx.fillStyle = textMuted;
        ctx.font = '11px "JetBrains Mono", monospace';
        ctx.fillText('No linked transaction', iconX2 + 14, 536);
      }
    };

    draw();
    void document.fonts.ready.then(draw);
    return () => {
      active = false;
    };
  }, [
    isOpen,
    position,
    canvas,
    theme,
    brandImg,
    hasHash,
    entryPrice,
    quantity,
    markPrice,
    pnl,
    notional,
    leverage,
    margin,
    roe,
    liqPrice,
    openedAt,
    posId,
  ]);

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
      toast.success('Position card copied');
    } catch {
      toast.error('Clipboard unavailable. Download the PNG instead.');
    }
  };

  const handleShareOnX = async () => {
    if (!canvas || !position) return;
    try {
      const blob = await new Promise<Blob>((resolve, reject) =>
        canvas.toBlob(
          (value) => (value ? resolve(value) : reject(new Error('Image unavailable'))),
          'image/png'
        )
      );

      // If browser supports mobile Web Share API with files
      const file = new File([blob], `LucidKeeper-${position.marketSymbol}-Position.png`, {
        type: 'image/png',
      });
      if (
        typeof navigator !== 'undefined' &&
        navigator.canShare &&
        navigator.canShare({ files: [file] })
      ) {
        try {
          await navigator.share({
            files: [file],
            text,
            title: `LucidKeeper ${position.marketSymbol}-PERP Position`,
          });
          toast.success('Position card shared');
          return;
        } catch (err) {
          if ((err as Error)?.name === 'AbortError') return;
        }
      }

      // Copy image directly to clipboard so user can instantly Ctrl+V into tweet
      if (navigator.clipboard && window.ClipboardItem) {
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
        toast.success('¡Imagen copiada al portapapeles! Pégala con Ctrl + V en tu tweet', {
          duration: 6000,
        });
      }
    } catch {
      // Proceed to open X
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
      contentClassName="modal-share-card"
    >
      <div className="share-theme-tabs" role="group" aria-label="Position card theme">
        {(['dark', 'light'] as const).map((value) => (
          <button
            key={value}
            type="button"
            className={`share-theme-tab ${theme === value ? 'active' : ''}`}
            aria-pressed={theme === value}
            onClick={() => setTheme(value)}
          >
            {value === 'dark' ? 'Dark' : 'Light'}
          </button>
        ))}
      </div>

      <div className="share-canvas-container">
        <canvas
          ref={setCanvas}
          width={1200}
          height={675}
          className="share-canvas"
          role="img"
          aria-label={
            position
              ? `${position.marketSymbol}-PERP ${position.isLong ? 'long' : 'short'} cross-margin position snapshot on Somnia Tokyo testnet, chain 50383. Entry price: ${entryPrice}. Quantity: ${quantity}. Mark price: ${markPrice}. ${hasHash ? `Related transaction: ${position.openTxHash}` : `Perp pool: ${position.poolAddress}; no linked transaction`}. Snapshot, not proof of realized PnL.`
              : 'Position snapshot unavailable'
          }
        />
      </div>

      <div className="share-actions-row">
        <div className="share-actions-buttons">
          <button type="button" className="button-share-primary" onClick={download}>
            <Download size={16} aria-hidden="true" />
            <span>Download PNG</span>
          </button>
          <button type="button" className="button-share-secondary" onClick={() => void copy()}>
            <Copy size={16} aria-hidden="true" />
            <span>Copy image</span>
          </button>
          <a
            className="button-share-secondary"
            href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`}
            target="_blank"
            rel="noreferrer"
            onClick={() => void handleShareOnX()}
          >
            <svg
              className="w-4 h-4 fill-current inline-block"
              viewBox="0 0 24 24"
              width="15"
              height="15"
              aria-hidden="true"
            >
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
            <span>Share on X</span>
          </a>
        </div>
        <div className="share-resolution-tag">PNG • 2x resolution</div>
      </div>
    </Modal>
  );
}
