import { Link } from 'react-router-dom';
import { CheckCircle2, RotateCcw, XCircle } from 'lucide-react';

export default function RecallSummary({ place, flags, outcomes, summary, onRestart }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-bold uppercase tracking-wide text-moss">Round complete</p>
          <h2 className="mt-1 text-2xl font-bold">{place.name}</h2>
        </div>
        <div className="flex gap-3 text-sm font-semibold">
          <span className="inline-flex items-center gap-1 text-emerald-800"><CheckCircle2 size={17} /> {summary.green} recalled</span>
          <span className="inline-flex items-center gap-1 text-red-800"><XCircle size={17} /> {summary.red} revisit</span>
        </div>
      </div>
      <div className="mt-4">
        <p className="mb-2 text-sm text-slate-600">Heatmap: green means recalled in time; red means revisit that idea.</p>
        <div className="max-w-3xl">
          <div className="relative overflow-hidden rounded-xl">
            <img src={place.imageUrl} alt={`${place.name} recall heatmap`} className="block w-full" />
            {flags.map((flag, index) => <span key={flag.id} className={`absolute flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white text-sm font-bold text-white shadow ${outcomes[flag.id] === 'green' ? 'bg-emerald-600' : 'bg-red-700'}`} style={{ left: `${flag.x}%`, top: `${flag.y}%` }}>{outcomes[flag.id] === 'green' ? '✓' : '✕'}</span>)}
          </div>
        </div>
      </div>
      <ol className="mt-4 divide-y divide-slate-100">
        {flags.map((flag, index) => <li key={flag.id} className="flex items-start gap-3 py-3">
          {outcomes[flag.id] === 'green' ? <CheckCircle2 className="mt-0.5 shrink-0 text-emerald-700" size={18} /> : <XCircle className="mt-0.5 shrink-0 text-red-700" size={18} />}
          <div><p className="font-semibold">{index + 1}. {flag.emoji ? `${flag.emoji} ` : ''}{flag.title}</p><p className="mt-1 text-sm text-slate-600">{flag.note || 'No note'}</p><p className="mt-1 text-xs font-semibold">{outcomes[flag.id] === 'green' ? 'Recalled in time' : 'Missed or timed out'}</p></div>
        </li>)}
      </ol>
      <div className="mt-5 flex flex-wrap gap-2">
        <button type="button" onClick={onRestart} className="inline-flex items-center gap-2 rounded-xl bg-moss px-4 py-2.5 font-semibold text-white"><RotateCcw size={17} /> Start another round</button>
        <Link to="/palace" className="rounded-xl border border-slate-300 px-4 py-2.5 font-semibold hover:bg-paper">Review your places</Link>
      </div>
    </section>
  );
}