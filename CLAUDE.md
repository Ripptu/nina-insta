# Nina Insta: autonome Instagram-Automatik für @ninahoemmencoaching

Christian (VAMELA) betreut den Account von Nina Hömmen, traumasensibler Coach für Frauen in Oldenburg und online. Dieses Projekt plant, gestaltet, prüft, veröffentlicht und wertet Beiträge aus, ohne Freigabeschleife. Der vollständige Auftrag steht in `docs/auftrag.md`. Bei Widerspruch gilt `docs/auftrag.md`, danach diese Datei, danach `docs/strategie.md`.

## Bei jedem Lauf zuerst lesen

0. `kontext/claude.md` und die drei Dateien dort (`who_i_am.md`, `how_i_talk.md`, `how_you_work.md`): Person, Stimme, Zusammenarbeit, Workflows auf Abruf
1. `learnings.md` (was getestet wurde und was gilt)
2. `docs/strategie.md` (Positionierung, Kernthemen, Wochenmodell, Caption-Aufbau)
3. bei Produktion zusätzlich `docs/content-reels.md`, `docs/content-posts.md`, `data/angebote.json`, `plan/queue.json`

## Feste Regeln

Diese Regeln darf keine Selbstoptimierung ändern.

**Marke**
- Feed 1080 × 1350 JPG, Stories und Reels 1080 × 1920, Reels als MP4 (H.264, AAC).
- Farben: Weiß, Butter #fff0a6 und Rosa #ffc4e4 auf Fotos (Stil Foto-Typo, Christian 29.09.2026), Schrift auf hellen Flächen Tannengrün #33402f, keine dunklen Flächen. Ninas frühere Salbei-Palette gilt nicht mehr. Vor dem Livegang mit Nina abstimmen.
- Logo/Blumen-Doodle auf jeder Seite, jedem Reel und jeder Story (Datei in Drive `NINA/Marke`).
- Schrift aus Ninas bestehenden Beiträgen ermitteln (Beispiele in `NINA/Referenz`), nur frei lizenzierte Schriften, lokal eingebunden.
- Bilder nie verzerren, immer proportional skalieren und zuschneiden.
- Cover mit großer, fetter Schrift, lesbar in Daumennagelgröße.
- Jedes Foto darf nur ein einziges Mal als Cover (erste Karussell-Seite, Reel-Titelbild) vorkommen, niemals zweimal (Christian, 29.09.2026). Das Verzeichnis `data/cover-nutzung.json` führt Buch (`render/covers.mjs`). Sind alle Fotos verbraucht, kommt ein reines Textcover, und der Bericht meldet, dass neue Fotos gebraucht werden.

**Inhalt**
- Jeder Beitrag enthält etwas, das die Leserin sofort für sich mitnehmen kann.
- Keine „Aufgabe 1 / Aufgabe 2"-Schemata.
- **Karussell-Struktur (Christian, 02.10.2026, gilt für alle Karussells):** genau 6 Seiten. Seite 1 Hook, höchstens 10 Wörter, der Neugier weckt oder ein Problem aufmacht. Seiten 2 bis 5 Inhalt: ein Kerngedanke pro Seite, kurze Sätze (höchstens zwei, höchstens etwa 20 Wörter), keine Textwüsten. Seite 6 CTA: eine klare Handlungsaufforderung (Speichern, Teilen oder Kommentieren; bei Angebot „Link in der Bio“, ohne Angebot kein Link). Geprüft von `automatik/karussell-regeln.mjs` (beim Schreiben, Produzieren und im Prüf-Agenten).
- Angebote im Wechsel: Coaching, Buch, Shop, Veranstaltungen, jeder dritte Beitrag ohne Angebot. Hinweis immer auf „Link in der Bio".
- Deutsch, Du-Form, warm, klar, kein Marktschreier-Ton.
- Zielgruppe nicht auf Frauen verengen (Nina, 29.09.2026: „ab dem 1.1.27 arbeite ich auch mit Männern und Paaren“). Neutral ansprechen („du“, „Menschen“, „Paare“). Bezeichnungen echter Frauen-Angebote (Frauenkreis HERZ.ZEIT, FREUNDINNEN.ZEIT, „Zurück zu dir – 8 Abende für Frauen“) bleiben wörtlich und werden als solche gekennzeichnet. Vor dem 01.01.2027 keine Aussage, dass Männer begleitet werden; ab dann ausdrücklich erlaubt.

**Schutz**
- Traumasensibel: keine Diagnosen, keine Heilversprechen, keine Schuld bei der Leserin. Bei riskant lesbaren Themen (bleiben, verzeihen, Nähe zulassen) gehört die Grenze hinein (Respektlosigkeit, Kontrolle, Gewalt). Wo es passt, Hilfetelefon „Gewalt gegen Frauen" 116 016.
- Coaching-Inhalte nur anonymisiert, ohne Namen, Orte, Berufe, Alter oder erkennbare Details. Mini-Geschichten tragen den Hinweis, dass sie aus vielen Erfahrungen zusammengesetzt sind.
- Keine erfundenen Fotos, Personen, Kundenstimmen, Zahlen oder Studien. Zitate von Klientinnen nur, wenn sie wörtlich in Drive `NINA/Stimmen` liegen.
- Keine Preise, Termine oder Produktdetails erfinden. Nur verwenden, was auf der Homepage oder in Drive steht, und vor jedem Beitrag prüfen, ob es noch stimmt.

**System**
- Kein Geld ausgeben, keine Werbung schalten, keine Kontoeinstellungen ändern, nichts auf Instagram löschen.
- Nicht auf Kommentare oder Direktnachrichten antworten. Das bleibt bei Nina.
- Tokens und Schlüssel nur in Secrets bzw. im macOS-Schlüsselbund, nie im Code oder im Git-Verlauf.
- Ninas Unterlagen und ihr Buch vertraulich behandeln, öffentlich hochgeladen werden nur fertige Beitragsdateien.
- Liegt im Repository eine Datei `PAUSE`, wird nichts veröffentlicht.
- Kosten: 0 € zusätzlich. Claude nur über das Abo (`CLAUDE_CODE_OAUTH_TOKEN`), nie ein API-Schlüssel mit Abrechnung pro Nutzung. GitHub Actions nur Linux-Runner, Monatsverbrauch unter 50 % des freien Kontingents. Geht etwas nur gegen Geld: nicht umsetzen, kostenlose Alternative nennen und dokumentieren, was fehlt.

## Gestaltung

Stil **Foto-Typo** nach dem Instagram-Grid, das Christian am 29.09.2026 als einzige Referenz festgelegt hat („vergiss alle anderen Referenzposts“, „sei sehr kreativ“): Ninas echte Fotos im Vollbild auf jeder Seite (Karussell, Reel, Story), Ausschnitt und Foto wechseln je Seite, dazu riesige enge Grotesk in Weiß, Butter und Rosa, gestapelte Wörter (zwei Umrisse, ein volles Wort), iMessage-Blasen, iOS-Textmarkierung, Handschrift (Caveat, gut lesbar, nie dünne Schreibschrift) mit Pfeilen und Kringeln, Text hinter der Person (Freisteller-Masken). Bausteine `render/typo.mjs`, `render/viral.mjs` (Cover), `render/fotoinnen.mjs` (Innenseiten), Details `docs/gestaltung.md`. **Keine dunklen Flächen** (weder Dunkelrot, Braun noch Schwarz, Christian 29.09.2026): Farbflächen nur Rosa, Butter, Creme mit Schrift in Tannengrün (#33402f); die Abdunklung der Fotos ist neutral und nur hinter dem Text. Jedes Foto darf nur einmal als Cover vorkommen; auf Innenseiten dürfen Fotos in anderen Beiträgen wiederkehren, aber nie zweimal im selben Beitrag. Gesichter nie mit Text, Pfeilen, Pillen, Blasen oder Logo überdecken (der Renderer prüft das automatisch und bricht sonst ab). Objekte nur als eigene Zeichnungen. Der Papier-Stil (`render/designer.mjs`, STIL=designer) und die frühere Farbflächen-Variante sind abgelöst.

**Werbe-Beiträge:** Karussells mit `Format: Werbung` stellen ein Angebot (Buch, Coaching, Shop, Veranstaltungen) ausführlich vor, nur mit Aussagen aus `data/angebote.json` und den geprüften Inhalten. Etwa jeder vierte Feed-Beitrag ist einer (`automatik/auswahl.mjs`), nie zwei hintereinander.

## Weitere Regeln aus der Strategie

- Höchstens 5 Hashtags pro Beitrag.
- Caption-Aufbau und Wochenmodell: siehe `docs/strategie.md`.
- Kein Thema und kein Hook, der in den letzten 30 Tagen lief (auch nicht aus dem Altbestand in `~/NINA/posts.md`).
- Stories: die API kann keine interaktiven Sticker. Automatische Stories fragen nach einer Antwort per Nachricht.
- Ton ohne KI-Floskeln: keine dekorativen Nummerierungen („01", „02"), keine Kapitälchen-Kicker, keine Emojis auf Slides.

## Instagram-Zugang

- Business-Account-ID 17841472270201994, Instagram Graph API mit Instagram-Login, kostenlose Meta-Entwickler-App.
- Medien brauchen öffentliche HTTPS-Links: eigenes öffentliches GitHub-Repository nur für fertige Dateien, kurz vor dem Veröffentlichen hochladen, danach wieder löschen.
- Im Browser-Pane der Claude-App ist Instagram mit Ninas Konto angemeldet (Stand 29.09.2026). Dort nur lesen, nie liken, folgen, kommentieren oder Einstellungen ändern.

## Material

- Drive `NINA/` mit `Fotos`, `Marke`, `Sprachnachrichten`, `Podcast`, `Shop`, `Stimmen`, `Referenz`, `Musik`.
- Ninas Fotos liegen bisher in Christians Gmail (Mails von Nina, u. a. „Fw: Foto 1–19, a–I" vom 10./11.08.2026) und als WhatsApp-Bilder in `~/NINA/`. Sie kommen in Phase 2 nach Drive `NINA/Fotos`.
- Neues Material vom 02.10.2026 (zwei Mails „Bilder“ von Nina, per Chrome aus Gmail geholt): 26 Fotos als `fotos/okt_foto_NN.jpg` (Katalog-IDs 43–68, Masken in `data/masken/`, Buchfotos 55, 56, 60, 61, 62, 65, ausgeschlossen: 50 und 57 wegen fremder Personen) und 6 Videoclips als `videos/clip_NN.mp4` (480p, hochkant, Gesichter in `data/clips.json`, neu analysieren mit `node render/videoreel.mjs --analysieren`). Der Ton der Clips ist Alltagsgespräch (Nina erklärt, wie sie filmt) und wird nie verwendet: **Reels sind stumm**, die Clips laufen als Hintergrund unter der Textfolge (`render/videoreel.mjs`, ersetzt die Foto-Fassung in `render/reel.mjs`, `REEL_VIDEO=0` schaltet zurück). Reels mit „Umsetzung: Sprachnachricht“ (r11, r13, r18, r19, r20) warten auf Ninas Stimme. Reels laufen wieder: Mo/Mi/Fr Reel, Di/Do Karussell, Mi Serien-Reel (`plan/params.json`).
- **Veröffentlichen auslösen (seit 06.10.2026):** GitHubs Zeitplan startet nur etwa 4 bis 5 statt 45 Läufe am Tag (abends oft einer, mal 19:20, mal 23:08 Uhr), deshalb stößt ein Mac-Dienst die Veröffentlichung an: `~/Library/LaunchAgents/de.vamela.nina-insta-trigger.plist` startet alle 5 Minuten `~/nina-insta-trigger/mac-trigger.sh` (Kopie in `automatik/mac-trigger.sh`, schlanker Klon ohne `out/`). Es macht einen Trockenlauf (`NUR_PLAN=1 publish.mjs --trocken`) und startet `veroeffentlichen.yml` mit `trocken=false` nur, wenn etwas fällig ist. Protokoll `~/nina-insta-trigger/trigger.log`. Der GitHub-Zeitplan bleibt als zweite Sicherung, Doppelposts verhindern Tagessperre und Caption-Abgleich. Abschalten: `launchctl bootout gui/$(id -u)/de.vamela.nina-insta-trigger`. Der Mac muss laufen und online sein.
- **Facebook-Spiegelung (seit 08.10.2026):** `automatik/facebook.mjs` postet jeden Karussell- und Reel-Beitrag nach der Instagram-Veröffentlichung zusätzlich auf Ninas Facebook-Seite (Stories nicht). Braucht die GitHub-Secrets `FB_PAGE_ID` und `FB_PAGE_TOKEN` (Seiten-Zugangsschlüssel mit `pages_manage_posts`); ohne sie passiert nichts. Ergebnis steht in der Queue unter `fb` (`id` oder `fehler`); ein Facebook-Fehler beeinträchtigt Instagram nie. Seiten-ID 992738230600465. Der Seiten-Token muss aus einem **verlängerten** Benutzer-Token stammen (Explorer → ⓘ → Access Token Tool → „Extend Access Token“, dann `/{seiten-id}?fields=access_token`), sonst läuft er nach wenigen Stunden ab (so geschehen am 11.10.2026). Der seit 13.10. gesetzte Token läuft nie ab, wird aber ungültig, wenn Christian sein Facebook-Passwort ändert oder die App-Freigabe entzieht. Ein Facebook-Fehler macht den Lauf rot (GitHub-Mail) und steht im Wochenbericht.
- Ninas Vorgaben und Vorlagen: Mail „Fw: Insta" vom 07.08.2026 in Christians Gmail (Anhänge `WasistderVorlageist.pdf`, `screen.png`, `attachment.png`). Gehört nach Drive `NINA/Referenz`. Nina wünscht ausdrücklich, dass Stil und Vorlagen optisch unverändert bleiben.
- Altbestand: `~/NINA/` (Canva-Ablauf bis Beitrag 20 im September 2026, `posts.md` mit verbrauchten Themen). Dort nichts ändern.

## Werkzeuge auf Christians Mac (Stand 29.09.2026)

Kein Homebrew, alles ohne Admin-Rechte installiert:
- Node 24 LTS: `~/.local/node/bin`
- Rust 1.98 (rustup): `~/.cargo/bin`, eingebunden über `~/.zshenv`
- Python 3.12 und 3.13 über uv (`~/.local/bin/uv`), Projekt nutzt 3.12
- ffmpeg 6.0: `~/.local/ffmpeg/bin`
- GitHub CLI 2.101: `~/.local/bin/gh`
- Claude CLI: nicht im PATH. Die Desktop-App bringt sie mit unter `~/Library/Application Support/Claude/claude-code/<version>/claude.app/Contents/MacOS/claude`. Die Versionsnummer wechselt mit jedem App-Update, deshalb immer die höchste vorhandene Version suchen.
- Architektur: arm64 (M1 Pro)

Bash-Schleifen verlieren hier gern den PATH. Bei mehreren Schritten ein Node- oder Python-Skript statt Shell-Schleife nehmen.
