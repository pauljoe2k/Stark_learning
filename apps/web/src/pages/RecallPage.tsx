import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle, Check, Clock3, Download, Eye, Mic, RotateCcw, WifiOff, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api, type OfflineReviewPlace, type RecallCompletion, type RecallRound } from '../api';
import { useAuth } from '../auth';
import { offlineReviewKey, parseOfflineReviewSnapshot, type OfflineReviewSnapshot } from '../lib/offline-review';

type RecallAnswer = { id: number; title: string; note: string | null; emoji: string | null; timeLimitSec: number };
type ResultMap = Record<number, 'green' | 'red'>;

function readOfflineSnapshot(userId: number): OfflineReviewSnapshot | undefined {
  try {
    return parseOfflineReviewSnapshot(localStorage.getItem(offlineReviewKey(userId))) ?? undefined;
  } catch {
    return undefined;
  }
}

function OfflineReview({ places, onExit }: { places: OfflineReviewPlace[]; onExit: () => void }) {
  const [placeId, setPlaceId] = useState(places[0]?.id ?? 0);
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const place = places.find((item) => item.id === placeId);
  const flag = place?.flags[index];

  function moveNext() {
    setRevealed(false);
    setIndex((current) => current + 1);
  }

  return (
    <section className="recall-card">
      <div className="recall-section-heading">
        <div><span className="eyebrow">OFFLINE REVIEW</span><h2>Review without a connection</h2></div>
        <button type="button" className="secondary-button" onClick={onExit}>Back to Recall</button>
      </div>
      <p className="recall-muted"><WifiOff size={15} aria-hidden="true" /> Your downloaded review set stays on this device.</p>
      {places.length > 1 && (
        <label className="recall-label">Place
          <select value={placeId} onChange={(event) => { setPlaceId(Number(event.target.value)); setIndex(0); setRevealed(false); }}>
            {places.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}
          </select>
        </label>
      )}
      {!flag ? (
        <div className="recall-empty">
          <Check size={26} aria-hidden="true" />
          <h3>Review set complete</h3>
          <p>You've reviewed every saved idea for {place?.name ?? 'this place'}.</p>
          <button type="button" className="primary-button" onClick={() => { setIndex(0); setRevealed(false); }}>Review again</button>
        </div>
      ) : (
        <article className="offline-flashcard" aria-live="polite">
          <p className="eyebrow">{place?.name} · FLAG {index + 1} OF {place.flags.length}</p>
          {!revealed ? (
            <>
              <h3>What idea belongs at this flag?</h3>
              <p>Think of the answer before revealing it.</p>
              <button type="button" className="primary-button" onClick={() => setRevealed(true)}><Eye size={17} /> Reveal answer</button>
            </>
          ) : (
            <>
              <h3>{flag.emoji ? `${flag.emoji} ` : ''}{flag.title}</h3>
              <p>{flag.note || 'No note saved for this flag.'}</p>
              <div className="recall-actions">
                <button type="button" className="secondary-button" onClick={moveNext}>Review again</button>
                <button type="button" className="primary-button" onClick={moveNext}><Check size={17} /> Got it</button>
              </div>
            </>
          )}
        </article>
      )}
    </section>
  );
}

function DueReviewQueue({ token }: { token: string }) {
  const queryClient = useQueryClient();
  const [revealed, setRevealed] = useState<number | null>(null);
  const [errorText, setErrorText] = useState('');
  const dueQuery = useQuery({
    queryKey: ['due-flags', token],
    queryFn: async () => (await api.dueFlags(token)).flags,
    enabled: navigator.onLine,
  });

  async function grade(flagId: number, gradeValue: 'correct' | 'incorrect') {
    setErrorText('');
    try {
      await api.reviewFlag(token, flagId, gradeValue);
      setRevealed(null);
      await queryClient.invalidateQueries({ queryKey: ['due-flags', token] });
    } catch (error) {
      setErrorText(error instanceof Error ? error.message : 'The review result could not be saved.');
    }
  }

  return (
    <section className="recall-card due-review-card">
      <div className="recall-section-heading">
        <div><span className="eyebrow">SPACED REPETITION</span><h2>Flags due for review</h2></div>
        {dueQuery.data && <span className="recall-count">{dueQuery.data.length} due</span>}
      </div>
      {dueQuery.isPending && <p className="recall-muted">Checking your review schedule…</p>}
      {dueQuery.isError && <p role="alert" className="recall-error"><AlertCircle size={16} /> {dueQuery.error.message}</p>}
      {dueQuery.data?.length === 0 && <p className="recall-muted">Nothing is due right now. New flags appear here when they are ready to review.</p>}
      {dueQuery.data?.slice(0, 5).map((flag) => (
        <article className="due-review-item" key={flag.id}>
          <div><p className="font-semibold">{flag.title}</p><p className="recall-muted">{flag.place.name}</p></div>
          {revealed === flag.id ? (
            <div className="due-review-answer">
              <p>{flag.note || 'No note saved for this flag.'}</p>
              <div className="recall-actions">
                <button type="button" className="secondary-button" onClick={() => void grade(flag.id, 'incorrect')}><X size={15} /> Review again</button>
                <button type="button" className="primary-button" onClick={() => void grade(flag.id, 'correct')}><Check size={15} /> Remembered</button>
              </div>
            </div>
          ) : <button type="button" className="text-button" onClick={() => setRevealed(flag.id)}>Show answer</button>}
        </article>
      ))}
      {dueQuery.data && dueQuery.data.length > 5 && <p className="recall-muted">Showing the first five due flags.</p>}
      {errorText && <p role="alert" className="recall-error">{errorText}</p>}
    </section>
  );
}

export function RecallPage() {
  const { token, user } = useAuth();
  const queryClient = useQueryClient();
  const [timeLimitSec, setTimeLimitSec] = useState(30);
  const [speedMode, setSpeedMode] = useState(false);
  const [round, setRound] = useState<RecallRound | null>(null);
  const [completion, setCompletion] = useState<RecallCompletion | null>(null);
  const [activeFlagId, setActiveFlagId] = useState<number | null>(null);
  const [answer, setAnswer] = useState<RecallAnswer | null>(null);
  const [answerVisible, setAnswerVisible] = useState(false);
  const [remaining, setRemaining] = useState(0);
  const [outcomes, setOutcomes] = useState<ResultMap>({});
  const [transcript, setTranscript] = useState('');
  const [voiceError, setVoiceError] = useState('');
  const [errorText, setErrorText] = useState('');
  const [successText, setSuccessText] = useState('');
  const [busy, setBusy] = useState(false);
  const [offlineMode, setOfflineMode] = useState(false);
  const [isOnline, setIsOnline] = useState(() => navigator.onLine);
  const startedAt = useRef(0);
  const answerPanelRef = useRef<HTMLElement>(null);
  const recognition = useRef<{ start(): void; stop(): void } | null>(null);

  const snapshotKey = user ? offlineReviewKey(user.id) : '';
  const offlineQuery = useQuery({
    queryKey: ['offline-review', token],
    queryFn: async () => {
      if (!token || !user) throw new Error('Sign in to save an offline review set.');
      const { places } = await api.offlineReview(token);
      const snapshot: OfflineReviewSnapshot = { savedAt: new Date().toISOString(), places };
      try {
        localStorage.setItem(snapshotKey, JSON.stringify(snapshot));
      } catch {
        throw new Error('The review set could not be saved on this device. Check available storage and try again.');
      }
      return snapshot;
    },
    enabled: Boolean(token && user),
    initialData: () => user ? readOfflineSnapshot(user.id) : undefined,
    staleTime: 5 * 60_000,
  });
  const offlinePlaces = offlineQuery.data?.places ?? [];

  useEffect(() => {
    const update = () => setIsOnline(navigator.onLine);
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);

  useEffect(() => () => recognition.current?.stop(), []);

  useEffect(() => {
    if (activeFlagId === null) return;
    answerPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    answerPanelRef.current?.focus({ preventScroll: true });
  }, [activeFlagId]);

  const completedCount = Object.keys(outcomes).length;
  const dueCount = useMemo(() => offlineQuery.data?.places.reduce((count, place) => count + place.flags.length, 0) ?? 0, [offlineQuery.data]);

  async function startRound(): Promise<void> {
    if (!token) return;
    setBusy(true);
    setErrorText('');
    setSuccessText('');
    try {
      const nextRound = await api.startRecall(token, { timeLimitSec, speedMode });
      setRound(nextRound);
      setCompletion(null);
      setOutcomes({});
      setActiveFlagId(null);
      setAnswer(null);
      setAnswerVisible(false);
      setTranscript('');
    } catch (error) {
      setErrorText(error instanceof Error ? error.message : 'Recall could not start.');
    } finally {
      setBusy(false);
    }
  }

  const saveGrade = useCallback(async (result: 'green' | 'red', voiceText?: string): Promise<void> => {
    if (!token || !round || activeFlagId === null || busy) return;
    setBusy(true);
    setErrorText('');
    const secondsTaken = Math.floor((Date.now() - startedAt.current) / 1000);
    try {
      const saved = voiceText
        ? (await api.submitRecallVoiceAnswer(token, round.roundId, {
          flagId: activeFlagId,
          transcript: voiceText,
          secondsTaken,
        })).result
        : (await api.saveRecallResult(token, round.roundId, {
          flagId: activeFlagId,
          result,
          secondsTaken,
        })).result;
      setOutcomes((current) => ({ ...current, [activeFlagId]: saved.result }));
      if (voiceText && 'feedback' in saved && typeof saved.feedback === 'string') setSuccessText(saved.feedback);
      else if (secondsTaken > round.timeLimitSec) setSuccessText('Time ran out; this flag is scheduled for an early review.');
      setActiveFlagId(null);
      setAnswer(null);
      setAnswerVisible(false);
      setTranscript('');
      recognition.current?.stop();
      recognition.current = null;
    } catch (error) {
      setErrorText(error instanceof Error ? error.message : 'The recall result could not be saved.');
    } finally {
      setBusy(false);
      await queryClient.invalidateQueries({ queryKey: ['due-flags', token] });
    }
  }, [activeFlagId, busy, queryClient, round, token]);

  useEffect(() => {
    if (!activeFlagId || !round || completion || busy) return undefined;
    const timer = window.setInterval(() => {
      const elapsed = Math.floor((Date.now() - startedAt.current) / 1000);
      const next = Math.max(0, round.timeLimitSec - elapsed);
      setRemaining(next);
      if (next === 0) {
        window.clearInterval(timer);
        void saveGrade('red');
      }
    }, 250);
    return () => window.clearInterval(timer);
  }, [activeFlagId, busy, completion, round, saveGrade]);

  async function selectFlag(flagId: number): Promise<void> {
    if (!token || !round || activeFlagId !== null || outcomes[flagId]) return;
    setErrorText('');
    setSuccessText('');
    setActiveFlagId(flagId);
    setRemaining(round.timeLimitSec);
    startedAt.current = Date.now();
    setAnswer(null);
    setAnswerVisible(false);
    setTranscript('');
  }

  async function revealAnswer(): Promise<void> {
    if (!token || !round || activeFlagId === null || busy) return;
    setBusy(true);
    setErrorText('');
    try {
      const result = await api.revealRecallFlag(token, round.roundId, activeFlagId);
      setAnswer(result.flag);
      setAnswerVisible(true);
    } catch (error) {
      setErrorText(error instanceof Error ? error.message : 'The answer could not be loaded.');
    } finally {
      setBusy(false);
    }
  }

  function startVoiceCapture(): void {
    const Recognition = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!Recognition) {
      setVoiceError('Speech recognition is not available in this browser. You can type your answer instead.');
      return;
    }
    const speech = new Recognition();
    speech.continuous = true;
    speech.interimResults = false;
    speech.lang = navigator.language || 'en-US';
    speech.onresult = (event) => {
      const parts: string[] = [];
      for (let index = 0; index < event.results.length; index += 1) {
        const result = event.results[index];
        if (result?.isFinal && result[0]?.transcript) parts.push(result[0].transcript.trim());
      }
      if (parts.length) setTranscript((current) => [current, ...parts].filter(Boolean).join(' ').trim());
    };
    speech.onerror = (event) => {
      setVoiceError(`Speech recognition stopped${event.error ? `: ${event.error}` : ''}. You can edit or type your answer.`);
      recognition.current = null;
    };
    try {
      speech.start();
      recognition.current = speech;
      setVoiceError('');
    } catch {
      setVoiceError('The microphone could not start. Check browser microphone permissions.');
    }
  }

  async function submitVoiceAnswer(): Promise<void> {
    if (!transcript.trim()) {
      setErrorText('Speak or type an answer before asking for AI feedback.');
      return;
    }
    await saveGrade('red', transcript.trim());
  }

  async function finishRound(): Promise<void> {
    if (!token || !round || busy) return;
    setBusy(true);
    setErrorText('');
    try {
      const result = await api.finishRecall(token, round.roundId);
      setCompletion(result);
      setOutcomes(Object.fromEntries(result.results.map((item) => [item.flagId, item.result])));
      await queryClient.invalidateQueries({ queryKey: ['due-flags', token] });
    } catch (error) {
      setErrorText(error instanceof Error ? error.message : 'The round could not be finished.');
    } finally {
      setBusy(false);
    }
  }

  function openOfflineReview(): void {
    setOfflineMode(true);
  }

  if (offlineMode && offlinePlaces.length > 0) {
    return (
      <main className="recall-page">
        <header className="recall-heading"><span className="eyebrow">PINPOINT / RECALL</span><h1>Recall</h1></header>
        <OfflineReview places={offlinePlaces} onExit={() => setOfflineMode(false)} />
      </main>
    );
  }

  return (
    <main className="recall-page">
      <header className="recall-heading">
        <span className="eyebrow">PINPOINT / RECALL</span>
        <h1>Recall</h1>
        <p>Return to a familiar place and see which ideas come back to you under time pressure.</p>
      </header>

      {!round && (
        <>
          <section className="recall-card recall-setup">
            <Clock3 size={34} aria-hidden="true" />
            <h2>Set up a recall round</h2>
            <p>Choose a place at random, then recall each hidden flag before time runs out.</p>
            <label className="recall-label">Time allowed per flag
              <select value={timeLimitSec} onChange={(event) => setTimeLimitSec(Number(event.target.value))}>
                {(speedMode ? [5, 10, 15, 20, 30] : [10, 20, 30, 45, 60, 90, 120]).map((seconds) => (
                  <option value={seconds} key={seconds}>{seconds} seconds</option>
                ))}
              </select>
            </label>
            <label className="recall-speed-toggle"><input type="checkbox" checked={speedMode} onChange={(event) => {
              const next = event.target.checked;
              setSpeedMode(next);
              if (next && timeLimitSec > 30) setTimeLimitSec(15);
              if (!next && timeLimitSec < 10) setTimeLimitSec(30);
            }} /> Speed round for fast learners</label>
            <button type="button" className="primary-button" onClick={() => void startRound()} disabled={busy || !isOnline}>
              {busy ? 'Starting…' : 'Start Recall'}
            </button>
            {!isOnline && <p role="status" className="recall-muted"><WifiOff size={15} /> Connect to start a timed round, or use your offline review set below.</p>}
          </section>

          <section className="recall-card offline-download">
            <div>
              <span className="eyebrow">TAKE IT WITH YOU</span>
              <h2>Offline review</h2>
              <p>Save your flags on this device to review them without a connection.</p>
              {offlineQuery.data && <p className="recall-muted">{dueCount} saved flags · Last saved {new Date(offlineQuery.data.savedAt).toLocaleString()}</p>}
              {offlineQuery.isError && !offlineQuery.data && <p role="alert" className="recall-error">{offlineQuery.error.message}</p>}
            </div>
            <div className="recall-actions">
              <button type="button" className="secondary-button" disabled={!isOnline || offlineQuery.isFetching} onClick={() => void offlineQuery.refetch()}>
                <Download size={16} /> {offlineQuery.isFetching ? 'Saving…' : 'Save offline set'}
              </button>
              {offlinePlaces.length > 0 && <button type="button" className="primary-button" onClick={openOfflineReview}><WifiOff size={16} /> Start offline review</button>}
            </div>
          </section>
          {token && isOnline && <DueReviewQueue token={token} />}
          {errorText && <p role="alert" className="recall-error"><AlertCircle size={16} /> {errorText}</p>}
        </>
      )}

      {round && !completion && (
        <>
          <div className="recall-round-heading">
            <div><h2>{round.place.name}</h2><p>{completedCount} of {round.flags.length} flags completed{round.speedMode ? ' · Speed round' : ''}</p></div>
            <button type="button" className="secondary-button" disabled={busy} onClick={() => void finishRound()}>Finish round</button>
          </div>
          <div className="recall-round-layout">
            <div className="recall-map">
              <img src={round.place.imageUrl} alt={`${round.place.name} for recall`} />
              {round.flags.map((flag, index) => {
                const outcome = outcomes[flag.id];
                return (
                  <button
                    type="button"
                    key={flag.id}
                    className={`recall-marker${activeFlagId === flag.id ? ' active' : ''}${outcome ? ` ${outcome}` : ''}`}
                    style={{ left: `${flag.x}%`, top: `${flag.y}%` }}
                    aria-label={outcome ? `Flag ${index + 1}: ${outcome === 'green' ? 'recalled' : 'missed'}` : `Recall flag ${index + 1}`}
                    disabled={Boolean(outcome) || activeFlagId !== null || busy}
                    onClick={() => void selectFlag(flag.id)}
                  >{outcome === 'green' ? '✓' : outcome === 'red' ? '×' : index + 1}</button>
                );
              })}
            </div>
            <section ref={answerPanelRef} tabIndex={-1} className="recall-card recall-answer-panel" aria-live="polite" aria-label="Recall answer panel">
              {activeFlagId === null ? (
                <div className="recall-idle"><Eye size={30} aria-hidden="true" /><h3>Choose a numbered flag</h3><p>Try to remember the idea before revealing the answer.</p></div>
              ) : (
                <>
                  <p className="recall-timer"><Clock3 size={16} /> {remaining}s remaining</p>
                  {!answerVisible ? (
                    <>
                      <p className="recall-question">Recall the idea at this location. You can say your answer for AI feedback or reveal it to self-grade.</p>
                      <button type="button" className="secondary-button" disabled={busy} onClick={() => void revealAnswer()}><Eye size={16} /> Reveal answer</button>
                      <label className="recall-label">Your spoken or typed answer
                        <textarea value={transcript} onChange={(event) => setTranscript(event.target.value)} maxLength={3000} rows={3} />
                      </label>
                      <div className="recall-actions">
                        {recognition.current
                          ? <button type="button" className="secondary-button" onClick={() => { recognition.current?.stop(); recognition.current = null; }}><Mic size={16} /> Stop microphone</button>
                          : <button type="button" className="secondary-button" onClick={startVoiceCapture}><Mic size={16} /> Speak answer</button>}
                        <button type="button" className="primary-button" disabled={busy || !transcript.trim()} onClick={() => void submitVoiceAnswer()}>Check with AI</button>
                      </div>
                      <p className="recall-privacy-note">Speech recognition runs in your browser. The transcript is sent to AI for checking and saved with this result.</p>
                    </>
                  ) : (
                    <>
                      <p className="eyebrow">ANSWER</p>
                      <h3>{answer?.emoji ? `${answer.emoji} ` : ''}{answer?.title}</h3>
                      <p className="recall-answer-note">{answer?.note || 'No note saved for this flag.'}</p>
                      <p>Did you recall this in time?</p>
                      <div className="recall-actions">
                        <button type="button" className="secondary-button" disabled={busy} onClick={() => void saveGrade('red')}><X size={16} /> Missed</button>
                        <button type="button" className="primary-button" disabled={busy} onClick={() => void saveGrade('green')}><Check size={16} /> Got it</button>
                      </div>
                    </>
                  )}
                  {voiceError && <p role="status" className="recall-muted">{voiceError}</p>}
                </>
              )}
              {errorText && <p role="alert" className="recall-error"><AlertCircle size={16} /> {errorText}</p>}
              {successText && <p role="status" className="recall-success">{successText}</p>}
            </section>
          </div>
        </>
      )}

      {completion && (
        <section className="recall-card recall-completion">
          <span className="eyebrow">ROUND COMPLETE</span>
          <h2>{completion.place.name}</h2>
          <p>{completion.summary.green} recalled · {completion.summary.red} to review</p>
          {round && (
            <>
              <div className="recall-legend" aria-hidden="true"><span className="dot green" /> Recalled <span className="dot red" /> To review</div>
              <div className="recall-map recall-heatmap" role="img" aria-label={`Heatmap of recalled and missed flags in ${completion.place.name}`}>
                <img src={round.place.imageUrl} alt="" />
                {round.flags.map((flag) => (
                  <span key={flag.id} aria-hidden="true" className={`recall-marker ${outcomes[flag.id] ?? 'red'}`} style={{ left: `${flag.x}%`, top: `${flag.y}%` }}>
                    {outcomes[flag.id] === 'green' ? '✓' : '×'}
                  </span>
                ))}
              </div>
            </>
          )}
          <div className="recall-result-list">
            {completion.flags.map((flag) => {
              const result = completion.results.find((item) => item.flagId === flag.id);
              return <article key={flag.id} className="recall-result-item">
                <span className={`recall-result-icon ${result?.result ?? 'red'}`}>{result?.result === 'green' ? '✓' : '×'}</span>
                <div><h3>{flag.emoji ? `${flag.emoji} ` : ''}{flag.title}</h3><p>{flag.note || 'No note saved.'}</p>
                  {result?.aiFeedback && <p className="recall-ai-feedback">{result.aiFeedback}</p>}
                </div>
              </article>;
            })}
          </div>
          <div className="recall-actions">
            <button type="button" className="primary-button" onClick={() => { setRound(null); setCompletion(null); setErrorText(''); setSuccessText(''); }}><RotateCcw size={16} /> Another round</button>
            <Link to="/palace" className="secondary-button">Review your places</Link>
          </div>
        </section>
      )}
    </main>
  );
}
