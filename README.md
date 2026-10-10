# Mission Sommerbody

Trainingsphase von Robert, Eddie und Anny, Sa 10.10.2026 bis Fr 13.11.2026 (Zeitraum nur in `lib/mission.ts`): Checkups, Tageswerte, Ernährung und Training. Ein gemeinsames Passwort schützt die App, Konten gibt es keine.

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
   6. `supabase/migrations/0006_daily_nutrition_totals.sql`
   7. `supabase/migrations/0007_third_person.sql`
   8. `supabase/migrations/0008_session_clock.sql`
   9. `supabase/migrations/0009_light_category.sql`
   10. `supabase/seed.sql` (Robert, Eddie, Anny, Übungen, Vorlagen, Standardwoche; mehrfach ausführbar)
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

Das Projekt `mission-sommerbody` (Scope `robert-6581s-projects`) ist mit diesem Repo verbunden: **jeder Push auf `main` deployt automatisch** nach https://sommerbody.boomlike.de (und https://mission-sommerbody.vercel.app).

Domain: `sommerbody.boomlike.de` ist im Vercel-Projekt eingetragen. DNS bei manitu (dns01/dns02.manitu.net): `CNAME sommerbody → f8c4e0aed05ff870.vercel-dns-017.com.` Den Zielwert zeigt `npx vercel domains verify sommerbody.boomlike.de`.

Neu einrichten, falls nötig:

1. Vercel-Konto mit GitHub verbinden: https://vercel.com/account/authentication
2. Der Vercel-App auf GitHub Zugriff auf das Repo geben: https://github.com/settings/installations
3. Im Projektordner: `npx vercel link --project mission-sommerbody` und `npx vercel git connect`
4. Die vier Variablen setzen, zum Beispiel `npx vercel env add APP_PASSWORD production --sensitive`
5. Region prüfen: **Settings > Functions > Function Region** muss Dublin (`dub1`) zeigen. Das kommt aus `vercel.json`.

## Was die App kann

- **Heute:** "Was habt ihr gemacht?" per Antippen (Kraft, Laufen, Schwimmen, Spinning, HIIT, Rad locker, Gehen, Recovery (Sauna, Eisbad, Massage, mehrere auf einmal, ohne Zeit)). "Rad locker" und "Gehen" sind die Kategorie Locker: zählen mit niedrigem Verbrauch in die Energiebilanz, aber nicht zum Wochenziel. Gehen-km werden von den Schritten abgezogen, damit nichts doppelt zählt. Mehrere Trainings am Tag sind möglich, auch gemeinsam mit den anderen. Schritte, Morgengewicht, Schlaf, Energie, Protein und Kalorien als grober Tageswert (gilt vor der Summe der Mahlzeiten) oder einzeln pro Mahlzeit, Proteinziel, Bemerkungen. Alles speichert automatisch.
- **Einheit:** Kraft mit eigenen Übungen und Sätzen, der letzte Wert derselben Übung steht als Referenz daneben, dazu eine Notiz pro Übung (z. B. "Satz 3 mit Band"), die beim nächsten Mal unter "Letztes Mal" steht. Ausdauer mit Dauer (45, 26:40 oder 1:05:30) und km, der Schnitt (min/km, km/h) wird berechnet. Status Geplant, Erledigt oder Ausgelassen per Antippen.
- **Trainingszeit und Pause:** Leiste unten auf der Einheit. "Starten" speichert die Startzeit in der Datenbank (läuft weiter, auch wenn die App zu ist), "Beenden" trägt die Zeit als Dauer ein und setzt die Einheit auf erledigt. Pausen-Timer 1:00, 1:30, 2:00, 3:00 mit Ton und Vibration, solange die App offen ist.
- **Woche, Planung, Vorlagen:** optional planen, Woche aus Vorlage füllen, verschieben. Ein Wochenziel für alle Trainings, Recovery zählt extra.
- **Ernährung, Checkups, Übersicht:** Protein pro Tag und Woche, Körperfett nach Jackson/Pollock mit Start-gegen-Ende-Vergleich, Verläufe.
- **Export:** CSV und ZIP unter Einstellungen.

## Auf dem Home-Bildschirm

- **iPhone:** Seite in Safari öffnen, Teilen, "Zum Home-Bildschirm". Danach über das Icon starten und dort einmal anmelden (die Home-Bildschirm-App hat eigene Cookies).
- **Android:** Seite in Chrome öffnen, Menü, "App installieren".

Icons: `app/apple-icon.png` (iOS) und `public/icons/` (Manifest). Nach einer Logo-Änderung in `app/icon.svg` neu erzeugen mit `node scripts/icons.mjs`.

## Backup

```bash
npm run backup
```

Schreibt jede Tabelle als JSON nach `backups/<Zeitstempel>/` (nur lokal, per `.gitignore` ausgeschlossen, enthält Gesundheitsdaten). Vor jeder Schema-Änderung ausführen.

## Prüfen

```bash
npm run lint
npm test
npm run build
```
