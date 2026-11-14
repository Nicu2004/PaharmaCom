import { useEffect, useRef, useState, type FormEvent } from 'react';
import { ClinicError, createBooking, type BookingState, type Doctor } from './clinicApi';
import { formatSlot } from './format';
import DoctorAvatar from './DoctorAvatar';
import type { Triage } from '../triage/TriageContext';
import type { SessionUser } from '../auth/AuthContext';

interface Props {
  doctor: Doctor;
  user: SessionUser | null;
  triage: Triage | null;
  onClose: () => void;
  /** Called after the clinic accepted the request into its list (status PENDING). */
  onBooked: (booking: BookingState, slotAt: string) => void;
  /** The chosen hour was taken meanwhile: the page reloads the doctors' free hours. */
  onSlotsStale: () => void;
}

export default function BookingModal({ doctor, user, triage, onClose, onBooked, onSlotsStale }: Props) {
  const [slot, setSlot] = useState<string>(doctor.nextFreeAt ?? '');
  const [name, setName] = useState<string>(user ? `${user.firstName} ${user.lastName}`.trim() : '');
  const [email, setEmail] = useState<string>(user?.email ?? '');
  const [phone, setPhone] = useState<string>('');
  const [reason, setReason] = useState<string>(triage?.symptoms ?? '');
  const [includeAi, setIncludeAi] = useState<boolean>(true);
  const [summary, setSummary] = useState<string>(triage?.analysis ?? '');
  const [sending, setSending] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [done, setDone] = useState<{ slotAt: string } | null>(null);

  const firstField = useRef<HTMLSelectElement>(null);

  // If the free hours were refreshed and the chosen one is gone, fall back to the first free hour
  useEffect(() => {
    if (!doctor.freeSlots.includes(slot)) setSlot(doctor.freeSlots[0] ?? '');
  }, [doctor.freeSlots, slot]);

  // Keep the latest onClose without re-running the effect below (it would steal focus while typing)
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  // Escape closes; the page behind doesn't scroll while the pop-up is open
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeRef.current();
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    firstField.current?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, []);

  const hasAi = Boolean(triage?.analysis);
  const noSlots = doctor.freeSlots.length === 0;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (sending || !slot) return;
    setSending(true);
    setError('');
    try {
      const booking = await createBooking({
        doctorId: doctor.id,
        slotAt: slot,
        patientName: name.trim(),
        patientEmail: email.trim(),
        patientPhone: phone.trim(),
        reason: reason.trim(),
        symptomSummary: hasAi && includeAi ? summary.trim() : '',
      });
      onBooked(booking, slot);
      setDone({ slotAt: slot });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'A apărut o eroare.';
      setError(msg);
      if (err instanceof ClinicError && err.status === 409) onSlotsStale();
    } finally {
      setSending(false);
    }
  };

  return (
    <div
      className="appt-overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="appt-modal" role="dialog" aria-modal="true" aria-labelledby="appt-modal-title">
        <header className="appt-modal__head">
          <DoctorAvatar doctor={doctor} size={56} />
          <div className="appt-modal__who">
            <h2 id="appt-modal-title">Programare la {doctor.name}</h2>
            <p>{doctor.specialty}</p>
          </div>
          <button type="button" className="appt-modal__close" onClick={onClose} aria-label="Închide">
            ×
          </button>
        </header>

        {done ? (
          <div className="appt-modal__done">
            <div className="appt-modal__check" aria-hidden="true">✓</div>
            <h3>Cererea a fost trimisă</h3>
            <p>
              Ai cerut o programare la {doctor.name}, <strong>{formatSlot(done.slotAt)}</strong>. Clinica o confirmă în
              curând; vezi starea în lista „Programările mele”.
            </p>
            <button type="button" className="btn" onClick={onClose}>
              Gata
            </button>
          </div>
        ) : (
          <form className="appt-form" onSubmit={submit}>
            <label className="appt-field">
              <span>Ora programării</span>
              <select
                ref={firstField}
                value={slot}
                onChange={(e) => setSlot(e.target.value)}
                disabled={noSlots}
                required
              >
                {noSlots && <option value="">Nu mai sunt locuri libere</option>}
                {doctor.freeSlots.map((s, i) => (
                  <option key={s} value={s}>
                    {formatSlot(s)}
                    {i === 0 ? ' (prima oră liberă)' : ''}
                  </option>
                ))}
              </select>
            </label>

            <div className="appt-form__row">
              <label className="appt-field">
                <span>Nume</span>
                <input value={name} onChange={(e) => setName(e.target.value)} required maxLength={120} autoComplete="name" />
              </label>
              <label className="appt-field">
                <span>Telefon (opțional)</span>
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  type="tel"
                  maxLength={40}
                  autoComplete="tel"
                />
              </label>
            </div>

            <label className="appt-field">
              <span>Email</span>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                required
                maxLength={200}
                autoComplete="email"
              />
            </label>

            <label className="appt-field">
              <span>Motivul vizitei</span>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                required
                maxLength={500}
                placeholder="De exemplu: dureri de cap de 3 zile"
              />
            </label>

            {hasAi ? (
              <div className="appt-ai">
                <label className="appt-ai__check">
                  <input type="checkbox" checked={includeAi} onChange={(e) => setIncludeAi(e.target.checked)} />
                  <span>Trimite medicului rezumatul făcut de AI</span>
                </label>
                {includeAi && (
                  <textarea
                    value={summary}
                    onChange={(e) => setSummary(e.target.value)}
                    rows={4}
                    maxLength={1500}
                    aria-label="Rezumatul AI trimis medicului"
                  />
                )}
                <p className="appt-ai__note">
                  Rezumatul conține date despre sănătatea ta și ajunge doar la clinică. Îl poți edita sau debifa.
                </p>
              </div>
            ) : (
              <p className="appt-ai__note">
                Nu ai o analiză AI încă. Descrie simptomele pe ecranul Acasă și vor apărea aici automat.
              </p>
            )}

            {error && (
              <p className="appt-error" role="alert">
                {error}
              </p>
            )}

            <button type="submit" className="btn appt-form__submit" disabled={sending || noSlots || !slot}>
              {sending ? 'Se trimite…' : `Trimite cererea la ${doctor.name}`}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
