import { useEffect, useState } from 'react';
import { Check, Pencil, Trash2, X } from 'lucide-react';

export default function FlagPanel({
  flag,
  draft,
  onClose,
  onSave,
  onUpdate,
  onDelete,
  topics = [],
  saving = false,
  error = '',
}) {
  const isNew = Boolean(draft);
  const [editing, setEditing] = useState(isNew);
  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');
  const [emoji, setEmoji] = useState('');
  const [topicId, setTopicId] = useState('');
  const [keyPointId, setKeyPointId] = useState('');
  const [formError, setFormError] = useState('');

  useEffect(() => {
    setEditing(Boolean(draft));
    setTitle(flag?.title ?? '');
    setNote(flag?.note ?? '');
    setEmoji(flag?.emoji ?? '');
    setTopicId(flag?.topicId ? String(flag.topicId) : '');
    setKeyPointId(flag?.keyPointId ? String(flag.keyPointId) : '');
    setFormError('');
  }, [flag?.id, draft]);

  async function save(event) {
    event.preventDefault();
    setFormError('');
    if (!title.trim()) {
      setFormError('Add a title for this flag.');
      return;
    }
    const data = {
      title: title.trim(),
      note,
      emoji: emoji.trim() || undefined,
      topicId: topicId ? Number(topicId) : null,
      keyPointId: keyPointId ? Number(keyPointId) : null,
    };
    try {
      if (isNew) await onSave({ ...draft, ...data });
      else {
        await onUpdate(flag.id, data);
        setEditing(false);
      }
    } catch (saveError) {
      setFormError(saveError.message || 'The flag could not be saved.');
    }
  }

  return (
    <aside aria-label={isNew ? 'Add flag details' : `Flag details: ${flag.title}`} className="fixed inset-x-0 bottom-0 z-30 max-h-[58vh] overflow-y-auto rounded-t-3xl border border-slate-200 bg-white p-5 shadow-2xl md:static md:max-h-[calc(100vh-12rem)] md:w-80 md:shrink-0 md:rounded-2xl md:shadow-sm">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-moss">{isNew ? 'New location' : 'Flag details'}</p>
          <h2 className="mt-1 text-lg font-bold">{isNew ? 'Add a flag' : (flag.emoji ? `${flag.emoji} ` : '') + flag.title}</h2>
        </div>
        <button type="button" onClick={onClose} aria-label="Close flag panel" className="rounded-full p-2 hover:bg-paper">
          <X aria-hidden="true" size={19} />
        </button>
      </div>

      {editing ? (
        <form onSubmit={save} className="space-y-3">
          <label className="block text-sm font-semibold">
            Title
            <input autoFocus maxLength={120} value={title} onChange={(event) => setTitle(event.target.value)} className="mt-1 block w-full rounded-xl border border-slate-300 px-3 py-2.5 font-normal" />
          </label>
          <label className="block text-sm font-semibold">
            Emoji <span className="font-normal text-slate-500">(optional)</span>
            <input maxLength={8} value={emoji} onChange={(event) => setEmoji(event.target.value)} className="mt-1 block w-full rounded-xl border border-slate-300 px-3 py-2.5 font-normal" placeholder="📍" />
          </label>
          <label className="block text-sm font-semibold">
            Note <span className="font-normal text-slate-500">(optional)</span>
            <textarea maxLength={2000} rows={3} value={note ?? ''} onChange={(event) => setNote(event.target.value)} className="mt-1 block w-full resize-y rounded-xl border border-slate-300 px-3 py-2.5 font-normal" />
          </label>
          <label className="block text-sm font-semibold">
            Link to topic <span className="font-normal text-slate-500">(optional)</span>
            <select value={topicId} onChange={(event) => { setTopicId(event.target.value); setKeyPointId(''); }} className="mt-1 block w-full rounded-xl border border-slate-300 px-3 py-2.5 font-normal">
              <option value="">No topic link</option>
              {topics.map((topic) => <option key={topic.id} value={topic.id}>{topic.title}</option>)}
            </select>
          </label>
          {topicId && <label className="block text-sm font-semibold">
            Key point <span className="font-normal text-slate-500">(optional)</span>
            <select value={keyPointId} onChange={(event) => setKeyPointId(event.target.value)} className="mt-1 block w-full rounded-xl border border-slate-300 px-3 py-2.5 font-normal">
              <option value="">No key point link</option>
              {topics.find((topic) => String(topic.id) === topicId)?.keyPoints?.map((point) => <option key={point.id} value={point.id}>{point.text}</option>)}
            </select>
          </label>}
          {(formError || error) && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{formError || error}</p>}
          <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-4">
            <button type="submit" disabled={saving} className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-moss px-4 py-2.5 font-semibold text-white hover:bg-ink disabled:opacity-60">
              <Check aria-hidden="true" size={18} /> {saving ? 'Saving…' : 'Save'}
            </button>
            {!isNew && (
              <button type="button" disabled={saving} onClick={() => { setEditing(false); setFormError(''); }} className="rounded-xl border border-slate-300 px-4 py-2.5 font-semibold hover:bg-paper disabled:opacity-60">
                Cancel
              </button>
            )}
            {!isNew && (
              <button type="button" disabled={saving} onClick={() => onDelete(flag.id)} className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 px-3 py-2.5 font-semibold text-red-800 hover:bg-red-50 disabled:opacity-60">
                <Trash2 aria-hidden="true" size={17} /> Delete
              </button>
            )}
          </div>
        </form>
      ) : (
        <div className="flex min-h-40 flex-col">
          <p className="whitespace-pre-wrap text-sm leading-6 text-slate-700">{flag.note || 'No note for this location.'}</p>
          <button type="button" onClick={() => { setEditing(true); setFormError(''); }} className="mt-auto inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 px-4 py-2.5 font-semibold hover:bg-paper">
            <Pencil aria-hidden="true" size={17} /> Edit flag
          </button>
        </div>
      )}
    </aside>
  );
}