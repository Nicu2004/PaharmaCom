import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import './AuthScreen.css';
import { useAuth, type AuthPayload } from './Authcontext';

export interface UserRegistrationPayload {
  lastName: string;
  firstName: string;
  email: string;
  password?: string; // Optional for Google Auth flows
  isGoogleConnected: boolean;
  age: number;
  city: string;
}

const BASE_URL: string = import.meta.env?.VITE_API_BASE_URL || 'http://localhost:8080';
const REGISTER_ROUTE: string = import.meta.env?.VITE_REGISTER_ROUTE || '/api/auth/register';
const LOGIN_ROUTE: string = import.meta.env?.VITE_LOGIN_ROUTE || '/api/auth/login';

const postJson = (path: string, body: unknown) =>
  fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    credentials: 'include', // lets the browser accept the refresh cookie set by /login
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

const AuthScreen: React.FC = () => {
  const { signIn } = useAuth();
  const [isSignUp, setIsSignUp] = useState<boolean>(false);
  const [step, setStep] = useState<number>(1);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  // Form fields
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [verifyPassword, setVerifyPassword] = useState<string>('');
  const [code, setCode] = useState<string>('');
  const [age, setAge] = useState<string>('');
  const [city, setCity] = useState<string>('');
  const [firstName, setFirstName] = useState<string>('');
  const [lastName, setLastName] = useState<string>('');

  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [codeSentTo, setCodeSentTo] = useState<string>(''); // avoids re-sending on Back -> Next

  // Reads {message} from an error response
  const readError = async (res: Response, fallback: string): Promise<string> => {
    const data = await res.json().catch(() => ({}));
    return data.message || fallback;
  };

  // Step 1 -> asks the server to email a 4-digit code
  const sendCode = async (): Promise<boolean> => {
    try {
      const res = await postJson('/api/auth/send-code', { email });
      if (!res.ok) {
        setError(await readError(res, 'Could not send the code.'));
        return false;
      }
      setCodeSentTo(email);
      return true;
    } catch {
      setError('Network error while sending the code.');
      return false;
    }
  };

  // Step 2 -> checks the code
  const isCodeOk = async (verificationCode: string): Promise<boolean> => {
    try {
      const res = await postJson('/api/auth/code-verify', { email, code: verificationCode });
      if (res.ok) return true;
      setError(await readError(res, 'Invalid verification code.'));
      return false;
    } catch {
      setError('Network error while verifying code.');
      return false;
    }
  };

  const handleResend = async () => {
    setError('');
    setIsLoading(true);
    await sendCode();
    setIsLoading(false);
  };

  const handleFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');

    // --- LOGIN ---
    if (!isSignUp) {
      await executeApiCall(false);
      return;
    }

    // --- 4-STEP REGISTRATION ---
    if (step === 1) {
      if (password !== verifyPassword) return setError('Passwords do not match.');
      if (password.length < 6) return setError('Password must be at least 6 characters.');

      if (codeSentTo !== email) {
        setIsLoading(true);
        const sent = await sendCode();
        setIsLoading(false);
        if (!sent) return;
      }
      setStep(2);
    } else if (step === 2) {
      if (code.length < 4) return setError('Please enter the 4-digit verification code.');

      setIsLoading(true);
      const codeValid = await isCodeOk(code);
      setIsLoading(false);
      if (codeValid) setStep(3);
    } else if (step === 3) {
      const ageNum = parseInt(age, 10);
      if (isNaN(ageNum) || ageNum < 18) return setError('You must be 18 or older to register.');
      if (city.trim().length < 2) return setError('Please enter your city.');
      setStep(4);
    } else if (step === 4) {
      if (firstName.trim().length < 2) return setError('Please enter your first name.');
      if (lastName.trim().length < 2) return setError('Please enter your last name.');
      await executeApiCall(true);
    }
  };

  const executeApiCall = async (isRegistering: boolean) => {
    setIsLoading(true);

    const registerPayload: UserRegistrationPayload = {
      lastName: lastName.trim(),
      firstName: firstName.trim(),
      email: email.trim(),
      password,
      isGoogleConnected: false,
      age: parseInt(age, 10),
      city: city.trim(),
    };

    try {
      if (isRegistering) {
        const reg = await postJson(REGISTER_ROUTE, registerPayload);
        if (!reg.ok) {
          setError(await readError(reg, 'Registration failed.'));
          return;
        }
      }

      // Log in (also right after registering). The server sets the refresh cookie,
      // the access token comes back in the body and is kept in memory by AuthContext.
      const response = await postJson(LOGIN_ROUTE, { email: email.trim(), password });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data.message || 'Authentication failed');
        return;
      }
      signIn(data as AuthPayload);
    } catch {
      setError('Network error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleAuth = (): void => {
    const baseUrl: string = import.meta.env?.VITE_API_BASE_URL || import.meta.env?.REACT_APP_API_BASE_URL || '';
    const googleRoute: string = import.meta.env?.VITE_GOOGLE_AUTH_ROUTE || import.meta.env?.REACT_APP_GOOGLE_AUTH_ROUTE || '/api/auth/google';
    window.location.href = `${baseUrl}${googleRoute}`;
  };

  const toggleMode = () => {
    setIsSignUp(!isSignUp);
    setStep(1);
    setError('');
  };

  return (
    <div className="auth-container">
      <div className="bg-animated-stripes"></div>

      <div className="auth-box">
        <h1 className="auth-title">PharmaCom</h1>

        {isSignUp && <div className="step-indicator">Step {step} of 4</div>}

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleFormSubmit}>
          {/* --- LOGIN OR STEP 1 --- */}
          {(!isSignUp || step === 1) && (
            <>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input type="email" required value={email} onChange={e => setEmail(e.target.value)} className="form-input" />
              </div>

              <div className="form-group">
                <label className="form-label">Password</label>
                <div className="input-container">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="form-input"
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="password-toggle">
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {isSignUp && (
                <div className="form-group">
                  <label className="form-label">Verify Password</label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={verifyPassword}
                    onChange={e => setVerifyPassword(e.target.value)}
                    className="form-input"
                  />
                </div>
              )}
            </>
          )}

          {/* --- STEP 2: CODE --- */}
          {isSignUp && step === 2 && (
            <div className="form-group">
              <label className="form-label">Verification Code</label>
              <p className="helper-text">We sent a 4-digit code to {email}</p>
              <input
                type="text"
                inputMode="numeric"
                required
                maxLength={4}
                value={code}
                onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
                className="form-input text-center tracking-widest"
                placeholder="1234"
              />
              <button type="button" className="auth-link" onClick={handleResend} disabled={isLoading}>
                Resend code
              </button>
            </div>
          )}

          {/* --- STEP 3: AGE + CITY --- */}
          {isSignUp && step === 3 && (
            <>
              <div className="form-group">
                <label className="form-label">Age</label>
                <p className="helper-text">You must be 18 or older to proceed.</p>
                <input
                  type="number"
                  required
                  min="1"
                  value={age}
                  onChange={e => setAge(e.target.value)}
                  className="form-input"
                  placeholder="e.g. 25"
                />
              </div>
              <div className="form-group">
                <label className="form-label">City</label>
                <input
                  type="text"
                  required
                  value={city}
                  onChange={e => setCity(e.target.value)}
                  className="form-input"
                  placeholder="Timișoara"
                />
              </div>
            </>
          )}

          {/* --- STEP 4: NAME --- */}
          {isSignUp && step === 4 && (
            <>
              <div className="form-group">
                <label className="form-label">First Name</label>
                <input
                  type="text"
                  required
                  value={firstName}
                  onChange={e => setFirstName(e.target.value)}
                  className="form-input"
                  placeholder="John"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Last Name</label>
                <input
                  type="text"
                  required
                  value={lastName}
                  onChange={e => setLastName(e.target.value)}
                  className="form-input"
                  placeholder="Doe"
                />
              </div>
            </>
          )}

          {/* Form actions */}
          <div className="form-actions">
            {isSignUp && step > 1 && (
              <button type="button" className="btn-secondary" onClick={() => setStep(step - 1)}>
                Back
              </button>
            )}
            <button type="submit" disabled={isLoading} className="btn-primary">
              {isLoading
                ? 'Processing...'
                : !isSignUp
                  ? 'Sign In'
                  : step === 4
                    ? 'Complete Registration'
                    : 'Next Step'}
            </button>
          </div>
        </form>

        <div className="divider">
          <span>OR</span>
        </div>

        <div className="auth-switch">
          {isSignUp ? 'Already have an account?' : "Don't have an account?"}
          <button type="button" onClick={toggleMode}>
            {isSignUp ? 'Sign In' : 'Sign Up'}
          </button>
        </div>

        {(!isSignUp || step === 1) && (
          <button type="button" onClick={handleGoogleAuth} className="btn-google">
            <svg viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </button>
        )}
      </div>
    </div>
  );
};

export default AuthScreen;