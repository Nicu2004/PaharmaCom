import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import './AuthScreen.css';

export interface UserRegistrationPayload {
  lastName: string;
  firstName: string;
  email: string;
  password?: string; // Optional for Google Auth flows
  isGoogleConnected: boolean;
  age: number;
  city: string;
}


const AuthScreen: React.FC = () => {
  const [isSignUp, setIsSignUp] = useState<boolean>(false);
  const [step, setStep] = useState<number>(1);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  // Form Fields
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [verifyPassword, setVerifyPassword] = useState<string>('');
  const [code, setCode] = useState<string>('');
  const [age, setAge] = useState<string>('');
  const [fullName, setFullName] = useState<string>('');
  
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const isCodeOk = async (verificationCode: string): Promise<boolean> => {
  try {


    const baseUrl: string = import.meta.env?.VITE_API_BASE_URL || 'http://localhost:8080';
    alert(`Verifying code: ${verificationCode} for email: ${email}`);
    alert(`Base URL: ${baseUrl}`);
    
    const response = await fetch(`${baseUrl}/api/auth/code-verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, code: verificationCode }),
    });

    if (response.ok) {
      return true;
    } else {
      const data = await response.json().catch(() => ({}));
      setError(data.message || 'Invalid verification code.');
      return false;
    }
  } catch (err) {
    setError('Network error while verifying code.');
    return false;
  }
};
  const handleFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');

    // --- STANDARD LOGIN FLOW ---
    if (!isSignUp) {
      await executeApiCall(false);
      return;
    }

    // --- 4-STEP REGISTRATION FLOW ---
    if (step === 1) {
      if (password !== verifyPassword) return setError("Passwords do not match.");
      if (password.length < 6) return setError("Password must be at least 6 characters.");
      
      // Simulated: Send code to email here
      setStep(2);
      
    } else if (step === 2) {
        
      // 1. Check if the user entered a 4-digit code before calling the API
      if (code.length < 4) return setError("Please enter a valid verification code.");
      
      // 2. Trigger the API call to verify the code
      setIsLoading(true);
      const codeValid = await isCodeOk(code);
      setIsLoading(false);

      // 3. Move to Step 3 (Age) ONLY if the Java server returns OK
      if (codeValid) {
        setStep(3); 
      }
      
    } else if (step === 3) {
      const ageNum = parseInt(age);
      if (isNaN(ageNum) || ageNum < 18) return setError("You must be 18 or older to register.");
      setStep(4);
      
    } else if (step === 4) {
      if (fullName.trim().length < 3) return setError("Please enter your full name.");
      await executeApiCall(true);
    }
  };

  const executeApiCall = async (isRegistering: boolean) => {
    setIsLoading(true);
    const baseUrl: string = import.meta.env?.VITE_API_BASE_URL || 'http://localhost:8080';
    const endpoint: string = isRegistering
      ? (import.meta.env?.VITE_REGISTER_ROUTE || '/api/auth/register')
      : (import.meta.env?.VITE_LOGIN_ROUTE ||'/api/auth/login');
    const payload = isRegistering
      ? { email, password, age: parseInt(age), fullName }
      : { email, password };

    try {
      const response = await fetch(`${baseUrl}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      
      const data = await response.json();
      if (response.ok) {
        console.log('Success:', data);
      } else {
        setError(data.message || 'Authentication failed');
      }
    } catch (err) {
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
      {/* Background Layer - Replace this div with your React Bits component if desired */}
      <div className="bg-animated-stripes"></div>
      
      <div className="auth-box">
        <h1 className="auth-title">PharmaCom</h1>
        
        {isSignUp && (
          <div className="step-indicator">
            Step {step} of 4
          </div>
        )}

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleFormSubmit}>
          
          {/* --- LOGIN OR STEP 1 REGISTRATION --- */}
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
                    type={showPassword ? "text" : "password"}
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
                    type={showPassword ? "text" : "password"}
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
                required 
                maxLength={4}
                value={code} 
                onChange={e => setCode(e.target.value.replace(/\D/g, ''))} 
                className="form-input text-center tracking-widest" 
                placeholder="1234" 
              />
            </div>
          )}

          {/* --- STEP 3: AGE --- */}
          {isSignUp && step === 3 && (
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
          )}

          {/* --- STEP 4: FULL NAME --- */}
          {isSignUp && step === 4 && (
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input 
                type="text" 
                required 
                value={fullName} 
                onChange={e => setFullName(e.target.value)} 
                className="form-input" 
                placeholder="John Doe" 
              />
            </div>
          )}

          {/* Form Actions */}
          <div className="form-actions">
            {isSignUp && step > 1 && (
              <button type="button" className="btn-secondary" onClick={() => setStep(step - 1)}>
                Back
              </button>
            )}
            <button type="submit" disabled={isLoading} className="btn-primary">
              {isLoading 
                ? 'Processing...' 
                : (!isSignUp ? 'Sign In' : (step === 4 ? 'Complete Registration' : 'Next Step'))
              }
            </button>
          </div>
        </form>

        <div className="divider">
          <span>OR</span>
        </div>

        <div className="auth-switch">
          {isSignUp ? "Already have an account?" : "Don't have an account?"}
          <button type="button" onClick={toggleMode}>
            {isSignUp ? 'Sign In' : 'Sign Up'}
          </button>
        </div>

        {/* Hide Google Auth during registration steps > 1 for a cleaner UX */}
        {(!isSignUp || step === 1) && (
          <button onClick={handleGoogleAuth} className="btn-google">
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