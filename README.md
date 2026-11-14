# 💊 PharmaCom

PharmaCom este o aplicație românească de sprijin în sănătate care ajută utilizatorii să descrie simptomele, să primească orientare de triage, să găsească farmacii din apropiere și să înțeleagă dacă este nevoie de consult medical.

Proiectul combină un frontend modern în React, un backend Java Spring Boot pentru autentificare și logică de business, și un serviciu Python cu inteligență artificială care analizează simptomele folosind Ollama și imagini locale.

## 🌍 Contextul proiectului

În România, mulți oameni pierd timp căutând farmacii care nu au medicamentele de care au nevoie sau nu știu dacă simptomele lor sunt urgente, moderate sau necomplicate. PharmaCom a fost gândit ca un ajutor rapid și prietenos pentru:

- evaluarea simptomelor
- recomandarea de medicamente fără rețetă
- găsirea farmaciilor din apropiere
- identificarea unei situații care necesită consult medical
- orientarea către urgență în cazuri mai grave

Acesta este un instrument de sprijin pentru sănătate și nu înlocuiește diagnosticul sau sfatul medicului.

## ✨ Funcționalități principale

- 🩺 descrierea simptomelor și analiza AI
- 🚦 niveluri de severitate: verde, galben, roșu
- 💊 recomandări de medicamente fără rețetă pentru cazuri simple
- 📍 căutare de farmacii în apropiere și listare pe hartă
- 🏥 flux de programare pentru consulturi medicale
- 👤 creare de cont, autentificare și gestionare profil
- 📧 verificare email și schimbare de parolă / cont
- 🚨 recomandări pentru urgențe și situații critice

## 🏗️ Arhitectura aplicației

### Frontend

- React + TypeScript + Vite
- interfață mobilă și prietenoasă
- navigație tip bottom nav
- experiență în limba română
- pagini pentru autentificare, farmacii, programări și triage

### Backend Java

- Spring Boot 4
- MySQL
- autentificare JWT
- endpointuri pentru login, înregistrare și management cont
- verificare email și schimbare date personale
- servicii pentru farmacii și triage medical

### Backend AI

- Python + FastAPI
- apeluri către modelul local Ollama (`gemma3:12b`)
- acceptă text și imagini în format base64
- returnează o analiză sumarizată a simptomelor

## 📁 Structura proiectului

```text
PaharmaCom/
├── backend/
│   ├── aiConnect.py
│   ├── main.py
│   ├── server.py
│   ├── getAllPharmacies.py
│   ├── test.py
│   └── data/
├── frontend/
│   ├── src/
│   ├── package.json
│   ├── vite.config.ts
│   └── README.md
├── javaServer/
│   ├── src/
│   ├── pom.xml
│   └── mvnw
├── .gitignore
├── LICENSE
├── README.md
└── .idea/
```

## ✅ Cerințe preliminare

Înainte de a rula aplicația, asigură-te că ai instalate:

- 🟢 Node.js 18+
- 📦 npm
- ☕ Java 21
- 🛠️ Maven
- 🗄️ MySQL
- 🐍 Python 3.10+
- 🤖 Ollama instalat și pornit local

Pentru serviciul AI, verifică că modelul este disponibil:

```bash
ollama pull gemma3:12b
```

## ⚙️ Variabile de mediu

Backend-ul Java așteaptă aceste variabile de mediu:

```bash
export SMTP_USER="your-email@gmail.com"
export SMTP_PASSWORD="your-app-password"
export JWT_SECRET="your-super-secret-key"
```

Configurarea locală implicită folosește:

- 🗄️ MySQL: `localhost:3306`
- 📚 baza de date: `pharmacom`
- 🌐 frontend: `http://localhost:5173`
- 🧠 Python API: `http://localhost:8000`
- ☕ Java backend: de obicei `http://localhost:8080`

## 🚀 Cum rulezi aplicația local

### 1) Pornește MySQL

Crează o bază de date locală numită `pharmacom` și verifică că credentialele din `javaServer/src/main/resources/application.properties` corespund configurației tale locale.

### 2) Pornește backend-ul Java

```bash
cd javaServer
./mvnw spring-boot:run
```

Aplicația Spring va crea automat tabelele necesare prin Hibernate (`ddl-auto=update`).

### 3) Pornește serviciul AI Python

```bash
cd backend
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install fastapi uvicorn pydantic ollama
uvicorn server:app --host 0.0.0.0 --port 8000 --reload
```

### 4) Pornește frontend-ul

```bash
cd frontend
npm install
npm run dev
```

Apoi deschide aplicația în browser la:

```text
http://localhost:5173
```

## 🔄 Fluxul de lucru al aplicației

1. Utilizatorul introduce simptome și opțional atașează fotografii
2. Frontend-ul trimite date către API-ul Python la `/analyze_symptoms`
3. Serviciul FastAPI apelează modelul Ollama cu text și imagini
4. AI-ul returnează un sumar al simptomelor și recomandări
5. Utilizatorul poate naviga apoi către farmacii, programări și cont
6. Backend-ul Java se ocupă de autentificare, date și logica aplicației

## 📝 Observații

- Proiectul este un prototip în limba română, destinat dezvoltării locale și demonstrației.
- Aplicația combină inteligență artificială locală cu o arhitectură backend Java de tip producție.
- Unele funcții depind de credențiale și servicii locale, deci poate necesita ajustări în funcție de calculatorul pe care rulează.

## ⚠️ Declarație importantă

Acest proiect este o demonstrație tehnologică și nu trebuie folosit ca instrument de diagnostic medical real. Este destinat exclusiv scopurilor educaționale, de prototip și de dezvoltare.

## 📜 Licență

Acest proiect este licențiat sub licența MIT. Consultă fișierul LICENSE pentru detalii.
