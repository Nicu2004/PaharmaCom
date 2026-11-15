import { useEffect, useMemo, useState } from 'react';
import './Medicines.css';
import { useAuth } from '../auth/AuthContext';
import { useGeolocation } from './useGeolocation';
import {
  availabilityUrl,
  formatDistance,
  formatPrice,
  type AvailabilityQuery,
  type MedicineAvailability as Availability,
} from './medicineApi';

interface Props {
  /** Pick ONE of these three: they come from the triage result. */
  symptomId?: string;
  category?: string;
  ingredient?: string;
  /** Shown above the list, e.g. "Pentru durerea ta în gât". */
  title?: string;
  defaultRadiusKm?: number;
}

const RADIUS_STEPS = [1, 2, 5, 10];

export default function MedicineAvailability({
  symptomId,
  category,
  ingredient,
  title = 'Medicamente fără rețetă',
  defaultRadiusKm = 2,
}: Props) {
  const { user, authFetch } = useAuth();
  const { position, state: geoState, locate } = useGeolocation();

  const [radiusKm, setRadiusKm] = useState(defaultRadiusKm);
  const [items, setItems] = useState<Availability[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openCode, setOpenCode] = useState<string | null>(null);

  const query = useMemo<AvailabilityQuery>(
    () => ({
      symptomId,
      category,
      ingredient,
      lat: position?.lat,
      lng: position?.lng,
      city: position ? undefined : user?.city,
      radiusKm,
      limit: 5,
    }),
    [symptomId, category, ingredient, position, user?.city, radiusKm],
  );

  useEffect(() => {
    if (!symptomId && !category && !ingredient) return;
    // wait for the position attempt to settle, so we don't fetch twice
    if (geoState === 'asking') return;

    const controller = new AbortController();
    setLoading(true);
    setError('');

    authFetch(availabilityUrl(query), { signal: controller.signal })
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return (await res.json()) as Availability[];
      })
      .then((data) => setItems(data))
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        setError(err instanceof Error && err.message.startsWith('HTTP')
          ? 'Nu am putut încărca medicamentele.'
          : 'Nu ne-am putut conecta la server.');
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [authFetch, query, geoState, symptomId, category, ingredient]);

  if (!symptomId && !category && !ingredient) return null;

  const available = items.filter((i) => i.pharmacyCount > 0);
  const missing = items.filter((i) => i.pharmacyCount === 0);

  return (
    <section className="med" aria-labelledby="med-title">
      <div className="med__head">
        <div>
          <h2 id="med-title" className="med__title">{title}</h2>
          <p className="med__sub">
            {position
              ? `Stoc în farmaciile la ${radiusKm} km de tine`
              : `Stoc în farmaciile din ${user?.city ?? 'oraș'}`}
          </p>
        </div>
        {position && (
          <div className="med__radius" role="group" aria-label="Rază de căutare">
            {RADIUS_STEPS.map((r) => (
              <button
                key={r}
                type="button"
                className={`med__radius-btn${r === radiusKm ? ' is-active' : ''}`}
                onClick={() => setRadiusKm(r)}
              >
                {r} km
              </button>
            ))}
          </div>
        )}
      </div>

      {(geoState === 'denied' || geoState === 'unavailable') && (
        <p className="med__note">
          Fără acces la locație îți arătăm tot orașul.{' '}
          <button type="button" className="med__link" onClick={locate}>Permite locația</button> ca să vezi
          farmacia cea mai apropiată care are produsul.
        </p>
      )}

      {loading && <p className="med__status">Verificăm stocul farmaciilor…</p>}
      {error && <p className="med__status med__status--error">{error}</p>}

      {!loading && !error && items.length === 0 && (
        <p className="med__status">Nu avem produse pentru acest simptom.</p>
      )}

      <ul className="med__list">
        {available.map((item) => {
          const open = openCode === item.medicine.code;
          const nearest = item.pharmacies[0];
          return (
            <li key={item.medicine.code} className="med-card">
              <div className="med-card__row">
                <div className="med-card__info">
                  <p className="med-card__name">{item.medicine.name}</p>
                  <p className="med-card__meta">
                    {item.medicine.activeIngredient}
                    {item.medicine.form ? ` · ${item.medicine.form}` : ''}
                    {item.medicine.approxPriceRon ? ` · ${formatPrice(item.medicine.approxPriceRon)}` : ''}
                  </p>
                </div>
                <span className="med-card__count">
                  {item.pharmacyCount === 1 ? '1 farmacie' : `${item.pharmacyCount} farmacii`}
                </span>
              </div>

              {nearest && (
                <p className="med-card__nearest">
                  Cea mai apropiată: <strong>{nearest.pharmacyName}</strong>
                  {nearest.distanceKm !== null && <> · {formatDistance(nearest.distanceKm)}</>}
                  {nearest.lowStock && <span className="med-card__low">ultimele bucăți</span>}
                </p>
              )}

              {item.medicine.warning && (
                <p className="med-card__warning">{item.medicine.warning}</p>
              )}

              <button
                type="button"
                className="med__link"
                aria-expanded={open}
                onClick={() => setOpenCode(open ? null : item.medicine.code)}
              >
                {open ? 'Ascunde farmaciile' : 'Vezi farmaciile care îl au'}
              </button>

              {open && (
                <ul className="med-stock">
                  {item.pharmacies.map((p) => (
                    <li key={p.pharmacyId} className="med-stock__item">
                      <div>
                        <p className="med-stock__name">{p.pharmacyName}</p>
                        {p.street && p.street !== 'Adresă indisponibilă' && (
                          <p className="med-stock__street">{p.street}</p>
                        )}
                      </div>
                      <div className="med-stock__side">
                        {p.distanceKm !== null && (
                          <span className="med-stock__dist">{formatDistance(p.distanceKm)}</span>
                        )}
                        <span className={`med-stock__qty${p.lowStock ? ' is-low' : ''}`}>
                          {p.lowStock ? `doar ${p.quantity}` : `${p.quantity} buc.`}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ul>

      {missing.length > 0 && (
        <p className="med__missing">
          Fără stoc în apropiere: {missing.map((m) => m.medicine.name).join(', ')}.
          {position && radiusKm < 10 && (
            <> <button type="button" className="med__link" onClick={() => setRadiusKm(10)}>Caută în 10 km</button></>
          )}
        </p>
      )}

      <p className="med__disclaimer">
        Stocul este informativ și poate diferi. Sună la farmacie înainte să te deplasezi.
        Pentru doze, întreabă farmacistul. Aceasta nu este o recomandare medicală.
      </p>
    </section>
  );
}
