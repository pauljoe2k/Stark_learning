import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import imageCompression from 'browser-image-compression';
import { BookOpen, Check, FileText, Plus, Save, Upload } from 'lucide-react';
import { useAuth } from '../auth';
import { CameraCapture } from '../components/CameraCapture';
import { api, type ExtractionJobResult, type KeyPoint, type TopicRecord } from '../api';
import { useSocket } from '../socket';

interface TopicDraft {
  topicId: number;
  title: string;
  notes: string;
  keyPoints: Array<{ id?: number; text: string }>;
}

interface FileProgress {
  fileId?: number;
  percent: number;
  stage: string;
  error?: string;
}

const maxUploadBytes = 20 * 1024 * 1024;

export function TopicPage() {
  const { token } = useAuth();
  const { socket } = useSocket();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState('');
  const [unitId, setUnitId] = useState('');
  const [drafts, setDrafts] = useState<Record<number, TopicDraft>>({});
  const [progress, setProgress] = useState<Record<number, FileProgress>>({});
  const [uploadingTopicId, setUploadingTopicId] = useState<number | null>(null);
  const [uploadError, setUploadError] = useState('');

  const acceptPolledStatus = useCallback((topicId: number, status: Awaited<ReturnType<typeof api.fileStatus>>) => {
    if (status.state === 'completed' && status.result) {
      const result = status.result;
      setProgress((current) => ({
        ...current,
        [topicId]: { fileId: status.fileId, percent: 100, stage: 'Review extracted notes' },
      }));
      setDrafts((current) => ({
        ...current,
        [topicId]: {
          topicId,
          title: result.extraction.title,
          notes: result.extraction.notes,
          keyPoints: result.keyPoints.map(({ id, text }) => ({ id, text })),
        },
      }));
      void queryClient.invalidateQueries({ queryKey: ['topics', token] });
    } else if (status.state === 'completed') {
      setProgress((current) => ({
        ...current,
        [topicId]: {
          fileId: status.fileId,
          percent: 100,
          stage: 'Extraction result unavailable',
          error: 'The result expired before it could be reviewed. Upload the material again.',
        },
      }));
    } else if (status.state === 'failed' || status.state === 'missing') {
      setProgress((current) => ({
        ...current,
        [topicId]: {
          fileId: status.fileId,
          percent: 0,
          stage: status.state === 'failed' ? 'Extraction failed' : 'Upload status unavailable',
          error: status.error ?? 'The extraction job is no longer available. Upload the material again.',
        },
      }));
    } else if (typeof status.progress === 'number') {
      const percent = status.progress;
      setProgress((current) => {
        const existing = current[topicId];
        return existing?.fileId === status.fileId
          ? { ...current, [topicId]: { ...existing, percent } }
          : current;
      });
    }
  }, [queryClient, token]);

  const topicsQuery = useQuery({
    queryKey: ['topics', token],
    queryFn: async () => {
      if (!token) throw new Error('Sign in to load topics.');
      return (await api.topics(token)).topics;
    },
    enabled: Boolean(token),
  });
  const unitsQuery = useQuery({
    queryKey: ['units', token],
    queryFn: async () => {
      if (!token) throw new Error('Sign in to load units.');
      return (await api.units(token)).units;
    },
    enabled: Boolean(token),
  });

  const createMutation = useMutation({
    mutationFn: async (input: { title: string; unitId?: number }) => {
      if (!token) throw new Error('Sign in to create a topic.');
      return api.createTopic(token, input);
    },
    onSuccess: async () => {
      setTitle('');
      await queryClient.invalidateQueries({ queryKey: ['topics', token] });
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (draft: TopicDraft) => {
      if (!token) throw new Error('Sign in to save this topic.');
      return api.updateTopic(token, draft.topicId, {
        title: draft.title,
        notes: draft.notes,
        keyPoints: draft.keyPoints.map((point) => point.id === undefined
          ? { text: point.text }
          : { id: point.id, text: point.text }),
      });
    },
    onSuccess: async (_result, draft) => {
      setDrafts((current) => {
        const next = { ...current };
        delete next[draft.topicId];
        return next;
      });
      await queryClient.invalidateQueries({ queryKey: ['topics', token] });
    },
  });

  useEffect(() => {
    if (!socket) return;
    const onProcessing = ({ fileId, topicId }: { fileId: number; topicId: number }) => {
      setProgress((current) => {
        const existing = current[topicId];
        if (existing?.fileId === fileId && (existing.error || existing.percent > 5)) return current;
        return { ...current, [topicId]: { fileId, percent: 5, stage: 'Queued for extraction' } };
      });
    };
    const onProgress = ({ fileId, percent, stage }: { fileId: number; percent: number; stage: string }) => {
      setProgress((current) => {
        const match = Object.entries(current).find(([, status]) => status.fileId === fileId);
        if (!match) return current;
        return { ...current, [Number(match[0])]: { fileId, percent, stage: progressLabel(stage) } };
      });
    };
    const onDone = ({ fileId, topicId, extraction, keyPoints }: {
      fileId: number;
      topicId: number;
      extraction: ExtractionJobResult['extraction'];
      keyPoints: KeyPoint[];
    }) => {
      setProgress((current) => ({
        ...current,
        [topicId]: { fileId, percent: 100, stage: 'Review extracted notes' },
      }));
      setDrafts((current) => ({
        ...current,
        [topicId]: {
          topicId,
          title: extraction.title,
          notes: extraction.notes,
          keyPoints: keyPoints.map(({ id, text }) => ({ id, text })),
        },
      }));
      void queryClient.invalidateQueries({ queryKey: ['topics', token] });
    };
    const onError = ({ fileId, message }: { fileId: number; message: string }) => {
      setProgress((current) => {
        const match = Object.entries(current).find(([, status]) => status.fileId === fileId);
        if (!match) return current;
        return { ...current, [Number(match[0])]: { fileId, percent: 0, stage: 'Extraction failed', error: message } };
      });
    };
    socket.on('file:processing', onProcessing);
    socket.on('file:progress', onProgress);
    socket.on('file:done', onDone);
    socket.on('file:error', onError);
    return () => {
      socket.off('file:processing', onProcessing);
      socket.off('file:progress', onProgress);
      socket.off('file:done', onDone);
      socket.off('file:error', onError);
    };
  }, [queryClient, socket, token]);

  function createTopic(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    const parsedUnitId = Number(unitId);
    createMutation.mutate({
      title,
      ...(unitId && Number.isInteger(parsedUnitId) ? { unitId: parsedUnitId } : {}),
    });
  }

  async function uploadFile(topic: TopicRecord, file: File): Promise<void> {
    setUploadError('');
    if (!token) {
      setUploadError('Sign in to upload material.');
      return;
    }
    if (file.size > maxUploadBytes) {
      setUploadError('Choose a file smaller than 20 MB.');
      return;
    }
    setUploadingTopicId(topic.id);
    setProgress((current) => ({
      ...current,
      [topic.id]: { percent: 4, stage: 'Preparing upload' },
    }));
    try {
      const preparedFile = file.type.startsWith('image/')
        ? await imageCompression(file, { maxSizeMB: 1.8, maxWidthOrHeight: 2400, useWebWorker: true })
        : file;
      setProgress((current) => ({
        ...current,
        [topic.id]: { percent: 8, stage: 'Requesting secure upload' },
      }));
      const ticket = await api.createUploadTicket(token, topic.id);
      const result = ticket.provider === 'local'
        ? await api.uploadLocal(token, topic.id, ticket, preparedFile)
        : await api.uploadCloudinary(token, topic.id, ticket, preparedFile);
      setProgress((current) => {
        const currentStatus = current[topic.id];
        if (currentStatus?.fileId === result.fileId && (currentStatus.error || currentStatus.percent > 10)) return current;
        return {
          ...current,
          [topic.id]: { fileId: result.fileId, percent: 10, stage: 'Waiting for extraction' },
        };
      });
      await queryClient.invalidateQueries({ queryKey: ['topics', token] });
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : 'The upload could not be completed.';
      setProgress((current) => ({
        ...current,
        [topic.id]: { percent: 0, stage: 'Upload failed', error: message },
      }));
    } finally {
      setUploadingTopicId(null);
    }
  }

  function updateDraft(topicId: number, patch: Partial<TopicDraft>): void {
    setDrafts((current) => {
      const draft = current[topicId];
      return draft ? { ...current, [topicId]: { ...draft, ...patch } } : current;
    });
  }

  const topics = topicsQuery.data ?? [];
  const pageError = topicsQuery.error instanceof Error
    ? topicsQuery.error.message
    : unitsQuery.error instanceof Error ? unitsQuery.error.message : '';

  return (
    <section className="topic-page" aria-labelledby="topics-heading">
      <header className="topic-heading">
        <div>
          <span className="eyebrow">PINPOINT / TOPIC</span>
          <h1 id="topics-heading">Make a topic yours.</h1>
          <p>Bring in a short document or a photo of your notes. Pinpoint will find the ideas worth keeping.</p>
        </div>
        <div className="topic-heading-mark" aria-hidden="true"><BookOpen size={34} strokeWidth={1.5} /></div>
      </header>

      <form className="topic-create-form" onSubmit={createTopic}>
        <label>
          New topic
          <input
            value={title}
            onChange={(event) => setTitle(event.currentTarget.value)}
            placeholder="e.g. Cell membranes"
            required
            maxLength={160}
          />
        </label>
        {unitsQuery.data && unitsQuery.data.length > 0 && (
          <label>
            Unit <span className="optional-label">optional</span>
            <select value={unitId} onChange={(event) => setUnitId(event.currentTarget.value)}>
              <option value="">No unit</option>
              {unitsQuery.data.map((unit) => <option key={unit.id} value={unit.id}>{unit.title}</option>)}
            </select>
          </label>
        )}
        <button className="primary-button" type="submit" disabled={createMutation.isPending || !title.trim()}>
          <Plus size={18} aria-hidden="true" />
          {createMutation.isPending ? 'Creating…' : 'Create topic'}
        </button>
      </form>

      {(pageError || createMutation.error) && (
        <p className="form-error" role="alert">
          {pageError || (createMutation.error instanceof Error ? createMutation.error.message : 'Topic could not be created.')}
        </p>
      )}
      {uploadError && <p className="form-error" role="alert">{uploadError}</p>}

      {topicsQuery.isPending ? (
        <div className="topic-list" aria-label="Loading topics">
          {[0, 1].map((item) => <div className="topic-skeleton" key={item} />)}
        </div>
      ) : topicsQuery.isError ? (
        <section className="topic-empty" role="alert">
          <FileText size={24} aria-hidden="true" />
          <h2>Topics could not load</h2>
          <p>{pageError || 'Check your connection and try again.'}</p>
          <button type="button" className="secondary-button" onClick={() => void topicsQuery.refetch()}>Try again</button>
        </section>
      ) : topics.length === 0 ? (
        <section className="topic-empty">
          <BookOpen size={28} aria-hidden="true" />
          <h2>Your first topic starts here.</h2>
          <p>Create a topic above, then add a document or capture a page of notes.</p>
        </section>
      ) : (
        <div className="topic-list">
          {topics.map((topic, index) => {
            const draft = drafts[topic.id];
            const status = progress[topic.id];
            const isUploading = uploadingTopicId === topic.id;
            const pageCount = topic.topicFiles.reduce((total, file) => total + file.pageCount, 0);
            return (
              <article className="topic-card" key={topic.id} style={{ animationDelay: `${index * 55}ms` }}>
                <header className="topic-card-header">
                  <div>
                    <span className="eyebrow">{topic.unit?.title ?? 'UNSORTED TOPIC'}</span>
                    <h2>{topic.title}</h2>
                    <p>{topic.topicFiles.length} {topic.topicFiles.length === 1 ? 'file' : 'files'} · {pageCount}/2 pages</p>
                  </div>
                  <span className="topic-card-icon" aria-hidden="true"><FileText size={20} /></span>
                </header>

                {topic.notes && <p className="topic-notes-preview">{topic.notes}</p>}
                {topic.keyPoints.length > 0 && (
                  <ul className="key-point-list">
                    {topic.keyPoints.map((point) => (
                      <li key={point.id}><Check size={16} aria-hidden="true" /><span>{point.text}</span></li>
                    ))}
                  </ul>
                )}

                {status && (
                  <div className={`upload-status${status.error ? ' has-error' : ''}`} role={status.error ? 'alert' : 'status'}>
                    <div className="upload-status-line">
                      <span>{status.stage}</span>
                      {!status.error && <span>{status.percent}%</span>}
                    </div>
                    {!status.error && <div className="upload-progress-track"><span style={{ width: `${status.percent}%` }} /></div>}
                    {status.error && <p>{status.error}</p>}
                  </div>
                )}
                {status?.fileId && status.stage !== 'Review extracted notes' && !status.error && token && (
                  <TopicFilePoller
                    token={token}
                    topicId={topic.id}
                    fileId={status.fileId}
                    onStatus={acceptPolledStatus}
                  />
                )}

                {draft && (
                  <section className="extraction-review" aria-label={`Review extracted notes for ${topic.title}`}>
                    <div className="review-heading">
                      <span className="eyebrow">READY TO SAVE</span>
                      <h3>Review what was found</h3>
                    </div>
                    <label>
                      Topic title
                      <input value={draft.title} onChange={(event) => updateDraft(topic.id, { title: event.currentTarget.value })} maxLength={160} />
                    </label>
                    <label>
                      Notes
                      <textarea value={draft.notes} onChange={(event) => updateDraft(topic.id, { notes: event.currentTarget.value })} rows={4} maxLength={20_000} />
                    </label>
                    <div className="review-keypoints">
                      <h4>Key points</h4>
                      {draft.keyPoints.map((point, pointIndex) => (
                        <label key={point.id ?? `new-${pointIndex}`}>
                          <span>Point {pointIndex + 1}</span>
                          <textarea
                            value={point.text}
                            onChange={(event) => {
                              const keyPoints = draft.keyPoints.map((existing, currentIndex) => currentIndex === pointIndex
                                ? { ...existing, text: event.currentTarget.value }
                                : existing);
                              updateDraft(topic.id, { keyPoints });
                            }}
                            rows={2}
                            maxLength={1000}
                          />
                        </label>
                      ))}
                      <button
                        type="button"
                        className="text-button"
                        onClick={() => updateDraft(topic.id, { keyPoints: [...draft.keyPoints, { text: '' }] })}
                        disabled={draft.keyPoints.length >= 30}
                      >
                        <Plus size={15} aria-hidden="true" /> Add key point
                      </button>
                    </div>
                    {saveMutation.error && <p className="form-error" role="alert">{saveMutation.error.message}</p>}
                    <button
                      className="primary-button"
                      type="button"
                      onClick={() => saveMutation.mutate(draft)}
                      disabled={saveMutation.isPending || !draft.title.trim() || !draft.keyPoints.length || draft.keyPoints.some((point) => !point.text.trim())}
                    >
                      <Save size={17} aria-hidden="true" />
                      {saveMutation.isPending ? 'Saving…' : 'Save topic and key points'}
                    </button>
                  </section>
                )}

                <details className="add-material">
                  <summary><Upload size={17} aria-hidden="true" /> Add material</summary>
                  <CameraCapture
                    disabled={isUploading || pageCount >= 2}
                    onSelect={(file) => void uploadFile(topic, file)}
                  />
                  {pageCount >= 2 && <p className="camera-hint">This topic already has its two pages of material.</p>}
                </details>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

function TopicFilePoller({
  token,
  topicId,
  fileId,
  onStatus,
}: {
  token: string;
  topicId: number;
  fileId: number;
  onStatus: (topicId: number, status: Awaited<ReturnType<typeof api.fileStatus>>) => void;
}) {
  const query = useQuery({
    queryKey: ['topic-file', token, topicId, fileId],
    queryFn: () => api.fileStatus(token, topicId, fileId),
    refetchInterval: (current) => (
      current.state.data?.state === 'completed'
      || current.state.data?.state === 'failed'
      || current.state.data?.state === 'missing'
        ? false
        : 1800
    ),
  });
  useEffect(() => {
    if (query.data) onStatus(topicId, query.data);
  }, [onStatus, query.data, topicId]);
  return null;
}

function progressLabel(stage: string): string {
  switch (stage) {
    case 'validating': return 'Checking your file';
    case 'extracting': return 'Finding the key ideas';
    case 'saving': return 'Preparing your review';
    default: return stage;
  }
}
