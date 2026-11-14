import { useEffect, useState } from 'react';
import Home from '../Home/Home';
import PharmaciesPage from '../pharmacies/PharmaciesPage';
import BottomNav, { type Tab } from '../components/BottomNav';

const HASH: Record<Tab, string> = {
  home: '#/',
  pharmacies: '#/farmacii',
  appointments: '#/programari',
  account: '#/cont',
};

// The current tab is kept in the URL hash, so a page reload stays on the same tab.
function tabFromHash(): Tab {
  const found = (Object.keys(HASH) as Tab[]).find((t) => HASH[t] === window.location.hash);
  return found ?? 'home';
}

function ComingSoon({ title }: { title: string }) {
  return (
    <div className="home">
      <main className="home__main" style={{ paddingTop: 48 }}>
        <h1 className="hero__title">{title}</h1>
        <p className="hero__upload-description">Această secțiune va fi disponibilă în curând.</p>
      </main>
    </div>
  );
}

export default function AppShell() {
  const [tab, setTab] = useState<Tab>(tabFromHash);

  useEffect(() => {
    const onHashChange = () => setTab(tabFromHash());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const change = (next: Tab) => {
    window.location.hash = HASH[next];
    setTab(next);
  };

  return (
    <>
      {tab === 'home' && <Home />}
      {tab === 'pharmacies' && <PharmaciesPage />}
      {tab === 'appointments' && <ComingSoon title="Programări" />}
      {tab === 'account' && <ComingSoon title="Cont" />}
      <BottomNav active={tab} onChange={change} />
    </>
  );
}
