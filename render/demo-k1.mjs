import * as T from './templates.mjs'
import { renderPages } from './render.mjs'
const F = (n) => process.cwd() + '/../material/freisteller/' + n
const pages = [
  T.coverFoto({ script: 'Früher', headline: 'dachte ich, Liebe sei einfach.', subline: 'Wer hier schreibt und warum ich Frauen begleite.', foto: F('10-modnet.png') }),
  T.textSeite({ script: 'Drama', text: 'Meine erste Beziehung war von Drama, Eifersucht und Schmerz geprägt. Später sahen meine Beziehungen von außen gut aus. Innen fühlte ich mich oft leer und unsicher.', side: 'right' }),
  T.zitat({ quote: 'Ich fragte mich, warum ich mich nicht wirklich öffnen konnte.', foto: F('22-modnet.png') }),
  T.liste({ script: 'Privat', title: 'Ein bisschen mehr über mich', items: ['Aufgewachsen im Emsland', 'Seit 2008 in Oldenburg an der Hunte', 'Seit über zehn Jahren Kraft tanken in Dänemark', 'Pferde, Hunde, Herbst und tiefe Gespräche'] }),
  T.schluss({ script: 'Heute', text: 'begleite ich Frauen im Einzelcoaching und in Frauenkreisen. In Oldenburg und online.', cta: 'Kostenfreies Erstgespräch: Link in der Bio', foto: F('03-modnet.png') }),
]
const files = await renderPages(pages, '../material/demo-k1')
console.log(files.join('\n'))
