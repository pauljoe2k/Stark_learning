import { Link } from 'react-router-dom';
import { MapPin } from 'lucide-react';

export default function PlaceCard({ place }) {
  const flagCount = place._count?.flags ?? place.flags?.length ?? 0;
  return (
    <Link
      to={`/palace/${place.id}`}
      className="group overflow-hidden rounded-2xl border border-black/5 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-moss"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
        <img
          src={place.imageUrl}
          alt=""
          className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
        />
        <span className="absolute bottom-3 left-3 inline-flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-1.5 text-sm font-semibold shadow">
          <MapPin aria-hidden="true" size={16} />
          {flagCount} {flagCount === 1 ? 'flag' : 'flags'}
        </span>
      </div>
      <div className="p-4">
        <h2 className="truncate text-lg font-semibold text-ink">{place.name}</h2>
      </div>
    </Link>
  );
}