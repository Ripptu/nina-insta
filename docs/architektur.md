# Architektur der Automatik (Stand 29.09.2026)

Läuft komplett in GitHub Actions (Linux), Claude nur über das Abo (`CLAUDE_CODE_OAUTH_TOKEN`). Der Mac wird nur für die App gebraucht.

## Ablauf
1. **Produzieren** (`automatik/produce.mjs`): Inhalte aus `docs/content-posts.md`, `docs/content-reels.md` (später von Claude neu geschriebene) → Bilder/Video in `out/<id>/` → Eintrag in `plan/queue.json`, Status `neu`.
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
