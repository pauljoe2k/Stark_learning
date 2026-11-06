import { useState, type FormEvent } from 'react';
import { AlertCircle, Check, Edit3, MapPin, Trash2, X } from 'lucide-react';
import type { CreateFlagBody } from '@pinpoint/shared';
import type { FlagRecord, TopicRecord } from '../../api';
import type { FlagPosition } from './PlaceCanvas';

type FlagDraft = Omit<CreateFlagBody, 'placeId' | 'topicId' | 'keyPointId'>
  & { topicId?: number | null; keyPointId?: number | null };

interface FlagPanelProps {
  flag: FlagRecord | null;
  position: FlagPosition | null;
  topics: TopicRecord[];
  saving: boolean;
  deleting: boolean;
  onClose: () => void;
  onSave: (draft: FlagDraft) => Promise<void>;
  onDelete: () => Promise<void>;
}

export function FlagPanel({
  flag,
  position,
  topics,
  saving,
  deleting,
  onClose,
  onSave,
  onDelete,
}: FlagPanelProps) {
  const [editing, setEditing] = useState(!flag);
  const [title, setTitle] = useState(flag?.title ?? '');
  const [note, setNote] = useState(flag?.note ?? '');
  const [emoji, setEmoji] = useState(flag?.emoji ?? '');
  const [topicId, setTopicId] = useState(flag?.topicId ? String(flag.topicId) : '');
  const [keyPointId, setKeyPointId] = useState(flag?.keyPointId ? String(flag.keyPointId) : '');
  const [error, setError] = useState('');
  const selectedTopic = topics.find((topic) => String(topic.id) === topicId);

  async function save(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setError('');
    if (!title.trim()) {
      setError('Add a short title for this flag.');
      return;
    }
    if (!flag && !position) {
      setError('Choose a spot on the photo first.');
      return;
    }
    try {
      await onSave({
        x: position?.x ?? flag?.x ?? 50,
        y: position?.y ?? flag?.y ?? 50,
        title: title.trim(),
        note: note.trim(),
        ...(emoji.trim() ? { emoji: emoji.trim() } : {}),
        ...(topicId ? { topicId: Number(topicId) } : flag ? { topicId: null } : {}),
        ...(keyPointId ? { keyPointId: Number(keyPointId) } : flag ? { keyPointId: null } : {}),
      });
      setEditing(false);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'The flag could not be saved.');
    }
  }

  async function deleteFlag(): Promise<void> {
    if (!flag) return;
    setError('');
    try {
      await onDelete();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'The flag could not be deleted.');
    }
  }

  function cancelEdit(): void {
    if (!flag) {
      onClose();
      return;
    }
    setTitle(flag.title);
    setNote(flag.note ?? '');
    setEmoji(flag.emoji ?? '');
    setTopicId(flag.topicId ? String(flag.topicId) : '');
    setKeyPointId(flag.keyPointId ? String(flag.keyPointId) : '');
    setError('');
    setEditing(false);
  }

  const pointText = flag?.topicId && flag.keyPointId
    ? topics.find((topic) => topic.id === flag.topicId)?.keyPoints.find((point) => point.id === flag.keyPointId)?.text
    : undefined;

  return (
    <aside className="flag-panel" aria-label={flag ? `Flag details: ${flag.title}` : 'New flag'}>
      <header className="flag-panel-heading">
        <div>
          <span className="eyebrow">{flag ? 'PALACE FLAG' : 'NEW MEMORY'}</span>
          <h2>{flag ? (editing ? 'Edit flag' : 'Remember this spot') : 'Add a flag'}</h2>
        </div>
        <button className="icon-button" type="button" onClick={onClose} aria-label="Close flag panel">
          <X size={18} aria-hidden="true" />
        </button>
      </header>

      {!editing && flag ? (
        <div className="flag-read-view">
          <div className="flag-read-title">
            <span className="flag-read-emoji" aria-hidden="true">{flag.emoji || <MapPin size={20} />}</span>
            <h3>{flag.title}</h3>
          </div>
          {flag.note
            ? <p className="flag-note">{flag.note}</p>
            : <p className="flag-note muted">No note added yet.</p>}
          {pointText && <p className="linked-keypoint"><Check size={15} aria-hidden="true" /> Linked idea: {pointText}</p>}
          <div className="flag-panel-footer">
            <button type="button" className="primary-button" onClick={() => setEditing(true)}>
              <Edit3 size={16} aria-hidden="true" /> Edit flag
            </button>
          </div>
        </div>
      ) : (
        <form className="flag-edit-form" onSubmit={(event) => void save(event)}>
          <label htmlFor="flag-title">Title</label>
          <input
            id="flag-title"
            autoFocus
            required
            maxLength={120}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="One clear idea"
          />
          <label htmlFor="flag-note">Note <span>optional</span></label>
          <textarea
            id="flag-note"
            rows={5}
            maxLength={2000}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Add a detail or memory prompt"
          />
          <label htmlFor="flag-emoji">Marker character <span>optional, up to 8 characters</span></label>
          <input
            id="flag-emoji"
            maxLength={8}
            value={emoji}
            onChange={(event) => setEmoji(event.target.value)}
            placeholder="e.g. 🌿"
          />
          <label htmlFor="flag-topic">Link to a topic <span>optional</span></label>
          <select
            id="flag-topic"
            value={topicId}
            onChange={(event) => {
              setTopicId(event.target.value);
              setKeyPointId('');
            }}
          >
            <option value="">Free note (no topic)</option>
            {topics.map((topic) => <option key={topic.id} value={topic.id}>{topic.title}</option>)}
          </select>
          {selectedTopic && (
            <>
              <label htmlFor="flag-keypoint">Key point <span>optional</span></label>
              <select id="flag-keypoint" value={keyPointId} onChange={(event) => setKeyPointId(event.target.value)}>
                <option value="">Choose a key point</option>
                {selectedTopic.keyPoints.map((point) => (
                  <option key={point.id} value={point.id}>{point.text}</option>
                ))}
              </select>
            </>
          )}
          {error && <p className="form-error" role="alert"><AlertCircle size={15} />{error}</p>}
          <div className="flag-panel-footer">
            <button type="submit" className="primary-button" disabled={saving || deleting || !title.trim()}>
              <Check size={16} aria-hidden="true" /> {saving ? 'Saving…' : 'Save flag'}
            </button>
            <button type="button" className="secondary-button" onClick={cancelEdit} disabled={saving || deleting}>Cancel</button>
            {flag && (
              <button type="button" className="danger-button" onClick={() => void deleteFlag()} disabled={saving || deleting}>
                <Trash2 size={16} aria-hidden="true" /> {deleting ? 'Deleting…' : 'Delete'}
              </button>
            )}
          </div>
        </form>
      )}
    </aside>
  );
}
