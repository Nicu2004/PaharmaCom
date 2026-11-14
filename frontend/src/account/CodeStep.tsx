import { useEffect, useState, type FormEvent } from 'react';

interface Props {
  /** Where the code was sent, partly hidden */
  sentTo: string;
  busy: boolean;
  error: string;
  submitLabel: string;
  onSubmit: (code: string) => void;
  /** Asks the server for a new code. Throws if it fails; the parent shows the message. */
  onResend: () => Promise<void>;
  onBack: () => void;
}

const COOLDOWN_SECONDS = 60; // the server enforces the same pause

/** Second step of a change: the user types the 6-digit code from the email. */
export default function CodeStep({ sentTo, busy, error, submitLabel, onSubmit, onResend, onBack }: Props) {
  const [code, setCode] = useState('');
  const [wait, setWait] = useState(COOLDOWN_SECONDS);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    if (wait <= 0) return;
    const t = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (code.length === 6 && !busy) onSubmit(code);
  };

  const resend = async () => {
    setResending(true);
    try {
      await onResend();
      setCode('');
      setWait(COOLDOWN_SECONDS);
    } catch {
      /* the parent already shows the error */
    } finally {
      setResending(false);
    }
  };

  return (
    <form className="acct-form" onSubmit={submit}>
      <p className="acct-hint">
        Am trimis un cod din 6 cifre la <strong>{sentTo}</strong>. Expiră în 10 minute.
      </p>

      <label className="acct-field">
        <span>Cod din email</span>
        <input
          className="acct-code"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
          inputMode="numeric"
          autoComplete="one-time-code"
          placeholder="••••••"
          maxLength={6}
          autoFocus
          required
        />
      </label>

      {error && (
        <p className="acct-error" role="alert">
          {error}
        </p>
      )}

      <div className="acct-actions">
        <button type="submit" className="btn" disabled={busy || code.length !== 6}>
          {busy ? 'Se verifică…' : submitLabel}
        </button>
        <button type="button" className="acct-link" onClick={onBack} disabled={busy}>
          Înapoi
        </button>
        <button type="button" className="acct-link" onClick={resend} disabled={wait > 0 || resending || busy}>
          {wait > 0 ? `Trimite din nou (${wait}s)` : resending ? 'Se trimite…' : 'Trimite din nou'}
        </button>
      </div>
    </form>
  );
}
