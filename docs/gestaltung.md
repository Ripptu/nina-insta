# Gestaltung: Foto-Typo (gilt seit 29.09.2026)

Christian hat zwei Referenzen vorgegeben, die Karussells sollen „exakt so aussehen“:
- `referenz/stil-typo-raster.webp` (Raster mit Vollbild-Fotos, riesige enge Schrift in Butter und Rosa)
- ein zweiter Raster-Screenshot (Instagram-Grid mit weißer Grotesk, dünner Schreibschrift, handgezeichneten Pfeilen und Kringeln, gestapeltem Wort „VLOG“)

Der frühere Collage-Stil (`referenz/stil-collage.webp`, Vorlagen in `render/templates.mjs`) ist damit **abgelöst**. Er bleibt im Repo, wird aber nicht mehr benutzt.

## Was den Stil ausmacht

- **Ninas echte Fotos im Vollbild** (1080 × 1350), leicht abgedunkelt und entsättigt (Verlauf oben und unten), damit Schrift lesbar bleibt. Keine Freisteller nötig.
- **Riesige enge Schrift** (Inter Tight 700, Zeilenabstand .86, Buchstabenabstand −4,5 %) in Weiß, Butter #fff0a6 und Rosa #ffc4e4. Meist 2 bis 4 Zeilen, oft eine Zeile in Rosa als Betonung.
- **Dünne Schreibschrift** (Mrs Saint Delafield) für Nebenbemerkungen, dazu handgezeichnete Pfeile und Kringel.
- **Handschrift-Notiz** (Reenie Beanie) für kleine Zusätze.
- **Bausteine:** iMessage-Blasen (rosa und weiß), Text-Markierung wie im iOS-Textfeld mit „Kopieren / Alles auswählen“, weiße Pillen mit Fakten rund um die Person, gestapelte Wiederholung eines Worts, Zitat in Butter.
- **Gesicht bleibt frei:** Text nie über Ninas Gesicht. Die Foto-Position wird pro Seite so gewählt, dass die Schrift in leeren Bildbereichen (Himmel, Wand, Boden) steht.
- **Logo** (Creme-Fassung, klein) unten links auf jeder Seite, außer wenn es Text stört.

## Umsetzung

`render/typo.mjs` (Bausteine) und `render/demo-typo.mjs` (Karussell 1 als Beispiel). Farben und Schriftstärken stehen dort, `render/palette.json` gilt für diesen Stil nicht.

## Offen

- Die Farben Butter und Rosa kommen aus der Referenz und weichen von Ninas Salbei ab. Mit Nina abstimmen.
- Bei hellen Fotos (Sonne, Himmel) reicht die Abdunklung teils knapp. Pro Foto prüfen.
- Ausgeschnittene Personen mit weißer Kontur wie im zweiten Raster (Person umrandet) sind noch nicht gebaut.
