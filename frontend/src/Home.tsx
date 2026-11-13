import { useState } from "react";
import "./Home.css";

type Level = "green" | "yellow" | "red";

interface TriageLevel {
  level: Level;
  title: string;
  text: string;
}

interface Pharmacy {
  id: number;
  name: string;
  street: string;
  distance: string;
  status: string;
  isOpen: boolean;
}

interface Clinic {
  id: number;
  name: string;
  specialty: string;
  street: string;
  nextSlot: string;
}

// Date statice demo: înlocuiește-le mai târziu cu date reale din API / SQLite.
const quickSymptoms: string[] = ["Durere de cap", "Tuse", "Durere în gât", "Nas înfundat", "Febră"];

const triageLevels: TriageLevel[] = [
  {
    level: "green",
    title: "Ușor",
    text: "Îți arătăm medicamentele fără rețetă și farmaciile din apropiere care le au.",
  },
  {
    level: "yellow",
    title: "De verificat",
    text: "Primești o sugestie pentru ameliorare și îți recomandăm un consult la medic.",
  },
  {
    level: "red",
    title: "Urgent",
    text: "Te trimitem direct la 112, fără recomandări de medicamente.",
  },
];

const pharmacies: Pharmacy[] = [
  { id: 1, name: "Farmacia Centru", street: "Bulevardul Take Ionescu 12", distance: "350 m", status: "Deschis până la 21:00", isOpen: true },
  { id: 2, name: "Farmacia Piața Unirii", street: "Piața Unirii 5", distance: "800 m", status: "Deschis non-stop", isOpen: true },
  { id: 3, name: "Farmacia Iosefin", street: "Strada Gheorghe Lazăr 20", distance: "1,4 km", status: "Închis, deschide la 08:00", isOpen: false },
];

const clinics: Clinic[] = [
  { id: 1, name: "Clinica Medicală Vest", specialty: "Medicină de familie", street: "Calea Aradului 40", nextSlot: "Mâine, 10:30" },
  { id: 2, name: "Centrul ORL Timiș", specialty: "ORL", street: "Strada Mărășești 8", nextSlot: "Vineri, 14:00" },
];

export default function Home() {
  const [symptoms, setSymptoms] = useState<string>("");

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // TODO: trimite textul către backend (triaj + recomandare).
    console.log("Simptome:", symptoms);
  };

  return (
    <div className="home">
      <header className="home__top">
        <span className="home__logo">Doccom</span>
        <button type="button" className="home__location">
          Timișoara
        </button>
      </header>

      <main className="home__main">
        <section className="hero" aria-labelledby="hero-title">
          <h1 id="hero-title" className="hero__title">
            Spune-ne ce simți. Îți arătăm unde să mergi.
          </h1>

          <form className="hero__form" onSubmit={handleSubmit}>
            <label htmlFor="symptoms" className="hero__label">
              Descrie simptomele tale
            </label>
            <textarea
              id="symptoms"
              className="hero__input"
              rows={3}
              placeholder="De exemplu: am dureri de cap de azi dimineață"
              value={symptoms}
              onChange={(e) => setSymptoms(e.target.value)}
            />

            <div className="hero__chips" role="group" aria-label="Simptome frecvente">
              {quickSymptoms.map((s) => (
                <button key={s} type="button" className="chip" onClick={() => setSymptoms(s)}>
                  {s}
                </button>
              ))}
            </div>

            <button type="submit" className="btn" disabled={symptoms.trim().length === 0}>
              Verifică simptomele
            </button>
          </form>

          <p className="hero__note">
            Primești doar o recomandare, nu un diagnostic. Dacă e nevoie, mergi la medic.
          </p>
        </section>

        <section className="triage" aria-labelledby="triage-title">
          <h2 id="triage-title" className="section__title">
            Cum te ajutăm
          </h2>
          <ul className="triage__list">
            {triageLevels.map((t) => (
              <li key={t.level} className={`triage__item triage__item--${t.level}`}>
                <h3 className="triage__name">{t.title}</h3>
                <p className="triage__text">{t.text}</p>
              </li>
            ))}
          </ul>
        </section>

        <div className="columns">
          <section aria-labelledby="pharm-title">
            <h2 id="pharm-title" className="section__title">
              Farmacii aproape de tine
            </h2>
            <ul className="rows">
              {pharmacies.map((p) => (
                <li key={p.id} className="row">
                  <div className="row__main">
                    <p className="row__name">{p.name}</p>
                    <p className="row__meta">{p.street}</p>
                    <p className={`row__status ${p.isOpen ? "row__status--open" : "row__status--closed"}`}>
                      {p.status}
                    </p>
                  </div>
                  <span className="row__side">{p.distance}</span>
                </li>
              ))}
            </ul>
          </section>

          <section aria-labelledby="clinic-title">
            <h2 id="clinic-title" className="section__title">
              Clinici cu decontare CNAS
            </h2>
            <ul className="rows">
              {clinics.map((c) => (
                <li key={c.id} className="row">
                  <div className="row__main">
                    <p className="row__name">{c.name}</p>
                    <p className="row__meta">
                      {c.specialty}, {c.street}
                    </p>
                    <p className="row__status">Primul loc liber: {c.nextSlot}</p>
                  </div>
                  <button type="button" className="btn btn--small">
                    Programează-te
                  </button>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <aside className="emergency">
          <p>
            Urgență? Sună la <a href="tel:112">112</a>.
          </p>
        </aside>
      </main>

      <nav className="nav" aria-label="Navigare principală">
        <button type="button" className="nav__item" aria-current="page">Acasă</button>
        <button type="button" className="nav__item">Farmacii</button>
        <button type="button" className="nav__item">Programări</button>
        <button type="button" className="nav__item">Cont</button>
      </nav>
    </div>
  );
}