# Mission Sommerbody

Trainingsphase von Robert und Eddie, Mo 12.10.2026 bis Fr 13.11.2026: Checkups, Tageswerte, Ernährung und Training. Ein gemeinsames Passwort schützt die App, Konten gibt es keine.

Plan und Entscheidungen: [`.planning/plan.md`](.planning/plan.md)

## Stack

| Schicht | Wahl |
| :-- | :-- |
| Framework | Next.js 16 (App Router, TypeScript, Server Actions, `proxy.ts`) |
| Styling | Tailwind CSS 4, Design-Tokens aus One and Done in `app/globals.css` |
| Datenbank | Supabase Postgres, Zugriff nur serverseitig mit dem Secret Key |
| Hosting | Vercel, Funktionen in Dublin (`dub1`, neben der Supabase-Datenbank in Irland, siehe `vercel.json`) |
| Tests | Vitest |

## Setup

### 1. Repo

```bash
git clone git@github.com:RobertLennartz/mission-sommerbody.git
cd mission-sommerbody
npm install
```

### 2. Supabase

1. Auf supabase.com ein Projekt anlegen (EU-Region).
2. Im SQL Editor nacheinander ausführen:
   1. `supabase/migrations/0001_schema.sql`
   2. `supabase/migrations/0002_functions.sql`
   3. `supabase/migrations/0003_security.sql`
   4. `supabase/migrations/0004_flexible_training.sql`
   5. `supabase/migrations/0005_duration_seconds.sql`
   6. `supabase/seed.sql` (Robert, Eddie, Übungen, Vorlagen, Standardwoche; mehrfach ausführbar)
3. Unter **Settings > API Keys** den Secret Key (`sb_secret_...`) kopieren.

Die Migrationen schalten RLS auf allen Tabellen ein und geben nur der Rolle `service_role` Rechte. Mit dem öffentlichen Key ist nichts lesbar.

### 3. Umgebungsvariablen

```bash
cp .env.example .env.local
```

| Variable | Inhalt |
| :-- | :-- |
| `APP_PASSWORD` | gemeinsames Passwort, mindestens 12 Zeichen |
| `SESSION_SECRET` | `openssl rand -base64 32` |
| `SUPABASE_URL` | `https://<ref>.supabase.co` |
| `SUPABASE_SECRET_KEY` | Secret Key, geheim |

Ein neues `APP_PASSWORD` oder `SESSION_SECRET` meldet alle Geräte ab.

### 4. Lokal starten

```bash
npm run dev
```

### 5. Vercel

Das Projekt `mission-sommerbody` (Scope `robert-6581s-projects`) ist mit diesem Repo verbunden: **jeder Push auf `main` deployt automatisch** nach https://mission-sommerbody.vercel.app.

Neu einrichten, falls nötig:

1. Vercel-Konto mit GitHub verbinden: https://vercel.com/account/authentication
2. Der Vercel-App auf GitHub Zugriff auf das Repo geben: https://github.com/settings/installations
3. Im Projektordner: `npx vercel link --project mission-sommerbody` und `npx vercel git connect`
4. Die vier Variablen setzen, zum Beispiel `npx vercel env add APP_PASSWORD production --sensitive`
5. Region prüfen: **Settings > Functions > Function Region** muss Dublin (`dub1`) zeigen. Das kommt aus `vercel.json`.

## Was die App kann

- **Heute:** "Was habt ihr gemacht?" per Antippen (Kraft, Laufen, Schwimmen, Rad, HIIT, Recovery), auch mehrere Trainings am Tag und für beide zugleich. Schritte, Morgengewicht, Schlaf, Energie, Mahlzeiten mit Proteinziel, Bemerkungen. Alles speichert automatisch.
- **Einheit:** Kraft mit eigenen Übungen und Sätzen, der letzte Wert derselben Übung steht als Referenz daneben. Ausdauer mit Dauer (45, 26:40 oder 1:05:30) und km, der Schnitt (min/km, km/h) wird berechnet.
- **Woche, Planung, Vorlagen:** optional planen, Woche aus Vorlage füllen, verschieben. Ein Wochenziel für alle Trainings, Recovery zählt extra.
- **Ernährung, Checkups, Übersicht:** Protein pro Tag und Woche, Körperfett nach Jackson/Pollock mit Start-gegen-Ende-Vergleich, Verläufe.
- **Export:** CSV und ZIP unter Einstellungen.

## Prüfen

```bash
npm run lint
npm test
npm run build
```
