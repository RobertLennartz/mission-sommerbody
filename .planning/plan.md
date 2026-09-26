# Mission Sommerbody: Plan

Stand: 26.09.2026. Status: **wartet auf Freigabe**. Gebaut wird erst nach deinem OK.

## Was ich von dir brauche

1. **Supabase-Projekt (blockiert Meilenstein 1):** Dein Supabase-Konto hat das Limit von zwei Gratis-Projekten erreicht. In der Org "boomlike GmbH" (Free-Plan) laufen `gridiron-survivor` und `Fussball`, beide in Irland (eu-west-1). Ein drittes Gratis-Projekt lässt Supabase nicht zu, auch nicht in einer neuen Org. Empfehlung und Alternativen stehen in Abschnitt 12.
2. **GitHub-Repo anlegen:** Die gh CLI ist auf diesem Mac nicht installiert (Homebrew auch nicht). SSH zu GitHub funktioniert aber (Konto RobertLennartz). Bitte auf https://github.com/new ein **privates, leeres** Repo `mission-sommerbody` anlegen, ohne README, ohne .gitignore, ohne Lizenz. Der erste Commit mit diesem Plan liegt lokal bereit, ich pushe, sobald das Repo existiert.
3. **Vier kleinere Fragen** in Abschnitt 12. Keine davon blockiert den Start.

---

## 1. Rahmen

| | |
| :-- | :-- |
| Zeitraum | Mo, 12.10.2026 bis Fr, 13.11.2026, 33 Tage, KW 42 bis KW 46 (nachgerechnet) |
| Personen | Robert und Eddie, beide sehen und bearbeiten alles |
| Zeitzone | Europe/Berlin. "Heute" wird serverseitig in Berliner Zeit bestimmt, nicht in UTC. Am So, 25.10. endet die Sommerzeit, die Datumslogik wird genau daran getestet. |
| Projektordner | `~/Desktop/Rating Star/mission-sommerbody`, neben One and Done |
| Zielbild | App steht und ist getestet bis spätestens **Fr, 09.10.**, damit ihr am Wochenende davor alles ausprobieren könnt. Danach lösche ich die Testdaten (nur nach deinem OK). |

Der Missionszeitraum steht an genau einer Stelle im Code (`lib/mission.ts`). Eine zweite Mission später wäre ein kleiner Umbau, ist aber nicht Teil dieses Plans.

## 2. Stack und Versionen (geprüft am 26.09.2026)

| Baustein | Version | Anmerkung |
| :-- | :-- | :-- |
| Next.js (App Router, TypeScript) | 16.3.6 | Seit Next.js 16 heißt die Middleware `proxy.ts`, `middleware.ts` ist veraltet. Läuft standardmäßig in der Node.js-Runtime. [Doku](https://nextjs.org/docs/app/api-reference/file-conventions/proxy) |
| React | 19.3.0 | |
| Tailwind CSS | 4.3.3 | Design-Tokens per `@theme` in `globals.css`, wie bei One and Done |
| @supabase/supabase-js | 2.117.2 | nur serverseitig, mit dem neuen **Secret Key** (`sb_secret_...`) |
| @supabase/ssr | wird nicht gebraucht | Das Paket verwaltet Login-Cookies von Supabase Auth. Wir nutzen kein Supabase Auth, also fällt es weg. |
| zod | 4.6.5 | Validierung, dieselben Regeln in Formular und Server |
| Vitest | 5.0.2 | Unit-Tests |
| ESLint / eslint-config-next | 10.11.0 / 16.3.6 | |
| TypeScript | offen | npm-Latest ist 7.0.2. Ich nehme die Version, die `create-next-app@16.3.6` einrichtet, und gehe nur auf 7.x, wenn der Typcheck von `next build` damit sauber läuft. |
| Node.js lokal | 24.18.0 | vorhanden |

Quellen zu Supabase: [API Keys](https://supabase.com/docs/guides/getting-started/api-keys) (Secret Keys umgehen RLS, antworten im Browser immer mit 401, die alten `anon`/`service_role`-Keys gelten als Legacy), [Securing your API](https://supabase.com/docs/guides/api/securing-your-api) (Supabase stellt gerade um: neue Tabellen bekommen künftig keine automatischen Rechte mehr).

**Vercel-Region:** Neue Vercel-Projekte führen Server-Code standardmäßig in Washington (`iad1`) aus. Jede Datenbankabfrage ginge dann über den Atlantik nach Frankfurt und zurück. Ich setze in `vercel.json` `"regions": ["fra1"]`. Auf dem Hobby-Plan ist genau eine Region erlaubt, das passt. [Doku](https://vercel.com/docs/functions/configuring-functions/region)

## 3. Zugang und Sicherheit

### Ablauf

1. Jeder Aufruf ohne gültiges Cookie landet auf `/login` (Passwortseite im Mission-Sommerbody-Look).
2. Das Formular ruft eine **Server Action** auf. Nur der Server kennt `APP_PASSWORD`. Der Vergleich läuft zeitkonstant (Hashes beider Werte, dann `timingSafeEqual`), damit die Antwortzeit nichts verrät.
3. Bei Erfolg setzt der Server das Cookie `ms_session`: httpOnly, secure, SameSite=Lax, 90 Tage gültig. Inhalt: Ablaufzeitpunkt plus HMAC-SHA256-Signatur mit `SESSION_SECRET`. In die Signatur fließt zusätzlich ein Fingerabdruck des Passworts ein. Folge: **Wer das Passwort ändert, meldet automatisch alle Geräte ab.** Ein neues `SESSION_SECRET` tut dasselbe.
4. `proxy.ts` prüft Signatur und Ablauf bei jedem Seitenaufruf. Ausgenommen sind nur `/login`, statische Dateien, Icons und Manifest.
5. Nach dem ersten Login fragt die App einmal "Wer trägt ein?" (zwei große Knöpfe Robert / Eddie). Die Wahl steht im Cookie `ms_athlete` (1 Jahr) und lässt sich oben in der Kopfleiste jederzeit umschalten. Cookie statt localStorage, weil der Server die Seite dann direkt für die richtige Person rendert, ohne Flackern.
6. "Abmelden" steht in den Einstellungen und im Seitenfuß.

### Warum nicht nur die Middleware

Next.js sagt selbst, dass man sich für Server Actions nicht allein auf den Proxy verlassen soll: Server Actions sind per POST direkt erreichbar, und ein geänderter Matcher kann den Schutz stillschweigend aushebeln. Deshalb gilt zusätzlich:

- Jeder Datenbankzugriff läuft über eine eigene Datenzugriffsschicht (`lib/data/*`, mit `import "server-only"`). Jede Funktion dort prüft zuerst selbst die Session.
- Server Actions sind dünn: Eingabe mit zod prüfen, Datenschicht aufrufen, fertig.

### Bremse gegen Durchprobieren

- Nach jedem Fehlversuch antwortet der Server erst nach 1,5 Sekunden.
- Zusätzlich zählt er Fehlversuche pro IP in einer kleinen Tabelle: ab 5 Fehlversuchen in 15 Minuten ist diese IP für 15 Minuten gesperrt.
- Warum beides: Eine reine Verzögerung bremst nur, wer brav nacheinander probiert. Parallel abgeschickte Versuche laufen trotzdem durch, und auf Vercel teilen sich die Server-Instanzen keinen Speicher. Die Tabelle kostet etwa 40 Zeilen Code.
- Die IP wird nur als Hash gespeichert und nach 24 Stunden gelöscht (DSGVO).
- Die eigentliche Sicherung bleibt ein starkes Passwort: mindestens 12 Zeichen, zum Beispiel vier zufällige Wörter.

### Datenbank

- Zugriff ausschließlich serverseitig mit dem Secret Key. Kein Supabase-Key im Browser, keine `NEXT_PUBLIC_`-Variable für Supabase.
- RLS auf allen Tabellen, keine Policies. Zusätzlich entziehe ich `anon` und `authenticated` ausdrücklich alle Rechte und vergebe Rechte nur an `service_role`. Das funktioniert unabhängig davon, welche Standardrechte Supabase dem neuen Projekt gerade mitgibt.
- Datenbankfunktionen (siehe Abschnitt 4) dürfen nur von `service_role` ausgeführt werden. RLS greift bei Funktionen nicht, deshalb wird das Ausführungsrecht für alle anderen entzogen.
- Nach jeder Migration lasse ich den Security Advisor von Supabase laufen.
- Kurze Aussetzer des Gratis-Tarifs (502/503/504) fange ich ab wie bei One and Done: lesende Anfragen werden einmal wiederholt, schreibende nie.

### Sonstiges

- `noindex` und `robots.txt` mit Disallow, damit die Login-Seite nicht bei Google landet.
- Basis-Sicherheitsheader (kein Einbetten in fremde Seiten, kein MIME-Sniffing, Referrer nur same-origin).
- Der Build braucht keine Secrets. Fehlt eine Variable zur Laufzeit, gibt es eine klare Fehlermeldung statt eines kryptischen Absturzes.

### Umgebungsvariablen

| Variable | Inhalt |
| :-- | :-- |
| `APP_PASSWORD` | gemeinsames Passwort |
| `SESSION_SECRET` | Zufallswert, erzeugen mit `openssl rand -base64 32` |
| `SUPABASE_URL` | Projekt-URL, zum Beispiel `https://xxxx.supabase.co` |
| `SUPABASE_SECRET_KEY` | Secret Key `sb_secret_...` aus Settings, API Keys |

Lokal in `.env.local` (per `.gitignore` ausgeschlossen, Muster `.env*` mit Ausnahme `!.env.example`), auf Vercel in den Project Settings. `.env.example` enthält nur Platzhalter.

## 4. Datenmodell

Alle Tabellen: `id uuid` als Primärschlüssel, `created_at`, `updated_at`. Datumsfelder sind reine Kalendertage (`date`, Berliner Tag). Jede Tabelle bekommt CHECK-Regeln mit denselben Grenzen wie die Formulare, damit auch ein fehlerhafter Aufruf keine Unsinnswerte speichert.

### Änderungen gegenüber deinem Vorschlag

1. **Hautfalten in eigener Tabelle** `checkup_skinfolds`: bis zu 3 Messungen pro Messpunkt, gerechnet wird mit dem Mittelwert.
2. **Abgeleitete Werte werden nicht gespeichert**, sondern beim Anzeigen mit einer getesteten Funktion berechnet (Summe, Körperdichte, KFA, Fettmasse, fettfreie Masse). Grund: Ändert sich eine Messung oder das Geburtsjahr, kann nichts veralten. Im CSV-Export sind die Werte trotzdem enthalten.
3. **Übungskatalog** `exercises` statt Freitext: Der "letzte Wert derselben Übung" scheitert sonst an Schreibweisen ("Bankdrücken" und "Bankdrücken LH" wären zwei Übungen). Beim Eintragen gibt es Autovervollständigung, neue Übungen entstehen einfach durch Eintippen.
4. **`pair_id` bei Einheiten:** "Für beide anlegen" erzeugt zwei Datensätze mit gemeinsamer `pair_id`. Beim Verschieben oder Löschen fragt die App, ob beide gemeint sind. Die Wochenansicht markiert gemeinsame Einheiten.
5. **Wochenvorlagen** `week_templates` für "Woche aus Vorlage füllen" (Wochentag, Reihenfolge, Einheiten-Vorlage).
6. **Wochenziele pro Person** direkt in `athletes`.
7. **`login_attempts`** für die Bremse gegen Durchprobieren.
8. Pro Person höchstens ein Start-, ein Zwischen- und ein End-Checkup (eindeutig je Person und Typ).
9. Sätze werden erst angelegt, wenn etwas eingetragen wird. Die geplante Satzzahl steht an der Übung. So entstehen keine leeren Datensätze bei ausgelassenen Einheiten.

### Tabellen

**athletes**

| Spalte | Typ | Regel |
| :-- | :-- | :-- |
| slug | text | eindeutig: `robert`, `eddie` |
| name | text | |
| birth_year | smallint, optional | 1930 bis 2012 |
| height_cm | numeric, optional | 120 bis 230 |
| protein_target_g_per_kg | numeric | Default 2,0; erlaubt 0,8 bis 3,5 |
| steps_target | integer | Default 10.000; erlaubt 1.000 bis 50.000 |
| strength_target_per_week | smallint | Default 3 |
| cardio_target_per_week | smallint | Default 3, zählt Ausdauer und HIIT zusammen |

**checkups**: athlete_id, type (`start` / `interim` / `end`), date, weight_kg (40 bis 200), notes, dazu Umfänge in cm (alle optional, Plausibilitätsgrenzen pro Stelle): `neck_cm`, `chest_cm`, `waist_cm` (Bauchnabelhöhe), `hips_cm`, `upper_arm_left_cm`, `upper_arm_right_cm`, `forearm_cm`, `thigh_left_cm`, `thigh_right_cm`, `calf_left_cm`, `calf_right_cm`.

**checkup_skinfolds**: checkup_id (wird mit dem Checkup gelöscht), site (`chest`, `midaxillary`, `triceps`, `subscapular`, `abdominal`, `suprailiac`, `thigh`), reading_no (1 bis 3), value_mm (2 bis 60). Eindeutig je Checkup, Messpunkt und Messung.

**daily_logs**: athlete_id + date (eindeutig zusammen), steps (0 bis 100.000), weight_kg (optional, 40 bis 200), sleep_hours (optional, 0 bis 16), energy (optional, 1 bis 5), notes (mehrzeilig).

**meals**: athlete_id, date, meal_type (`breakfast` / `lunch` / `dinner` / `snack`), description, protein_g (0 bis 300), kcal (optional, 0 bis 5.000).

**exercises**: name, eindeutig ohne Unterschied zwischen Groß- und Kleinschreibung.

**sessions**

| Spalte | Regel |
| :-- | :-- |
| athlete_id, date, slot | slot = Reihenfolge am Tag, mehrere Einheiten pro Tag erlaubt |
| category | `strength` / `cardio` / `hiit` |
| title | |
| status | `planned` / `done` / `skipped` |
| duration_min | optional, 1 bis 600 |
| rpe | optional, 1 bis 10 |
| activity, distance_km, avg_hr | optional, nur Ausdauer und HIIT (0 bis 300 km, Puls 40 bis 220) |
| notes | optional |
| template_id | Herkunft; bleibt leer, falls die Vorlage gelöscht wird |
| pair_id | optional, verbindet die beiden Datensätze bei "für beide" |

**session_exercises**: session_id (wird mit der Einheit gelöscht), position, exercise_id, target_sets, target_reps (Text, zum Beispiel "8-10"), notes.

**session_sets**: session_exercise_id, set_no, reps (0 bis 100), weight_kg (0 bis 500). Eindeutig je Übung und Satznummer.

**plan_templates**: name (eindeutig), category, default_duration_min, activity, default_distance_km, notes. Dazu **plan_template_exercises**: template_id, position, exercise_id, target_sets, target_reps.

**week_templates**: name. Dazu **week_template_items**: week_template_id, weekday (1 = Mo bis 7 = So), slot, plan_template_id.

**login_attempts**: ip_hash, attempted_at. Einträge älter als 24 Stunden werden beim nächsten Login-Versuch gelöscht.

### Mehrteilige Schreibvorgänge

"Woche aus Vorlage füllen" und "für beide anlegen" erzeugen Einheiten plus Übungen in einem Rutsch. Das läuft als Postgres-Funktion in einer Transaktion: entweder alles oder nichts, keine halb angelegte Woche.

## 5. Berechnungen und Regeln

### Körperfett (Jackson/Pollock 7-Punkt, Siri)

- Pro Messpunkt: Mittelwert aus 1 bis 3 Messungen. S = Summe der 7 Mittelwerte in mm.
- age = Messjahr minus Geburtsjahr.
- body_density = 1,112 - 0,00043499 · S + 0,00000055 · S² - 0,00028826 · age
- body_fat_pct = 495 / body_density - 450
- fat_mass_kg = Gewicht · KFA / 100; lean_mass_kg = Gewicht - Fettmasse
- Anzeige auf eine Nachkommastelle. Fehlt ein Messpunkt, das Geburtsjahr oder (für die Massen) das Gewicht, zeigt die App, was fehlt, statt einer Zahl.
- **Nachgerechnetes Testbeispiel:** S = 100 mm, 35 Jahre ergibt Dichte 1,0639119 und KFA 15,2641 %, angezeigt 15,3 %. Weitere Testfälle: S = 120 / 40 Jahre ergibt 18,7 %, S = 60 / 30 Jahre ergibt 8,7 %.
- Hinweis zur Genauigkeit: Mit Geburtsjahr statt Geburtsdatum kann das Alter um ein Jahr danebenliegen. Das verschiebt den KFA um etwa 0,13 Prozentpunkte (nachgerechnet). Für den Vergleich Start gegen Ende spielt das keine Rolle, weil beide Messungen 2026 liegen und das Alter damit gleich bleibt.
- Die Eingabemaske zeigt zu jedem Messpunkt einen kurzen Hinweis (rechte Körperseite, Faltenrichtung, genaue Lage), ebenso zu den Umfängen (zum Beispiel "Oberarm entspannt, nicht angespannt"). Start und Ende sind nur vergleichbar, wenn gleich gemessen wird.

### Proteinziel

- Ziel an einem Tag = Gewicht aus dem **letzten Checkup an oder vor diesem Tag** · `protein_target_g_per_kg`. Ein Tag in Woche 2 rechnet also mit dem Startgewicht, auch wenn später der End-Checkup dazukommt.
- Vorschlag: Solange es noch keinen Checkup gibt, nimmt die App das letzte Morgengewicht und schreibt die Basis dazu ("Basis: Morgengewicht vom 12.10."). Ohne jedes Gewicht gibt es kein Ziel, nur einen Hinweis.

### Wochenziele

- Gezählt werden nur Einheiten mit Status `done`. Kraft zählt auf das Kraftziel, Ausdauer und HIIT gemeinsam auf das Ausdauerziel.
- KW 46 ist eine Kurzwoche (Mo bis Fr). Mein Vorschlag steht in Abschnitt 12.

### Schritte

- Wochendurchschnitt über die Tage mit Eintrag, nicht über 7 Tage. Die App zeigt dazu, an wie vielen Tagen erfasst wurde ("Ø 9.412, an 5 von 7 Tagen erfasst"). Ein vergessener Eintrag zählt so nicht als 0 Schritte.

### Countdown

- Vor dem Start: "Start in 16 Tagen". Während der Mission: "Tag 3 von 33". Danach: "Mission beendet".

## 6. Seitenstruktur und Navigation

| Route | Inhalt |
| :-- | :-- |
| `/login` | Passwortfeld, Knopf, Fehlermeldungen auf Deutsch |
| `/heute` | Datumsleiste mit Tag zurück / vor und "Heute" (auch vergangene Tage lassen sich nachtragen). Heutige Einheiten (geplant / erledigt / ausgelassen), antippen öffnet die Einheit; "Einheit hinzufügen". Schritte mit Fortschrittsbalken zum Schrittziel. Mahlzeiten nach Typ mit Protein und Tagesfortschritt gegen das Ziel. Optional Morgengewicht, Schlaf, Energie (fünf große Knöpfe). Ganz unten, groß und gut sichtbar: "Bemerkungen". |
| `/einheit/[id]` | Eine Einheit eintragen. Kraft: Übungen aus dem Plan vorausgefüllt, pro Satz Wiederholungen und Gewicht, darunter "Letztes Mal (Mi, 14.10.): 8 × 60 · 8 × 60 · 7 × 60 kg". Übung oder Satz hinzufügen. Ausdauer und HIIT: Aktivität, Dauer, Distanz, Puls. Für alle: Dauer, RPE, Notiz, Knöpfe "Erledigt", "Ausgelassen", "Zurück auf geplant". |
| `/woche` | KW-Auswahl. Mo bis So für beide: auf dem Laptop 7 Spalten mit einer Zeile pro Person, auf dem Handy eine Zeile pro Tag mit zwei Spalten. Einheiten nach Kategorie eingefärbt, Schritte pro Tag, Bemerkungen aufklappbar (ein Tooltip funktioniert auf dem Handy nicht). Oben pro Person: "Kraft 2/3, Ausdauer 3/3". Tage außerhalb der Mission ausgegraut. |
| `/planung` | Woche und Person wählen. Einheit planen (frei oder aus Vorlage, für Robert, Eddie oder beide). Verschieben per Tag-Auswahl und Reihenfolge hoch / runter. "Woche aus Vorlage füllen" mit Vorschau ("6 Einheiten werden angelegt") und Warnung, falls die Woche schon Einheiten hat (ergänzen oder geplante ersetzen). Legt nur Einheiten innerhalb des Missionszeitraums an. |
| `/planung/vorlagen` | Einheiten-Vorlagen mit Übungen, Zielsätzen und Zielwiederholungen bearbeiten; Wochenvorlagen bearbeiten. |
| `/ernaehrung` | Tagesliste pro Person: Protein gegen Ziel, kcal falls erfasst, Zahl der Mahlzeiten, Tag antippen öffnet ihn unter Heute. Wochendurchschnitt Protein, Tage mit erreichtem Ziel. |
| `/checkups` | Pro Person Karten für Start, Zwischen und Ende. Vergleichstabelle Start gegen Ende mit Differenz: Gewicht, alle Umfänge, Hautfaltensumme, KFA, Fettmasse, fettfreie Masse (Zwischen-Checkup als Extraspalte, falls vorhanden). |
| `/checkups/[id]` | Erfassen und Bearbeiten: Datum, Gewicht, Umfänge, 7 Hautfalten mit bis zu 3 Messungen, Ergebnis rechnet live mit. |
| `/uebersicht` | Beide im Vergleich: Gewichtsverlauf (Morgengewicht plus Checkups), Schritte als Tagesverlauf und Wochendurchschnitt, erledigte Einheiten nach Kategorie, Proteinschnitt, Tage bis zum Ende. |
| `/einstellungen` | Pro Person Geburtsjahr, Größe, Proteinziel g/kg, Schrittziel, Wochenziele. CSV-Export. Abmelden. |

Die Seite "Einstellungen" ist neu gegenüber deiner Liste. Irgendwo müssen Schrittziel, Proteinfaktor und Wochenziele einstellbar sein.

**Navigation:** Kopfleiste wie bei One and Done (schwarz, 4 px gelbe Unterkante) mit Wortmarke "Mission Sommerbody", Countdown und Umschalter Robert / Eddie. Auf dem Laptop darunter die weiße Navigationsleiste im One-and-Done-Stil. **Auf dem Handy weiche ich bewusst ab:** eine feste Leiste unten mit Heute, Woche, Planung, Ernährung und "Mehr" (Checkups, Übersicht, Einstellungen). Grund: Beim Eintragen mit einer Hand ist unten mit dem Daumen erreichbar, und sieben Einträge oben würden auf 375 px Breite seitlich scrollen. Optisch bleibt sie im selben Stil. Die Aufteilung lässt sich später leicht ändern.

## 7. Eingabe, Speichern, Validierung

- **Autosave statt Speichern-Knopf:** Jedes Feld speichert beim Verlassen und nach kurzer Tipp-Pause. Jeder Bereich zeigt seinen Status ("Speichert ...", "Gespeichert 14:32", "Nicht gespeichert, erneut versuchen"). Solange etwas offen ist, warnt der Browser beim Schließen des Tabs. Seitenwechsel innerhalb der App verlieren nichts, weil laufende Speichervorgänge weiterlaufen.
- Anlegen und Löschen (Mahlzeit, Einheit, Satz) passieren per Knopf, Löschen immer mit Rückfrage.
- **Funkloch im Studio:** Scheitert das Speichern, bleiben die Eingaben im Formular und zusätzlich lokal im Browser stehen und werden automatisch nachgespeichert, sobald wieder Netz da ist. Eine vollständige Offline-App (PWA mit Service Worker) baue ich nicht, das wäre deutlich mehr Aufwand.
- Gleichzeitiges Bearbeiten desselben Felds von zwei Geräten: Der letzte Stand gewinnt. Bei zwei Personen mit getrennten Daten ist das in der Praxis kein Thema.
- **Zahlen:** Eingabefelder als Text mit `inputmode="numeric"` (Schritte, Wiederholungen) bzw. `inputmode="decimal"` (Gewichte, cm, mm, km, Protein). Komma und Punkt werden als Dezimaltrenner akzeptiert. Bei Ganzzahlen gilt der Punkt als Tausendertrenner ("12.345" ergibt 12345). Anzeige immer deutsch: 12.345 Schritte, 82,5 kg, 15,3 %.
- Eingabefelder mit 16 px Schriftgröße. Darunter zoomt iOS beim Antippen ungefragt in die Seite (One and Done nutzt 15 px, das ändere ich hier).
- **Validierung** mit zod, identisch in Formular und Server, Grenzen wie in Abschnitt 4 (Hautfalte 2 bis 60 mm, Gewicht 40 bis 200 kg, Schritte 0 bis 100.000 usw.). Meldungen auf Deutsch, zum Beispiel "Bitte eine Zahl zwischen 2 und 60 eingeben."

## 8. Design

Übernommen aus One and Done (Design-System "Trikot", `app/globals.css`):

- Farben: Weiß `#FFFFFF`, Papier `#F4F5F2`, Tinte `#0B0C0B`, Grau `#6E7370`, Hellgrau `#B4B9B4`, Linie `#E2E4E0`, Flaggengelb `#EFB100` (Text darauf `#17130A`), Gelb-Tönung `#FDF6E0`, Grün `#0F7B45`, Rot `#C0281C`.
- Schrift: Archivo (400, 500, 800, 900) für Text, Überschriften und Knöpfe; Roboto Mono für Labels und Zahlenspalten.
- Border-Radius überall 0. Karten mit 1,5 px Rahmen in Tinte, Knöpfe in Großbuchstaben, gelber Knopf nur für die Hauptaktion, gelber Fokusrahmen.
- Kopfleiste schwarz mit 4 px gelber Unterkante, Wortmarke in Archivo 900, Countdown in Roboto Mono.

Neu für diese App:

- **Drei Kategorienfarben** für Kraft, Ausdauer und HIIT. Sie müssen sich von Gelb (Signal, aktiv) und Grün / Rot (Status) klar abheben. Dazu kommt ein Kürzel (K / A / H), damit die Kategorie auch ohne Farbwahrnehmung erkennbar ist. Status über die Füllung: geplant = nur Rahmen, erledigt = gefüllt, ausgelassen = grau und durchgestrichen. Die genauen Farbwerte prüfe ich beim Bau auf Kontrast.
- Große Tap-Flächen (mindestens 44 px), Umschalter Robert / Eddie als zweiteiliger Schalter mit gelbem aktivem Teil.
- Web-Manifest mit App-Icon, damit ihr die Seite auf den Home-Bildschirm legen könnt und sie ohne Browserleiste öffnet.
- Diagramme als schlichte eigene SVG-Komponenten statt einer Chart-Bibliothek: wenige Datenpunkte (2 Personen, 33 Tage), und so passen sie genau zum Look.

## 9. Seed, Export, README

**Seed** (`supabase/seed.sql`, mehrfach ausführbar ohne Duplikate):

- Robert und Eddie (Geburtsjahr und Größe, sobald du sie mir nennst, sonst später in den Einstellungen)
- Übungskatalog mit den Übungen aus den Vorlagen
- Vorlagen (Vorschlag, in der App frei änderbar):
  - Push: Bankdrücken 4 × 6-8, Schrägbankdrücken KH 3 × 8-10, Schulterdrücken 3 × 8-10, Seitheben 3 × 12-15, Trizepsdrücken am Kabel 3 × 10-12
  - Pull: Klimmzüge 4 × 6-10, Langhantelrudern 3 × 8-10, Latziehen 3 × 10-12, Face Pulls 3 × 12-15, Bizepscurls 3 × 10-12
  - Beine: Kniebeugen 4 × 6-8, Rumänisches Kreuzheben 3 × 8-10, Beinpresse 3 × 10-12, Ausfallschritte 3 × 10, Wadenheben 4 × 12-15
  - Ganzkörper: Kniebeugen 3 × 8, Bankdrücken 3 × 8, Langhantelrudern 3 × 10, Schulterdrücken 3 × 10, Hip Thrust 3 × 10
  - HIIT-Kurs (HIIT, 45 min), Lauf 5 km (Ausdauer, Laufen, 5 km)
- Wochenvorlage "Standardwoche": Mo Push, Di HIIT-Kurs, Mi Pull, Do Lauf 5 km, Fr Beine, Sa HIIT-Kurs

**CSV-Export** unter Einstellungen: je eine Datei für Tageswerte, Mahlzeiten, Einheiten, Sätze, Checkups (mit Umfängen, Hautfalten-Mittelwerten und berechneten Werten) und Hautfalten-Rohwerte, dazu "Alles als ZIP". Format für deutsches Excel: Semikolon als Trenner, Dezimalkomma, UTF-8 mit BOM (sonst zeigt Excel Umlaute falsch), Datum als JJJJ-MM-TT.

**README:** GitHub-Repo, Supabase-Projekt anlegen (Region Frankfurt), Migrationen und Seed einspielen (SQL-Editor oder `npx supabase db push`), Umgebungsvariablen, Deployment auf Vercel inklusive Region-Check, Passwort wechseln, Testdaten zurücksetzen.

## 10. Repo, Deployment, Meilensteine

**Repo:** Lokal ist `git init` erledigt, erster Commit enthält `.gitignore` und diesen Plan. Remote: `git@github.com:RobertLennartz/mission-sommerbody.git`. Commit-Messages auf Englisch. Nach jedem Meilenstein Push auf `main`.

**Vercel** (nach Meilenstein 1, Schritte kommen auch ins README): Auf vercel.com/new das Repo importieren, die vier Umgebungsvariablen eintragen, deployen. Region `fra1` kommt aus `vercel.json`, ich prüfe sie danach in der Deployment-Übersicht. Danach deployt jeder Push auf `main` automatisch. Hobby-Plan reicht, private Nutzung ist dort erlaubt.

**Meilensteine** (jeder endet mit Lint, Tests, Build, Ausgabe im Chat, dann Push):

| # | Inhalt | Beleg |
| :-- | :-- | :-- |
| M1 | Grundgerüst: Next.js-Setup, Design-Tokens, Layout mit Kopfleiste und Navigation, Login, Cookie, Proxy, Bremse, Migrationen mit RLS und Rechten, Seed, Datenschicht, `vercel.json`, `.env.example` | Unit-Tests (Cookie, Zahlen, Datum), curl-Checks (ohne Cookie Umleitung, gefälschtes Cookie abgelehnt, Server Action ohne Cookie abgelehnt, Fehlversuche gebremst), Security Advisor, Screenshot Login |
| M2 | Heute: Tageswerte mit Autosave, Mahlzeiten, Proteinziel, Datum zurück / vor | Tests Proteinziel, Screenshots Handy und Laptop |
| M3 | Training: Vorlagen, Übungskatalog, Planung, für beide, Woche füllen, Verschieben, Einheit eintragen mit letzten Werten, ungeplante Einheit | Tests Wochenziel, Klickpfad im Browser |
| M4 | Woche und Ernährung | Screenshots |
| M5 | Checkups mit Körperfett und Vergleichstabelle | Tests Formel inklusive nachgerechnetem Beispiel |
| M6 | Übersicht mit Diagrammen, Einstellungen, CSV-Export, App-Icon | Test CSV-Format (Semikolons, Anführungszeichen, Zeilenumbrüche in Notizen) |
| M7 | Abschluss: README, Durchgang aller Validierungen, Handy-Check auf 375 px, Vercel-Deployment prüfen, Testdaten löschen (nach deinem OK) | Liste, was fertig ist und was nicht |

**Testdaten:** Ohne Docker gibt es keine lokale Datenbank, und ein zweites Supabase-Projekt für Tests sprengt das Gratis-Limit. Ich teste deshalb gegen das echte Projekt und setze die Aktivitätsdaten vor dem 12.10. zurück (Personen, Vorlagen und Übungen bleiben). Das passiert nur nach deiner ausdrücklichen Freigabe.

## 11. Risiken und bewusste Grenzen

- **Ein Passwort für alles:** Wer es kennt, sieht Gewichte und Körperfett von euch beiden. Nur zwischen euch beiden weitergeben.
- **Gratis-Tarif (falls es dabei bleibt):** Supabase pausiert Gratis-Projekte nach etwa einer Woche ohne Aktivität (vorher kommt eine Warnmail). Während der Mission kein Thema, in den zwei Wochen davor möglich; ein Klick im Dashboard holt das Projekt zurück. Backups sind im Gratis-Tarif nicht herunterladbar, deshalb ist der CSV-Export eure Sicherung.
- **Messgenauigkeit:** Die 7-Punkt-Methode hat je nach Messung einige Prozentpunkte Unsicherheit. Aussagekräftig ist die Veränderung, wenn dieselbe Person mit derselben Zange misst.
- **Keine volle Offline-App**, siehe Abschnitt 7.
- **Keine Content Security Policy** im ersten Schritt, nur Basis-Header. Für eine private Zwei-Personen-App vertretbar, lässt sich nachrüsten.
- Drag and Drop in der Planung erst später, falls ihr es vermisst. Verschieben geht per Tag-Auswahl.

## 12. Offene Fragen und Entscheidungen

### 1. Supabase-Projekt (blockiert M1)

Fakten (geprüft per Supabase-API und [Doku](https://supabase.com/docs/guides/platform/billing-on-supabase)): Das Gratis-Limit sind zwei aktive Projekte, gezählt über alle Orgs, in denen du Owner oder Admin bist. Pausierte Projekte zählen nicht mit. Pro kostet ab 25 USD im Monat inklusive 10 USD Compute-Guthaben, jedes Projekt kostet eigenes Compute (Micro 10 USD im Monat). [Preise](https://supabase.com/pricing)

**Empfehlung:** Falls die Bundesliga-Runde (`Fussball`) gerade nicht live läuft: dieses Projekt pausieren und Mission Sommerbody gratis in der Org "boomlike GmbH" in Frankfurt anlegen. Ein pausiertes Projekt lässt sich 90 Tage lang wiederherstellen, aber nicht parallel zu zwei anderen aktiven Gratis-Projekten. Solange Mission Sommerbody läuft, bleibt `Fussball` also aus. Läuft die Runde, dann eine **eigene Org nur für Mission Sommerbody auf Pro** (etwa 25 USD im Monat, das Compute des einen Projekts deckt das Guthaben).

Abzuwägen: Es sind Gesundheitsdaten von dir und Eddie. Haben in der Org "boomlike GmbH" noch andere Leute Zugriff, gehört die App in eine eigene Org, auch wenn das kostet. Eine kostenlose eigene Org ginge nur, wenn Eddie sie mit seinem Konto anlegt und dich einlädt.

Nicht empfohlen: die ganze boomlike-Org auf Pro heben (etwa 45 USD im Monat, weil dann alle drei Projekte Compute kosten) oder die Tabellen in ein bestehendes Projekt packen (Irland statt Frankfurt, und ein geleakter Key träfe beide Apps).

Wenn du dich entschieden hast, kann ich das Projekt per Supabase-Anbindung in eu-central-1 (Frankfurt) anlegen und Migrationen plus Seed einspielen. Das Anlegen mache ich nur nach deinem ausdrücklichen OK, weil es je nach Weg Geld kostet. Den Secret Key trägst du selbst in `.env.local` und bei Vercel ein; über die Anbindung komme ich an Secret Keys ohnehin nicht heran, und in den Chat gehören sie nicht.

### 2. Stammdaten

Geburtsjahr und Größe von dir und Eddie. Das Geburtsjahr braucht die Körperfettformel. Nicht blockierend: lässt sich auch später in den Einstellungen eintragen.

### 3. Wochenziel in der Kurzwoche KW 46

Die Mission endet Freitag, 13.11. Wenn der End-Checkup an dem Tag morgens stattfindet, bleiben praktisch Mo bis Do für sechs Einheiten. **Vorschlag:** Ziel anteilig nach Missionstagen der Woche, gerundet: 3 · 5/7 ergibt 2, also Kraft 2 und Ausdauer 2. Alternative: 3 + 3 lassen.

### 4. Trainingsvorlagen

Habt ihr feste Pläne (Übungen, Sätze, Wiederholungen)? Dann trage ich die ein. Sonst nehme ich den Vorschlag aus Abschnitt 9, ihr könnt in der App alles ändern.

### Annahmen, falls du nichts anderes sagst

- Proteinziel vor dem ersten Checkup aus dem letzten Morgengewicht (Abschnitt 5).
- Untere Leiste auf dem Handy statt Navigation oben (Abschnitt 6).
- Autosave statt Speichern-Knopf (Abschnitt 7).
- Domain: erst einmal die `*.vercel.app`-Adresse.
- Einträge sind an jedem Datum möglich, Auswertungen zählen nur den Missionszeitraum.
