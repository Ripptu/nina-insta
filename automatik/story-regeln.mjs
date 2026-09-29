// Planung, Prompt und harte Formregeln für automatisch geschriebene Stories (neu-schreiben.mjs --typ story).
// Nur reine Funktionen (kein Netz, kein Dateizugriff), damit alles ohne Claude testbar ist (automatik/test/stories.test.mjs).
// Die Regeln stammen aus CLAUDE.md. Die inhaltliche Prüfung (Ton, Traumasensibilität) macht danach der Prüf-Agent (qa.mjs);
// hier stehen nur die Dinge, die sich maschinell sicher erkennen lassen.

export const INTERAKTIONEN = ['Umfrage', 'Fragebox', 'Quiz', 'Schieberegler']
/** Rotation der vier Kernthemen (Partnerwahl, Nähe, sich verlieren, Alleinsein). Nie zweimal dasselbe hintereinander. */
const KERNTHEMEN_FOLGE = [1, 3, 4, 2]
export const SCHLUSSSATZ = 'Schreib mir ein Wort als Nachricht.'
/** Zeichenlängen der Texte auf dem Bild (bestehende Stories: Text 134 bis 255, Auflösung 189 bis 354). */
export const LAENGE = { text: [60, 320], aufloesung: [60, 440] }
/** Nach diesen bestehenden Stories sind die Formate der Beispielblöcke im Prompt gewählt (docs/content-posts.md). */
const BEISPIEL_NR = { Umfrage: 2, Fragebox: 6, Quiz: 11, Schieberegler: 13 }
const HINTERGRUENDE = ['Foto von Nina (Porträt)', 'Foto von Nina (Natur/Alltag)', 'Foto von Nina am See (von hinten)']

/** Nächste freie Nummer: höher als jede Story in den Dateien und höher als jede Queue-ID s<Nr>. */
export function naechsteStoryNr(vorhanden, queueIds = []) {
  const ausQueue = queueIds.map((id) => /^s(\d+)$/.exec(String(id))?.[1]).filter(Boolean).map(Number)
  return Math.max(0, ...vorhanden.map((s) => s.nr), ...ausQueue) + 1
}

/**
 * Plan für die nächsten `anzahl` Stories: fortlaufende Nummern, Interaktion in der Reihenfolge Umfrage, Fragebox, Quiz,
 * Schieberegler (weiter nach der letzten vorhandenen), Kernthema rotierend, nie dasselbe wie die Story davor.
 * Jede Interaktion trifft mit der Zeit jedes Kernthema (die Rotation verschiebt sich alle vier Stories um eins).
 */
export function planeStories(vorhanden, anzahl, queueIds = []) {
  const start = naechsteStoryNr(vorhanden, queueIds)
  const letzte = vorhanden.reduce((a, s) => (!a || s.nr > a.nr ? s : a), null)
  const i0 = INTERAKTIONEN.indexOf(letzte?.interaktion)
  let vorher = letzte?.kernthema ?? null
  return Array.from({ length: anzahl }, (_, i) => {
    const g = vorhanden.length + i
    let k = KERNTHEMEN_FOLGE[(g + Math.floor(g / 4)) % 4]
    if (k === vorher) k = KERNTHEMEN_FOLGE[(KERNTHEMEN_FOLGE.indexOf(k) + 1) % 4]
    vorher = k
    return { nr: start + i, interaktion: INTERAKTIONEN[(i0 + 1 + i) % INTERAKTIONEN.length], kernthema: k }
  })
}

// ---------------------------------------------------------------------------------------------------------------------
// Harte Regeln
// ---------------------------------------------------------------------------------------------------------------------

/** Hilfetelefone dürfen Ziffern enthalten, sonst keine Zahlen (nichts Erfundenes). */
const HILFETELEFON = /116\s?016|0800\s?123\s?99\s?00/g
const MONATE = /\b(Januar|Februar|März|April|Juni|Juli|August|September|Oktober|November|Dezember)\b/

/** [Name, Test] auf jedem Text, der auf dem Bild oder in der Sticker-Fassung steht. Wahr = Verstoß. */
const TEXTREGELN = [
  ['Zahl (keine erfundenen Zahlen)', (t) => /\d/.test(t.replace(HILFETELEFON, ''))],
  ['Preis', (t) => /€|\bEuro\b|\bEUR\b|\bPreis(e|en)?\b/i.test(t)],
  ['Termin oder Monat', (t) => MONATE.test(t)],
  ['Studie oder Statistik', (t) => /%|\bProzent\b|\bStudie(n)?\b|\bStatistik\b|wissenschaftlich|Forschung(en)? zeig/i.test(t)],
  ['Emoji auf dem Bild', (t) => /\p{Extended_Pictographic}/u.test(t)],
  ['Ansprache als Frauen', (t) => /\b(Frau|Frauen|Mädels|Mädchen|Ladys?|Schwestern)\b/.test(t.replace(/Gewalt gegen Frauen/g, ''))],
  ['Männer (vor dem 01.01.2027 tabu)', (t) => /\bMänner\b/.test(t)],
  ['Aufgabe-Schema', (t) => /Aufgabe\s*[12]/i.test(t)],
  ['Angebot oder „Link in der Bio“ (Stories bewerben nichts)', (t) => /Link in der Bio/i.test(t)],
  ['Diagnose', (t) => /\b(Diagnose|Borderline|Narziss\w*|Depression\w*|depressiv\w*|PTBS|Bindungsstörung|Angststörung|Persönlichkeitsstörung)\b/i.test(t)],
  ['Heilversprechen', (t) => /\b(heil(en|st|t)|Heilung|geheilt)\b|garantier|nie wieder|für immer|endgültig|ein für alle Mal/i.test(t)],
  ['Schuldzuweisung', (t) => /selbst schuld|du bist schuld|ziehst[^.]*an, weil/i.test(t)],
]

/** Themen, bei denen die Grenze (Respektlosigkeit, Kontrolle, Gewalt) hineingehört (CLAUDE.md, Schutz). */
const RISIKOTHEMA = /verzeih|Nähe zulass|Nähe zuzulass|in (der|einer) Beziehung bleib|bei (ihm|ihr|der Person) bleib|bleiben oder gehen/i
const GRENZE = /Gewalt|respektlos|kontrollier|Kontrolle/i

const norm = (s) => String(s || '').toLowerCase().replace(/[^a-zäöüß0-9]+/g, ' ').trim()
const woerter = (t) => new Set(String(t || '').replace(SCHLUSSSATZ, '').toLowerCase().split(/[^a-zäöüß]+/).filter((w) => w.length > 3))
/** Jaccard-Ähnlichkeit der Wortmengen (0 bis 1), der Schlusssatz zählt nicht mit. */
export function aehnlichkeit(a, b) {
  const A = woerter(a), B = woerter(b)
  if (!A.size || !B.size) return 0
  let n = 0
  for (const w of A) if (B.has(w)) n++
  return n / (A.size + B.size - n)
}
const AEHNLICH_AB = 0.5

/** Verstöße gegen die Textregeln einer einzelnen Story (Automatik-Text, Auflösung, Text auf dem Hintergrund). */
export function textProbleme(s) {
  const out = []
  const felder = [['Automatik-Fassung', s.text], ['Auflösung', s.aufloesung], ['Text auf dem Hintergrund', s.textHg]].filter(([, t]) => t)
  for (const [feld, t] of felder) for (const [name, test] of TEXTREGELN) if (test(t)) out.push(`${feld}: ${name}`)
  const alles = felder.map(([, t]) => t).join(' ')
  if (RISIKOTHEMA.test(alles) && !GRENZE.test(alles)) out.push('riskantes Thema (verzeihen, bleiben, Nähe zulassen) ohne Grenze zu Respektlosigkeit, Kontrolle und Gewalt')
  if (/Gewalt/.test(alles) && !/116\s?016/.test(alles)) out.push('Gewalt erwähnt, aber ohne das Hilfetelefon „Gewalt gegen Frauen“ 116 016')
  if (s.text && !/\b(du|dir|dich|dein\w*)\b/i.test(s.text)) out.push('Automatik-Fassung: keine Du-Form')
  return out
}

/** Verstöße im Feld "Hintergrund" (Stil Foto-Typo: nur Fotos von Nina, keine Farbflächen, kein Buch-Foto ohne Buchbezug). */
export function hintergrundProbleme(hg) {
  if (!hg) return ['Hintergrund fehlt']
  const out = []
  if (!/Foto/.test(hg)) out.push('Hintergrund: nur ein Foto von Nina (Foto-Typo), keine Farbfläche')
  if (/Buch/.test(hg)) out.push('Hintergrund: kein Buch-Foto (Stories ohne Angebot)')
  if (/Salbei|dunkel|schwarz|braun|Fineline/i.test(hg)) out.push('Hintergrund: keine Salbei-Palette, keine dunklen Flächen, keine Fineline')
  return out
}

/** Alle Verstöße einer Story gegen Plan und Regeln (Liste, leer = in Ordnung). `kontext.titel/texte` sind schon Vorhandenes. */
export function storyProbleme(g, p, kontext = {}) {
  const out = []
  const mit = (m) => out.push(`Story ${g.nr}: ${m}`)
  if (g.interaktion !== p.interaktion) mit(`Interaktion ist „${g.interaktion}“, verlangt ist „${p.interaktion}“`)
  if (g.kernthema !== p.kernthema) mit(`Kernthema ist ${g.kernthema}, verlangt ist ${p.kernthema}`)
  if (!g.ziel || g.ziel.length < 10) mit('Ziel fehlt')
  if (!g.titel || g.titel.length < 3 || g.titel.length > 60) mit('Titel fehlt oder ist zu lang (3 bis 60 Zeichen)')
  if (!g.textHg) mit('Zeile „Text auf dem Hintergrund“ fehlt')
  if (!g.sticker || !g.sticker.startsWith(p.interaktion)) mit(`Zeile „Sticker (von Hand in der App, freiwillig für Nina)“ muss mit „${p.interaktion}.“ beginnen`)
  const [tmin, tmax] = LAENGE.text
  if (!g.text) mit('Automatik-Fassung fehlt oder steht nicht in „…“')
  else {
    if (g.text.length < tmin || g.text.length > tmax) mit(`Automatik-Fassung hat ${g.text.length} Zeichen, erlaubt sind ${tmin} bis ${tmax}`)
    if (!g.text.endsWith(SCHLUSSSATZ)) mit(`Automatik-Fassung muss mit „${SCHLUSSSATZ}“ enden`)
  }
  if (p.interaktion === 'Quiz') {
    const [amin, amax] = LAENGE.aufloesung
    if (!g.aufloesung) mit('Quiz braucht die Zeile „Auflösung (zweite Story, …)“ mit dem Text in „…“')
    else {
      if (!g.aufloesung.startsWith('Meine Sicht:')) mit('Auflösung muss mit „Meine Sicht:“ beginnen')
      if (g.aufloesung.length < amin || g.aufloesung.length > amax) mit(`Auflösung hat ${g.aufloesung.length} Zeichen, erlaubt sind ${amin} bis ${amax}`)
    }
  } else if (g.aufloesung) mit('nur Quiz-Stories haben eine Auflösung')
  for (const m of hintergrundProbleme(g.hintergrund)) mit(m)
  for (const m of textProbleme(g)) mit(m)
  if ((kontext.titel || []).some((t) => norm(t) === norm(g.titel))) mit(`Titel „${g.titel}“ gibt es schon`)
  for (const t of kontext.texte || []) {
    for (const eigen of [g.text, g.aufloesung].filter(Boolean)) {
      if (aehnlichkeit(eigen, t) >= AEHNLICH_AB) { mit(`Text ähnelt einer vorhandenen Story zu stark („${String(t).slice(0, 50)}…“), anderes Thema oder anderer Hook`); break }
    }
  }
  return out
}

/**
 * Prüft die vom Parser gelesenen Blöcke gegen den Plan. Rückgabe: null (in Ordnung) oder ein Text mit den Gründen,
 * den der nächste Versuch als Korrektur bekommt.
 */
export function pruefeStories(gelesen, plan, { titel = [], texte = [] } = {}) {
  if (gelesen.length !== plan.length) {
    return `${gelesen.length} statt ${plan.length} lesbare Story-Blöcke (Pflicht: Überschrift „## Story N: Titel“ und die Zeile „- Automatik-Fassung (ohne Sticker): „…““ mit dem Text in „…“)`
  }
  const probleme = []
  const bekannteTitel = [...titel], bekannteTexte = [...texte]
  const nummern = new Set()
  for (const g of gelesen) {
    const p = plan.find((x) => x.nr === g.nr)
    if (!p) { probleme.push(`unerwartete Nummer ${g.nr}`); continue }
    if (nummern.has(g.nr)) { probleme.push(`Nummer ${g.nr} doppelt`); continue }
    nummern.add(g.nr)
    probleme.push(...storyProbleme(g, p, { titel: bekannteTitel, texte: bekannteTexte }))
    bekannteTitel.push(g.titel)
    bekannteTexte.push(...[g.text, g.aufloesung].filter(Boolean))
  }
  return probleme.length ? probleme.slice(0, 8).join(' | ') : null
}

// ---------------------------------------------------------------------------------------------------------------------
// Prompt
// ---------------------------------------------------------------------------------------------------------------------

/** Beispielblock einer bestehenden Story mit der gewünschten Interaktion; die veraltete Hintergrund-Zeile wird ersetzt. */
export function beispielBlock(md, interaktion) {
  const nr = BEISPIEL_NR[interaktion]
  const m = md.match(new RegExp(`^## Story ${nr}:[\\s\\S]*?(?=\\n## |\\n# |$(?![\\s\\S]))`, 'm'))
  return m ? m[0].trim().replace(/^- Hintergrund:.*$/m, `- Hintergrund: ${HINTERGRUENDE[0]}`) : null
}

export function baueStoryPrompt({ regeln = '', strategie = '', learnings = '', themen = [], plan, beispiele = [], fehler = null }) {
  const nrn = plan.map((p) => `Story ${p.nr} (Interaktion: ${p.interaktion}, Kernthema: ${p.kernthema})`).join('; ')
  return `Du schreibst neue Stories für den Instagram-Account @ninahoemmencoaching (Nina Hömmen, traumasensible Single- und Beziehungscoachin, Oldenburg und online).

Was eine Story hier ist: ein einzelnes Bild (1080 × 1920) mit einem Foto von Nina und kurzem Text; bei Quiz-Stories kommt als zweites Bild die Auflösung dazu. Die Instagram-API kann keine Sticker. Deshalb veröffentlicht die Automatik nur die Zeile „Automatik-Fassung (ohne Sticker)“, sie bittet um eine Antwort per Nachricht, und genau dieser Text wird auf das Bild gesetzt. Die übrigen Zeilen (Text auf dem Hintergrund, Sticker) sind die freiwillige Fassung, die Nina von Hand in der App setzen kann.

VERBINDLICHE REGELN (CLAUDE.md):
${regeln}

STRATEGIE (Kernthemen, Caption-Aufbau, Wochenmodell):
${strategie}

BISHERIGE ERKENNTNISSE:
${learnings}

BEREITS VERWENDETE THEMEN/TITEL (nicht wiederholen, auch nicht sinngemäß): ${themen.join(' | ')}

AUFGABE: Schreibe ${plan.length} neue Story-Blöcke mit diesen Nummern, Interaktionen und Kernthemen: ${nrn}.
Kernthemen: 1 = Muster in der Partnerwahl, 2 = Nähe und die Angst davor, 3 = sich in Beziehungen selbst verlieren, 4 = allein sein, ohne zu warten. Jede Story bekommt ein frisches Thema mit einem frischen Hook, eine Mitnahme für die Leserin (ein Satz oder eine kleine Frage an sich selbst, die sie sofort für sich nutzen kann) und hört nicht bei einer Frage auf, sondern bei der Bitte um eine Antwort.

FORMAT je Block, exakt wie im Beispiel (jede Zeile außer der Überschrift beginnt mit „- “, die Texte stehen in „…“):
## Story N: Titel
- Interaktion: Umfrage | Fragebox | Quiz | Schieberegler
- Kernthema: 1 bis 4
- Ziel: ein Satz, was die Story bei den Lesenden bewirkt
- Text auf dem Hintergrund: „…“ (die Sticker-Fassung: Frage und Mitnahme, kein Emoji)
- Sticker (von Hand in der App, freiwillig für Nina): <Interaktion>. Frage: „…“ Antworten: „…“ / „…“ (Quiz: dazu „Als richtig markieren: „…“.“; Fragebox: „Antwort: frei“; Schieberegler: „Emoji des Reglers: 🤍“ und im Text auf dem Hintergrund „Unter dem Reglerbereich links „…“, rechts „…“.“)
- Auflösung (zweite Story, einige Stunden später, in beiden Fassungen gleich): „Meine Sicht: …“ (nur bei Quiz)
- Hintergrund: ${HINTERGRUENDE.join(' | ')}
- Automatik-Fassung (ohne Sticker): „…“ (ohne Sticker lesbar: die Frage mit den Antwortmöglichkeiten im Satz, die Mitnahme, am Ende genau: ${SCHLUSSSATZ})

HARTE REGELN (werden maschinell geprüft, ein Verstoß lässt den Versuch scheitern):
- Automatik-Fassung ${LAENGE.text[0]} bis ${LAENGE.text[1]} Zeichen, endet mit „${SCHLUSSSATZ}“. Quiz-Auflösung ${LAENGE.aufloesung[0]} bis ${LAENGE.aufloesung[1]} Zeichen, beginnt mit „Meine Sicht:“. Nur Quiz hat eine Auflösung.
- Du-Form, warm, klar, kein Marktschreier-Ton. Niemanden als „Frauen“ ansprechen, keine Männer erwähnen (neutral: „du“, „Menschen“).
- Keine Zahlen (außer den Hilfetelefonen), keine Preise, Termine, Monate, Studien, Prozentangaben, keine erfundenen Personen oder Zitate. Keine Diagnosen, keine Heilversprechen („nie wieder“, „für immer“), keine Schuld bei der Leserin.
- Kein Emoji im Text (nur in der Sticker-Zeile beim Schieberegler). Stories bewerben nichts: kein „Link in der Bio“, kein Angebot, kein Buch.
- Bei riskant lesbaren Themen (bleiben, verzeihen, Nähe zulassen) gehört die Grenze hinein (Respektlosigkeit, Kontrolle, Gewalt) und das Hilfetelefon „Gewalt gegen Frauen“ 116 016. Nähe, Rückzug und Alleinsein ohne diese Entscheidung brauchen sie nicht.
- Zeile „Hintergrund“: nur ein Foto von Nina aus der Liste oben (Stil Foto-Typo). Keine Farbflächen, keine Salbei-Palette, keine dunklen Flächen, keine Fineline, kein Buch. Die Hintergrund-Zeilen der Beispiele unten sind bereits angepasst, übernimm sie so und wechsle je Story.
- Interaktion und Kernthema genau wie oben verlangt. Titel neu, kurz (3 bis 60 Zeichen), ohne Nummerierung.
${fehler ? `\nDEIN LETZTER VERSUCH WURDE ABGELEHNT WEGEN: ${fehler}\nKorrigiere genau das.\n` : ''}
BEISPIELBLÖCKE (Format! Nur das Format übernehmen, nicht den Inhalt):
${beispiele.join('\n\n')}

Gib NUR die neuen Blöcke aus, ohne Vorwort und ohne Codeblock, getrennt durch eine Zeile "---".`
}
