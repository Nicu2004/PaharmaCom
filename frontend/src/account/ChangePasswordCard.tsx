import { useState, type FormEvent } from 'react';
import { useAuth, type AuthPayload } from '../auth/AuthContext';
import { accountPost, MIN_PASSWORD, type CodeSent } from './accountApi';
import CodeStep from './CodeStep';
import PasswordInput from './PasswordInput';

type Step = 'closed' | 'form' | 'code' | 'done';

export default function ChangePasswordCard() {
  const { authFetch, signIn } = useAuth();

  const [step, setStep] = useState<Step>('closed');
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [sentTo, setSentTo] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const reset = () => {
    setStep('closed');
    setCurrent('');
    setNext('');
    setConfirm('');
    setError('');
  };

  const validate = (): string => {
    if (next.length < MIN_PASSWORD) return `Parola nouă trebuie să aibă cel puțin ${MIN_PASSWORD} caractere.`;
    if (next !== confirm) return 'Parolele noi nu coincid.';
    if (next === current) return 'Parola nouă trebuie să fie diferită de cea curentă.';
    return '';
  };

  // Step 1: the current password is checked and the code is sent
  const requestCode = async () => {
    const res = await accountPost<CodeSent>(authFetch, '/password/send-code', { currentPassword: current });
    setSentTo(res.sentTo);
  };

  const submitForm = async (e: FormEvent) => {
    e.preventDefault();
    const problem = validate();
    if (problem) return setError(problem);
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

  // Step 2: current password + code + new password
  const submitCode = async (code: string) => {
    setBusy(true);
    setError('');
    try {
      // the server ends all other sessions and answers with a fresh one for this device
      const session = await accountPost<AuthPayload>(authFetch, '/password', {
        currentPassword: current,
        newPassword: next,
        code,
      });
      signIn(session);
      setCurrent('');
      setNext('');
      setConfirm('');
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
    <section className="acct-card" aria-labelledby="pw-title">
      <div className="acct-card__head">
        <div>
          <h2 id="pw-title">Parolă</h2>
          <p>Ai nevoie de parola curentă și de un cod primit pe email.</p>
        </div>
        {step === 'closed' && (
          <button type="button" className="btn btn--small" onClick={() => setStep('form')}>
            Schimbă parola
          </button>
        )}
      </div>

      {step === 'form' && (
        <form className="acct-form" onSubmit={submitForm}>
          <PasswordInput
            label="Parola curentă"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            autoComplete="current-password"
            required
            autoFocus
          />
          <PasswordInput
            label="Parola nouă"
            value={next}
            onChange={(e) => setNext(e.target.value)}
            autoComplete="new-password"
            minLength={MIN_PASSWORD}
            maxLength={72}
            required
          />
          <PasswordInput
            label="Repetă parola nouă"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            autoComplete="new-password"
            required
          />
          {error && (
            <p className="acct-error" role="alert">
              {error}
            </p>
          )}
          <div className="acct-actions">
            <button type="submit" className="btn" disabled={busy}>
              {busy ? 'Se trimite…' : 'Trimite codul pe email'}
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
          submitLabel="Schimbă parola"
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
          <p>Parola a fost schimbată. Ai fost deconectat de pe celelalte dispozitive.</p>
          <button type="button" className="acct-link" onClick={reset}>
            Închide
          </button>
        </div>
      )}
    </section>
  );
}
