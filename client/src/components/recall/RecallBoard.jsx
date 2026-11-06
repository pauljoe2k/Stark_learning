import { MapPin } from 'lucide-react';

export default function RecallBoard({ place, flags, outcomes, activeId, onPick, hidden }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
      <div className="relative">
        <img src={place.imageUrl} alt={`${place.name} for recall`} className="block h-auto max-h-[65vh] w-full object-contain" />
        {flags.map((flag, index) => {
          const result = outcomes[flag.id];
          const color = result === 'green' ? 'bg-emerald-600' : result === 'red' ? 'bg-red-700' : 'bg-moss';
          return (
            <button
              key={flag.id}
              type="button"
              onClick={() => onPick(flag)}
              disabled={Boolean(result) || Boolean(activeId)}
              aria-label={result ? `Flag ${index + 1}: ${result === 'green' ? 'recalled' : 'missed'}` : `Recall flag ${index + 1}`}
              className={`recall-flag-marker absolute flex min-h-11 min-w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white text-white shadow-lg disabled:cursor-not-allowed disabled:opacity-90 ${color} ${activeId === flag.id ? 'ring-4 ring-yellow-300' : ''}`}
              style={{ left: `${flag.x}%`, top: `${flag.y}%` }}
            >
              {result ? <span className="text-xs font-bold">{result === 'green' ? '✓' : '✕'}</span> : hidden ? <span className="text-xs font-bold">{index + 1}</span> : <MapPin aria-hidden="true" size={20} />}
            </button>
          );
        })}
      </div>
    </div>
  );
}