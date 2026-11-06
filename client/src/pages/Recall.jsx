import { useCallback, useEffect, useRef, useState } from 'react';
import { AlertCircle, Check, Clock3, Eye, X } from 'lucide-react';
import RecallBoard from '../components/recall/RecallBoard.jsx';
import RecallSetup from '../components/recall/RecallSetup.jsx';
import RecallSummary from '../components/recall/RecallSummary.jsx';
import { useRecallTimer } from '../hooks/useRecallTimer.js';
import {
  useFinishRecall,
  useRevealRecall,
  useSaveRecallResult,
  useStartRecall,
} from '../hooks/useStudy.js';

export default function Recall() {
  const startRound = useStartRecall();
  const [round, setRound] = useState(null);
  const [selectedFlag, setSelectedFlag] = useState(null);
  const [answer, setAnswer] = useState(null);
  const [answerVisible, setAnswerVisible] = useState(false);
  const [outcomes, setOutcomes] = useState({});
  const [summary, setSummary] = useState(null);
  const [errorText, setErrorText] = useState('');
  const [saving, setSaving] = useState(false);
  const startedAt = useRef(0);
  const answerPanelRef = useRef(null);
  const reveal = useRevealRecall(round?.roundId);
  const saveResult = useSaveRecallResult(round?.roundId);
  const finishRound = useFinishRecall(round?.roundId);

  const saveFlagResult = useCallback(async (result, secondsTaken) => {
    if (!selectedFlag || saving) return;
    setSaving(true);
    setErrorText('');
    try {
      const saved = await saveResult.mutateAsync({
        flag_id: selectedFlag.id,
        result,
        seconds_taken: secondsTaken,
      });
      setOutcomes((current) => ({ ...current, [selectedFlag.id]: saved.result }));
      setSelectedFlag(null);
      setAnswer(null);
      setAnswerVisible(false);
    } catch (requestError) {
      setErrorText(requestError.message || 'The result could not be saved.');
    } finally {
      setSaving(false);
    }
  }, [selectedFlag, saving, saveResult]);

  const onTimeout = useCallback(() => {
    saveFlagResult('red', round?.time_limit_sec ?? 30);
  }, [saveFlagResult, round?.time_limit_sec]);
  const timeRemaining = useRecallTimer(
    round?.time_limit_sec ?? 30,
    Boolean(selectedFlag && !answerVisible && !reveal.isPending),
    onTimeout,
  );

  useEffect(() => {
    if (!selectedFlag) return;
    answerPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    answerPanelRef.current?.focus({ preventScroll: true });
  }, [selectedFlag?.id]);

  async function start(timeLimit) {
    setErrorText('');
    try {
      const data = await startRound.mutateAsync({ time_limit_sec: timeLimit });
      setRound(data);
      setOutcomes({});
      setSummary(null);
      setSelectedFlag(null);
      setAnswer(null);
      setAnswerVisible(false);
    } catch (requestError) {
      setErrorText(requestError.message || 'Recall could not start.');
    }
  }

  function selectFlag(flag) {
    if (selectedFlag || outcomes[flag.id]) return;
    setErrorText('');
    setSelectedFlag(flag);
    setAnswer(null);
    setAnswerVisible(false);
    startedAt.current = Date.now();
  }

  async function showAnswer() {
    if (!selectedFlag || reveal.isPending) return;
    setErrorText('');
    try {
      const full = await reveal.mutateAsync(selectedFlag.id);
      setAnswer(full);
      setAnswerVisible(true);
    } catch (requestError) {
      setErrorText(requestError.message || 'The answer could not be loaded. Try again.');
    }
  }

  async function grade(result) {
    const elapsed = Math.max(0, Math.floor((Date.now() - startedAt.current) / 1000));
    await saveFlagResult(result, elapsed);
  }

  async function finish() {
    setErrorText('');
    try {
      const result = await finishRound.mutateAsync();
      const nextOutcomes = {};
      for (const item of result.results) nextOutcomes[item.flag_id ?? item.flagId] = item.result;
      setOutcomes(nextOutcomes);
      setSummary(result);
      setSelectedFlag(null);
      setAnswer(null);
      setAnswerVisible(false);
    } catch (requestError) {
      setErrorText(requestError.message || 'The round could not be finished.');
    }
  }

  function reset() {
    setRound(null);
    setSummary(null);
    setOutcomes({});
    setErrorText('');
  }

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-4 py-8 pb-24 sm:px-8 sm:py-10">
      <header className="mb-7">
        <p className="text-sm font-bold uppercase tracking-[0.16em] text-moss">Step 4 · Strengthen recall</p>
        <h1 className="mt-1 text-3xl font-bold">Recall</h1>
        <p className="mt-2 text-slate-600">Return to a familiar place and see which ideas come back to you under time pressure.</p>
      </header>
      {!round && <RecallSetup onStart={start} busy={startRound.isPending} error={errorText || startRound.error?.message} />}
      {round && !summary && <>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div><h2 className="text-xl font-bold">{round.place.name}</h2><p className="text-sm text-slate-600">{Object.keys(outcomes).length} of {round.flags.length} flags completed</p></div>
          <button type="button" disabled={finishRound.isPending || saving} onClick={finish} className="rounded-xl border border-slate-300 px-4 py-2.5 font-semibold hover:bg-white disabled:opacity-50">Finish round</button>
        </div>
        <div className="grid gap-5 lg:grid-cols-[1fr_21rem]">
          <RecallBoard place={round.place} flags={round.flags} outcomes={outcomes} activeId={selectedFlag?.id} onPick={selectFlag} hidden />
          <section ref={answerPanelRef} tabIndex={-1} aria-live="polite" aria-label="Recall answer panel" className="rounded-2xl border border-slate-200 bg-white p-5 outline-none focus-visible:ring-2 focus-visible:ring-moss">
            {!selectedFlag ? (
              <div className="flex min-h-44 flex-col items-center justify-center text-center">
                <Eye aria-hidden="true" className="text-moss" size={32} />
                <p className="mt-3 font-semibold">Choose a numbered flag</p>
                <p className="mt-1 text-sm text-slate-600">Try to recall the idea before revealing it.</p>
              </div>
            ) : <>
              <p className="inline-flex items-center gap-2 rounded-full bg-paper px-3 py-1.5 text-sm font-bold"><Clock3 size={16} /> {timeRemaining}s remaining</p>
              {!answerVisible ? (
                <div className="mt-5">
                  <p className="font-semibold">What idea did you place here?</p>
                  <button type="button" onClick={showAnswer} disabled={reveal.isPending} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-moss px-4 py-2.5 font-semibold text-white disabled:opacity-50">
                    <Eye size={17} /> {reveal.isPending ? 'Loading answer…' : 'Reveal answer'}
                  </button>
                </div>
              ) : (
                <div className="mt-5">
                  <p className="text-xs font-bold uppercase tracking-wide text-moss">Answer</p>
                  <h3 className="mt-1 text-lg font-bold">{answer?.emoji ? `${answer.emoji} ` : ''}{answer?.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{answer?.note || 'No note for this flag.'}</p>
                  <p className="mt-4 text-sm font-semibold">Did you recall this in time?</p>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <button type="button" disabled={saving} onClick={() => grade('green')} className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-700 px-3 py-2.5 font-semibold text-white disabled:opacity-50"><Check size={17} /> Got it</button>
                    <button type="button" disabled={saving} onClick={() => grade('red')} className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-700 px-3 py-2.5 font-semibold text-white disabled:opacity-50"><X size={17} /> Missed</button>
                  </div>
                </div>
              )}
            </>}
            {(errorText || saveResult.error) && <p role="alert" className="mt-4 inline-flex items-start gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-900"><AlertCircle className="mt-0.5 shrink-0" size={17} /> {errorText || saveResult.error?.message}</p>}
          </section>
        </div>
      </>}
      {round && summary && <RecallSummary place={summary.place ?? round.place} flags={summary.flags ?? round.flags} outcomes={outcomes} summary={summary.summary ?? { green: 0, red: 0 }} onRestart={reset} />}
    </main>
  );
}