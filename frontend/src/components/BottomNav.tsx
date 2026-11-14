export type Tab = 'home' | 'pharmacies' | 'appointments' | 'account';

const TABS: { id: Tab; label: string }[] = [
  { id: 'home', label: 'Acasă' },
  { id: 'pharmacies', label: 'Farmacii' },
  { id: 'appointments', label: 'Programări' },
  { id: 'account', label: 'Cont' },
];

// Uses the .nav / .nav__item styles from Home.css
export default function BottomNav({ active, onChange }: { active: Tab; onChange: (tab: Tab) => void }) {
  return (
    <nav className="nav" aria-label="Navigare principală">
      {TABS.map((t) => (
        <button
          key={t.id}
          type="button"
          className="nav__item"
          aria-current={t.id === active ? 'page' : undefined}
          onClick={() => onChange(t.id)}
        >
          {t.label}
        </button>
      ))}
    </nav>
  );
}
