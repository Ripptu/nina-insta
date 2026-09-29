# Nina Insta: autonome Instagram-Automatik für @ninahoemmencoaching

Christian (VAMELA) betreut den Account von Nina Hömmen, traumasensibler Coach für Frauen in Oldenburg und online. Dieses Projekt plant, gestaltet, prüft, veröffentlicht und wertet Beiträge aus, ohne Freigabeschleife. Der vollständige Auftrag steht in `docs/auftrag.md`. Bei Widerspruch gilt `docs/auftrag.md`, danach diese Datei, danach `docs/strategie.md`.

## Bei jedem Lauf zuerst lesen

1. `learnings.md` (was getestet wurde und was gilt)
2. `docs/strategie.md` (Positionierung, Kernthemen, Wochenmodell, Caption-Aufbau)
3. bei Produktion zusätzlich `docs/content-reels.md`, `docs/content-posts.md`, `data/angebote.json`, `plan/queue.json`

## Feste Regeln

Diese Regeln darf keine Selbstoptimierung ändern.

**Marke**
- Feed 1080 × 1350 JPG, Stories und Reels 1080 × 1920, Reels als MP4 (H.264, AAC).
- Farben laut `render/palette.json` (seit 29.09.2026 Altrosa: Text #7a4e48, Fläche #e2b7ab, zweite Fläche #f0dcd3, Papier #fbf7f3). Christian hat das gewählt; Ninas frühere Salbei-Palette (#6d7965, #f9f7f4, #d7dfde) gilt nicht mehr. Vor dem Livegang mit Nina abstimmen.
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
- Tokens und Schlüssel nur in Secrets bzw. im macOS-Schlüsselbund, nie im Code oder im Git-Verlauf.
- Ninas Unterlagen und ihr Buch vertraulich behandeln, öffentlich hochgeladen werden nur fertige Beitragsdateien.
- Liegt im Repository eine Datei `PAUSE`, wird nichts veröffentlicht.
- Kosten: 0 € zusätzlich. Claude nur über das Abo (`CLAUDE_CODE_OAUTH_TOKEN`), nie ein API-Schlüssel mit Abrechnung pro Nutzung. GitHub Actions nur Linux-Runner, Monatsverbrauch unter 50 % des freien Kontingents. Geht etwas nur gegen Geld: nicht umsetzen, kostenlose Alternative nennen und dokumentieren, was fehlt.

## Gestaltung

Collage-Stil nach `docs/referenz/stil-collage.webp`, Details und Übertragung in `docs/gestaltung.md`. Die festen Regeln oben gehen vor: Farben nur aus `render/palette.json`, nur Ninas echte Fotos, Objekte als eigene Zeichnungen. Personen groß und freigestellt mit weißem Aufkleberrand, leicht gekippt, Schreibschrift-Wort läuft hinter ihnen.

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
