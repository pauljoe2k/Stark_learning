import { useState } from 'react';
import { ImagePlus, LoaderCircle, X } from 'lucide-react';
import { useCreatePlace } from '../../hooks/usePlaces.js';
import { compressImage } from '../../lib/helpers.js';

export default function AddPlaceDialog({ onClose }) {
  const createPlace = useCreatePlace();
  const [name, setName] = useState('');
  const [file, setFile] = useState(null);
  const [error, setError] = useState('');

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    if (!name.trim()) {
      setError('Enter a name for this place.');
      return;
    }
    if (!file) {
      setError('Choose a photo for this place.');
      return;
    }
    try {
      const compressed = await compressImage(file);
      const formData = new FormData();
      formData.append('name', name.trim());
      formData.append('image', new File([compressed], file.name, { type: compressed.type }));
      await createPlace.mutateAsync(formData);
      onClose();
    } catch (requestError) {
      setError(requestError.message || 'The place could not be saved.');
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/50 p-0 sm:items-center sm:p-4" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget && !createPlace.isPending) onClose();
    }}>
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-place-title"
        className="w-full rounded-t-3xl bg-white p-5 shadow-xl sm:max-w-lg sm:rounded-3xl sm:p-7"
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 id="add-place-title" className="text-xl font-bold">Add a place</h2>
          <button type="button" onClick={onClose} aria-label="Close dialog" className="rounded-full p-2 hover:bg-paper">
            <X aria-hidden="true" size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block text-sm font-semibold">
            Place name
            <input
              autoFocus
              maxLength={80}
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2.5 font-normal"
              placeholder="e.g. My garden"
            />
          </label>
          <label className="flex min-h-32 cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-300 bg-paper p-4 text-center">
            <ImagePlus aria-hidden="true" className="text-moss" size={28} />
            <span className="text-sm font-semibold">{file ? file.name : 'Choose a photo or take one'}</span>
            <span className="text-xs text-slate-600">Images are compressed before upload</span>
            <input
              className="sr-only"
              type="file"
              accept="image/*"
              capture="environment"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            />
          </label>
          {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}
          <div className="flex justify-end gap-3 pt-1">
            <button type="button" onClick={onClose} disabled={createPlace.isPending} className="rounded-xl px-4 py-2.5 font-semibold hover:bg-paper disabled:opacity-50">
              Cancel
            </button>
            <button type="submit" disabled={createPlace.isPending} className="inline-flex items-center gap-2 rounded-xl bg-moss px-4 py-2.5 font-semibold text-white hover:bg-ink disabled:opacity-60">
              {createPlace.isPending && <LoaderCircle aria-hidden="true" className="animate-spin" size={17} />}
              {createPlace.isPending ? 'Saving…' : 'Save place'}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}