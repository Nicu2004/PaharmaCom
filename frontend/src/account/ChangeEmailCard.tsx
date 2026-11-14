import { useState, type FormEvent } from 'react';
import { useAuth, type SessionUser } from '../auth/AuthContext';
import { accountPost, type CodeSent } from './accountApi';
import CodeStep from './CodeStep';
import PasswordInput from './PasswordInput';

type Step = 'closed' | 'form' | 'code' | 'done';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ChangeEmailCard() {
  const { user, authFetch, updateUser } = useAuth();

  const [step, setStep] = useState<Step>('closed');
  const [newEmail, setNewEmail] = useState('');
  const [password, setPassword] = useState('');
  const [sentTo, setSentTo] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const reset = () => {
    setStep('closed');
    setNewEmail('');
    setPassword('');
    setError('');
  };

  // Step 1: the password is checked and the code goes to the NEW address
  const requestCode = async () => {
    const res = await accountPost<CodeSent>(authFetch, '/email/send-code', {
      newEmail: newEmail.trim(),
      currentPassword: password,
    });
    setSentTo(res.sentTo);
  };

  const submitForm = async (e: FormEvent) => {
    e.preventDefault();
    const email = newEmail.trim();
    if (!EMAIL_RE.test(email)) return setError('Adresa de email nu este validă.');
    if (email.toLowerCase() === user?.email.toLowerCase()) return setError('Aceasta este deja adresa ta de email.');
    setBusy(true);
    setError('');
    try {
      await requestCode();
      setStep('code');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'A apărut o eroare.');
    } finally {
      setBusy(false);
    }
  };

  // Step 2: password + the code that arrived on the new address
  const submitCode = async (code: string) => {
    setBusy(true);
    setError('');
    try {
      const updated = await accountPost<SessionUser>(authFetch, '/email', {
        newEmail: newEmail.trim(),
        currentPassword: password,
        code,
      });
      updateUser(updated);
      setPassword('');
      setStep('done');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'A apărut o eroare.');
    } finally {
      setBusy(false);
    }
  };

  const resend = async () => {
    setError('');
    try {
      await requestCode();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'A apărut o eroare.');
      throw err;
    }
  };

  return (
    <section className="acct-card" aria-labelledby="email-title">
      <div className="acct-card__head">
        <div>
          <h2 id="email-title">Adresă de email</h2>
          <p>{user?.email}</p>
        </div>
        {step === 'closed' && (
          <button type="button" className="btn btn--small" onClick={() => setStep('form')}>
            Schimbă emailul
          </button>
        )}
      </div>

      {step === 'form' && (
        <form className="acct-form" onSubmit={submitForm}>
          <label className="acct-field">
            <span>Adresa nouă de email</span>
            <input
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              autoComplete="email"
              maxLength={200}
              required
              autoFocus
            />
          </label>
          <PasswordInput
            label="Parola ta"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
          <p className="acct-hint">Îți trimitem un cod pe adresa nouă, ca să confirmăm că ești tu.</p>
          {error && (
            <p className="acct-error" role="alert">
              {error}
            </p>
          )}
          <div className="acct-actions">
            <button type="submit" className="btn" disabled={busy}>
              {busy ? 'Se trimite…' : 'Trimite codul'}
            </button>
            <button type="button" className="acct-link" onClick={reset} disabled={busy}>
              Anulează
            </button>
          </div>
        </form>
      )}

      {step === 'code' && (
        <CodeStep
          sentTo={sentTo}
          busy={busy}
          error={error}
          submitLabel="Confirmă emailul"
          onSubmit={submitCode}
          onResend={resend}
          onBack={() => {
            setError('');
            setStep('form');
          }}
        />
      )}

      {step === 'done' && (
        <div className="acct-done" role="status">
          <p>Adresa de email a fost schimbată. Am anunțat și adresa veche.</p>
          <button type="button" className="acct-link" onClick={reset}>
            Închide
          </button>
        </div>
      )}
    </section>
  );
}
