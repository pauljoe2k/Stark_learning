import { useState } from 'react';
import { AlertCircle, MapPin, Plus } from 'lucide-react';
import { AddPlaceDialog } from '../components/palace/AddPlaceDialog';
import { PlaceCard } from '../components/palace/PlaceCard';
import { usePlaces } from '../hooks/usePlaces';

export function PalacePage() {
  const placesQuery = usePlaces();
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <section className="palace-page">
      <header className="palace-heading">
        <div>
          <span className="eyebrow">PINPOINT / PALACE</span>
          <h1>Make ideas memorable.</h1>
          <p>Pin the ideas you understand to places you know by heart.</p>
        </div>
        <button className="primary-button add-place-button" type="button" onClick={() => setDialogOpen(true)}>
          <Plus size={18} aria-hidden="true" /> Add place
        </button>
      </header>

      {placesQuery.isPending && (
        <div className="place-grid" aria-label="Loading places">
          {[0, 1, 2].map((item) => <div className="place-card-skeleton" key={item} />)}
        </div>
      )}
      {placesQuery.isError && (
        <div className="palace-error" role="alert">
          <AlertCircle size={18} aria-hidden="true" />
          <span>{placesQuery.error.message}</span>
          <button type="button" className="text-button" onClick={() => void placesQuery.refetch()}>Try again</button>
        </div>
      )}
      {placesQuery.isSuccess && placesQuery.data.length === 0 && (
        <div className="palace-empty">
          <span className="palace-empty-mark"><MapPin size={24} aria-hidden="true" /></span>
          <h2>Start with somewhere familiar</h2>
          <p>Add a photo of a room or place you know well. Then give each key idea its own spot.</p>
          <button className="primary-button" type="button" onClick={() => setDialogOpen(true)}>
            <Plus size={17} aria-hidden="true" /> Add your first place
          </button>
        </div>
      )}
      {placesQuery.isSuccess && placesQuery.data.length > 0 && (
        <div className="place-grid">
          {placesQuery.data.map((place, index) => (
            <div className="place-card-enter" style={{ animationDelay: `${Math.min(index * 45, 270)}ms` }} key={place.id}>
              <PlaceCard place={place} />
            </div>
          ))}
        </div>
      )}
      {dialogOpen && <AddPlaceDialog onClose={() => setDialogOpen(false)} />}
    </section>
  );
}
