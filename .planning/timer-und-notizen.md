# Trainings-Timer, Pausen-Timer, Notizen, Home-Bildschirm

Stand: 10.10.2026. Auftrag von Robert am selben Tag, direkt umsetzen.

## 1. Home-Bildschirm (Web-App)

- `app/apple-icon.png` (180 px, deckend, ohne Rundung, iOS rundet selbst).
- `public/icons/icon-192.png`, `icon-512.png`, `icon-maskable-512.png` (Logo im sicheren Innenbereich).
- `app/manifest.ts`: id, scope, description, Icons mit `purpose`.
- `proxy.ts`: `/icons/` und `/apple-icon.png` ohne Login erreichbar.

## 2. Trainings-Timer

- Migration `0008_session_clock.sql`, nur additiv: `sessions.started_at`, `sessions.ended_at` (beide leer erlaubt).
- Server-Action `setSessionClock(id, "start" | "stop" | "resume" | "reset")`.
  - Start: `started_at = jetzt`, `ended_at = leer`.
  - Beenden: `ended_at = jetzt`, `duration_sec = Differenz` (max. 10 h), Status `done`.
  - Fortsetzen: `ended_at = leer` (nach versehentlichem Beenden).
  - Abbrechen: beide leer, Dauer bleibt unverändert.
- Zeit steht in der Datenbank, läuft also weiter, wenn die App geschlossen oder das Handy gewechselt wird.
- Anzeige: Leiste unten über der Navigation (läuft, Beenden), nach dem Ende die Gesamtzeit mit Start- und Endzeit.

## 3. Pausen-Timer

- Nur im Browser, Ende als Zeitstempel in `localStorage`, damit Neuladen nichts verliert.
- Vorgaben 1:00, 1:30, 2:00, 3:00, dazu +30 s und Stopp.
- Am Ende: Hinweis in der Leiste, Ton (Web Audio, beim Antippen freigeschaltet), Vibration wo unterstützt.
- Grenze: Läuft die App im Hintergrund oder ist der Bildschirm aus, kommt kein Ton. Die Restzeit stimmt beim Zurückkommen trotzdem.

## 4. Notizen zu den Sätzen

- Eine Notiz pro Übung (Spalte `session_exercises.notes` gibt es schon, keine Migration).
- Eigene Spalte pro Satz wäre auf dem Handy zu eng. "Satz 3 mit Band" passt in die Übungsnotiz.
- Die Notiz vom letzten Mal steht beim nächsten Training unter "Letztes Mal".
- CSV-Export "Sätze" bekommt die Spalte "Notiz Übung".

## 5. "Erledigt" bei Eddie

- Befund: Eddies Einheiten kommen alle aus der Schnellauswahl und sind dort schon "erledigt". Der Button "Als erledigt markieren" war dann ausgeblendet, und der Zustand stand nur klein oben rechts.
- Lösung: Statusauswahl unten immer mit allen drei Zuständen (Geplant, Erledigt, Ausgelassen), der aktuelle ist markiert.

## Sicherheit

- Vorher `npm run backup`, Eddies Zahlen vorher und nachher vergleichen.
- Tests nur an einer Testeinheit auf einem leeren Tag vor der Mission, danach per ID löschen.
