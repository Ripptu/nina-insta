# Gestaltung

## Karussells: Designer-Stil (gilt seit 29.09.2026, löst Foto-Typo bei Karussells ab)

Referenz: Panorama-Karussell einer Designerin (Christian, 29.09.2026): „wie von einem Designer gemacht, aber dennoch viral“. Umsetzung in `render/designer.mjs`, Demo `node render/demo-designer.mjs [Nr …]` (Ergebnis in `material/designer/`, ändert das Cover-Verzeichnis nicht, wenn `DEMO=1`).

- **Eine Leinwand, viele Seiten.** Jede Seite ist ein Ausschnitt einer Leinwand von N × 1080 Pixeln. Sticker (`verbinder`) liegen auf den Seitenkanten und sind auf beiden Seiten halb zu sehen, sie werden nur dort gesetzt, wo beide Seiten frei sind.
- **Schrift:** Playfair Display 900 für Überschriften, kursiv 700 für den Akzent (zweiter Teil des Hooks), Inter Tight für Fließtext, Caveat für Handschrift. Kopfzeile auf jeder Seite: Name, „traumasensibles Coaching“, Handle.
- **Farbwelt:** Rosa #ffc4e4, Braun #2a1710, Creme #f6efe6, Akzente Beere #b5347a und Butter. Seitenfolge wechselt je Beitrag (`themen`), Schlussseite immer Rosa.
- **Seitentypen:** Papier (Überschrift plus weiße Karte mit gerissenem Rand und Klebeband), Label (Überschrift in rosa Bändern), Statement (Überschrift mit Marker), Zitat, Chat (Du sagst / Manchmal meinst du), Schlussseite (Hinweis mit Button „Link in der Bio“, bei Buch ein Polaroid mit dem Buchfoto).
- **Cover:** Freisteller (Maske aus `data/masken/`) mit weißem Rand vor gerissenem Papier, Überschrift oben, Untertitel auf einem Papierstreifen. Die Person beginnt unter der Überschrift, nie darunter drüber; der Gesichtsschutz prüft zusätzlich alles, was nach der Person gezeichnet wird. Jedes Foto nur einmal als Cover (`render/covers.mjs`), danach Textcover im selben Stil.
- **Sticker:** eigene Zeichnungen (Herz, Funke, Blume, Tasse, Bücher, Sprechblase, Brief, Handy) mit weißem Rand, passend zum Text gewählt, bei Werbebeiträgen der Sticker des Angebots.
- Ersatz: Scheitert der Designer-Stil, rendert `render/karussell.mjs` den früheren Foto-Typo-Stil.

## Reels, Stories und der frühere Foto-Typo-Stil (bis 29.09.2026)


Christian hat zwei Referenzen vorgegeben, die Karussells sollen „exakt so aussehen“:
- `referenz/stil-typo-raster.webp` (Raster mit Vollbild-Fotos, riesige enge Schrift in Butter und Rosa)
- ein zweiter Raster-Screenshot (Instagram-Grid mit weißer Grotesk, dünner Schreibschrift, handgezeichneten Pfeilen und Kringeln, gestapeltem Wort „VLOG“)

Der frühere Collage-Stil (`referenz/stil-collage.webp`, Vorlagen in `render/templates.mjs`) ist damit **abgelöst**. Er bleibt im Repo, wird aber nicht mehr benutzt.

## Was den Stil ausmacht

- **Ninas echte Fotos im Vollbild** (1080 × 1350), leicht abgedunkelt und entsättigt (Verlauf oben und unten), damit Schrift lesbar bleibt. Keine Freisteller nötig.
- **Riesige enge Schrift** (Inter Tight 700, Zeilenabstand .86, Buchstabenabstand −4,5 %) in Weiß, Butter #fff0a6 und Rosa #ffc4e4. Meist 2 bis 4 Zeilen, oft eine Zeile in Rosa als Betonung.
- **Handschrift** (Caveat, fett, mit dunklem Schatten) für Nebenbemerkungen, dazu handgezeichnete Pfeile und Kringel. Die dünne Schreibschrift der Referenz (Mrs Saint Delafield) ist auf dem Handy schwer lesbar und wird nicht mehr benutzt. Mindestgröße 90 px.
- **Bausteine:** iMessage-Blasen (rosa und weiß), Text-Markierung wie im iOS-Textfeld mit „Kopieren / Alles auswählen“, weiße Pillen mit Fakten rund um die Person, gestapelte Wiederholung eines Worts, Zitat in Butter.
- **Gesicht bleibt frei (hart geprüft):** `render/render.mjs` sucht vor dem Speichern auf dem nackten Foto mit OpenCV YuNet (`render/py/faces.py`, Modell `render/py/yunet.onnx`) alle Gesichter, erweitert die Box um Stirn, Haare und Kinn und vergleicht sie mit jeder Textzeile, Pille, Blase, jedem Pfeil und dem Logo. Bei Überlappung bricht das Rendern mit Fehler ab (`faceGuard`, Standard an). Die Automatik muss dann Position, Größe oder Foto ändern. Mit `FACE_DEBUG=1` entstehen `debug-N.jpg` mit roten Gesichtsboxen und grünen Textboxen. Einrichtung: `uv venv render/py/.venv` und `uv pip install opencv-python-headless numpy` (in der Action derselbe Schritt).
- **Logo** (Creme-Fassung, klein) unten links auf jeder Seite, außer wenn es Text stört.

## Fotos nur auf dem Cover (Christian, 29.09.2026)

Ninas Fotos erscheinen nur auf dem Cover, jedes Foto nur einmal (`render/covers.mjs`). Innenseiten, Reel-Abschnitte nach dem ersten Bild und Stories sind Farbflächen mit riesiger Schrift, Markierung, Chat-Blasen und eigenen Strichzeichnungen (`render/seiten.mjs`, `render/deko.mjs`). Cover-Vorlagen: Text hinter Nina, Chat, markierter Text, eingekreistes Kernwort, gestapeltes Echo-Wort (`render/viral.mjs`), Freistell-Masken in `data/masken/`. Sind alle Fotos Cover gewesen, gibt es reine Textcover.

## Umsetzung

`render/typo.mjs` (Bausteine) und `render/demo-typo.mjs` (Karussell 1 als Beispiel). Farben und Schriftstärken stehen dort, `render/palette.json` gilt für diesen Stil nicht.

## Offen

- Die Farben Butter und Rosa kommen aus der Referenz und weichen von Ninas Salbei ab. Mit Nina abstimmen.
- Bei hellen Fotos (Sonne, Himmel) reicht die Abdunklung teils knapp. Pro Foto prüfen.
- Fotos ohne erkanntes Gesicht (Nr. 2, 33–35, 37–42 der Sheet-Liste) von Hand ansehen, bevor sie als Vollbild-Hintergrund gelten: erkennt YuNet ein abgewandtes Gesicht nicht, schützt die Prüfung nicht.
- Ausgeschnittene Personen mit weißer Kontur wie im zweiten Raster (Person umrandet) sind noch nicht gebaut.
