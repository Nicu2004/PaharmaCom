import React, { useState, useRef, useEffect } from "react";
import "./Home.css";
import UploadAndDisplayImage from "./components/UploadAndDisplayImage";

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

interface Message {
  id: string;
  sender: "user" | "bot";
  text: string;
  image?: string; // data URI, shown as a thumbnail in the bubble
  loading?: boolean; // true while waiting for the AI
}

const quickSymptoms: string[] = ["Durere de cap", "Tuse", "Durere în gât", "Nas înfundat", "Febră"];

const triageLevels: TriageLevel[] = [
  { level: "green", title: "Ușor", text: "Îți arătăm medicamentele fără rețetă și farmaciile din apropiere care le au." },
  { level: "yellow", title: "De verificat", text: "Primești o sugestie pentru ameliorare și îți recomandăm un consult la medic." },
  { level: "red", title: "Urgent", text: "Te trimitem direct la 112, fără recomandări de medicamente." },
];

const pharmacies: Pharmacy[] = [
  { id: 1, name: "Farmacia Centru", street: "Bulevardul Take Ionescu 12", distance: "350 m", status: "Deschis până la 21:00", isOpen: true },
  { id: 2, name: "Farmacia Piața Unirii", street: "Piața Unirii 5", distance: "800 m", status: "Deschis non-stop", isOpen: true },
];

const clinics: Clinic[] = [
  { id: 1, name: "Clinica Medicală Vest", specialty: "Medicină de familie", street: "Calea Aradului 40", nextSlot: "Mâine, 10:30" },
];

export default function Home() {
  const [symptoms, setSymptoms] = useState<string>("");
  const [imagePayload, setImagePayload] = useState<string | null>(null);
  const [conversation, setConversation] = useState<Message[]>([]);
  const [uploadKey, setUploadKey] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const historyRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  // Scroll only the chat box, not the whole page
  useEffect(() => {
    const el = historyRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [conversation]);

  const canSend = (symptoms.trim().length > 0 || imagePayload !== null) && !isLoading;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!canSend) return;

    const sentText = symptoms.trim();
    const sentImage = imagePayload;
    const loadingId = `loading-${Date.now()}`;

    // Show the user's message plus a glowing "loading" bubble right away
    setConversation((prev) => [
      ...prev,
      { id: `user-${Date.now()}`, sender: "user", text: sentText, image: sentImage ?? undefined },
      { id: loadingId, sender: "bot", text: "Analizăm simptomele tale…", loading: true },
    ]);

    // Reset the inputs
    setSymptoms("");
    setImagePayload(null);
    setUploadKey((k) => k + 1); // remounts the uploader, clearing its preview
    setIsLoading(true);

    // The backend expects `images: string[]`
    const payload = {
      symptoms: sentText,
      images: sentImage ? [sentImage] : [],
    };

    let reply: string;
    try {
      const response = await fetch("http://localhost:8000/analyze_symptoms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      reply = data.analysis || "Nu am primit un răspuns valid de la AI.";
    } catch (err) {
      console.error(err);
      reply = "Nu ne-am putut conecta la server. Încearcă din nou în câteva momente.";
    }

    // Swap the loading bubble for the real answer
    setConversation((prev) =>
      prev.map((m) => (m.id === loadingId ? { id: `bot-${Date.now()}`, sender: "bot", text: reply } : m))
    );
    setIsLoading(false);
  };

  return (
    <div className="home">
      <header className="home__top">
        <span className="home__logo">{import.meta.env.VITE_APP_NAME}</span>
        <button type="button" className="home__location">Timișoara</button>
      </header>

      <main className="home__main">
        <section className="hero" aria-labelledby="hero-title">
          <h1 id="hero-title" className="hero__title">
            Spune-ne ce simți. Îți arătăm unde să mergi.
          </h1>

          {conversation.length > 0 && (
            <div className="chat-history" ref={historyRef} aria-live="polite">
              {conversation.map((msg) => (
                <div key={msg.id} className={`chat-message chat-message--${msg.sender}`}>
                  <div className={`chat-bubble${msg.loading ? " chat-bubble--loading" : ""}`}>
                    {msg.image && <img className="chat-image" src={msg.image} alt="Imagine atașată" />}
                    {msg.loading ? (
                      <span className="glow-text">{msg.text}</span>
                    ) : (
                      msg.text && <p>{msg.text}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          <form className="hero__form" ref={formRef} onSubmit={handleSubmit}>
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
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  formRef.current?.requestSubmit();
                }
              }}
            />

            <div className="hero__chips" role="group" aria-label="Simptome frecvente">
              {quickSymptoms.map((s) => (
                <button
                  key={s}
                  type="button"
                  className="chip"
                  onClick={() => setSymptoms((prev) => (prev ? `${prev}, ${s}` : s))}
                >
                  {s}
                </button>
              ))}
            </div>

            <section className="hero__upload" aria-labelledby="upload-title">
              <div>
                <h2 id="upload-title" className="hero__upload-title">Adaugă o fotografie</h2>
                <p className="hero__upload-description">O imagine ne poate ajuta să înțelegem mai bine simptomele.</p>
              </div>

              <UploadAndDisplayImage key={uploadKey} onImageReady={setImagePayload} />
            </section>

            <button type="submit" className="btn btn--submit" disabled={!canSend}>
              {isLoading ? "Se analizează…" : "Verifică simptomele"}
            </button>
          </form>
        </section>

        <section className="triage" aria-labelledby="triage-title">
          <h2 id="triage-title" className="section__title">Cum te ajutăm</h2>
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
            <h2 id="pharm-title" className="section__title">Farmacii aproape de tine</h2>
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
            <h2 id="clinic-title" className="section__title">Clinici cu decontare CNAS</h2>
            <ul className="rows">
              {clinics.map((c) => (
                <li key={c.id} className="row">
                  <div className="row__main">
                    <p className="row__name">{c.name}</p>
                    <p className="row__meta">{c.specialty}, {c.street}</p>
                    <p className="row__status">Primul loc liber: {c.nextSlot}</p>
                  </div>
                  <button type="button" className="btn btn--small">Programează-te</button>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <aside className="emergency">
          <p>Urgență? Sună la <a href="tel:112">112</a>.</p>
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