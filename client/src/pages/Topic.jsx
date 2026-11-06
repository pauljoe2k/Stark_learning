import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { BookOpen, FilePlus2, LoaderCircle, Pencil, Plus, Save, Trash2, Upload } from 'lucide-react';
import {
  useCreateTopic,
  useCreateUnit,
  useDeleteTopic,
  useSaveTopic,
  useTopics,
  useTopic,
  useUnits,
  useUploadTopicFiles,
} from '../hooks/useStudy.js';

export default function Topic() {
  const [search, setSearch] = useSearchParams();
  const selectedId = search.get('selected');
  const requestedUnitId = search.get('unit');
  const { data: topics = [], isLoading, isError, error } = useTopics();
  const { data: units = [] } = useUnits();
  const selectedQuery = useTopic(selectedId);
  const createTopic = useCreateTopic();
  const createUnit = useCreateUnit();
  const saveTopic = useSaveTopic(selectedId);
  const deleteTopic = useDeleteTopic(selectedId);
  const uploadFiles = useUploadTopicFiles();
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [keyPoints, setKeyPoints] = useState([]);
  const [newTitle, setNewTitle] = useState('');
  const [newUnitId, setNewUnitId] = useState('');
  const [unitId, setUnitId] = useState('');
  const [newUnitTitle, setNewUnitTitle] = useState('');
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [errorText, setErrorText] = useState('');

  useEffect(() => {
    if (!selectedQuery.data) return;
    setTitle(selectedQuery.data.title);
    setNotes(selectedQuery.data.notes);
    setKeyPoints(selectedQuery.data.keyPoints ?? []);
    setUnitId(selectedQuery.data.unitId ? String(selectedQuery.data.unitId) : '');
  }, [selectedQuery.data]);

  useEffect(() => {
    if (selectedId || !requestedUnitId || !topics.length) return;
    const firstUnitTopic = topics.find((topic) => String(topic.unitId) === requestedUnitId);
    if (firstUnitTopic) setSearch({ selected: String(firstUnitTopic.id) }, { replace: true });
  }, [requestedUnitId, selectedId, setSearch, topics]);

  async function create(event) {
    event.preventDefault();
    setBusy(true);
    setErrorText('');
    setMessage('');
    try {
      const topic = await createTopic.mutateAsync({ title: newTitle.trim(), unitId: newUnitId ? Number(newUnitId) : null });
      setSearch({ selected: String(topic.id) });
      if (selectedFiles.length) {
        const formDataFiles = [...selectedFiles];
        const result = await uploadFiles.mutateAsync({ topicId: topic.id, files: formDataFiles });
        setMessage(`${result.extraction.keyPoints.length} key points extracted. Review and save your changes.`);
      }
      setSelectedFiles([]);
      setNewTitle('');
    } catch (requestError) {
      setErrorText(requestError.message || 'The topic could not be created.');
    } finally {
      setBusy(false);
    }
  }

  async function uploadMore() {
    if (!selectedFiles.length) {
      setErrorText('Choose at least one PDF or image.');
      return;
    }
    setBusy(true);
    setErrorText('');
    setMessage('');
    try {
      const result = await uploadFiles.mutateAsync({ topicId: Number(selectedId), files: [...selectedFiles] });
      setTitle(result.topic.title);
      setNotes(result.topic.notes);
      setKeyPoints(result.topic.keyPoints);
      setSelectedFiles([]);
      setMessage(`${result.extraction.keyPoints.length} key points extracted. Review and save your changes.`);
    } catch (requestError) {
      setErrorText(requestError.message || 'The study material could not be uploaded.');
    } finally {
      setBusy(false);
    }
  }

  async function saveEdits(event) {
    event.preventDefault();
    setBusy(true);
    setErrorText('');
    try {
      await saveTopic.mutateAsync({ title: title.trim(), notes, keyPoints, unitId: unitId ? Number(unitId) : null });
      setMessage('Topic saved.');
    } catch (requestError) {
      setErrorText(requestError.message || 'The topic could not be saved.');
    } finally {
      setBusy(false);
    }
  }

  async function addUnit() {
    try {
      const unit = await createUnit.mutateAsync({ title: newUnitTitle.trim() });
      setNewUnitId(String(unit.id));
      setNewUnitTitle('');
    } catch (requestError) {
      setErrorText(requestError.message || 'The unit could not be created.');
    }
  }

  async function removeTopic() {
    if (!window.confirm(`Delete "${selectedQuery.data?.title}" and its study history?`)) return;
    try {
      await deleteTopic.mutateAsync();
      setSearch({});
      setTitle('');
      setNotes('');
      setKeyPoints([]);
    } catch (requestError) {
      setErrorText(requestError.message);
    }
  }

  if (isLoading) return <main className="p-6" role="status">Loading topics…</main>;
  if (isError) return <main className="p-6"><p role="alert" className="rounded-xl bg-red-50 p-4 text-red-900">{error.message}</p></main>;

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-4 py-8 pb-24 sm:px-8 sm:py-10">
      <header className="mb-7">
        <p className="text-sm font-bold uppercase tracking-[0.16em] text-moss">Step 1 · Learn the material</p>
        <h1 className="mt-1 text-3xl font-bold">Topics & notes</h1>
        <p className="mt-2 text-slate-600">Add a topic, then upload PDFs or images of notes for key-point extraction.</p>
      </header>
      <div className="grid gap-5 lg:grid-cols-[0.8fr_1.2fr]">
        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="text-lg font-bold">Your topics</h2>
          {topics.length ? (
            <ul className="mt-3 divide-y divide-slate-100">
              {topics.map((topic) => <li key={topic.id}>
                <button type="button" onClick={() => setSearch({ selected: String(topic.id) })} className={`flex w-full items-center gap-3 rounded-lg px-2 py-3 text-left hover:bg-paper ${String(topic.id) === selectedId ? 'bg-paper' : ''}`}>
                  <BookOpen aria-hidden="true" className="shrink-0 text-moss" size={19} />
                  <span className="min-w-0 flex-1 truncate font-semibold">{topic.title}</span>
                  <span className="shrink-0 text-xs text-slate-500">{topic.keyPoints?.length ?? 0} points</span>
                </button>
              </li>)}
            </ul>
          ) : <p className="mt-3 rounded-xl bg-paper p-4 text-sm text-slate-600">No topics yet. Create one to get started.</p>}
          <form onSubmit={create} className="mt-5 space-y-3 border-t border-slate-100 pt-4">
            <h3 className="font-semibold">Create a topic</h3>
            <label htmlFor="new-topic-title" className="sr-only">Topic title</label>
            <input id="new-topic-title" required maxLength={160} value={newTitle} onChange={(event) => setNewTitle(event.target.value)} placeholder="e.g. Cell biology" className="w-full rounded-xl border border-slate-300 px-3 py-2.5" />
            <label className="block text-sm font-medium">Unit
              <select value={newUnitId} onChange={(event) => setNewUnitId(event.target.value)} className="mt-1 block w-full rounded-xl border border-slate-300 px-3 py-2.5">
                <option value="">No unit</option>
                {units.map((unit) => <option key={unit.id} value={unit.id}>{unit.title}</option>)}
              </select>
            </label>
            <label className="block rounded-xl border border-dashed border-slate-300 p-3 text-sm text-slate-600">
              <span className="inline-flex items-center gap-2 font-semibold text-ink"><FilePlus2 size={17} /> Add PDF or images</span>
              <span className="mt-1 block">Upload PDFs or images (up to 100 pages total).</span>
              <input type="file" accept="application/pdf,image/*" multiple className="mt-2 block w-full text-sm" onChange={(event) => setSelectedFiles([...event.target.files].slice(0, 10))} />
            </label>
            {selectedFiles.length > 0 && <p className="text-xs text-slate-500">{selectedFiles.map((file) => file.name).join(', ')}</p>}
            <button type="submit" disabled={busy} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-moss px-4 py-2.5 font-semibold text-white hover:bg-ink disabled:opacity-50">
              {busy ? <LoaderCircle className="animate-spin" size={17} /> : <Plus size={17} />} Create topic
            </button>
            <div className="flex gap-2 border-t border-slate-100 pt-3">
              <label className="sr-only" htmlFor="new-unit-title">New unit title</label>
              <input id="new-unit-title" maxLength={120} value={newUnitTitle} onChange={(event) => setNewUnitTitle(event.target.value)} placeholder="New unit name" className="min-w-0 flex-1 rounded-xl border border-slate-300 px-3 py-2" />
              <button type="button" onClick={addUnit} disabled={!newUnitTitle.trim() || createUnit.isPending} className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold disabled:opacity-50">Add unit</button>
            </div>
          </form>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
          {!selectedId ? (
            <div className="flex min-h-64 flex-col items-center justify-center text-center text-slate-600">
              <BookOpen aria-hidden="true" className="text-moss" size={36} />
              <p className="mt-3 font-semibold text-ink">Choose a topic to review</p>
              <p className="mt-1 text-sm">Edit notes and key points before explaining them.</p>
            </div>
          ) : selectedQuery.isLoading ? <p role="status">Loading topic…</p> : selectedQuery.isError ? (
            <p role="alert" className="text-red-800">{selectedQuery.error.message}</p>
          ) : (
            <form onSubmit={saveEdits} className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-xl font-bold">Review and edit</h2>
                <button type="button" onClick={removeTopic} disabled={busy} aria-label="Delete topic" title="Delete topic" className="rounded-lg border border-red-200 p-2 text-red-800 hover:bg-red-50"><Trash2 size={18} /></button>
              </div>
              <label className="block text-sm font-semibold">Title
                <input required maxLength={160} value={title} onChange={(event) => setTitle(event.target.value)} className="mt-1 block w-full rounded-xl border border-slate-300 px-3 py-2.5 font-normal" />
              </label>
              <label className="block text-sm font-semibold">Unit
                <select value={unitId} onChange={(event) => setUnitId(event.target.value)} className="mt-1 block w-full rounded-xl border border-slate-300 px-3 py-2.5 font-normal">
                  <option value="">No unit</option>
                  {units.map((unit) => <option key={unit.id} value={unit.id}>{unit.title}</option>)}
                </select>
              </label>
              <label className="block text-sm font-semibold">Notes
                <textarea rows={5} value={notes} onChange={(event) => setNotes(event.target.value)} className="mt-1 block w-full rounded-xl border border-slate-300 px-3 py-2.5 font-normal" />
              </label>
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="font-semibold">Key points ({keyPoints.length})</h3>
                  <button type="button" onClick={() => setKeyPoints((items) => [...items, { id: Math.max(0, ...items.map((item) => Number(item.id))) + 1, text: '' }])} disabled={keyPoints.length >= 50} className="inline-flex items-center gap-1 text-sm font-semibold text-moss disabled:opacity-40"><Plus size={16} /> Add point</button>
                </div>
                <ol className="space-y-2">
                  {keyPoints.map((point, index) => <li key={point.id} className="flex items-start gap-2">
                    <span className="mt-2 text-sm font-semibold text-slate-500">{index + 1}.</span>
                    <label className="sr-only" htmlFor={`point-${point.id}`}>Key point {index + 1}</label>
                    <textarea id={`point-${point.id}`} required maxLength={500} rows={2} value={point.text} onChange={(event) => setKeyPoints((items) => items.map((item) => item.id === point.id ? { ...item, text: event.target.value } : item))} className="min-w-0 flex-1 rounded-xl border border-slate-300 px-3 py-2" />
                    <button type="button" onClick={() => setKeyPoints((items) => items.filter((item) => item.id !== point.id))} aria-label={`Remove key point ${index + 1}`} className="mt-1 rounded-lg p-2 text-slate-500 hover:bg-red-50 hover:text-red-800"><Trash2 size={16} /></button>
                  </li>)}
                </ol>
              </div>
              <div className="rounded-xl bg-paper p-3">
                <p className="text-sm font-semibold">Study material</p>
                <p className="mt-1 text-xs text-slate-600">{selectedQuery.data.topicFiles?.length ? `${selectedQuery.data.topicFiles.reduce((sum, file) => sum + file.pageCount, 0)} pages uploaded` : 'No files uploaded yet.'}</p>
                <div className="mt-3 flex flex-wrap items-end gap-2">
                  <label className="min-w-0 flex-1 text-xs font-medium">Add or replace source material
                    <input type="file" accept="application/pdf,image/*" multiple className="mt-1 block w-full text-xs" onChange={(event) => setSelectedFiles([...event.target.files].slice(0, 10))} />
                  </label>
                  <button type="button" onClick={uploadMore} disabled={busy || !selectedFiles.length} className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold disabled:opacity-50"><Upload size={15} /> Analyze</button>
                </div>
              </div>
              {message && <p role="status" className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-900">{message}</p>}
              {errorText && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-900">{errorText}</p>}
              <button type="submit" disabled={busy} className="inline-flex items-center gap-2 rounded-xl bg-moss px-4 py-2.5 font-semibold text-white hover:bg-ink disabled:opacity-50">
                {busy ? <LoaderCircle className="animate-spin" size={17} /> : <Save size={17} />} Save topic
              </button>
            </form>
          )}
        </section>
      </div>
    </main>
  );
}