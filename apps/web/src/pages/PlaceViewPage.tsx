import { useEffect, useState, type FormEvent } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertCircle, ArrowLeft, Check, Pencil, Plus, Trash2, X } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import type { CreateFlagBody } from '@pinpoint/shared';
import { api } from '../api';
import { useAuth } from '../auth';
import { FlagPanel } from '../components/palace/FlagPanel';
import { PlaceCanvas, type FlagPosition } from '../components/palace/PlaceCanvas';
import {
  useCreateFlag,
  useDeleteFlag,
  useDeletePlace,
  usePlace,
  useRenamePlace,
  useUpdateFlag,
} from '../hooks/usePlaces';

type FlagDraft = Omit<CreateFlagBody, 'placeId' | 'topicId' | 'keyPointId'>
  & { topicId?: number | null; keyPointId?: number | null };

export function PlaceViewPage() {
  const { id: routeId } = useParams();
  const placeId = Number(routeId);
  const validPlaceId = Number.isInteger(placeId) && placeId > 0;
  const { token } = useAuth();
  const navigate = useNavigate();
  const placeQuery = usePlace(validPlaceId ? placeId : undefined);
  const [addMode, setAddMode] = useState(false);
  const [draftPosition, setDraftPosition] = useState<FlagPosition | null>(null);
  const [selectedFlagId, setSelectedFlagId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState(false);
  const [name, setName] = useState('');
  const [nameError, setNameError] = useState('');

  const topicsQuery = useQuery({
    queryKey: ['topics', token],
    queryFn: async () => {
      if (!token) throw new Error('Sign in to load topics.');
      return (await api.topics(token)).topics;
    },
    enabled: Boolean(token),
  });
  const renameMutation = useRenamePlace(placeId);
  const deletePlaceMutation = useDeletePlace(placeId);
  const createFlagMutation = useCreateFlag(placeId);
  const updateFlagMutation = useUpdateFlag(placeId);
  const deleteFlagMutation = useDeleteFlag(placeId);
  const place = placeQuery.data;
  const selectedFlag = place?.flags.find((flag) => flag.id === selectedFlagId) ?? null;

  useEffect(() => {
    if (place) setName(place.name);
  }, [place]);

  async function saveName(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setNameError('');
    try {
      await renameMutation.mutateAsync(name.trim());
      setEditingName(false);
    } catch (error) {
      setNameError(error instanceof Error ? error.message : 'The place could not be renamed.');
    }
  }

  async function deletePlace(): Promise<void> {
    if (!place || !window.confirm(`Delete "${place.name}" and all its flags? This cannot be undone.`)) return;
    try {
      await deletePlaceMutation.mutateAsync();
      navigate('/palace');
    } catch {
      return;
    }
  }

  async function saveFlag(draft: FlagDraft): Promise<void> {
    if (selectedFlag) {
      await updateFlagMutation.mutateAsync({ id: selectedFlag.id, changes: draft });
      return;
    }
    const { topicId, keyPointId, ...newFlag } = draft;
    const created = await createFlagMutation.mutateAsync({
      ...newFlag,
      ...(typeof topicId === 'number' ? { topicId } : {}),
      ...(typeof keyPointId === 'number' ? { keyPointId } : {}),
    });
    setDraftPosition(null);
    setSelectedFlagId(created.id);
  }

  async function removeFlag(): Promise<void> {
    if (!selectedFlag) return;
    await deleteFlagMutation.mutateAsync(selectedFlag.id);
    setSelectedFlagId(null);
    setDraftPosition(null);
  }

  function closePanel(): void {
    setSelectedFlagId(null);
    setDraftPosition(null);
  }

  if (!validPlaceId) {
    return <PlaceNotFound message="That place address is not valid." />;
  }
  if (placeQuery.isPending) {
    return <section className="place-view-page"><div className="place-view-skeleton" aria-label="Loading place" /></section>;
  }
  if (placeQuery.isError || !place) {
    return <PlaceNotFound message={placeQuery.error instanceof Error ? placeQuery.error.message : 'Place not found.'} />;
  }

  const saving = createFlagMutation.isPending || updateFlagMutation.isPending;
  const flagForPanel = selectedFlagId === null ? null : selectedFlag;
  const panelOpen = draftPosition !== null || selectedFlagId !== null;

  return (
    <section className="place-view-page">
      <header className="place-view-header">
        <Link className="back-link" to="/palace"><ArrowLeft size={17} aria-hidden="true" /> All places</Link>
        <div className="place-view-title">
          {editingName ? (
            <form className="rename-place-form" onSubmit={(event) => void saveName(event)}>
              <label className="visually-hidden" htmlFor="rename-place">Place name</label>
              <input id="rename-place" autoFocus maxLength={80} value={name} onChange={(event) => setName(event.target.value)} />
              <button type="submit" className="icon-button" disabled={renameMutation.isPending || !name.trim()} aria-label="Save place name">
                <Check size={17} />
              </button>
              <button type="button" className="icon-button" onClick={() => { setEditingName(false); setName(place.name); }} aria-label="Cancel rename">
                <X size={17} />
              </button>
            </form>
          ) : (
            <>
              <h1>{place.name}</h1>
              <button type="button" className="icon-button rename-place-button" onClick={() => setEditingName(true)} aria-label="Rename place">
                <Pencil size={16} aria-hidden="true" />
              </button>
            </>
          )}
        </div>
        {nameError && <p className="form-error" role="alert">{nameError}</p>}
        <div className="place-view-actions">
          <button
            type="button"
            className={`primary-button${addMode ? ' add-mode-active' : ''}`}
            onClick={() => {
              closePanel();
              setAddMode((current) => !current);
            }}
          >
            {addMode ? <X size={17} aria-hidden="true" /> : <Plus size={18} aria-hidden="true" />}
            {addMode ? 'Cancel adding' : 'Add flag'}
          </button>
          <button
            type="button"
            className="danger-outline-button"
            onClick={() => void deletePlace()}
            disabled={deletePlaceMutation.isPending}
          >
            <Trash2 size={16} aria-hidden="true" /> {deletePlaceMutation.isPending ? 'Deleting…' : 'Delete place'}
          </button>
        </div>
      </header>

      {deletePlaceMutation.isError && <p className="form-error" role="alert">{deletePlaceMutation.error.message}</p>}
      {updateFlagMutation.isError && !panelOpen && <p className="form-error" role="alert">{updateFlagMutation.error.message}</p>}
      <div className={`place-view-layout${panelOpen ? ' panel-open' : ''}`}>
        <div className="place-canvas-column">
          {place.flags.length === 0 && !addMode && (
            <p className="place-canvas-hint"><MapPinLabel /> Add a flag, then tap a memorable spot in the photo.</p>
          )}
          <PlaceCanvas
            imageUrl={place.imageUrl}
            imageAlt={`Photo of ${place.name}`}
            flags={place.flags}
            selectedFlagId={selectedFlagId}
            addMode={addMode}
            onDraftPosition={(position) => {
              setDraftPosition(position);
              setSelectedFlagId(null);
              setAddMode(false);
            }}
            onSelectFlag={(flagId) => {
              setSelectedFlagId(flagId);
              setDraftPosition(null);
              setAddMode(false);
            }}
            onReposition={(flagId, position) => {
              updateFlagMutation.mutate({ id: flagId, changes: position });
            }}
          />
        </div>
        {panelOpen && (
          <FlagPanel
            key={selectedFlag ? `flag-${selectedFlag.id}` : `draft-${draftPosition?.x}-${draftPosition?.y}`}
            flag={flagForPanel}
            position={draftPosition}
            topics={topicsQuery.data ?? []}
            saving={saving}
            deleting={deleteFlagMutation.isPending}
            onClose={closePanel}
            onSave={saveFlag}
            onDelete={removeFlag}
          />
        )}
      </div>
      {topicsQuery.isError && <p className="form-error" role="alert">Topic links could not be loaded: {topicsQuery.error.message}</p>}
    </section>
  );
}

function PlaceNotFound({ message }: { message: string }) {
  return (
    <div className="place-not-found" role="alert">
      <AlertCircle size={20} aria-hidden="true" />
      <p>{message}</p>
      <Link to="/palace">Return to your places</Link>
    </div>
  );
}

function MapPinLabel() {
  return <span aria-hidden="true">Pick a spot</span>;
}
