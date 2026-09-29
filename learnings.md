# Learnings

Was getestet wurde, was herauskam und was sich dadurch geändert hat. Jeder Eintrag mit Datum, Beleg (Zahlen) und Entscheidung. Diese Datei wird bei jedem Denk-Lauf zuerst gelesen.

## 29.09.2026: Ausgangslage beim Livegang (Baseline)

- Konto @ninahoemmencoaching. Ausgangswerte (Follower, Reichweite je Beitrag) trägt der erste Mess-Lauf (`messen.yml`) ein, danach vergleicht der Denk-Lauf jeweils mit dem Vormonat.
- Stil: Foto-Typo (Vollbild-Fotos von Nina, riesige enge Schrift in Weiß, Butter, Rosa; Vorlagen Text hinter Person, Chat, Markierung, Kringel, gestapeltes Wort, Handschrift, Blasen). Karussell-Cover je Foto nur einmal. Keine dunklen Flächen. Entscheidung Christian 29.09.2026 nach Ablehnung von Papier-/Himmel-Stil.
- Rhythmus: Karussell Mo bis Fr 20:00, Stories Di/Do/So 12:30, im ersten Monat keine Reels (bis Nina Videos schickt). Etwa jeder vierte Karussell-Beitrag ist Werbung (Buch, Coaching, Shop, Veranstaltung), die ersten drei nie.
- Prüf-Agent: bei der ersten Serie wurden 5 von 8 Karussells abgelehnt. Ursachen waren echte Layoutfehler (Wort am Rand abgeschnitten, Buchstaben hinter dem Kopf verdeckt, Handschrift über Buchtitel) und Fehlalarme (Gesicht bei abgewandter Person, Caption bei Stories). Die Renderer prüfen jetzt Überlauf und einzelne Buchstaben; Prüf-Logik und Fotos mit Schrift (Buchtitel) wurden angepasst.
- Offene Hypothesen für die ersten 30 Tage: Cover mit Text hinter Nina gegen Chat-Cover gegen Markierungs-Cover (Reichweite, Speicherungen), Werbe-Beiträge gegen Nutzen-Beiträge (Speicherungen, Profilbesuche).


## 2026-09-29: Montags-Karussells erreichen deutlich mehr Reichweite und Interaktionen als an a
- Beobachtung: Montags-Karussells erreichen deutlich mehr Reichweite und Interaktionen als an anderen Wochentagen, Mittwoch ist am schwächsten. Die Uhrzeit selbst variiert nicht (alle Beiträge laufen um 18:00 UTC / 20:00 Berlin), daher liefern die Daten kein Zeit-Muster, das eine Änderung der Uhrzeit stützt.
- Beleg: Montag (Sep 7/14/21): Reichweite 29, 49, 55 (Ø 44,3), Interaktionen 3, 6, 11 (Ø 6,7). Mittwoch (Sep 2/9/16/23): Reichweite 34, 34, 30, 31 (Ø 32,3), Interaktionen 3, 4, 5, 3 (Ø 3,8). Dienstag Ø Reichweite 35,5/Interaktionen 6,5, Donnerstag Ø 33/5, Freitag Ø 33,75/4,75. Alle 20 regulären Feed-Beiträge im September liefen zur selben Uhrzeit 18:00:0x UTC, es gibt also keine Vergleichswerte für andere Uhrzeiten. Für Stories liegen in den Kennzahlen keine Einträge vor (nur typ:feed).
- Entscheidung: Kein Stellwert wird geändert. Das gefundene Muster betrifft den Wochentag (Montag stark, Mittwoch schwach), aber feed.tage ist laut Auftrag fix (nur Karussells Mo–Fr, Reels pausiert) und keine erlaubte Stellgröße. Bei der Uhrzeit selbst gibt es keine Streuung in den Daten, die einen Wechsel begründen würde, und für Stories fehlen Kennzahlen komplett. Eine Änderung ohne Zahlenbeleg wäre reine Spekulation. (keine Änderung)
- Nächster Test: In den nächsten zwei Wochen prüfen, ob der Montags-Vorsprung stabil bleibt (z. B. durch den Wochenend-Abstand seit dem letzten Beitrag) und ob Story-Kennzahlen erfasst werden, um stories.uhrzeit künftig belegbar zu testen; parallel beobachten, ob eine spätere Feed-Uhrzeit (z. B. 20:30) die schwachen Mittwoch-Werte verbessert, sobald dafür Vergleichsdaten vorliegen.
