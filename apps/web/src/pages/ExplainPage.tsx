import { useEffect, useMemo, useRef, useState, type CSSProperties, type FormEvent } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { AlertCircle, ArrowRight, BookOpen, Check, Clock3, Mic2, Pin, Square, Type } from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import type { ExplainBody, ExplainResult } from '@pinpoint/shared';
import { useAuth } from '../auth';
import { api, type KeyPoint } from '../api';
import { useSocket } from '../socket';

type ExplainPoint = ExplainResult['points'][number];
type SessionMode = 'idle' | 'recording' | 'ready';

interface RecognitionAlternativeLike {
  transcript: string;
}

interface RecognitionResultLike extends ArrayLike<RecognitionAlternativeLike> {
  isFinal: boolean;
}

interface RecognitionEventLike extends Event {
  results: ArrayLike<RecognitionResultLike>;
}

interface RecognitionErrorLike extends Event {
  error?: string;
}

interface SpeechRecognitionLike {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: RecognitionEventLike) => void) | null;
  onerror: ((event: RecognitionErrorLike) => void) | null;
  start(): void;
  stop(): void;
}

declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  }
}

const durations = [
  { minutes: 1, seconds: 60 },
  { minutes: 2, seconds: 120 },
  { minutes: 3, seconds: 180 },
  { minutes: 5, seconds: 300 },
] as const;

function countWords(value: string): number {
  return value.trim().split(/\s+/).filter(Boolean).length;
}

function formatTime(seconds: number): string {
  return `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
}

export function ExplainPage() {
  const { token, user } = useAuth();
  const { socket } = useSocket();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const reduceMotion = useReducedMotion();
  const [selectedTopicId, setSelectedTopicId] = useState(searchParams.get('topicId') ?? '');
  const [durationSec, setDurationSec] = useState<ExplainBody['durationSec']>(120);
  const [transcript, setTranscript] = useState('');
  const [mode, setMode] = useState<SessionMode>('idle');
  const [remaining, setRemaining] = useState(120);
  const [voiceError, setVoiceError] = useState('');
  const [formError, setFormError] = useState('');
  const [explanation, setExplanation] = useState<ExplainResult | null>(null);
  const [livePoints, setLivePoints] = useState<ExplainPoint[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const deadlineRef = useRef<number | null>(null);
  const transcriptRef = useRef<HTMLTextAreaElement>(null);
  const wordCount = useMemo(() => countWords(transcript), [transcript]);

  const topicsQuery = useQuery({
    queryKey: ['topics', token],
    queryFn: async () => {
      if (!token) throw new Error('Sign in to load topics.');
      return (await api.topics(token)).topics;
    },
    enabled: Boolean(token),
  });
  const topics = useMemo(() => topicsQuery.data ?? [], [topicsQuery.data]);
  const topic = topics.find((item) => String(item.id) === selectedTopicId) ?? null;

  useEffect(() => {
    const topicId = searchParams.get('topicId');
    if (topicId && topics.some((item) => String(item.id) === topicId)) setSelectedTopicId(topicId);
  }, [searchParams, topics]);

  const explainMutation = useMutation({
    mutationFn: async (input: { topicId: number; body: ExplainBody }) => {
      if (!token) throw new Error('Sign in to submit an explanation.');
      return (await api.explain(token, input.topicId, input.body)).explanation;
    },
    onSuccess: (result) => {
      setExplanation(result);
      setLivePoints([]);
      setIsAnalyzing(false);
    },
    onError: (error: Error) => {
      setIsAnalyzing(false);
      setFormError(error.message);
    },
  });

  useEffect(() => {
    if (!socket) return;
    const onAnalyzing = (event: { topicId: number }) => {
      if (String(event.topicId) !== selectedTopicId) return;
      setIsAnalyzing(true);
      setExplanation(null);
      setLivePoints([]);
    };
    const onPoint = (event: {
      topicId: number;
      point: ExplainPoint;
      index: number;
      total: number;
    }) => {
      if (String(event.topicId) !== selectedTopicId) return;
      setLivePoints((current) => {
        const next = current.filter((point) => point.keyPointId !== event.point.keyPointId);
        next.splice(Math.min(event.index, next.length), 0, event.point);
        return next;
      });
    };
    socket.on('explain:analyzing', onAnalyzing);
    socket.on('explain:result', onPoint);
    return () => {
      socket.off('explain:analyzing', onAnalyzing);
      socket.off('explain:result', onPoint);
    };
  }, [selectedTopicId, socket]);

  useEffect(() => {
    if (mode !== 'recording') return;
    const timer = window.setInterval(() => {
      const deadline = deadlineRef.current;
      if (deadline === null) return;
      const secondsLeft = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      setRemaining(secondsLeft);
      if (secondsLeft === 0) {
        recognitionRef.current?.stop();
        recognitionRef.current = null;
        setMode('ready');
        setVoiceError('Time is up. Review your transcript, then submit it for a gap map.');
      }
    }, 250);
    return () => window.clearInterval(timer);
  }, [mode]);

  useEffect(() => () => {
    recognitionRef.current?.stop();
  }, []);

  function beginTypedSession(notice = ''): void {
    setFormError('');
    setVoiceError(notice);
    setRemaining(durationSec);
    deadlineRef.current = Date.now() + durationSec * 1000;
    setMode('recording');
    transcriptRef.current?.focus();
  }

  async function beginVoiceSession(): Promise<void> {
    const Recognition = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!Recognition) {
      beginTypedSession('Voice recognition is not available in this browser. You can type your explanation instead.');
      return;
    }

    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('Microphone access is not available.');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop());
    } catch {
      beginTypedSession('Microphone permission was not granted. You can type your explanation instead.');
      return;
    }

    const recognition = new Recognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = navigator.language || 'en-US';
    recognition.onresult = (event) => {
      const finalParts: string[] = [];
      for (let index = 0; index < event.results.length; index += 1) {
        const result = event.results[index];
        if (result?.isFinal && result[0]?.transcript) finalParts.push(result[0].transcript.trim());
      }
      if (finalParts.length > 0) setTranscript(finalParts.join(' ').trim());
    };
    recognition.onerror = (event) => {
      setVoiceError(`Voice recognition stopped${event.error ? `: ${event.error}` : ''}. You can edit or type the transcript.`);
      recognition.stop();
      setMode('ready');
      recognitionRef.current = null;
    };
    recognitionRef.current = recognition;
    beginTypedSession();
    try {
      recognition.start();
      setVoiceError('');
    } catch {
      recognitionRef.current = null;
      setMode('ready');
      setVoiceError('Voice recognition could not start. Type or edit your explanation instead.');
    }
  }

  function stopSession(): void {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setMode('ready');
    setVoiceError('Recording stopped. Review your transcript before submitting.');
  }

  function submitExplanation(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    setFormError('');
    if (!topic) {
      setFormError('Choose a topic with saved key points first.');
      return;
    }
    if (wordCount < 15) {
      setFormError('Explain for at least 15 words before submitting.');
      return;
    }
    setExplanation(null);
    setLivePoints([]);
    setIsAnalyzing(true);
    explainMutation.mutate({
      topicId: topic.id,
      body: { transcript: transcript.trim(), durationSec },
    });
  }

  function retryGaps(): void {
    setTranscript('');
    setExplanation(null);
    setLivePoints([]);
    setFormError('');
    setVoiceError('Try explaining the gaps in your own words. You can start with the typed fallback or voice recording.');
    transcriptRef.current?.focus();
  }

  function pinGaps(): void {
    if (!topic || !explanation) return;
    navigate(`/palace?topicId=${topic.id}&keyPointIds=${explanation.nextFocus.join(',')}`, {
      state: { topicId: topic.id, keyPointIds: explanation.nextFocus },
    });
  }

  const resultPoints = explanation?.points ?? livePoints;
  const keyPoints = topic?.keyPoints ?? [];
  const mappedPoints = resultPoints.map((point) => ({
    ...point,
    text: keyPoints.find((item: KeyPoint) => item.id === point.keyPointId)?.text ?? 'Study point',
  }));
  const coveredCount = mappedPoints.filter((point) => point.status === 'covered').length;
  const score = explanation?.score;
  const progressValue = score ?? (isAnalyzing ? Math.min(95, Math.round((livePoints.length / Math.max(1, keyPoints.length)) * 100)) : 0);

  return (
    <section className="explain-page">
      <header className="explain-heading">
        <div>
          <span className="eyebrow">PINPOINT / EXPLAIN</span>
          <h1>Teach it back.</h1>
          <p>Say what you understand, then use the gap map to choose what to strengthen next.</p>
        </div>
        <span className="explain-heading-mark" aria-hidden="true"><BookOpen size={27} strokeWidth={1.7} /></span>
      </header>

      {topicsQuery.isPending && <div className="explain-skeleton" aria-label="Loading topics" />}
      {topicsQuery.isError && <p className="form-error" role="alert">{topicsQuery.error.message}</p>}
      {!topicsQuery.isPending && !topicsQuery.isError && topics.length === 0 && (
        <div className="explain-empty">
          <BookOpen size={26} aria-hidden="true" />
          <h2>Start with a topic</h2>
          <p>Add study material and key points before trying an explanation.</p>
          <Link className="primary-button explain-link" to="/topic">Go to Topic <ArrowRight size={17} /></Link>
        </div>
      )}

      {topics.length > 0 && (
        <div className="explain-layout">
          <form className="explain-workspace" onSubmit={submitExplanation}>
            <label className="explain-select-label" htmlFor="explain-topic">Topic to explain</label>
            <select
              id="explain-topic"
              value={selectedTopicId}
              disabled={mode === 'recording' || explainMutation.isPending}
              onChange={(event) => {
                setSelectedTopicId(event.target.value);
                setExplanation(null);
                setLivePoints([]);
                setFormError('');
              }}
            >
              <option value="">Choose a topic</option>
              {topics.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}
            </select>

            {topic && (
              <>
                <p className="explain-topic-meta">
                  {topic.keyPoints.length} key {topic.keyPoints.length === 1 ? 'point' : 'points'}
                  {topic.keyPoints.length === 0 && <> · <Link to="/topic">Add key points in Topic</Link></>}
                </p>
                <fieldset className="duration-picker" disabled={mode === 'recording' || explainMutation.isPending}>
                  <legend><Clock3 size={15} aria-hidden="true" /> Set your explain time</legend>
                  <div className="duration-options">
                    {durations.map((duration) => (
                      <button
                        key={duration.seconds}
                        type="button"
                        className={durationSec === duration.seconds ? 'duration-option selected' : 'duration-option'}
                        aria-pressed={durationSec === duration.seconds}
                        onClick={() => {
                          setDurationSec(duration.seconds);
                          setRemaining(duration.seconds);
                        }}
                      >
                        {duration.minutes} min
                      </button>
                    ))}
                  </div>
                </fieldset>

                <div className={`timer-display${mode === 'recording' ? ' active' : ''}`} role="timer" aria-label={`${formatTime(remaining)} remaining`}>
                  <span>{formatTime(remaining)}</span>
                  <small>{mode === 'recording' ? 'Time to explain' : 'Ready when you are'}</small>
                </div>

                <div className="explain-session-actions">
                  {mode === 'recording' ? (
                    <button className="secondary-button" type="button" onClick={stopSession}>
                      <Square size={15} fill="currentColor" aria-hidden="true" /> Stop session
                    </button>
                  ) : (
                    <>
                      <button className="primary-button" type="button" onClick={() => void beginVoiceSession()} disabled={explainMutation.isPending}>
                        <Mic2 size={18} aria-hidden="true" /> Speak now
                      </button>
                      <button className="secondary-button" type="button" onClick={() => beginTypedSession()} disabled={explainMutation.isPending}>
                        <Type size={17} aria-hidden="true" /> Type instead
                      </button>
                    </>
                  )}
                </div>

                {voiceError && <p className="explain-notice" role="status">{voiceError}</p>}
                <label className="transcript-label" htmlFor="explain-transcript">
                  Your transcript <span>{wordCount} words · at least 15 to submit</span>
                </label>
                <textarea
                  id="explain-transcript"
                  ref={transcriptRef}
                  rows={9}
                  maxLength={20_000}
                  value={transcript}
                  onChange={(event) => setTranscript(event.target.value)}
                  placeholder="Explain the topic in your own words. You can edit speech recognition here before submitting."
                />
                <p className="explain-privacy-note">Keep personal details out of your explanation. Your transcript is sent securely for analysis and saved with this result.</p>
                {formError && <p className="form-error" role="alert"><AlertCircle size={15} />{formError}</p>}
                {explainMutation.isError && !formError && <p className="form-error" role="alert">{explainMutation.error.message}</p>}
                <button
                  className="primary-button explain-submit"
                  type="submit"
                  disabled={!topic.keyPoints.length || wordCount < 15 || explainMutation.isPending || mode === 'recording'}
                >
                  {explainMutation.isPending ? 'Finding your gaps…' : 'Show my gap map'}
                  <ArrowRight size={17} aria-hidden="true" />
                </button>
              </>
            )}

            {!topic && <p className="explain-hint">Choose a saved topic to start. Your topic’s key points will guide the gap map.</p>}
          </form>

          <aside className="explain-results" aria-live="polite">
            {!explanation && !isAnalyzing && (
              <div className="explain-result-empty">
                <span className="result-spark" aria-hidden="true"><Mic2 size={24} /></span>
                <h2>Your understanding, made visible</h2>
                <p>After you submit, each key point will show what you covered, what needs more detail, and where to focus next.</p>
              </div>
            )}
            {isAnalyzing && (
              <div className="explain-analyzing">
                <div className="score-ring analyzing" style={{ '--score': `${progressValue}%` } as CSSProperties}>
                  <span>{livePoints.length}<small>/{keyPoints.length || '…'}</small></span>
                </div>
                <h2>Listening for the key ideas</h2>
                <p>{livePoints.length > 0 ? `${livePoints.length} of ${keyPoints.length} points checked so far.` : 'Comparing your explanation with the saved study points…'}</p>
              </div>
            )}
            {explanation && (
              <>
                <div className="explain-score-row">
                  <div
                    className="score-ring"
                    role="img"
                    aria-label={`Score ${explanation.score} percent`}
                    style={{ '--score': `${explanation.score}%` } as CSSProperties}
                  >
                    <span>{explanation.score}<small>%</small></span>
                  </div>
                  <div>
                    <span className="eyebrow">GAP MAP</span>
                    <h2>{coveredCount} of {explanation.points.length} covered</h2>
                    <p>{explanation.summary}</p>
                    {user && <small className="pass-mark-note">Your current pass mark is {user.passMark}%.</small>}
                    {user && (
                      <p className={`pass-mark-state${explanation.score >= user.passMark ? ' passed' : ''}`}>
                        {explanation.score >= user.passMark ? 'At or above your pass mark' : 'Keep practicing to reach your pass mark'}
                      </p>
                    )}
                  </div>
                </div>
                {explanation.source === 'keyword' && (
                  <p className="fallback-note"><AlertCircle size={15} aria-hidden="true" /> Keyword estimate used because AI analysis was unavailable. Check the feedback against your material.</p>
                )}
              </>
            )}
            {mappedPoints.length > 0 && (
              <div className="gap-list" aria-label="Key point results">
                <AnimatePresence initial={false}>
                  {mappedPoints.map((point, index) => (
                    <motion.article
                      key={point.keyPointId}
                      className={`gap-item status-${point.status}`}
                      initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: reduceMotion ? 0 : 0.22, delay: reduceMotion ? 0 : Math.min(index * 0.035, 0.28) }}
                    >
                      <span className="gap-status-icon" aria-hidden="true">
                        {point.status === 'covered' ? <Check size={16} /> : <AlertCircle size={16} />}
                      </span>
                      <div>
                        <span className="gap-status-label">{point.status}</span>
                        <h3>{point.text}</h3>
                        {point.evidence && <blockquote>“{point.evidence}”</blockquote>}
                        <p>{point.feedback}</p>
                      </div>
                    </motion.article>
                  ))}
                </AnimatePresence>
              </div>
            )}
            {explanation && (
              <div className="explain-next-actions">
                <button className="secondary-button" type="button" onClick={retryGaps}>
                  <Mic2 size={16} aria-hidden="true" /> Retry the gaps
                </button>
                {explanation.nextFocus.length > 0 && (
                  <button className="primary-button" type="button" onClick={pinGaps}>
                    <Pin size={16} aria-hidden="true" /> Pin the gaps
                  </button>
                )}
              </div>
            )}
          </aside>
        </div>
      )}
    </section>
  );
}
