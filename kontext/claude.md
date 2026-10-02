# Anweisungen für Claude: Kontext zu Ninas Instagram (@ninahoemmencoaching)

Diese Datei und ihre drei Schwestern liegen in `~/nina-insta/kontext/`. **Lies vor jeder Arbeitsaufgabe, die Ninas Marke, Texte, Inhalte oder Gestaltung betrifft, in dieser Reihenfolge:**

1. `~/nina-insta/CLAUDE.md` (feste Regeln, gelten immer zuerst)
2. `kontext/who_i_am.md` (Person, Marke, Angebote, Zielgruppe, Ziele, was offen ist)
3. `kontext/how_i_talk.md` (Tonalität, Wortschatz, Caption-Aufbau, was nie vorkommt)
4. `kontext/how_you_work.md` (wie mit Christian zu arbeiten ist)
5. `learnings.md` und `docs/strategie.md` (was getestet wurde, Strategie und Plan)

**Vorrang bei Widerspruch:** `docs/auftrag.md`, dann `CLAUDE.md`, dann diese Dateien, dann `docs/strategie.md`. Diese Dateien ändern keine festen Regeln, sie ergänzen nur. Was in `who_i_am.md` unter „Offen“ steht, nie als Fakt schreiben, sondern fragen oder als Annahme kennzeichnen. Nach neuen Erkenntnissen (Ninas Wünsche, neue Angebote, neue Tabuwörter) die passende Datei knapp nachziehen, mit Datum.

## Workflows auf Abruf

Auslöser sind die Namen unten. Jeder Workflow endet mit einem Ergebnis, das Christian direkt benutzen kann, und trägt nichts in Ninas Konto ein.

### Audience Bullseye Builder (5-Stufen-Zielgruppenanalyse für den Content-Mix)

Eingabe: nichts Zusätzliches nötig, sonst Zeitraum oder Thema. Vorgehen: Die Zielgruppe in fünf Ringen von innen nach außen beschreiben, jeweils als **Annahme gekennzeichnet**, solange Daten fehlen (Alter, Beruf nicht belegt):

1. **Ring 1, Bereit:** Menschen, die ein Coaching oder das Buch bereits suchen (Muster erkannt, suchen Hilfe).
2. **Ring 2, Betroffen:** erkennen das Muster, haben aber noch kein Wort dafür.
3. **Ring 3, Neugierig:** erleben einzelne Szenen (Warten auf Antwort, Rückzug nach schönen Abenden), suchen keine Lösung.
4. **Ring 4, Angrenzend:** Freundinnen, Eltern, Coaches, Partner, die helfen oder verstehen wollen (das Buch nennt Eltern und Coaches ausdrücklich).
5. **Ring 5, Streuung:** Fremde, die über Reichweiten-Inhalte (Zitat, Szene) auf das Profil kommen.

Je Ring ausgeben: typische Situation in einem Satz, ein wörtliches Zitat, das sie sagen würde, passendes Format (Karussell, Story, Reel), ein Hook, passendes Angebot (oder keins), eine Messgröße (zum Beispiel Speicherungen, Nicht-Follower-Anteil, Profilbesuche, Anfragen). Zum Schluss ein Vorschlag für den **Content-Mix in Prozent** über 4 Wochen, mit Begründung und mit Bezug zu den Kernthemen. Abgleich mit `data/messwerte.json`: Wo Zahlen vorliegen, diese nennen; sonst „nicht gemessen“.

### Hook Machine (Hooks bewerten und neu schreiben)

Eingabe: Hooks von Nina oder aus fremden Beiträgen, oder ein Thema. Vorgehen:

1. **Bewerten** jeden Hook von 1 bis 5 auf sechs Prinzipien: Selbstbezug (die Leserin erkennt sich in einem Satz), Konkretheit (Szene statt Begriff), Widerspruch oder Neugier-Lücke (Auflösung fehlt), Spannung ohne Drama (keine Übertreibung), Mitnahme-Versprechen (etwas, das sie sofort hat), Sicherheit (keine Schuld, kein Heilversprechen, keine Diagnose). Kurze Begründung je Wert.
2. **Neu schreiben:** fünf Varianten je Hook, getrennt nach Muster (Ich-Geständnis, wörtliches Zitat, Widerspruch, Alltagsszene, Frage), im Ton aus `how_i_talk.md`, neutral in der Ansprache.
3. **Gegenprüfen** jede Variante gegen die festen Regeln und gegen die 30-Tage-Sperre (`plan/queue.json`, `~/NINA/posts.md`).
4. Ausgabe als Tabelle: Original, Wert, Variante, Muster, Empfehlung. Empfehlung nennen, nicht nur sammeln.

### Channel & Outlier Analyzer (Muster und Gewinner)

Eingabe: `data/messwerte.json` (Ninas Konto), optional Referenz `docs/referenzanalyse.md` oder neue Kennzahlen von Christian. Vorgehen:

1. Reichweite, Interaktionen, Speicherungen, Teilungen, Profilbesuche, Follower-Zuwachs je Beitrag einlesen. Beiträge ohne Daten als „nicht gemessen“ führen, nie schätzen.
2. **Ausreißer** bestimmen: deutlich über oder unter dem Median (zum Beispiel mehr als das 1,5-Fache oder weniger als die Hälfte). Immer die Stichprobengröße nennen; bei weniger als fünf Beiträgen je Gruppe als **Hinweis, nicht als Beleg** kennzeichnen.
3. Muster nach Format, Cover-Vorlage, Hook-Muster, Kernthema, Angebot (Werbung oder nicht), Wochentag und Uhrzeit auswerten. Besonders: Nicht-Follower-Anteil, Speicherungen und Teilungen als Wachstumssignale.
4. **Gewinner zerlegen:** Was haben die Top-Beiträge gemeinsam (Hook, Szene, Länge, Bild)? Was die schwächsten?
5. Höchstens **drei Hypothesen** für die nächsten 30 Tage, jede mit konkretem Test (was ändern, woran messen, wie lange). Die Selbstoptimierung (`automatik/think.mjs`) ändert nur eine Stellschraube pro Woche und nur freie Stellgrößen in `plan/params.json`; dieser Workflow schlägt nur vor und schreibt höchstens nach Absprache in `learnings.md`.
