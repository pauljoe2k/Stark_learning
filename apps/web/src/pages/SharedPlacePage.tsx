import { AlertCircle, MapPin } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api';

export function SharedPlacePage({ token }: { token: string }) {
  const sharedQuery = useQuery({
    queryKey: ['shared-place', token],
    queryFn: async () => (await api.sharedPlace(token)).place,
    enabled: /^[a-f0-9]{64}$/i.test(token),
    retry: false,
  });

  if (!/^[a-f0-9]{64}$/i.test(token)) {
    return <main className="shared-place-page"><SharedPlaceUnavailable message="This shared palace link is invalid." /></main>;
  }
  if (sharedQuery.isPending) {
    return <main className="shared-place-page"><div className="recall-card">Loading shared palace…</div></main>;
  }
  if (sharedQuery.isError || !sharedQuery.data) {
    return <main className="shared-place-page"><SharedPlaceUnavailable message={sharedQuery.error.message} /></main>;
  }

  const place = sharedQuery.data;
  return (
    <main className="shared-place-page">
      <header className="shared-place-header">
        <span className="brand"><span className="brand-pin" aria-hidden="true" />Pinpoint</span>
        <span className="eyebrow">READ-ONLY SHARED PALACE</span>
        <h1>{place.name}</h1>
        <p>This palace was shared with you for viewing. Changes are disabled.</p>
      </header>
      <section className="shared-place-canvas" aria-label={`${place.name} and its memory flags`}>
        <img src={place.imageUrl} alt={`Shared photo of ${place.name}`} />
        {place.flags.map((flag, index) => (
          <div className="shared-place-marker" key={flag.id} style={{ left: `${flag.x}%`, top: `${flag.y}%` }}>
            <span>{index + 1}</span>
            <div className="shared-place-tooltip">
              <strong>{flag.emoji ? `${flag.emoji} ` : ''}{flag.title}</strong>
              {flag.note && <p>{flag.note}</p>}
            </div>
          </div>
        ))}
      </section>
      <section className="shared-place-flags">
        <h2>{place.flags.length} {place.flags.length === 1 ? 'memory flag' : 'memory flags'}</h2>
        {place.flags.length ? place.flags.map((flag, index) => (
          <article key={flag.id}>
            <span className="shared-place-flag-index"><MapPin size={15} />{index + 1}</span>
            <div><h3>{flag.emoji ? `${flag.emoji} ` : ''}{flag.title}</h3><p>{flag.note || 'No note'}</p></div>
          </article>
        )) : <p>This place has no flags yet.</p>}
      </section>
    </main>
  );
}

function SharedPlaceUnavailable({ message }: { message: string }) {
  return (
    <section className="recall-card shared-place-unavailable" role="alert">
      <AlertCircle size={24} aria-hidden="true" />
      <h1>Shared palace unavailable</h1>
      <p>{message || 'The owner may have revoked this link.'}</p>
    </section>
  );
}
