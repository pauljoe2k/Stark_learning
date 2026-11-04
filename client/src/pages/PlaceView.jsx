import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Check, LoaderCircle, MapPinPlus, Pencil, Trash2, X } from 'lucide-react';
import FlagPanel from '../components/palace/FlagPanel.jsx';
import PlaceCanvas from '../components/palace/PlaceCanvas.jsx';
import {
  useCreateFlag,
  useDeleteFlag,
  useDeletePlace,
  usePlace,
  useRenamePlace,
  useUpdateFlag,
} from '../hooks/usePlaces.js';
import { useTopics } from '../hooks/useStudy.js';

export default function PlaceView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: place, isLoading, isError, error } = usePlace(id);
  const { data: topics = [] } = useTopics();
  const renamePlace = useRenamePlace(id);
  const deletePlace = useDeletePlace(id);
  const createFlag = useCreateFlag(id);
  const updateFlag = useUpdateFlag(id);
  const deleteFlag = useDeleteFlag(id);
  const [addMode, setAddMode] = useState(false);
  const [selectedFlag, setSelectedFlag] = useState(null);
  const [draft, setDraft] = useState(null);
  const [editingName, setEditingName] = useState(false);
  const [name, setName] = useState('');
  const [pageError, setPageError] = useState('');

  useEffect(() => {
    if (place) setName(place.name);
  }, [place?.id, place?.name]);

  function closePanel() {
    setSelectedFlag(null);
    setDraft(null);
    setPageError('');
  }

  async function saveDraft(data) {
    setPageError('');
    await createFlag.mutateAsync(data);
    closePanel();
    setAddMode(false);
  }

  async function updateSelected(flagId, data) {
    setPageError('');
    await updateFlag.mutateAsync({ id: flagId, data });
    setSelectedFlag((current) => current ? { ...current, ...data } : current);
  }

  async function removeFlag(flagId) {
    setPageError('');
    await deleteFlag.mutateAsync(flagId);
    closePanel();
  }

  async function saveName(event) {
    event.preventDefault();
    if (!name.trim()) {
      setPageError('Place name cannot be empty.');
      return;
    }
    try {
      setPageError('');
      await renamePlace.mutateAsync({ name: name.trim() });
      setEditingName(false);
    } catch (requestError) {
      setPageError(requestError.message);
    }
  }

  async function removePlace() {
    if (!window.confirm(`Delete "${place.name}" and all its flags? This cannot be undone.`)) return;
    try {
      await deletePlace.mutateAsync();
      navigate('/palace');
    } catch (requestError) {
      setPageError(requestError.message);
    }
  }

  if (isLoading) return <main className="mx-auto max-w-7xl p-6" role="status">Loading place…</main>;
  if (isError) return (
    <main className="mx-auto max-w-7xl p-6">
      <Link to="/palace" className="inline-flex items-center gap-2 font-semibold text-moss"><ArrowLeft size={18} /> Back to places</Link>
      <p role="alert" className="mt-6 rounded-xl bg-red-50 p-4 text-red-900">{error.message || 'Place could not be loaded.'}</p>
    </main>
  );
  if (!place) return null;

  const panelError = pageError || createFlag.error?.message || updateFlag.error?.message || deleteFlag.error?.message || '';
  const isSavingFlag = createFlag.isPending || updateFlag.isPending || deleteFlag.isPending;

  return (
    <main className="mx-auto min-h-screen max-w-7xl px-4 pb-[58vh] pt-5 sm:px-8 sm:pt-8 md:pb-8">
      <Link to="/palace" className="inline-flex items-center gap-2 rounded-lg py-2 pr-3 font-semibold text-moss hover:text-ink">
        <ArrowLeft aria-hidden="true" size={19} /> Back to places
      </Link>
      <header className="mb-5 mt-3 flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          {editingName ? (
            <form onSubmit={saveName} className="flex max-w-xl items-center gap-2">
              <label htmlFor="place-name" className="sr-only">Place name</label>
              <input id="place-name" autoFocus maxLength={80} value={name} onChange={(event) => setName(event.target.value)} className="min-w-0 flex-1 rounded-xl border border-slate-300 px-3 py-2 text-xl font-bold" />
              <button type="submit" disabled={renamePlace.isPending} aria-label="Save place name" className="rounded-lg bg-moss p-2 text-white disabled:opacity-50"><Check size={19} /></button>
              <button type="button" onClick={() => { setEditingName(false); setName(place.name); }} aria-label="Cancel place name edit" className="rounded-lg border p-2"><X size={19} /></button>
            </form>
          ) : (
            <div className="flex items-center gap-2">
              <h1 className="truncate text-2xl font-bold sm:text-3xl">{place.name}</h1>
              <button type="button" aria-label="Rename place" title="Rename place" onClick={() => setEditingName(true)} className="rounded-lg p-2 text-slate-600 hover:bg-white"><Pencil size={17} /></button>
            </div>
          )}
          <p className="mt-1 text-sm text-slate-600">{place.flags.length} {place.flags.length === 1 ? 'flag' : 'flags'}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-pressed={addMode}
            onClick={() => { setAddMode((value) => !value); closePanel(); }}
            className={`inline-flex items-center gap-2 rounded-xl px-3 py-2.5 font-semibold sm:px-4 ${addMode ? 'bg-ink text-white' : 'bg-moss text-white hover:bg-ink'}`}
          >
            <MapPinPlus aria-hidden="true" size={18} /> {addMode ? 'Cancel add' : 'Add flag'}
          </button>
          <button type="button" disabled={deletePlace.isPending} onClick={removePlace} aria-label="Delete place" title="Delete place" className="rounded-xl border border-red-200 p-2.5 text-red-800 hover:bg-red-50 disabled:opacity-50">
            {deletePlace.isPending ? <LoaderCircle className="animate-spin" size={19} /> : <Trash2 aria-hidden="true" size={19} />}
          </button>
        </div>
      </header>

      {pageError && <p role="alert" className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-900">{pageError}</p>}
      <div className="flex flex-col gap-5 md:flex-row md:items-start">
        <PlaceCanvas
          place={place}
          addMode={addMode}
          flags={place.flags}
          selectedFlag={selectedFlag}
          onSelectFlag={(flag) => { setSelectedFlag(flag); setDraft(null); setAddMode(false); }}
          onDraft={(position) => { setDraft(position); setSelectedFlag(null); setAddMode(false); }}
        />
        {(selectedFlag || draft) && (
          <FlagPanel
            key={draft ? `new-${draft.x}-${draft.y}` : selectedFlag.id}
            flag={selectedFlag}
            draft={draft}
            onClose={closePanel}
            onSave={saveDraft}
            onUpdate={updateSelected}
            onDelete={removeFlag}
            topics={topics}
            saving={isSavingFlag}
            error={panelError}
          />
        )}
      </div>
    </main>
  );
}