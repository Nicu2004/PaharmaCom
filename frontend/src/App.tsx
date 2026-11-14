import './App.css';
import Home from './Home';
import AuthScreen from './auth/AuthScreen';
import { AuthProvider, useAuth } from './auth/Authcontext';

// Everything behind the login lives here: signed out -> login screen, signed in -> the app.
function Gate() {
  const { status } = useAuth();

  if (status === 'loading') {
    // Checking for an existing session (silent refresh) before deciding what to show
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>
        <span className="glow-text">Se încarcă…</span>
      </div>
    );
  }

  return status === 'authenticated' ? <Home /> : <AuthScreen />;
}

function App() {
  return (
    <AuthProvider>
      <Gate />
    </AuthProvider>
  );
}

export default App;