import { useCallback, useEffect, useMemo, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import { divIcon, type LatLngTuple } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './Pharmacies.css';
import { useAuth } from '../auth/AuthContext';
import { distanceKm, formatDistance, type LatLng } from './geo';

interface Pharmacy {
  id: number;
  name: string;
  address: string | null;
  city: string;
  latitude: number;
  longitude: number;
}

type GeoState = 'asking' | 'ok' | 'denied' | 'unavailable';

const DEFAULT_RADIUS_KM = 2;
const DEFAULT_CENTER: LatLngTuple = [45.7489, 21.2087]; // only used until the pharmacies are loaded

// Custom markers made with CSS: no image files, so nothing breaks when bundling
const iconIn = divIcon({
  className: 'pharm-pin pharm-pin--in',
  html: '+',
  iconSize: [22, 22],
  iconAnchor: [11, 11],
  popupAnchor: [0, -12],
});
const iconOut = divIcon({
  className: 'pharm-pin pharm-pin--out',
  html: '+',
  iconSize: [22, 22],
  iconAnchor: [11, 11],
  popupAnchor: [0, -12],
});
const iconYou = divIcon({
  className: 'pharm-you',
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

/** Moves the map: fits all points when the data changes, flies to a pharmacy when one is picked. */
function MapController({ fitPoints, focus }: { fitPoints: LatLngTuple[]; focus: LatLngTuple | null }) {
  const map = useMap();

  useEffect(() => {
    if (fitPoints.length > 0) map.fitBounds(fitPoints, { padding: [40, 40], maxZoom: 15 });
  }, [map, fitPoints]);

  useEffect(() => {
    if (focus) map.flyTo(focus, 17);
  }, [map, focus]);

  return null;
}

export default function PharmaciesPage() {
  const { user, authFetch } = useAuth();
  const city = user?.city ?? '';

  const [pharmacies, setPharmacies] = useState<Pharmacy[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  const [radiusKm, setRadiusKm] = useState<number>(DEFAULT_RADIUS_KM);
  const [userPos, setUserPos] = useState<LatLng | null>(null);
  const [geoState, setGeoState] = useState<GeoState>('asking');
  const [focusReq, setFocusReq] = useState<{ id: number; n: number } | null>(null);

  // --- the user's location (needs their permission) ---
  const locate = useCallback(() => {
    if (!('geolocation' in navigator)) {
      setGeoState('unavailable');
      return;
    }
    setGeoState('asking');
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setUserPos({ lat: p.coords.latitude, lng: p.coords.longitude });
        setGeoState('ok');
      },
      () => setGeoState('denied'),
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 },
    );
  }, []);

  useEffect(() => {
    locate();
  }, [locate]);

  // --- all pharmacies of the user's city, from the database ---
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');

    authFetch(`/api/pharmacies?city=${encodeURIComponent(city)}`)
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return (await res.json()) as Pharmacy[];
      })
      .then((data) => {
        if (!cancelled) setPharmacies(data);
      })
      .catch(() => {
        if (!cancelled) setError('Nu am putut încărca farmaciile. Încearcă din nou în câteva momente.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [city, authFetch]);

  // --- distances and the radius filter ---
  const withDistance = useMemo(
    () =>
      pharmacies.map((p) => ({
        ...p,
        distanceKm: userPos ? distanceKm(userPos, { lat: p.latitude, lng: p.longitude }) : null,
      })),
    [pharmacies, userPos],
  );

  const nearby = useMemo(
    () =>
      withDistance
        .filter((p) => p.distanceKm !== null && p.distanceKm <= radiusKm)
        .sort((a, b) => (a.distanceKm as number) - (b.distanceKm as number)),
    [withDistance, radiusKm],
  );

  const nearbyIds = useMemo(() => new Set(nearby.map((p) => p.id)), [nearby]);

  // Points the map zooms to when data loads. The user's own position is included only
  // if they are actually near the city, so someone abroad doesn't get a world-sized map.
  const fitPoints = useMemo<LatLngTuple[]>(() => {
    const points: LatLngTuple[] = pharmacies.map((p) => [p.latitude, p.longitude]);
    const closest = Math.min(...withDistance.map((p) => p.distanceKm ?? Infinity));
    if (userPos && closest < 30) points.push([userPos.lat, userPos.lng]);
    return points;
  }, [pharmacies, withDistance, userPos]);

  const focus = useMemo<LatLngTuple | null>(() => {
    const p = focusReq ? pharmacies.find((x) => x.id === focusReq.id) : undefined;
    return p ? [p.latitude, p.longitude] : null;
  }, [focusReq, pharmacies]);

  const listItems = userPos ? nearby : withDistance;
  const radiusLabel = radiusKm.toFixed(1).replace('.', ',').replace(',0', '');

  return (
    <div className="home home--wide">
      <header className="home__top">
        <span className="home__logo">{import.meta.env.VITE_APP_NAME}</span>
        <span className="home__location">{city}</span>
      </header>

      <main className="pharm">
        <h1 className="pharm__title">Farmacii din {city}</h1>

        <section className="pharm-controls" aria-label="Rază de căutare">
          <div className="pharm-controls__row">
            <label htmlFor="radius" className="pharm-controls__label">Rază de căutare</label>
            <span className="pharm-controls__value">{radiusLabel} km</span>
          </div>
          <input
            id="radius"
            type="range"
            min={0.5}
            max={10}
            step={0.5}
            value={radiusKm}
            onChange={(e) => setRadiusKm(Number(e.target.value))}
          />
          {geoState === 'asking' && <p className="pharm-controls__hint">Căutăm locația ta…</p>}
          {geoState === 'ok' && (
            <p className="pharm-controls__hint">
              {nearby.length === 1 ? '1 farmacie' : `${nearby.length} farmacii`} în raza de {radiusLabel} km față de tine.
            </p>
          )}
          {(geoState === 'denied' || geoState === 'unavailable') && (
            <p className="pharm-controls__hint">
              Nu avem acces la locația ta, așa că arătăm toate farmaciile din oraș. Permite locația în browser și{' '}
              <button type="button" onClick={locate}>încearcă din nou</button>.
            </p>
          )}
        </section>

        <section className="pharm-map" aria-label="Harta farmaciilor">
          <MapContainer center={DEFAULT_CENTER} zoom={13} scrollWheelZoom>
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
              maxZoom={19}
            />
            <MapController fitPoints={fitPoints} focus={focus} />

            {userPos && (
              <>
                <Circle
                  center={[userPos.lat, userPos.lng]}
                  radius={radiusKm * 1000}
                  pathOptions={{ color: '#0f6b5c', weight: 1.5, fillColor: '#0f6b5c', fillOpacity: 0.08 }}
                />
                <Marker position={[userPos.lat, userPos.lng]} icon={iconYou}>
                  <Popup>Tu ești aici</Popup>
                </Marker>
              </>
            )}

            {withDistance.map((p) => (
              <Marker
                key={p.id}
                position={[p.latitude, p.longitude]}
                icon={nearbyIds.has(p.id) ? iconIn : iconOut}
              >
                <Popup>
                  <p className="pharm-popup__name">{p.name}</p>
                  {p.address && <p className="pharm-popup__meta">{p.address}</p>}
                  {p.distanceKm !== null && <p className="pharm-popup__meta">{formatDistance(p.distanceKm)} de tine</p>}
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </section>

        <section aria-labelledby="pharm-list-title">
          <h2 id="pharm-list-title" className="pharm-list__title">
            {userPos ? `În raza de ${radiusLabel} km` : `Toate farmaciile din ${city}`}
          </h2>

          {loading && <p className="pharm-status">Se încarcă farmaciile…</p>}
          {error && <p className="pharm-status pharm-status--error">{error}</p>}
          {!loading && !error && pharmacies.length === 0 && (
            <p className="pharm-list__empty">Nu avem încă farmacii în baza de date pentru {city}.</p>
          )}
          {!loading && !error && pharmacies.length > 0 && listItems.length === 0 && (
            <p className="pharm-list__empty">Nicio farmacie în această rază. Mărește raza de căutare.</p>
          )}

          <ul className="rows">
            {listItems.map((p) => (
              <li key={p.id} className="pharm-list__item">
                <button
                  type="button"
                  className="row pharm-row"
                  onClick={() => setFocusReq({ id: p.id, n: Date.now() })}
                >
                  <div className="row__main">
                    <p className="row__name">{p.name}</p>
                    {p.address && <p className="row__meta">{p.address}</p>}
                  </div>
                  {p.distanceKm !== null && <span className="row__side">{formatDistance(p.distanceKm)}</span>}
                </button>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </div>
  );
}