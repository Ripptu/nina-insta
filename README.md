# Nina Insta

Vollautomatische Instagram-Betreuung für [@ninahoemmencoaching](https://www.instagram.com/ninahoemmencoaching/) (Nina Hömmen, traumasensible Single- und Beziehungscoachin, Oldenburg und online). Das System plant, gestaltet, prüft, veröffentlicht, misst und lernt selbst. Es läuft in GitHub Actions, der Mac wird nur für die App gebraucht. Zusätzliche Kosten: 0 € (Claude nur über das Abo, GitHub Actions im freien Kontingent).

## Für Christian: das Wichtigste

- **App „Nina Insta“** (`/Programme`, Menüleistensymbol): Übersicht, Kalender, Beiträge, Auswertung, Lernen, Material, Berichte, Protokoll, Einstellungen. Schließen versteckt nur das Fenster, die Menüleiste bleibt.
- **Pausieren:** App → Einstellungen → „Pausieren“ (legt die Datei `PAUSE` im Repository an). Solange sie da ist, veröffentlicht nichts.
- **Wochenbericht:** jeden Montag per Mail und in der App unter „Berichte“.
- **Neue Fotos:** in Drive `NINA/Fotos` legen. Fotos vom Mac: App → Material → „Fotos hochladen“.
- **App aktualisieren:** `App aktualisieren.command` doppelklicken. **Deinstallieren:** `Deinstallieren.command`.

## Was wann läuft (Berliner Zeit)

| Was | Wann | Datei |
|---|---|---|
| Veröffentlichen (Feed) | Mo–Fr 20:00 (Mo Reel, Di Karussell, Mi Serien-Reel, Do Karussell, Fr Reel) | `.github/workflows/veroeffentlichen.yml` |
| Stories | Di, Do, So 12:30 | ebenda |
| Produzieren und prüfen (nur wenn der Puffer unter 10 fällt) | nachts | `produzieren.yml` |
| Messen | täglich früh | `messen.yml` |
| Denken (Auswertung, eine Stellschraube pro Woche) | sonntags abends | `denken.yml` |
| Bericht | montags früh | `bericht.yml` |
| Token erneuern (Instagram, 60 Tage gültig) | mittwochs | `token.yml` |

Geschätzter Verbrauch: etwa 250 bis 350 Actions-Minuten im Monat, das sind rund 15 % des freien Kontingents (2000 Minuten, nur Linux-Runner).

## Aufbau

```
CLAUDE.md            feste Regeln (Marke, Inhalt, Schutz, System), gilt vor allem anderen
docs/                Strategie, Referenzanalyse, Inhalte (content-*.md), Gestaltung, Architektur
plan/                queue.json (alle Beiträge und ihr Status), params.json (freie Stellgrößen)
automatik/           produce, qa (Prüf-Agent), publish, fill, messen, think, neu-schreiben, bericht
render/              Layout-Engine, Cover-Vorlagen, Innenseiten, Stories, Reels, Gesichtsschutz
data/                Fotokatalog, Freistell-Masken, Cover-Verbrauch, Messwerte, Angebote
app/                 Tauri-Mac-App (Rust + React)
learnings.md         was getestet wurde und was gilt
```

Ablauf: Vorrat (`docs/content-*.md`, bei Bedarf von Claude neu geschrieben) → Bilder und Videos (`render/`) → unabhängiger Prüf-Agent (`automatik/qa.mjs`) → Puffer von mindestens 10 geprüften Beiträgen → Veröffentlichen über die Instagram API → Messen → Denken.

## Regeln, die niemand ändert (auch nicht die Selbstoptimierung)

Alles unter „Feste Regeln“ in `CLAUDE.md`. Kurz: Ninas Fotos nur auf dem Cover und jedes Foto nur einmal als Cover; kein Gesicht wird je von Text überdeckt (der Renderer bricht sonst ab); Takeaway in jedem Beitrag; keine erfundenen Zahlen, Personen, Zitate, Preise oder Termine; traumasensibel, keine Diagnosen; Zielgruppe nicht auf Frauen verengt; nie auf Kommentare oder Nachrichten antworten; nichts auf Instagram löschen; kein Geld ausgeben, keine Werbung.

## Zugangsdaten

Nur im macOS-Schlüsselbund und als Actions-Secrets, nie im Code: `IG_ACCESS_TOKEN`, `IG_USER_ID`, `CLAUDE_CODE_OAUTH_TOKEN`, `RCLONE_DRIVE_TOKEN`, `DRIVE_FOLDER`, `GMAIL_USER`, `GMAIL_APP_PASSWORD`, `REPORT_TO`, `TOKEN_KEY`, `MEDIA_TOKEN` (fein abgestufter GitHub-Token, nur `nina-insta-media`, läuft nach einem Jahr ab).

## Wenn etwas hakt

- Kein Beitrag um 20 Uhr: App → Protokoll → Ablauf „Veröffentlichen“ → Details. Häufige Gründe: `PAUSE` gesetzt, Puffer leer, Token abgelaufen, `MEDIA_TOKEN` fehlt.
- Prüf-Agent lehnt ab: App → Beiträge → Filter „Probleme“, die Gründe stehen dort.
- Instagram meldet Fehler beim Video: Reels müssen H.264, 23–60 fps, 3–90 s sein (`render/reel.mjs` prüft das mit ffprobe).
