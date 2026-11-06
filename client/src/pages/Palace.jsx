import { useState } from 'react';
import { Plus, RefreshCw, Map } from 'lucide-react';
import AddPlaceDialog from '../components/palace/AddPlaceDialog.jsx';
import PlaceCard from '../components/palace/PlaceCard.jsx';
import { usePlaces } from '../hooks/usePlaces.js';

export default function Palace() {
  const { data: places = [], isLoading, isError, error, refetch } = usePlaces();
  const [showDialog, setShowDialog] = useState(false);

  return (
    <main className="mx-auto min-h-screen max-w-7xl px-4 py-8 sm:px-8 sm:py-12">
      <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-moss">PALACE</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">Your places</h1>
          <p className="mt-2 max-w-xl text-slate-600">Turn familiar spaces into memorable paths. Add flags to remember what matters.</p>
        </div>
        <button type="button" onClick={() => setShowDialog(true)} className="inline-flex items-center gap-2 rounded-xl bg-moss px-4 py-3 font-semibold text-white shadow-sm hover:bg-ink">
          <Plus aria-hidden="true" size={19} /> Add place
        </button>
      </header>

      {isLoading && <p role="status" className="rounded-xl bg-white p-5 text-slate-600">Loading your places…</p>}
      {isError && (
        <section role="alert" className="rounded-2xl border border-red-200 bg-white p-6">
          <p className="font-semibold text-red-900">Places could not be loaded.</p>
          <p className="mt-1 text-sm text-slate-600">{error.message}</p>
          <button type="button" onClick={() => refetch()} className="mt-4 inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 font-semibold hover:bg-paper">
            <RefreshCw aria-hidden="true" size={16} /> Try again
          </button>
        </section>
      )}
      {!isLoading && !isError && places.length === 0 && (
        <section className="rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
          <Map aria-hidden="true" className="mx-auto text-moss" size={40} />
          <h2 className="mt-4 text-xl font-bold">Your palace starts with a place</h2>
          <p className="mx-auto mt-2 max-w-md text-slate-600">Add a photo of a familiar room, garden, or route. Then drop flags on it to build memorable associations.</p>
          <button type="button" onClick={() => setShowDialog(true)} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-moss px-4 py-2.5 font-semibold text-white hover:bg-ink">
            <Plus aria-hidden="true" size={18} /> Add your first place
          </button>
        </section>
      )}
      {!isLoading && !isError && places.length > 0 && (
        <section aria-label="Your places" className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {places.map((place) => <PlaceCard key={place.id} place={place} />)}
        </section>
      )}
      {showDialog && <AddPlaceDialog onClose={() => setShowDialog(false)} />}
    </main>
  );
}