import { useState } from 'react';
import './Account.css';
import { useAuth } from '../auth/AuthContext';
import ChangeEmailCard from './ChangeEmailCard';
import ChangePasswordCard from './ChangePasswordCard';

export default function AccountPage() {
  const { user, signOut } = useAuth();
  const [leaving, setLeaving] = useState(false);

  const initials = user ? `${user.firstName[0] ?? ''}${user.lastName[0] ?? ''}`.toUpperCase() : '';

  return (
    <div className="home">
      <header className="home__top">
        <span className="home__logo">Doccom</span>
        <span className="home__location">{user?.city}</span>
      </header>

      <main className="acct">
        <h1 className="acct__title">Cont</h1>

        <section className="acct-card acct-profile" aria-label="Profil">
          <div className="acct-profile__avatar" aria-hidden="true">
            {initials}
          </div>
          <div>
            <p className="acct-profile__name">
              {user?.firstName} {user?.lastName}
            </p>
            <p className="acct-profile__meta">
              {user?.city}
              {user ? ` · ${user.age} ani` : ''}
            </p>
          </div>
        </section>

        <ChangeEmailCard />
        <ChangePasswordCard />

        <button
          type="button"
          className="acct-signout"
          disabled={leaving}
          onClick={() => {
            setLeaving(true);
            void signOut();
          }}
        >
          {leaving ? 'Se deconectează…' : 'Deconectare'}
        </button>
      </main>
    </div>
  );
}
