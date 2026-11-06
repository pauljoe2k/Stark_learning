import { MapPin } from 'lucide-react';

export default function FlagMarker({ flag, selected, onClick }) {
  return (
    <button
      type="button"
      data-flag-marker
      aria-label={`Flag: ${flag.title}`}
      aria-pressed={selected}
      title={flag.title}
      onClick={(event) => {
        event.stopPropagation();
        onClick(flag);
      }}
      className={`absolute z-10 flex min-h-10 min-w-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 shadow-md transition ${
        selected ? 'scale-110 border-ink bg-white ring-4 ring-moss/40' : 'border-white bg-moss text-white hover:scale-110'
      }`}
      style={{ left: `${flag.x}%`, top: `${flag.y}%` }}
    >
      {flag.emoji ? (
        <span aria-hidden="true" className="text-xl leading-none">{flag.emoji}</span>
      ) : (
        <MapPin aria-hidden="true" size={20} />
      )}
    </button>
  );
}