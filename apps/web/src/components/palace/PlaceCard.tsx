import { ArrowUpRight, MapPin } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { PlaceRecord } from '../../api';

export function PlaceCard({ place }: { place: PlaceRecord }) {
  return (
    <Link className="place-card" to={`/palace/${place.id}`} aria-label={`Open ${place.name}, ${place.flagsCount} flags`}>
      <img src={place.imageUrl} alt="" loading="lazy" />
      <div className="place-card-shade" />
      <div className="place-card-content">
        <div>
          <h2>{place.name}</h2>
          <span><MapPin size={14} aria-hidden="true" /> {place.flagsCount} {place.flagsCount === 1 ? 'flag' : 'flags'}</span>
        </div>
        <ArrowUpRight size={19} aria-hidden="true" />
      </div>
    </Link>
  );
}
