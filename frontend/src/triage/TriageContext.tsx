import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

/** What the user told the AI on the Home screen, and what the AI answered. */
export type TriageLevel = 'green' | 'yellow' | 'red';

export interface Triage {
  symptoms: string;
  analysis: string;
  /** From the triage engine. Medicines are only ever offered for "green". */
  level?: TriageLevel;
  /** The active ingredient the engine suggested, e.g. "Ibuprofen". */
  otcSuggestion?: string | null;
  /** The otc_category from symptom_triage.json, e.g. "throat_lozenges". */
  otcCategory?: string | null;
  /** Optional: if the AI backend ever returns the specialties itself, they win over keyword matching. */
  specialties?: string[];
}

interface TriageContextValue {
  triage: Triage | null;
  setTriage: (t: Triage) => void;
  clearTriage: () => void;
}

const KEY = 'doccom.triage.v1';

function load(): Triage | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Triage) : null;
  } catch {
    return null;
  }
}

function store(t: Triage | null) {
  try {
    if (t) sessionStorage.setItem(KEY, JSON.stringify(t));
    else sessionStorage.removeItem(KEY);
  } catch {
    /* storage can be blocked; the context still works in memory */
  }
}

const TriageContext = createContext<TriageContextValue | null>(null);

export function TriageProvider({ children }: { children: ReactNode }) {
  const [triage, setState] = useState<Triage | null>(load);

  const setTriage = useCallback((t: Triage) => {
    setState(t);
    store(t);
  }, []);

  const clearTriage = useCallback(() => {
    setState(null);
    store(null);
  }, []);

  const value = useMemo(() => ({ triage, setTriage, clearTriage }), [triage, setTriage, clearTriage]);
  return <TriageContext.Provider value={value}>{children}</TriageContext.Provider>;
}

export function useTriage(): TriageContextValue {
  const ctx = useContext(TriageContext);
  if (!ctx) throw new Error('useTriage must be used inside <TriageProvider>');
  return ctx;
}
