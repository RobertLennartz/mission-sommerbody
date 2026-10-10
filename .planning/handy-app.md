# Mission Sommerbody als Handy-App

Stand: 10.10.2026. Status: Vorschlag, noch nichts umgesetzt.

## Kurzfassung

Es gibt drei Wege, und sie unterscheiden sich stark bei Aufwand, Kosten und Dauer:

| Weg | Was es ist | Kosten | Bis es auf euren Handys ist |
| :-- | :-- | :-- | :-- |
| 1. Web-App auf dem Home-Bildschirm | Die bestehende Seite wird "installiert": eigenes Icon, startet ohne Browserleiste, auf Wunsch mit Erinnerungen | 0 € | Icon heute, Erinnerungen in etwa einem Tag |
| 2. Echte App, nur für euch drei | Die Seite in einer App-Hülle (Capacitor), plus Funktionen, die nur echte Apps können, vor allem **Schritte automatisch aus Apple Health** | Apple 99 USD pro Jahr, Android 25 USD einmalig | realistisch eine Woche (Konten, Xcode, Bau, Test) |
| 3. Komplett neue App | Alles neu programmiert (zum Beispiel React Native) | viel Zeit | mehrere Wochen |

**Empfehlung:** Weg 1 sofort. Die Challenge läuft seit heute und dauert fünf Wochen. Bis eine echte App über Apple verteilt ist, wäre etwa ein Viertel davon vorbei. Weg 2 lohnt sich, wenn (a) ihr die Schritte nicht mehr abtippen wollt, sondern automatisch aus Apple Health holt, oder (b) ihr die App nach dem 13.11. weiter nutzen wollt. Weg 3 ergibt für drei Personen keinen Sinn.

## Begriffe in einem Satz

- **Web-App / PWA:** eine Website, die man aufs Handy "installiert". Sie hat ein Icon und startet wie eine App. Ein Store ist dafür nicht nötig.
- **App Store / Google Play:** die offiziellen Läden. Was dort öffentlich erscheint, prüfen Apple bzw. Google vorher.
- **TestFlight:** Apples Weg, eine App an ausgewählte Leute zu verteilen, ohne sie öffentlich in den App Store zu stellen. Genau das Richtige für drei Personen.
- **Interner Test (Google Play):** dasselbe für Android.
- **Capacitor:** ein Werkzeug, das eine Website in eine echte App verpackt und ihr Zugriff auf Handy-Funktionen gibt (Apple Health, Push).
- **Xcode:** Apples kostenloses Programm, mit dem iPhone-Apps gebaut und hochgeladen werden. Läuft nur auf dem Mac.

## Weg 1: Web-App auf dem Home-Bildschirm

**Was schon da ist:** Die Seite hat ein Web-Manifest und startet nach dem Hinzufügen ohne Browserleiste.

**Was fehlt (gerade geprüft):**
- **iPhone-Icon:** Das Manifest verweist auf `/apple-icon.png`, die Datei gibt es nicht (HTTP 404). Auf dem iPhone erscheint deshalb kein richtiges App-Icon. Das ist mein Fehler.
- **Android-Icons** in den üblichen Größen (192 und 512 px).
- **Erinnerungen per Push**, optional: zum Beispiel abends "Schritte und Essen eintragen?". Auf dem iPhone geht Web-Push seit iOS 16.4, aber nur, wenn die Seite über "Zum Home-Bildschirm" installiert wurde ([PushAlert](https://pushalert.co/blog/apple-reverses-decision-will-continue-to-support-home-screen-web-apps-in-the-eu/), [9to5Mac zur EU-Debatte 2024](https://9to5mac.com/2024/02/15/ios-17-4-web-apps-european-union/)). Apple hatte das 2024 in der EU kurz abgeschaltet und mit iOS 17.4 wieder zurückgenommen. Den aktuellen Stand prüfe ich vor dem Bau auf einem echten iPhone.

**Wer macht was:**
- Ich: Icons erzeugen und einbinden, Manifest vervollständigen, optional Push (Service Worker, Schlüssel als Umgebungsvariable, eine kleine Tabelle für die Anmeldungen, täglicher Zeitplan auf Vercel).
- Ihr, einmal pro Handy:
  - **iPhone:** Seite in **Safari** öffnen, Teilen-Symbol, "Zum Home-Bildschirm". Danach immer über das Icon starten.
  - **Android:** Seite in Chrome öffnen, Menü, "App installieren" bzw. "Zum Startbildschirm hinzufügen".

**Grenze:** Eine Website kommt nicht an Apple Health heran. Schritte bleiben in Weg 1 Handarbeit.

## Weg 2: Echte App für euch drei

### Warum nicht einfach die Website "einpacken"?

Apple lehnt Apps ab, die nur eine Website in einer Hülle sind (Richtlinie 4.2 "Minimum Functionality", [AppFlight](https://appflight.dev/learn/rejections/app-store-guideline-4-2-minimum-functionality/), [Mobiloud](https://www.mobiloud.com/blog/app-store-review-guidelines-webview-wrapper/)). Capacitor selbst ist kein Problem ([Capgo](https://capgo.app/blog/how-to-put-a-web-app-on-the-app-store/)), aber die App braucht echten Mehrwert. Bei uns wäre das:
- **Schritte automatisch aus Apple Health** (Android: Health Connect). Das ist der eigentliche Gewinn.
- **Native Erinnerungen** (Push).

Für die Verteilung nur an euch drei über TestFlight ist diese Prüfung weniger streng. Ohne Mehrwert lohnt Weg 2 trotzdem nicht, dann reicht Weg 1.

### Was ihr braucht

| Was | Wofür | Kosten | Wer |
| :-- | :-- | :-- | :-- |
| Apple Developer Program | iPhone-Apps verteilen, auch über TestFlight | 99 USD pro Jahr ([Apple](https://developer.apple.com/programs/)) | du |
| Xcode | iPhone-App bauen und hochladen | kostenlos, Mac App Store, mehrere GB | du installierst, ich nutze es |
| Google Play Console | nur falls jemand Android hat | 25 USD einmalig, plus Identitätsprüfung ([Play-Hilfe](https://support.google.com/googleplay/android-developer/answer/14151465?hl=en)) | du |
| Android Studio | Android-App bauen | kostenlos | du installierst, ich nutze es |

Auf deinem Mac ist aktuell **kein Xcode** installiert, nur die Kommandozeilen-Werkzeuge (geprüft mit `xcode-select -p`).

**Privat oder über Boomlike?** Beides kostet gleich. Ein Firmenkonto braucht aber eine D-U-N-S-Nummer und eine Prüfung der Firma, das dauert länger. Für ein privates Projekt empfehle ich ein Konto als Privatperson. Dann stehst du als Anbieter drin, nicht Boomlike.

### Wer gibt frei?

- **TestFlight, interne Tester:** keine Prüfung durch Apple. Interne Tester sind bis zu 100 Mitglieder deines Teams in App Store Connect ([Apple TestFlight](https://developer.apple.com/testflight/)). Eddie und Anny würdest du dort als Teammitglieder einladen.
- **TestFlight, externe Tester per Einladung oder Link:** bis zu 10.000 Personen. Der erste Build geht durch eine Beta-Prüfung bei Apple ([Apple TestFlight](https://developer.apple.com/testflight/)).
- TestFlight-Versionen laufen nach einer festen Zeit ab. Nach meinem Stand sind das 90 Tage, auf Apples Seite habe ich die Zahl aber nicht gefunden. Für fünf Wochen reicht es auf jeden Fall, die genaue Frist prüfe ich vor dem Start.
- **Öffentlicher App Store:** volle Prüfung durch Apple, Datenschutzangaben (hier Gesundheitsdaten), Datenschutzerklärung, Begründung jeder Berechtigung. Für drei Personen nicht nötig, ich rate davon ab.
- **Android:** Für euch reicht der **interne Test** in der Play Console. Die bekannte Regel "12 Tester über 14 Tage" gilt erst, wenn ein neues privates Konto eine App öffentlich veröffentlichen will ([Play-Hilfe](https://support.google.com/googleplay/android-developer/answer/14151465?hl=en)).

### Schritt für Schritt (iPhone)

| # | Schritt | Wer | Dauer |
| :-- | :-- | :-- | :-- |
| 1 | Apple Developer Program beitreten (developer.apple.com/programs), Apple-ID mit Zwei-Faktor-Schutz, 99 USD zahlen | du | Anmeldung 15 min, Freischaltung meist schnell, bei Firmenkonten länger |
| 2 | Xcode aus dem Mac App Store installieren, einmal öffnen, Lizenz bestätigen | du | 30 bis 60 min (Download) |
| 3 | App-Hülle mit Capacitor anlegen: lädt sommerbody.boomlike.de, eigenes Icon und Startbildschirm | ich | halber Tag |
| 4 | Apple Health anbinden: Berechtigung abfragen, Tagesschritte lesen und automatisch in "Heute" eintragen (überschreibt nie einen Wert, den ihr selbst eingetragen habt) | ich | 1 bis 2 Tage |
| 5 | Optional Erinnerungen per Push | ich | 1 Tag |
| 6 | Im iPhone-Simulator testen, Screenshots an dich | ich | laufend |
| 7 | In App Store Connect den App-Eintrag anlegen und in Xcode mit deinem Konto anmelden (deine Passwörter tippst du selbst ein) | du, ich leite an | 30 min |
| 8 | Build hochladen (Xcode: Archive, Upload) | ich, mit deinem angemeldeten Xcode | 30 min |
| 9 | Eddie und Anny einladen (App Store Connect, Benutzer und Zugriff) | du | 10 min |
| 10 | Eddie und Anny: TestFlight-App aus dem App Store laden, Einladung annehmen, Mission Sommerbody installieren | Eddie, Anny | 5 min |

**Updates danach:** Weil die App eure Seite lädt, kommen alle Änderungen an der Seite ohne neue App-Version an. Einen neuen Build braucht es nur, wenn sich am nativen Teil etwas ändert, zum Beispiel an Apple Health.

**Android** läuft parallel und genauso: Play Console, Android Studio, interner Test, Einladung per Link.

## Risiken und ehrliche Grenzen

- **Zeit:** Bis die App bei allen dreien läuft, vergeht realistisch eine Woche. Der größte Unsicherheitsfaktor ist die Freischaltung des Apple-Kontos.
- **Gesundheitsdaten:** Apple Health liefert Gesundheitsdaten. Sie gehen in dieselbe Datenbank wie heute (EU, Irland), aber Apple verlangt dazu klare Angaben und einen sichtbaren Berechtigungsdialog.
- **Laufende Kosten:** Apple 99 USD jedes Jahr, solange die App installierbar bleiben soll.
- **Schrittzahlen:** Apple Health und Handy-Schrittzähler weichen voneinander und von Uhren ab. Das ist normal.

## Offene Fragen an dich

1. **Welche Handys haben Eddie und Anny?** Nur iPhones, oder ist Android dabei?
2. **Ist das automatische Holen der Schritte aus Apple Health der Hauptgrund für eine echte App?** Wenn nicht, reicht Weg 1.
3. **Soll die App nach dem 13.11. weiterleben?** Dann rechnet sich Weg 2 eher.
4. **Konto privat oder über Boomlike?** Meine Empfehlung: privat.
