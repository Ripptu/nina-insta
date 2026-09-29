# Prompt-Bausteine für Karussells (von Christian, 29.09.2026)

Quelle: Zusammenfassung eines Videos, von Christian eingefügt. Für Phase 3 als Arbeitsweise: Referenzbilder genau studieren, Stil übernehmen, Inhalt nicht; danach den Stil als wiederverwendbare Vorlage (Skill) festhalten, damit jeder neue Beitrag gleich aussieht.

## 1. Grundgerüst

```
You are a [designer / luxury brand art director / editorial magazine designer]. Build me an Instagram carousel that looks [premium / minimal / cinematic / arcadey].

BRIEF:
- Topic: [Thema]
- Audience: [Zielgruppe]
- Comment Keyword: [z. B. PROMPTS]
- What they get: [z. B. Resource guide / Cheatsheet]
- Social Handle: [@handle]

SLIDE STRUCTURE:
- One slide per idea
- Cover: Hook headline (max 6 words), Subline (max 10 words)
- Final slide: CTA slide (Call to Action)

STYLE:
- Style Name: [Name des Stils]
- Inspired by: [Inspiration]
- Colors: [Markenfarben]
- Fonts: [Schriftarten]
- Layout: [z. B. Separate graphic at top, text at bottom]
- Character/Graphics: [z. B. 3D Clay character / Gold robot]

TECHNICAL SETUP:
- Dimensions: 1080x1350 (4:5 ratio)
```

## 2. Zusatz für Referenzbilder

```
I've attached 5 reference images from one Instagram carousel creator. Study them closely: the paper, the typography, the spacing, the colors, the slide structure, and the small details. Then build me a new carousel in exactly this visual style. Match the style, not the content. Do not copy their text, their prompts, or their handle.
```

## 3. Als Skill festhalten

```
Turn this into a skill. Use the exact same style every time, include the reference images, and for each new carousel create a new character for the cover.
```

## 4. Anwendung

```
Use the [Skill-Name] skill and create a new carousel about [Thema].
```

## Übertragung auf dieses Projekt

- „Style" = `docs/gestaltung.md` plus `docs/referenz/stil-collage.webp`.
- „Character for the cover" gibt es hier nicht als erfundene Figur: Das Cover trägt ein echtes, freigestelltes Foto von Nina oder eine eigene Fineline-Zeichnung (feste Regel).
- „Comment Keyword" ist möglich („Schreib DASSELBE in die Kommentare"), aber die Automatik antwortet nie auf Kommentare. Nur einsetzen, wenn Nina selbst antworten will.
- Der Skill wird in Phase 3 als Vorlagen-Satz im Code umgesetzt (HTML/CSS/SVG), damit auch die GitHub-Action ohne Bild-API denselben Stil rendert.
