# Auftrag: autonome Instagram-Automatisierung (Masterprompt vom 28.09.2026, unverändert)


## Auftrag

Du baust für den Instagram-Account @ninahoemmencoaching ein System, das **vollständig autonom** läuft: Es plant, gestaltet, prüft, veröffentlicht, wertet aus und verbessert sich selbst. Nach der einmaligen Einrichtung muss ich (Christian, VAMELA) nichts mehr tun. Es gibt keine Freigabeschleife. Du triffst die Entscheidungen selbst, nach den Regeln in diesem Prompt.

**Kosten: 0 € zusätzlich.** Alles muss mit kostenlosen Diensten laufen und mit meinem bestehenden Claude-Abo. Details im Abschnitt „Kostenregel“.

**Ziel:** mindestens 20 Feed-Beiträge pro Kalendermonat, pünktlich veröffentlicht, in höchster gestalterischer Qualität, mit messbarem Wachstum an Followern, Profilaufrufen und Anfragen.

Arbeite die Einrichtung in Phasen ab (siehe unten). Während der Einrichtung darfst du mich fragen, gesammelt in einer Nachricht pro Phase. Nach dem Livegang fragst du nie mehr, sondern entscheidest und dokumentierst.

## Kontext

**Kundin:** Nina Hömmen, traumasensibler Coach für Frauen, die in der Liebe immer wieder dasselbe erleben. 1:1 Coaching in Oldenburg und online. Buch „Zwischen Single-Sein & falscher Nähe". Homepage nina-hömmen-coaching.de mit Coaching, Buch, Shop (ab November vollständig, mit eigener App und digitalen Produkten, im Dezember ein Adventskalender) und Veranstaltungen.

**Ausgangslage (28.09.2026):** 139 Follower, 87 Beiträge, fast nur Text-Karussells, in den letzten 30 Tagen nur 7 % der Aufrufe von Nicht-Followern. Details in `docs/strategie.md` und `docs/referenzanalyse.md`. Lies alle Dateien in `docs/` vollständig, bevor du irgendetwas baust.

**Nina steht nicht vor der Kamera.** Material kommt aus:
- Ninas Fotos in Google Drive
- Sprachnachrichten von Nina (etwa 1 Minute, ein Gedanke oder ein anonymisiertes Coaching-Thema), sie legt sie unregelmäßig in Drive ab
- später Material aus einem Gespräch/Podcast mit einer Bekannten
- den Inhalten ihrer Homepage (Coaching, Buch, Shop, Veranstaltungen)

Das System muss auch dann 20 Beiträge im Monat liefern, wenn Nina nichts Neues schickt.

## Feste Regeln (dürfen nie durch Selbstoptimierung geändert werden)

**Marke**
- Feed 1080 × 1350 JPG, Stories und Reels 1080 × 1920, Reels als MP4 (H.264, AAC).
- Farben nur Salbei #6d7965, Creme #f9f7f4, Hellgrau-Grün #d7dfde.
- Logo/Blumen-Doodle auf jeder Seite, jedem Reel und jeder Story (Datei in Drive `NINA/Marke`).
- Schrift aus Ninas bestehenden Beiträgen ermitteln (Beispiele in `NINA/Referenz`), nur frei lizenzierte Schriften, lokal eingebunden.
- Bilder nie verzerren, immer proportional skalieren und zuschneiden.
- Cover mit großer, fetter Schrift, lesbar in Daumennagelgröße.

**Inhalt**
- Jeder Beitrag enthält etwas, das die Leserin sofort für sich mitnehmen kann.
- Keine „Aufgabe 1 / Aufgabe 2"-Schemata.
- Angebote im Wechsel: Coaching, Buch, Shop, Veranstaltungen, jeder dritte Beitrag ohne Angebot. Hinweis immer auf „Link in der Bio".
- Deutsch, Du-Form, warm, klar, kein Marktschreier-Ton.

**Schutz**
- Traumasensibel: keine Diagnosen, keine Heilversprechen, keine Schuld bei der Leserin. Bei riskant lesbaren Themen (bleiben, verzeihen, Nähe zulassen) gehört die Grenze hinein (Respektlosigkeit, Kontrolle, Gewalt). Wo es passt, Hilfetelefon „Gewalt gegen Frauen" 116 016.
- Coaching-Inhalte nur anonymisiert, ohne Namen, Orte, Berufe, Alter oder erkennbare Details. Mini-Geschichten tragen den Hinweis, dass sie aus vielen Erfahrungen zusammengesetzt sind.
- Keine erfundenen Fotos, Personen, Kundenstimmen, Zahlen oder Studien. Zitate von Klientinnen nur, wenn sie wörtlich in Drive `NINA/Stimmen` liegen.
- Keine Preise, Termine oder Produktdetails erfinden. Nur verwenden, was auf der Homepage oder in Drive steht, und vor jedem Beitrag prüfen, ob es noch stimmt.

**System**
- Kein Geld ausgeben, keine Werbung schalten, keine Kontoeinstellungen ändern, nichts auf Instagram löschen.
- Nicht auf Kommentare oder Direktnachrichten antworten. Das bleibt bei Nina.
- Tokens und Schlüssel nur in Secrets, nie im Code oder im Git-Verlauf.
- Ninas Unterlagen und ihr Buch vertraulich behandeln, öffentlich hochgeladen werden nur fertige Beitragsdateien.

## Architektur

1. **Assets (Google Drive).** Ordner `NINA` mit `Fotos`, `Marke`, `Sprachnachrichten`, `Podcast`, `Shop`, `Stimmen`, `Referenz`. Anbindung über den Google-Drive-Connector, sonst über die Google Drive API mit einem Service-Account. Index mit Metadaten je Datei (Motiv, Stimmung, zuletzt verwendet). Ein Foto frühestens nach 3 Wochen erneut als Cover verwenden.
2. **Homepage-Abgleich.** Einmal pro Woche Coaching, Buch, Shop-Produkte und Veranstaltungen von der Homepage lesen und in `data/angebote.json` speichern. Neue Produkte und Termine automatisch in die Planung aufnehmen, abgelaufene Termine entfernen.
3. **Gestaltung ohne Bild-Credits.** HTML/CSS/SVG-Vorlagen, gerendert mit Playwright/Chromium. Vorlagen: Cover dunkel, Cover mit Foto, Textseite, Liste, Zitat, Vorher/Nachher, Mini-Geschichte, Produktvorstellung, Veranstaltung, Schlussseite, Story, Reel-Cover. Illustrationen als eigene SVG-Fineline-Zeichnungen (Personen immer bekleidet). Fotorealistische Bilder gibt es nur aus Ninas Fotos.
4. **Reels ohne Kamera.** Aus Sprachnachrichten und Podcast-Ausschnitten: lokal mit Whisper transkribieren, stärkste 20 bis 60 Sekunden wählen, Untertitel, Ninas Fotos mit langsamem Zoom und Schwenk, Hook groß in den ersten 2 Sekunden, Logo. Ohne neue Sprachnachricht: Text-Reels (Satz für Satz eingeblendet über ruhigen Fotos) ohne Stimme. Rendering mit ffmpeg.
5. **Redaktionsplan.** `plan/queue.json` mit Datum, Uhrzeit, Typ, Thema, Angebot, Status, Dateien, Caption, Qualitätsbericht. Die Planung hält immer einen **Puffer von 10 fertig geprüften Beiträgen**. Rhythmus: montags bis freitags je ein Feed-Beitrag um 20:00 Uhr Berlin, bis 20 pro Monat erreicht sind, dazu 3 Stories pro Woche. Themen und Reihenfolge zunächst nach `docs/strategie.md` und `docs/content-*.md`, danach nach den Zahlen.
6. **Autonome Qualitätsprüfung statt Freigabe.** Jeder Beitrag wird vor dem Einplanen von einem **separaten Prüfdurchlauf** bewertet, der die Entstehung nicht kennt (eigener Subagent mit nur dem fertigen Beitrag und den festen Regeln). Er prüft:
   - Regeln: jede feste Regel oben einzeln
   - Fakten: Angebote, Preise, Termine gegen `data/angebote.json`
   - Sprache: Rechtschreibung, Tonalität, kein Marktschreier-Ton
   - Gestaltung: Rendering ansehen, Lesbarkeit des Covers im Quadrat-Ausschnitt, nichts abgeschnitten, nichts verzerrt, Logo vorhanden
   - Wiederholung: kein Thema und kein Hook, der in den letzten 30 Tagen schon lief

   Nur Beiträge mit „bestanden" werden eingeplant. Durchgefallene werden bis zu zwei Mal überarbeitet, dann verworfen und ersetzt.
7. **Veröffentlichung.** Direkt über die Instagram Graph API (Instagram-Login, Business-Account ID 17841472270201994) mit einer kostenlosen Meta-Entwickler-App und einem langlebigen Token, den das System vor Ablauf selbst erneuert. Kein Composio, kein kostenpflichtiger Dienst. Karussell: Kind-Container, Eltern-Container, veröffentlichen. Reels und Stories analog. Instagram braucht öffentliche HTTPS-Links zu den Dateien: Lege dafür ein zweites, öffentliches GitHub-Repository nur für Mediendateien an, lade jede Datei erst kurz vor dem Veröffentlichen hoch und lösche sie danach wieder. Google-Drive-Links funktionieren nicht. Vor jedem Veröffentlichen das Tageskontingent prüfen. Nach dem Veröffentlichen per API kontrollieren, dass der Beitrag live ist.
8. **Zeitsteuerung, unabhängig von meinem Rechner.** Die Instagram-API kann nicht selbst planen. Richte deshalb GitHub Actions mit Cron ein (oder einen gleichwertigen Cloud-Job). Zwei Arten von Läufen:
   - **Veröffentlichen** (werktags 20:00 Uhr Berlin, Sommer- und Winterzeit beachten): reiner Code, braucht kein Sprachmodell.
   - **Denken** (Produktion, Prüfung, Auswertung, Optimierung): läuft über die offizielle GitHub Action `anthropics/claude-code-action` mit meinem Claude-Abo. Dafür erzeugst du mit mir einmal per `claude setup-token` einen Token und legst ihn als Secret `CLAUDE_CODE_OAUTH_TOKEN` ab. Kein kostenpflichtiger API-Schlüssel. Montags Auswertung, mittwochs und samstags Produktion zum Auffüllen des Puffers, am 1. jedes Monats Monatsrückblick.
9. **Auswertung.** Jeden Montag Konto- und Beitrags-Insights der letzten 7 Tage (Reichweite, Aufrufe, Anteil Nicht-Follower, Speicherungen, Shares, Kommentare, Profilaufrufe, Link-Taps, Follower netto) in `analytics/history.csv`. Bewertung nie nur nach Likes.
10. **Benachrichtigung ohne Handlungsbedarf.** Versand kostenlos über mein Gmail-Konto mit einem App-Passwort als Secret. Jeden Montag eine kurze Mail an stockmeier.ch@gmail.com: was lief, Zahlen gegen Vorwoche, was sich ändert. Am 1. des Monats zusätzlich ein Monatsbericht, den ich Nina weiterleiten kann (warm, ohne Fachbegriffe, mit den wichtigsten Zahlen und den Beiträgen des Monats). Keine Mail darf eine Aufgabe für mich enthalten, außer das System ist blockiert.

## Kostenregel: alles kostenlos

- **Claude:** nur über mein bestehendes Claude-Abo (Claude Code lokal und `claude-code-action` mit `CLAUDE_CODE_OAUTH_TOKEN`). Nie einen API-Schlüssel mit Abrechnung pro Nutzung verwenden.
- **GitHub:** Hauptrepository privat. Im kostenlosen Tarif gibt es für private Repositories ein monatliches Kontingent an Actions-Minuten. Nur Linux-Runner verwenden (macOS-Runner verbrauchen ein Vielfaches). Miss den Verbrauch jedes Laufs, zeig ihn in der App an und halte den Monatsverbrauch unter 50 % des Kontingents. Plane die Denk-Läufe entsprechend sparsam.
- **Instagram:** Graph API und Meta-Entwickler-App sind kostenlos.
- **Google Drive:** API kostenlos.
- **Transkription:** lokal mit faster-whisper (kleines Modell), kein Bezahldienst.
- **Bilder:** alles im Code gerendert, keine Bild-APIs, keine Credits. Schriften nur von Google Fonts.
- **Musik:** keine, außer lizenzfreie Dateien, die ich selbst in Drive `NINA/Musik` lege.
- **Mac-App:** mit kostenlosen Werkzeugen (Tauri, Rust, Node), auf meinem Mac gebaut, ohne kostenpflichtigen Apple-Entwickleraccount.
- **Wenn etwas nur gegen Geld geht:** nicht umsetzen, sondern mir die kostenlose Alternative nennen und dokumentieren, was dadurch fehlt.
- **Grenzen des Abos:** Falls das Nutzungslimit meines Claude-Abos greift, verschiebt sich die Produktion. Der Vorrat von 10 fertigen Beiträgen fängt das ab. Plane Denk-Läufe außerhalb der Zeiten, in denen ich selbst viel mit Claude arbeite (nachts).

## Mac-App: die Steuerzentrale

Zusätzlich zum System baust du ein **Programm für meinen Mac**, das ich per Doppelklick starte wie jede andere App. Ich soll im Alltag nie ein Terminal öffnen müssen, auch nicht für die Einrichtung.

**Grundprinzip:** Die App ist Anzeige, Einrichtung und Steuerung. Die eigentliche Arbeit (Veröffentlichen, Produktion, Auswertung) läuft in der Cloud über GitHub Actions. Deshalb wird auch gepostet, wenn der Mac aus ist oder die App geschlossen ist.

### Technik

- **Tauri 2** mit React, TypeScript und Tailwind. Klein, schnell, fühlt sich an wie eine native Mac-App. Nur wenn es einen triftigen Grund gibt, Electron, und dann kurz begründen.
- **Architektur des Macs erkennen** (`uname -m`): für Apple Silicon (arm64) oder Intel (x86_64) passend bauen.
- **Daten:** Zustand über die GitHub-API aus dem privaten Repository (`plan/queue.json`, `analytics/`, `learnings.md`, `logs/`, `PAUSE`). Lokaler Zwischenspeicher in `~/Library/Application Support/Nina Insta/`, damit die App auch offline sofort mit dem letzten Stand startet. App-Protokolle in `~/Library/Logs/Nina Insta/`.
- **Geheimnisse** (GitHub-, Google-, Instagram-, Claude- und Gmail-Zugänge) ausschließlich im macOS-Schlüsselbund. Nie in Dateien, nie im Repository. Von dort überträgt die App sie per GitHub-API verschlüsselt in die Actions-Secrets.
- **Keine Kosten:** nur kostenlose Werkzeuge, kein bezahlter Apple-Entwickleraccount. Die App wird lokal auf meinem Mac gebaut und signiert (ad hoc), damit macOS sie ohne Warnung öffnet.

### Einrichtungsassistent beim ersten Start

Statt Terminal-Befehlen führt mich die App beim ersten Start Schritt für Schritt durch alle Verbindungen. Jeder Schritt hat einen großen Knopf, öffnet bei Bedarf den Browser für die Anmeldung und zeigt danach einen grünen Haken:

1. **GitHub** anmelden (Device-Flow: Code anzeigen, Browser öffnet sich, fertig). Die App legt beide Repositories an, falls sie fehlen.
2. **Claude-Abo** verbinden: Die App startet `claude setup-token` im Hintergrund, öffnet die Anmeldung im Browser, übernimmt den Token und speichert ihn als Secret `CLAUDE_CODE_OAUTH_TOKEN`.
3. **Google Drive** verbinden (OAuth im Browser), Ordner `NINA` auswählen, Unterordner prüfen und fehlende anlegen.
4. **Instagram** verbinden: Schritt-für-Schritt-Anleitung mit Screenshots für die kostenlose Meta-Entwickler-App direkt in der App. Danach Anmeldung im Browser, Token übernehmen, Konto @ninahoemmencoaching prüfen.
5. **Gmail** für die Berichte: App-Passwort eintragen, Testmail senden.
6. **Abschlusstest:** alle Verbindungen prüfen, Ergebnis als Liste mit Haken.

Jeden Schritt kann ich später unter Einstellungen wiederholen.

### Oberfläche

Ninas Markenfarben, ruhig, übersichtlich, Deutsch, heller und dunkler Modus nach Systemeinstellung, Mac-typische Schrift (SF Pro) für die Bedienung, Ninas Schrift nur in den Beitragsvorschauen. Linke Seitenleiste, Inhalt rechts:

1. **Übersicht:** oben vier Kennzahlen mit Veränderung zur Vorwoche (Follower, erreichte Konten, Anteil Nicht-Follower, Profilaufrufe). Darunter ein Verlaufsdiagramm der Follower seit Start. Rechts der nächste Beitrag als Vorschau mit Countdown. Unten der Status aller Verbindungen und der verbrauchten GitHub-Minuten als Ampel.
2. **Kalender:** Monatsansicht mit kleinen Cover-Vorschauen an jedem Sendetag, Zähler „x von 20 Beiträgen diesen Monat", Status je Beitrag farbig: geplant, veröffentlicht, fehlgeschlagen.
3. **Beiträge:** alle Seiten zum Durchblättern wie auf dem Handy (Wischen und Pfeiltasten), Caption, Hashtags, Prüfbericht, nach der Veröffentlichung die Zahlen dieses Beitrags und ein Link zu Instagram. Optionale Knöpfe: „Neu erzeugen", „Aus dem Plan nehmen", „Jetzt veröffentlichen", „Alle Seiten speichern".
4. **Auswertung:** Diagramme je Woche und Monat, Ranking der besten Beiträge nach Anteil Nicht-Follower, Shares und Speicherungen, Formatvergleich, laufende Experimente mit Zwischenstand.
5. **Lernen:** `learnings.md` als Zeitleiste: was getestet wurde, was herauskam, was sich geändert hat.
6. **Material:** Ninas Fotos, Sprachnachrichten und Podcast-Dateien aus Drive als Raster, mit Markierung, was schon verwendet wurde.
7. **Berichte:** Monatsberichte zum Lesen und als PDF zum Weiterleiten an Nina, dazu die fertigen Texte für Bio, Highlights, Archivieren und Anpinnen mit „Kopieren"-Knopf.
8. **Protokoll:** alle Läufe und Aktionen mit Zeit und Ergebnis, Fehler rot, Filter nach Art.
9. **Einstellungen:** großer Schalter „Automatik läuft / pausiert" (setzt oder entfernt `PAUSE`), Sendezeit, Mindestanzahl Beiträge pro Monat, Verbindungen neu einrichten, Start bei Anmeldung ein/aus.

### Mac-Komfort

- **Menüleisten-Symbol** (Blumen-Doodle): zeigt auf einen Blick grün (alles läuft), gelb (Warnung) oder rot (blockiert). Klick öffnet ein Mini-Fenster mit dem nächsten Beitrag, den Followern heute und dem Pause-Schalter.
- **Mitteilungen von macOS** bei Veröffentlichung (optional abschaltbar), bei Fehlern und beim neuen Wochenbericht.
- **Optional beim Anmelden starten**, dann nur im Hintergrund in der Menüleiste.
- **Tastenkürzel:** ⌘1 bis ⌘9 für die Bereiche, ⌘R aktualisieren, ⌘P Pause umschalten.
- **Aktualisierung:** beim Öffnen und alle 5 Minuten. Wenn ich die App in Claude Code weiterentwickeln lasse, reicht danach ein Doppelklick auf `App aktualisieren.command` im Projektordner: baut neu und ersetzt die App in Programme.
- **Notfall:** Ist GitHub Actions gestört, kann ich in der App auf „Lokal veröffentlichen" klicken. Dann postet der Mac den fälligen Beitrag selbst, solange die App offen ist.

### Ergebnis auf meinem Mac

- `Nina Insta.app` in `/Applications`, mit eigenem App-Icon (Blumen-Doodle auf Salbei, in allen von macOS benötigten Größen) und im Dock
- `Nina Insta.dmg` im Projektordner zum Neuinstallieren
- `App aktualisieren.command` und `Deinstallieren.command` im Projektordner

### Abnahme der App

Bevor du die App als fertig meldest, prüfst du selbst:
- Kaltstart unter 3 Sekunden, keine Fehler in der Konsole
- Start ohne Internet zeigt den letzten Stand und einen Hinweis „offline"
- Jede Ansicht funktioniert mit echten Daten; von jeder machst du einen Screenshot und zeigst ihn mir
- Pause-Schalter setzen, einen Veröffentlichungslauf auslösen, prüfen, dass nichts gepostet wird, Schalter zurück
- Menüleisten-Symbol, Mitteilung und Tastenkürzel funktionieren
- Nach Neustart des Macs startet die App, wenn „bei Anmeldung starten" aktiv ist

## Selbstoptimierung

- **Wöchentlich:** Formate, Themen, Hooks, Cover-Varianten, Sendezeiten und Angebotsarten nach Anteil Nicht-Follower, Shares, Speicherungen und Profilaufrufen pro 1.000 Aufrufe vergleichen. Die Planung der Folgewoche gewichtet danach um: 70 % bewährt, 30 % Experiment.
- **Experimente:** Immer nur eine Sache pro Experiment ändern (zum Beispiel nur die Cover-Variante), mindestens 3 Beiträge pro Variante, erst dann entscheiden.
- **Gedächtnis:** Alles Gelernte in `learnings.md` mit Datum, Beleg (Zahlen) und Entscheidung. Diese Datei wird bei jedem Denk-Lauf zuerst gelesen.
- **Grenzen:** Die festen Regeln oben bleiben unangetastet. Die Selbstoptimierung darf Rhythmus, Formate, Themenmix, Hooks, Vorlagen und Sendezeiten ändern, aber nicht unter 20 Beiträge pro Monat gehen und keine neuen Kanäle, Konten oder Kosten einführen.
- **Rückschritt:** Fällt der Anteil Nicht-Follower zwei Wochen in Folge um mehr als ein Drittel, kehrt das System zur letzten Konfiguration zurück, die besser lief, und notiert das in `learnings.md`.

## Ausfallsicherheit

- Fehlschlag beim Veröffentlichen: nach 15 Minuten erneut versuchen, danach den nächsten Beitrag aus dem Puffer nehmen und mich per Mail informieren.
- Token läuft ab: automatisch erneuern, und 10 Tage vor Ablauf warnen, falls das nicht geht.
- Kein neues Material von Nina: Beiträge aus Homepage-Inhalten, `docs/`, Fotos und Illustrationen weiterproduzieren. Die 20 Beiträge pro Monat haben Vorrang.
- **Notbremse:** Liegt im Repository eine Datei `PAUSE`, veröffentlicht das System nichts mehr, bis sie entfernt ist. Im Alltag schalte ich das über den Schalter in der Mac-App.
- Jede Aktion wird in `logs/` protokolliert.

## Was trotzdem manuell bleibt

Diese Dinge kann die Instagram-API nicht, deshalb schlägt das System sie nur vor (einmal im Monatsbericht, als fertiger Text zum Kopieren): Bio ändern, Highlights pflegen, alte Beiträge archivieren, Beiträge anpinnen. Werbung schalten bleibt bewusst manuell, weil dabei Geld fließt.

## Einrichtung in Phasen

0. **Mac vorbereiten:** Prüfe, was auf meinem Mac fehlt (Xcode Command Line Tools, Homebrew, Node LTS, Rust, Python 3, ffmpeg, Git, GitHub CLI). Zeig mir eine Liste und installiere nach meinem einmaligen „ok" alles Fehlende. Nur kostenlose Werkzeuge.
1. **Grundlage:** Projekt anlegen, `docs/` lesen, `CLAUDE.md` mit allen Regeln dieses Prompts, `learnings.md` leer anlegen, Git initialisieren.
2. **App-Grundgerüst mit Einrichtungsassistent:** Die App so weit bauen, dass sie startet und der Einrichtungsassistent funktioniert. Ich richte alle Verbindungen über die App ein, nicht im Terminal. Danach alle Verbindungen nur lesend prüfen.
3. **Gestaltung:** Alle Vorlagen bauen, Karussell 1 aus `docs/content-posts.md` rendern und mir in der App zeigen. Mein Feedback einmal einarbeiten.
4. **Reels:** Ein Text-Reel und, falls schon vorhanden, ein Reel aus einer Sprachnachricht bauen und in der App zeigen.
5. **Prüfdurchlauf:** Den Prüf-Subagenten gegen 3 absichtlich fehlerhafte Testbeiträge laufen lassen (Heilversprechen, verzerrtes Bild, erfundener Preis). Er muss alle drei durchfallen lassen.
6. **Veröffentlichung:** Test mit einem Container, der nicht veröffentlicht wird. Dann den Vorrat mit 10 Beiträgen füllen.
7. **Zeitsteuerung:** GitHub Actions einrichten, Secrets aus dem Schlüsselbund übertragen, einen Probelauf jeder Lauf-Art ausführen, Protokoll und Minutenverbrauch zeigen und hochrechnen, wie viel vom kostenlosen Monatskontingent verbraucht wird.
8. **App fertigstellen:** alle Ansichten, Menüleiste, Mitteilungen, Tastenkürzel, `.dmg`, Skripte. Dann die Abnahme der App vollständig durchgehen.
9. **Livegang:** Ersten Auswertungsbericht als Ausgangswert erzeugen, `README.md` schreiben (was läuft wann, wie die App funktioniert, was die Mails bedeuten). Ab hier läuft alles ohne mich.

Fang mit Phase 0 an.
