import { useEffect, useLayoutEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Download } from 'lucide-react';
import { TOUR_STEPS, type TourStep } from '@/lib/tourSteps';
import { downloadUserGuidePdf } from '@/lib/guidePdf';

type Rect = { top: number; left: number; width: number; height: number };

interface Props {
  open: boolean;
  onClose: () => void;
}

const PADDING = 8;
const TOOLTIP_W = 320;
const TOOLTIP_GAP = 14;

function getRect(selector?: string): Rect | null {
  if (!selector) return null;
  const els = Array.from(document.querySelectorAll(selector)) as HTMLElement[];
  for (const el of els) {
    const r = el.getBoundingClientRect();
    if (r.width > 0 && r.height > 0) {
      return { top: r.top, left: r.left, width: r.width, height: r.height };
    }
  }
  return null;
}

function computeTooltipPos(rect: Rect | null, placement: TourStep['placement'], vw: number, vh: number) {
  if (!rect) {
    return {
      top: vh / 2 - 100,
      left: Math.max(12, vw / 2 - TOOLTIP_W / 2),
      arrow: 'none' as const,
    };
  }
  const wantTop = placement === 'top';
  const spaceBelow = vh - (rect.top + rect.height);
  const spaceAbove = rect.top;
  const useTop = wantTop ? spaceAbove > 180 : spaceBelow < 180 && spaceAbove > spaceBelow;

  let left = rect.left + rect.width / 2 - TOOLTIP_W / 2;
  left = Math.max(12, Math.min(left, vw - TOOLTIP_W - 12));

  if (useTop) {
    return { top: rect.top - TOOLTIP_GAP, left, arrow: 'bottom' as const, transform: 'translateY(-100%)' };
  }
  return { top: rect.top + rect.height + TOOLTIP_GAP, left, arrow: 'top' as const };
}

export function OnboardingTour({ open, onClose }: Props) {
  const [index, setIndex] = useState(0);
  const [, force] = useState(0);

  useEffect(() => {
    if (open) setIndex(0);
  }, [open]);

  useLayoutEffect(() => {
    if (!open) return;
    const onResize = () => force(v => v + 1);
    window.addEventListener('resize', onResize);
    window.addEventListener('scroll', onResize, true);
    // re-render uma vez após layout (caso alvo apareça depois)
    const t = window.setTimeout(onResize, 60);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('scroll', onResize, true);
      window.clearTimeout(t);
    };
  }, [open, index]);

  if (!open) return null;

  const step = TOUR_STEPS[index];
  const isFirst = index === 0;
  const isLast = index === TOUR_STEPS.length - 1;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const rect = getRect(step.selector);
  const tip = computeTooltipPos(rect, step.placement, vw, vh);

  const next = () => (isLast ? onClose() : setIndex(i => i + 1));
  const prev = () => setIndex(i => Math.max(0, i - 1));

  // Spotlight via 4 retângulos de overlay (evita SVG complexo)
  const overlay = rect ? (
    <>
      <div className="fixed inset-x-0 top-0 bg-black/70" style={{ height: Math.max(0, rect.top - PADDING) }} />
      <div
        className="fixed left-0 bg-black/70"
        style={{
          top: Math.max(0, rect.top - PADDING),
          width: Math.max(0, rect.left - PADDING),
          height: rect.height + PADDING * 2,
        }}
      />
      <div
        className="fixed right-0 bg-black/70"
        style={{
          top: Math.max(0, rect.top - PADDING),
          left: rect.left + rect.width + PADDING,
          height: rect.height + PADDING * 2,
        }}
      />
      <div
        className="fixed inset-x-0 bg-black/70"
        style={{
          top: rect.top + rect.height + PADDING,
          bottom: 0,
        }}
      />
      {/* halo do alvo */}
      <div
        className="pointer-events-none fixed rounded-xl ring-4 ring-primary/80 shadow-elevated animate-pulse"
        style={{
          top: rect.top - PADDING,
          left: rect.left - PADDING,
          width: rect.width + PADDING * 2,
          height: rect.height + PADDING * 2,
        }}
      />
    </>
  ) : (
    <div className="fixed inset-0 bg-black/80" />
  );

  return createPortal(
    <div className="fixed inset-0 z-[100]" role="dialog" aria-modal="true" aria-label="Tour guiado">
      {overlay}

      <div
        className="fixed z-10 rounded-2xl border border-border bg-card p-4 shadow-elevated animate-fade-in"
        style={{
          top: tip.top,
          left: tip.left,
          width: TOOLTIP_W,
          transform: (tip as any).transform,
        }}
      >
        <div className="mb-1 flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-widest text-primary">
            Passo {index + 1} de {TOUR_STEPS.length}
          </span>
          <button
            onClick={onClose}
            className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground hover:text-foreground"
          >
            Pular
          </button>
        </div>
        <h3 className="font-display text-xl leading-tight text-foreground">{step.title}</h3>
        <p className="mt-1.5 text-sm text-muted-foreground">{step.body}</p>

        {/* progresso */}
        <div className="mt-3 flex gap-1">
          {TOUR_STEPS.map((_, i) => (
            <div
              key={i}
              className={
                'h-1 flex-1 rounded-full ' +
                (i <= index ? 'bg-primary' : 'bg-secondary')
              }
            />
          ))}
        </div>

        <div className="mt-3 flex items-center justify-between gap-2">
          <button
            onClick={prev}
            disabled={isFirst}
            className="rounded-lg px-3 py-2 text-sm font-semibold text-muted-foreground hover:bg-secondary disabled:opacity-40"
          >
            Voltar
          </button>
          <button
            onClick={next}
            className="rounded-lg gradient-primary px-5 py-2 text-sm font-bold text-primary-foreground shadow-elevated active:scale-95 transition-transform"
          >
            {isLast ? 'Concluir' : 'Próximo'}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
