import { useState } from 'react';
import { Brain, LoaderCircle } from 'lucide-react';

export default function RecallSetup({ onStart, busy, error }) {
  const [timeLimit, setTimeLimit] = useState(30);
  return (
    <section className="mx-auto max-w-xl rounded-3xl border border-slate-200 bg-white p-6 text-center shadow-sm sm:p-9">
      <Brain aria-hidden="true" className="mx-auto text-moss" size={42} />
      <h2 className="mt-4 text-2xl font-bold">Recall from a familiar place</h2>
      <p className="mt-2 text-slate-600">We’ll choose one of your places at random. Flags will be hidden while you recall each idea.</p>
      <label className="mx-auto mt-6 block max-w-xs text-left text-sm font-semibold">Time allowed per flag
        <select value={timeLimit} onChange={(event) => setTimeLimit(Number(event.target.value))} className="mt-1.5 block w-full rounded-xl border border-slate-300 px-3 py-2.5">
          {[10, 20, 30, 45, 60, 90].map((seconds) => <option key={seconds} value={seconds}>{seconds} seconds</option>)}
        </select>
      </label>
      {error && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-900">{error}</p>}
      <button type="button" disabled={busy} onClick={() => onStart(timeLimit)} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-moss px-5 py-3 font-semibold text-white hover:bg-ink disabled:opacity-50">
        {busy && <LoaderCircle aria-hidden="true" size={18} className="animate-spin" />} Start Recall
      </button>
    </section>
  );
}