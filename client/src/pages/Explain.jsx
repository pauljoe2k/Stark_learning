import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { AlertCircle, CheckCircle2, CircleHelp, Mic, MicOff, RotateCcw, Send, Sparkles } from 'lucide-react';
import { useSpeech } from '../hooks/useSpeech.js';
import { useTopics, useExplainTopic, usePinGaps, useExplanations } from '../hooks/useStudy.js';
import { usePlaces } from '../hooks/usePlaces.js';

const statusNames = {
  covered: 'Covered',
  partial: 'Partial',
  incorrect: 'Incorrect',
  missing: 'Not covered',
};

const statusStyles = {
  covered: 'border-emerald-200 bg-emerald-50 text-emerald-900',
  partial: 'border-amber-200 bg-amber-50 text-amber-900',
  incorrect: 'border-red-200 bg-red-50 text-red-900',
  missing: 'border-slate-200 bg-slate-50 text-slate-700',
};

export default function Explain() {
  const [search, setSearch] = useSearchParams();
  const navigate = useNavigate();
  const { data: topics = [] } = useTopics();
  const { data: places = [] } = usePlaces();
  const [topicId, setTopicId] = useState(search.get('topic') || '');
  const [duration, setDuration] = useState(60);
  const [remaining, setRemaining] = useState(60);
  const [recording, setRecording] = useState(false);
  const [result, setResult] = useState(null);
  const [selectedPlace, setSelectedPlace] = useState('');
  const [errorText, setErrorText] = useState('');
  const speech = useSpeech();
  const explain = useExplainTopic(topicId);
  const pinMutation = usePinGaps();
  const { data: history = [] } = useExplanations(topicId);
  const latest = result ?? history.find((item) => Array.isArray(item.points)) ?? null;
  const intervalRef = useRef(null);
  const selectedTopic = topics.find((topic) => String(topic.id) === String(topicId));

  useEffect(() => {
    if (!topicId && topics.length) setTopicId(String(topics[0].id));
  }, [topics, topicId]);

  useEffect(() => {
    const urlTopic = search.get('topic');
    if (urlTopic) setTopicId(urlTopic);
  }, [search]);

  useEffect(() => () => window.clearInterval(intervalRef.current), []);

  function startTimer() {
    window.clearInterval(intervalRef.current);
    setRemaining(duration);
    setRecording(true);
    speech.start();
    intervalRef.current = window.setInterval(() => {
      setRemaining((value) => {
        if (value <= 1) {
          window.clearInterval(intervalRef.current);
          setRecording(false);
          speech.stop();
          return 0;
        }
        return value - 1;
      });
    }, 1000);
  }

  function stopTimer() {
    window.clearInterval(intervalRef.current);
    setRecording(false);
    speech.stop();
  }

  async function submit(event) {
    event.preventDefault();
    setErrorText('');
    try {
      const response = await explain.mutateAsync({ transcript: speech.transcript, duration_sec: duration });
      setResult(response);
    } catch (requestError) {
      setErrorText(requestError.message || 'Your explanation could not be checked.');
    }
  }

  function retryGaps() {
    speech.clear();
    setResult(null);
    setErrorText('');
  }

  async function handlePinGaps() {
    const gapIds = new Set(latest.points.filter((point) => point.status !== 'covered').map((point) => Number(point.id)));
    const keyPoints = selectedTopic.keyPoints.filter((point) => gapIds.has(Number(point.id)));
    if (!selectedPlace) {
      setErrorText('Add a place in Palace before pinning ideas.');
      return;
    }
    try {
      await pinMutation.mutateAsync({ placeId: Number(selectedPlace), keyPoints });
      navigate(`/palace/${selectedPlace}`);
    } catch (requestError) {
      setErrorText(requestError.message || 'The gaps could not be pinned.');
    }
  }

  if (!topics.length) return (
    <main className="mx-auto max-w-4xl px-4 py-10 pb-24">
      <h1 className="text-3xl font-bold">Explain it back</h1>
      <p className="mt-3 text-slate-600">Create a topic with key points before starting an explanation.</p>
      <Link to="/topic" className="mt-5 inline-flex rounded-xl bg-moss px-4 py-2.5 font-semibold text-white">Go to Topics</Link>
    </main>
  );

  return (
    <main className="mx-auto min-h-screen max-w-5xl px-4 py-8 pb-24 sm:px-8 sm:py-10">
      <header className="mb-7">
        <p className="text-sm font-bold uppercase tracking-[0.16em] text-moss">Step 2 · Find the gaps</p>
        <h1 className="mt-1 text-3xl font-bold">Explain it back</h1>
        <p className="mt-2 text-slate-600">Say what you understand in your own words. You can edit the transcript before checking it.</p>
      </header>
      <div className="grid gap-5 lg:grid-cols-[0.8fr_1.2fr]">
        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <label className="block text-sm font-semibold">Choose a topic
            <select value={topicId} onChange={(event) => { setTopicId(event.target.value); setSearch(event.target.value ? { topic: event.target.value } : {}); setResult(null); }} className="mt-1.5 block w-full rounded-xl border border-slate-300 px-3 py-2.5">
              {topics.map((topic) => <option key={topic.id} value={topic.id}>{topic.title}</option>)}
            </select>
          </label>
          {selectedTopic && <div className="mt-4 rounded-xl bg-paper p-4">
            <p className="font-semibold">{selectedTopic.title}</p>
            <p className="mt-2 line-clamp-5 text-sm leading-6 text-slate-600">{selectedTopic.notes || 'Add notes in Topics to help ground your explanation check.'}</p>
            <p className="mt-3 text-xs font-medium text-slate-500">{selectedTopic.keyPoints?.length ?? 0} key points</p>
          </div>}
          <label className="mt-5 block text-sm font-semibold">Speaking time
            <select value={duration} onChange={(event) => { setDuration(Number(event.target.value)); setRemaining(Number(event.target.value)); }} disabled={recording} className="mt-1.5 block w-full rounded-xl border border-slate-300 px-3 py-2.5">
              {[60, 120, 180, 300].map((value) => <option key={value} value={value}>{value / 60} {value === 60 ? 'minute' : 'minutes'}</option>)}
            </select>
          </label>
          <div className="mt-5 rounded-2xl bg-ink p-5 text-center text-white">
            <p className="text-xs font-semibold uppercase tracking-wider text-white/70">Time remaining</p>
            <p role="timer" className="mt-1 text-5xl font-bold tabular-nums">{Math.floor(remaining / 60)}:{String(remaining % 60).padStart(2, '0')}</p>
            {recording ? (
              <button type="button" onClick={stopTimer} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 font-semibold text-ink"><MicOff size={18} /> Stop recording</button>
            ) : (
              <button type="button" onClick={startTimer} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 font-semibold text-ink"><Mic size={18} /> Start speaking</button>
            )}
          </div>
          {!speech.supported && <p className="mt-3 inline-flex items-start gap-2 text-sm text-slate-600"><CircleHelp className="mt-0.5 shrink-0" size={17} />Voice input is not supported in this browser. Type your explanation below.</p>}
          {speech.error && <p role="status" className="mt-3 text-sm text-amber-900">{speech.error}</p>}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
          <form onSubmit={submit}>
            <label htmlFor="explanation-transcript" className="block text-lg font-bold">Your explanation</label>
            <p className="mt-1 text-sm text-slate-600">Aim for at least 15 words. Review and edit the transcript before you submit.</p>
            <textarea id="explanation-transcript" required rows={10} value={speech.transcript} onChange={(event) => speech.setTranscript(event.target.value)} placeholder="Explain the topic as if you were teaching a friend…" className="mt-4 block w-full resize-y rounded-xl border border-slate-300 px-3 py-3 leading-6" />
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              <span className="text-xs text-slate-500">{speech.transcript.trim().split(/\s+/).filter(Boolean).length} words</span>
              <button type="submit" disabled={explain.isPending || recording} className="inline-flex items-center gap-2 rounded-xl bg-moss px-4 py-2.5 font-semibold text-white hover:bg-ink disabled:opacity-50">
                <Sparkles aria-hidden="true" size={17} /> {explain.isPending ? 'Checking…' : 'Check my explanation'}
              </button>
            </div>
          </form>

          {errorText && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-900">{errorText}</p>}
          {latest && <section aria-label="Explanation results" className="mt-6 border-t border-slate-100 pt-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div><p className="text-xs font-bold uppercase tracking-wide text-moss">Gap map</p><h2 className="mt-1 text-xl font-bold">{latest.score}% score</h2></div>
              <div className="rounded-full bg-paper px-4 py-2 text-sm font-semibold">{latest.points.filter((point) => point.status === 'covered').length} of {latest.points.length} covered</div>
            </div>
            <p className="mt-3 text-sm text-slate-700">{latest.summary}</p>
            {latest.used_fallback && <p className="mt-2 rounded-lg bg-amber-50 p-3 text-xs text-amber-900">AI was unavailable, so this check used a keyword-based fallback. Review it carefully.</p>}
            <ul className="mt-4 space-y-3">
              {latest.points.map((point) => {
                const source = selectedTopic.keyPoints.find((item) => Number(item.id) === Number(point.id));
                const Icon = point.status === 'covered' ? CheckCircle2 : AlertCircle;
                return <li key={point.id} className={`rounded-xl border p-3 ${statusStyles[point.status]}`}>
                  <div className="flex items-start gap-2"><Icon aria-hidden="true" className="mt-0.5 shrink-0" size={18} /><div className="min-w-0">
                    <p className="text-xs font-bold uppercase tracking-wide">{statusNames[point.status]}</p>
                    <p className="mt-1 font-semibold">{source?.text || `Key point ${point.id}`}</p>
                    {point.evidence && <p className="mt-1 text-sm italic">“{point.evidence}”</p>}
                    <p className="mt-1 text-sm">{point.feedback}</p>
                  </div></div>
                </li>;
              })}
            </ul>
            <div className="mt-4 flex flex-wrap gap-2">
              <button type="button" onClick={retryGaps} className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2.5 font-semibold hover:bg-paper"><RotateCcw size={17} /> Retry gaps</button>
              {latest.points.some((point) => point.status !== 'covered') && <>
                <label className="sr-only" htmlFor="pin-place">Choose a place for gap flags</label>
                <select id="pin-place" value={selectedPlace} onChange={(event) => setSelectedPlace(event.target.value)} className="min-w-0 flex-1 rounded-xl border border-slate-300 px-3 py-2">
                  <option value="">Choose palace</option>
                  {places.map((place) => <option key={place.id} value={place.id}>{place.name}</option>)}
                </select>
                <button type="button" disabled={pinMutation.isPending} onClick={handlePinGaps} className="inline-flex items-center gap-2 rounded-xl bg-moss px-4 py-2.5 font-semibold text-white disabled:opacity-50"><Send size={17} /> Pin the gaps</button>
              </>}
            </div>
            {places.length === 0 && latest.points.some((point) => point.status !== 'covered') && <p className="mt-2 text-xs text-slate-600">Add a place in <Link to="/palace" className="underline">Palace</Link> before pinning gaps.</p>}
          </section>}
        </section>
      </div>
    </main>
  );
}