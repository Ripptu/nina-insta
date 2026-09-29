# Architektur der Automatik (Stand 29.09.2026)

Läuft komplett in GitHub Actions (Linux), Claude nur über das Abo (`CLAUDE_CODE_OAUTH_TOKEN`). Der Mac wird nur für die App gebraucht.

## Ablauf
1. **Produzieren** (`automatik/produce.mjs`): Inhalte aus `docs/content-posts.md`, `docs/content-reels.md` (später von Claude neu geschriebene) → Bilder/Video in `out/<id>/` → Eintrag in `plan/queue.json`, Status `neu`.
   **Vorrat** (`automatik/vorrat.mjs`, vor dem Produzieren): zählt, was noch keinen Queue-Eintrag hat, und lässt per `automatik/neu-schreiben.mjs --typ karussell|reel|story` neu schreiben (Karussells und Stories unter 6 unproduzierten: 4 neue, Reels unter 4). Die neuen Blöcke hängen im selben Format an `docs/content-posts-auto.md`, `docs/content-reels-auto.md` bzw. `docs/content-stories-auto.md`, nachdem der Parser sie lesen konnte und die Formregeln stimmen (bei Stories in `automatik/story-regeln.mjs`: Nummern fortlaufend nach der höchsten in den Dateien und in der Queue, Interaktion und Kernthema im Wechsel, keine Zahlen, Preise, Emojis oder Angebote). Stories liest `render/story.mjs` (`alleStories()`) aus beiden Dateien. Ist Claude nicht erreichbar (lokal nicht angemeldet), gibt es nur eine Meldung.
2. **Prüfen** (`automatik/qa.mjs`): unabhängiger Prüf-Agent (eigener Claude-Aufruf ohne Herstellungswissen) gegen `CLAUDE.md`. Status `geprueft` oder `abgelehnt` (mit Gründen, dann neu produzieren).
3. **Puffer:** mindestens 10 geprüfte Beiträge in der Queue (`automatik/fill.mjs`), sonst nachproduzieren.
4. **Veröffentlichen** (`automatik/publish.mjs`): Mo–Fr 20:00 Berlin ein Feed-Beitrag, 3 Stories pro Woche, Reels nach Plan. Datei `PAUSE` stoppt alles. Medien kurz in das öffentliche Repo `Ripptu/nina-insta-media` legen, Instagram-Container anlegen, veröffentlichen, danach Medien wieder löschen.
5. **Messen** (`automatik/measure.mjs`): täglich Insights der letzten Beiträge → `data/messwerte.json`.
6. **Denken** (`automatik/think.mjs`): wöchentlich; Claude liest `learnings.md` + Messwerte, ändert nur freie Variablen in `plan/params.json` (Hook-Stil, Themengewicht, Uhrzeit-Fenster, Format-Mix), nie die festen Regeln aus `CLAUDE.md`.
7. **Bericht** (`automatik/bericht.mjs`): Montag Mail an `REPORT_TO`.

## Datei-Verträge

`plan/queue.json` (Array):
```json
{ "id": "k01", "typ": "karussell|story|reel", "quelle": "docs/content-posts.md#Karussell 1", "titel": "Wer ich bin",
  "angebot": "Coaching|Buch|Shop|Veranstaltungen|keins", "kernthema": 3, "fruehestens": "2026-11-08|null",
  "dateien": ["out/k01/01.jpg", "..."], "caption": "…", "hashtags": ["#a", "#b"],
  "status": "neu|geprueft|abgelehnt|veroeffentlicht|fehler", "geplant": "ISO-Zeit oder null",
  "qa": { "verdikt": "ok|abgelehnt", "gruende": [], "am": "ISO" },
  "ig": { "id": "…", "permalink": "…", "am": "ISO" }, "fehler": null }
```
Module (alle ESM, Node ≥ 20, Abhängigkeiten im Wurzel-`package.json`):
- `automatik/queue.mjs`: `ladeQueue()`, `speichereQueue(q)`, `naechster(q, typ, jetzt)`.
- `automatik/instagram.mjs`: `veroeffentlicheKarussell({dateien, caption})`, `veroeffentlicheBild`, `veroeffentlicheStory`, `veroeffentlicheReel({video, caption, cover?})`, `erneuereToken()`, `insights(mediaId)`, `mediaListe(limit)`. Alle geben `{id, permalink}` zurück. Umgebung: `IG_ACCESS_TOKEN`, `IG_USER_ID`, `MEDIA_REPO`, `MEDIA_TOKEN`. Option `{trocken:true}` macht alles außer dem echten Veröffentlichen.
- `automatik/qa.mjs`: `pruefe(item, absVerzeichnis) → { verdikt, gruende[] }`.
- `render/story.mjs`: `renderStory(eng, story, outDir)`; `render/reel.mjs`: `renderReel(eng, reel, outDir)`.
- Layout-Engine: `render/engine.mjs` (`createEngine()`, `cover`, `text`, `split`, `renderHtml`), Gesichtsschutz in `render/render.mjs`, Fotokatalog `data/fotos.json`.

## Feste Grenzen (nie ändern)
Alles unter „Feste Regeln“ in `CLAUDE.md`. Kein Antworten auf Kommentare oder Direktnachrichten, nichts auf Instagram löschen, keine Werbung, keine Kontoeinstellungen. Token nie in Dateien oder Logs. Echtes Veröffentlichen nur über `publish.mjs` und nicht bei vorhandener `PAUSE`.

## Offenes
- Cross-Repo-Schreibrecht für `nina-insta-media`: Actions brauchen einen fein abgestuften Zugriffstoken (`MEDIA_TOKEN`, nur `contents:write` auf dieses eine Repo). Christian legt ihn einmal an.
- Ninas Fotos müssen in Drive `NINA/Fotos` liegen, die Action holt sie mit rclone.

## Instagram-Modul: Umgebungsvariablen und Limits
- Umgebung: `IG_ACCESS_TOKEN`, `IG_USER_ID`, `MEDIA_REPO` (`owner/repo`), `MEDIA_TOKEN`; für Token-Erneuerung `TOKEN_KEY` (mind. 16 Zeichen, verschlüsselt `data/ig-token.enc` mit AES-256-GCM); optional `MEDIA_BRANCH` (Standard `main`), `IG_API_VERSION` (Standard `v25.0`).
- Ein erneuertes Token liegt nur in `data/ig-token.enc`; die Automatik muss die Datei dauerhaft ablegen (Commit oder Cache). Wird `IG_ACCESS_TOKEN` von Hand neu gesetzt, gilt der neue Wert. Erneuern mindestens alle 30 Tage (Token läuft nach 60 Tagen ab, Erneuerung frühestens nach 24 h).
- Limits: laut Doku 50 bzw. 100 API-Beiträge pro 24 h (das Modul liest `quota_total`), Karussell 2 bis 10 JPEG, Caption max. 2200 Zeichen, Reels MP4/MOV bis 300 MB, Story-Video bis 60 s / 100 MB. `media_publish` wird bei 5xx nie wiederholt (Doppelpostgefahr).
- `{trocken:true}` sendet keine einzige Anfrage (auch keine Container) und gibt die geplanten Requests ohne Token zurück. Datei `PAUSE` im Projektwurzelordner blockiert jedes Veröffentlichen auch im Modul.
- Tests: `node --test` (Node 24 akzeptiert `node --test automatik/test/` als Ordner nicht, stattdessen ohne Argument oder mit `automatik/test/*.test.mjs`).

## QA-Agent (`automatik/qa.mjs`)
`pruefe(item, absVerzeichnis)` → `{ verdikt, gruende[] }` (zusätzlich `hinweise`, `dauerMs`). Zwei Stufen: harte Messungen im Code (Maße 1080×1350 bzw. 1080×1920, Dateien vorhanden, Hashtag-Zahl, „Link in der Bio“ bei Angebot, Video: H.264/AAC), danach ein eigener Aufruf der Claude-CLI (`claude -p`, nur Werkzeug Read, temporäres Verzeichnis mit Bildkopien und einer Übersicht in Daumennagelgröße, Videos als Frames). Der Prüf-Agent bekommt nur die Prüfliste `automatik/qa/regeln.md` (aus `CLAUDE.md` abgeleitet, bei Regeländerung mitpflegen), die Bilder und die Caption. Das Verdikt leitet der Code aus der Punkteliste ab; Aufruf-, Parse- oder Vollständigkeitsfehler ergeben immer `abgelehnt` mit „Prüfung nicht durchführbar“. Umgebung: `CLAUDE_BIN` (sonst `claude` im PATH, sonst die Claude-App), `QA_MODEL` (Standard `sonnet`), `ANTHROPIC_API_KEY` wird im Kindprozess entfernt (nur Abo, in der Action über `CLAUDE_CODE_OAUTH_TOKEN`). Test: `node automatik/qa/pruefung/lauf.mjs` (Testbeiträge nach `material/qa-test/`, gitignored).
