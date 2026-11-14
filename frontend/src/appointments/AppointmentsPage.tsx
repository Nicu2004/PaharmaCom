import { useCallback, useEffect, useMemo, useState } from 'react';
import './Appointments.css';
import { useAuth } from '../auth/AuthContext';
import { useTriage } from '../triage/TriageContext';
import {
  fetchBooking,
  fetchDoctors,
  type BookingState,
  type Doctor,
} from './clinicApi';
import { formatSlot } from './format';
import { suggestSpecialties } from './specialty';
import DoctorAvatar from './DoctorAvatar';
import BookingModal from './BookingModal';

/** What we remember about a request, so "Programările mele" survives a page reload. */
interface StoredBooking {
  id: string;
  doctorName: string | null;
  slotAt: string;
  createdAt: string;
}

const storageKey = (userId: number | undefined) => `doccom.bookings.v1.${userId ?? 'anon'}`;

function loadBookings(key: string): StoredBooking[] {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as StoredBooking[]) : [];
  } catch {
    return [];
  }
}

function saveBookings(key: string, list: StoredBooking[]) {
  try {
    localStorage.setItem(key, JSON.stringify(list));
  } catch {
    /* storage blocked: the list just won't survive a reload */
  }
}

const STATUS_LABEL: Record<BookingState['status'], string> = {
  PENDING: 'În așteptare',
  ACCEPTED: 'Confirmată',
  DECLINED: 'Refuzată',
};

export default function AppointmentsPage() {
  const { user } = useAuth();
  const { triage } = useTriage();

  const [clinicName, setClinicName] = useState<string>('');
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [reloadKey, setReloadKey] = useState<number>(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const key = storageKey(user?.id);
  const [bookings, setBookings] = useState<StoredBooking[]>(() => loadBookings(key));
  const [statuses, setStatuses] = useState<Record<string, BookingState>>({});

  // --- doctors and their free hours, from the clinic ---
  useEffect(() => {
    const controller = new AbortController();
    setError('');
    fetchDoctors(controller.signal)
      .then((data) => {
        setClinicName(data.clinicName);
        setDoctors(data.doctors);
      })
      .catch((e: unknown) => {
        if (controller.signal.aborted) return;
        setError(e instanceof Error ? e.message : 'Nu am putut încărca medicii.');
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [reloadKey]);

  const reloadDoctors = useCallback(() => setReloadKey((k) => k + 1), []);
  const closeModal = useCallback(() => setSelectedId(null), []);

  // --- which doctors fit the symptoms ---
  const wanted = useMemo(
    () => suggestSpecialties(`${triage?.symptoms ?? ''} ${triage?.analysis ?? ''}`, triage?.specialties),
    [triage],
  );

  const { recommended, others } = useMemo(() => {
    const rank = (d: Doctor) => wanted.indexOf(d.specialty);
    const rec = doctors.filter((d) => rank(d) >= 0).sort((a, b) => rank(a) - rank(b));
    const rest = doctors.filter((d) => rank(d) < 0);
    return { recommended: rec, others: rest };
  }, [doctors, wanted]);

  const selected = doctors.find((d) => d.id === selectedId) ?? null;

  // --- "my appointments": statuses come from the clinic, polled while something is pending ---
  const pendingKey = bookings
    .filter((b) => (statuses[b.id]?.status ?? 'PENDING') === 'PENDING')
    .map((b) => b.id)
    .join(',');

  useEffect(() => {
    if (bookings.length === 0) return;
    let cancelled = false;

    const poll = async (ids: string[]) => {
      const results = await Promise.allSettled(ids.map((id) => fetchBooking(id)));
      if (cancelled) return;
      setStatuses((prev) => {
        const next = { ...prev };
        results.forEach((r, i) => {
          if (r.status === 'fulfilled') next[ids[i]] = r.value;
        });
        return next;
      });
    };

    // first load: everything we know about; afterwards: only what is still pending
    void poll(bookings.map((b) => b.id));
    if (!pendingKey) return () => { cancelled = true; };
    const timer = setInterval(() => void poll(pendingKey.split(',')), 6000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookings.length, pendingKey]);

  const onBooked = (booking: BookingState, slotAt: string) => {
    const entry: StoredBooking = {
      id: booking.id,
      doctorName: booking.doctorName,
      slotAt,
      createdAt: new Date().toISOString(),
    };
    const next = [entry, ...bookings];
    setBookings(next);
    saveBookings(key, next);
    setStatuses((s) => ({ ...s, [booking.id]: booking }));
    reloadDoctors(); // the chosen hour is no longer free
  };

  const hide = (id: string) => {
    const next = bookings.filter((b) => b.id !== id);
    setBookings(next);
    saveBookings(key, next);
  };

  const renderDoctor = (d: Doctor, fit: boolean) => (
    <li key={d.id} className="appt-card">
      <div className="appt-card__top">
        <DoctorAvatar doctor={d} />
        <div>
          <h3 className="appt-card__name">{d.name}</h3>
          <p className="appt-card__spec">{d.specialty}</p>
          {fit && <span className="appt-badge">Potrivit simptomelor tale</span>}
        </div>
      </div>
      <p className="appt-card__bio">{d.bio}</p>
      <p className="appt-card__slot">
        {d.nextFreeAt ? (
          <>
            Primul loc liber: <strong>{formatSlot(d.nextFreeAt)}</strong>
          </>
        ) : (
          'Nu are locuri libere în următoarele zile'
        )}
      </p>
      <button type="button" className="btn" disabled={!d.nextFreeAt} onClick={() => setSelectedId(d.id)}>
        Programează la {d.name}
      </button>
    </li>
  );

  return (
    <div className="home home--wide">
      <header className="home__top">
        <span className="home__logo">Doccom</span>
        <span className="home__location">{clinicName || 'Clinică'}</span>
      </header>

      <main className="appt">
        <h1 className="appt__title">Programări</h1>

        {/* what the doctors were picked from */}
        {triage ? (
          <section className="appt-note" aria-label="Simptomele tale">
            <p className="appt-note__label">Pe baza simptomelor tale</p>
            <p className="appt-note__text">{triage.symptoms || 'Fotografii trimise'}</p>
            <div className="appt-note__chips">
              {wanted.map((s) => (
                <span key={s} className="chip appt-chip">{s}</span>
              ))}
            </div>
            <p className="appt-note__hint">
              Medicii sunt sortați după potrivire. Pentru urgențe sună la <a href="tel:112">112</a>.
            </p>
          </section>
        ) : (
          <section className="appt-note" aria-label="Simptome">
            <p className="appt-note__text">
              Descrie simptomele pe ecranul <a href="#/">Acasă</a> și îți recomandăm medicul potrivit. Poți și să alegi
              direct un medic mai jos.
            </p>
          </section>
        )}

        {bookings.length > 0 && (
          <section aria-labelledby="mine-title">
            <h2 id="mine-title" className="appt__section">Programările mele</h2>
            <ul className="appt-mine">
              {bookings.map((b) => {
                const st = statuses[b.id];
                const status = st?.status ?? 'PENDING';
                const when = status === 'ACCEPTED' && st?.scheduledAt ? st.scheduledAt : b.slotAt;
                return (
                  <li key={b.id} className="appt-mine__item">
                    <div>
                      <p className="appt-mine__doc">{b.doctorName ?? 'Medic'}</p>
                      <p className="appt-mine__when">
                        {status === 'ACCEPTED' ? 'Confirmată pentru ' : 'Cerută pentru '}
                        {formatSlot(when)}
                      </p>
                      {status === 'DECLINED' && (
                        <p className="appt-mine__when">Clinica nu a putut accepta. Alege un alt medic sau altă oră.</p>
                      )}
                    </div>
                    <div className="appt-mine__side">
                      <span className={`appt-status appt-status--${status.toLowerCase()}`}>{STATUS_LABEL[status]}</span>
                      {status !== 'PENDING' && (
                        <button type="button" className="appt-link" onClick={() => hide(b.id)}>
                          Ascunde
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        {loading && <p className="appt-status-box">Se încarcă medicii…</p>}
        {error && (
          <p className="appt-status-box appt-status-box--error">
            {error}{' '}
            <button type="button" className="appt-link" onClick={reloadDoctors}>
              Încearcă din nou
            </button>
          </p>
        )}

        {!loading && !error && recommended.length > 0 && (
          <section aria-labelledby="rec-title">
            <h2 id="rec-title" className="appt__section">Recomandați pentru tine</h2>
            <ul className="appt-grid">{recommended.map((d) => renderDoctor(d, true))}</ul>
          </section>
        )}

        {!loading && !error && others.length > 0 && (
          <section aria-labelledby="all-title">
            <h2 id="all-title" className="appt__section">
              {recommended.length > 0 ? 'Alți medici' : 'Medici disponibili'}
            </h2>
            <ul className="appt-grid">{others.map((d) => renderDoctor(d, false))}</ul>
          </section>
        )}
      </main>

      {selected && (
        <BookingModal
          doctor={selected}
          user={user}
          triage={triage}
          onClose={closeModal}
          onBooked={onBooked}
          onSlotsStale={reloadDoctors}
        />
      )}
    </div>
  );
}
