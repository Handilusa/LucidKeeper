import * as Tooltip from '@radix-ui/react-tooltip';
import { Info } from 'lucide-react';
import { useRef, useState } from 'react';

export function HelpTip({ label, children }: { label: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const pointerOpen = useRef<boolean | null>(null);
  return (
    <Tooltip.Provider delayDuration={200}>
      <Tooltip.Root open={open} onOpenChange={setOpen}>
        <Tooltip.Trigger
          asChild
          onPointerDown={() => { pointerOpen.current = open; }}
          onPointerCancel={() => { pointerOpen.current = null; }}
          onKeyDown={() => { pointerOpen.current = null; }}
          onClick={(event) => {
            // Touch focus can open before click; toggle from the pointer-down state.
            event.preventDefault();
            setOpen(!(pointerOpen.current ?? open));
            pointerOpen.current = null;
          }}
        >
          <button
            type="button"
            className="help-trigger"
            aria-label={`About ${label}`}
          >
            <Info size={12} aria-hidden="true" />
          </button>
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content className="help-content" sideOffset={7}>
            {children}
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  );
}
