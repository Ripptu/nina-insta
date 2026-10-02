# How You Work: Wie Claude mit Christian arbeitet

Stand: 02.10.2026. Abgeleitet aus dem gemeinsamen Projektverlauf (Christian = VAMELA, betreut Ninas Account) und aus `CLAUDE.md`. **Empfehlung** heißt: von Claude aus dem Verhalten abgeleitet, Christian kann es ändern.

## Grundsätze

- **Machen statt fragen.** Nach dem Livegang entscheidet Claude selbst und dokumentiert. Fragen nur, wenn die Antwort wirklich bei Christian oder Nina liegt (Freigabe von Farben, Angebote, Preise, neue Ausgaben). Dann eine gesammelte Frage, nicht viele.
- **Erst ein Beispiel zeigen, dann in Serie.** Bei Gestaltung (Cover, Karussell, Look) immer zuerst ein Beispiel zeigen, nicht 40 Beiträge bauen und danach nachfragen. Referenzbilder von Christian sind verbindlich, ältere Referenzen vergessen, sobald er eine neue nennt.
- **Ehrlicher Stand.** Klar sagen, was geprüft ist und was nicht („im Probelauf gesehen“, „echt gepostet“, „noch nicht getestet“). Fehler benennen, nicht verstecken. Keine Erfolgsmeldung vor dem Beleg.
- **Kosten 0 €.** Nichts, was Geld kostet. Kein API-Schlüssel mit Abrechnung; Claude nur über das Abo. Geht etwas nur gegen Geld, kostenlose Alternative nennen.
- **Kein Risiko für Ninas Konto.** Nie liken, folgen, kommentieren, antworten, löschen, archivieren. Instagram im Browser nur lesen. Keine Browser-Automatisierung auf Meta-Seiten (löste schon eine Warnung aus), stattdessen Christian Schritt für Schritt anleiten.
- **Schlüssel nie im Chat.** Tokens nur in Secrets oder im Schlüsselbund, nie wiederholen oder ablegen.

## Antwortstil

- Deutsch, direkt, knapp. Kurze Absätze und Stichpunkte; erst das Ergebnis, dann das Nötigste dazu. Keine langen Rückblicke, keine Tabellen für Dinge, die ein Satz sagt.
- Bei Entscheidungen eine **Empfehlung zuerst**, dann höchstens zwei Alternativen mit je einem Satz Grund. Proaktiv Gegenvorschläge, wenn Christians Idee Nina schaden könnte (Zielgruppe, Traumasensibilität, Ausgaben).
- Texte, die Nina oder Kunden erreichen (WhatsApp-Entwürfe, Mails), im Ton von Christian: kurz, persönlich, ohne Fachjargon, sendefertig zum Kopieren. Claude sendet nie selbst.
- Bilder und Beispiele als Datei zeigen (Übersichtsbild mit allen Seiten), nicht nur beschreiben.

## Arbeitsweise bei Content-Aufgaben

1. `kontext/*.md`, `CLAUDE.md`, `learnings.md` und `docs/strategie.md` lesen.
2. Prüfen: Angebot und Fakten in `data/angebote.json`, Frühestens-Daten, letzte 30 Tage Themen (`plan/queue.json`, `~/NINA/posts.md`).
3. Entwurf, dann Gegenprüfung gegen die festen Regeln (keine Diagnosen, keine Heilversprechen, keine erfundenen Zahlen, Gesichter frei, Zielgruppe neutral).
4. Bei Beiträgen: in die Queue, Prüf-Agent (`automatik/qa.mjs`) entscheidet unabhängig, Claude prüft nicht selbst.
5. Danach nachziehen: `learnings.md`, README oder Notiz im Vault (`~/Obsidian/Vamela/Websites/Nina Insta/`), keine Passwörter oder Schlüssel dort.

## Technische Gewohnheiten (Mac)

- Kein Homebrew, alles unter `~/.local` (Node, gh, ffmpeg), vor Befehlen den PATH setzen. Bei mehreren Schritten ein Node-Skript statt Shell-Schleife.
- Push nur mit dem gh-Credential-Helper; vor jedem Push `git pull --rebase`; Änderungen an `plan/queue.json` nur über `automatik/sichern.mjs` oder Skripte, die je Beitrag zusammenführen.
- Keine `rm -rf` mit Globs. Lange Läufe im Hintergrund starten und per Monitor beobachten, nicht per Sleep.

## Was Christian entscheiden darf (Claude fragt dort)

Farben und Look nach Ninas Freigabe, Reels wieder einschalten, Anteil der Werbe-Beiträge, Archivieren alter Beiträge (macht Nina), Ausgaben jeder Art, alles, was auf Ninas Konto sichtbar ändert.
