import { useState, type FormEvent } from 'react';
import imageCompression from 'browser-image-compression';
import { AlertCircle, X } from 'lucide-react';
import { CameraCapture } from '../CameraCapture';
import { useCreatePlace } from '../../hooks/usePlaces';

interface AddPlaceDialogProps {
  onClose: () => void;
}

export function AddPlaceDialog({ onClose }: AddPlaceDialogProps) {
  const [name, setName] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState('');
  const createPlace = useCreatePlace();

  async function submit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setError('');
    if (!file) {
      setError('Choose or take a photo for this place.');
      return;
    }
    try {
      const compressed = await imageCompression(file, {
        maxSizeMB: 1.5,
        maxWidthOrHeight: 1920,
        useWebWorker: true,
        fileType: 'image/jpeg',
      });
      await createPlace.mutateAsync({ name: name.trim(), image: compressed });
      onClose();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'The place could not be saved.');
    }
  }

  return (
    <div className="dialog-backdrop" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget && !createPlace.isPending) onClose();
    }}>
      <section className="palace-dialog" role="dialog" aria-modal="true" aria-labelledby="add-place-title">
        <header className="dialog-heading">
          <div>
            <span className="eyebrow">A FAMILIAR PLACE</span>
            <h2 id="add-place-title">Add a place</h2>
          </div>
          <button className="icon-button" type="button" onClick={onClose} disabled={createPlace.isPending} aria-label="Close dialog">
            <X size={18} aria-hidden="true" />
          </button>
        </header>
        <form className="palace-dialog-form" onSubmit={(event) => void submit(event)}>
          <label htmlFor="place-name">Place name</label>
          <input
            id="place-name"
            autoFocus
            maxLength={80}
            required
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="e.g. My kitchen"
          />
          <div className="photo-choice">
            <span className="photo-choice-label">Choose or take a photo</span>
            <CameraCapture
              accept="image/*"
              hint="JPEG, PNG or WebP · images are compressed before upload"
              disabled={createPlace.isPending}
              onSelect={setFile}
            />
          </div>
          {file && <p className="selected-photo" role="status">Selected: {file.name}</p>}
          {error && <p className="form-error" role="alert"><AlertCircle size={15} />{error}</p>}
          <div className="dialog-actions">
            <button type="button" className="secondary-button" onClick={onClose} disabled={createPlace.isPending}>Cancel</button>
            <button type="submit" className="primary-button" disabled={createPlace.isPending || !name.trim()}>
              {createPlace.isPending ? 'Saving place…' : 'Save place'}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
