import { MapPin } from 'lucide-react';
import type { PointerEvent } from 'react';

interface FlagMarkerProps {
  x: number;
  y: number;
  title: string;
  emoji: string | null;
  selected?: boolean;
  result?: 'green' | 'red';
  onSelect: () => void;
  onPointerDown?: (event: PointerEvent<HTMLButtonElement>) => void;
}

export function FlagMarker({
  x,
  y,
  title,
  emoji,
  selected = false,
  result,
  onSelect,
  onPointerDown,
}: FlagMarkerProps) {
  return (
    <button
      type="button"
      className={`flag-marker${selected ? ' selected' : ''}${result ? ` result-${result}` : ''}`}
      style={{ left: `${x}%`, top: `${y}%` }}
      aria-label={`${result ? `${result === 'green' ? 'Recalled' : 'Missed'} flag: ` : 'Flag: '}${title}`}
      aria-pressed={selected}
      onPointerDown={(event) => {
        event.stopPropagation();
        event.currentTarget.setPointerCapture(event.pointerId);
        onPointerDown?.(event);
      }}
      onClick={(event) => {
        event.stopPropagation();
        onSelect();
      }}
    >
      {emoji ? <span aria-hidden="true">{emoji}</span> : <MapPin size={19} strokeWidth={2} aria-hidden="true" />}
      <span className="visually-hidden">{title}</span>
    </button>
  );
}
