import * as T from './templates.mjs'
import { renderPages } from './render.mjs'
const F = (n) => process.cwd() + '/../material/freisteller/' + n
const files = await renderPages([
  T.coverViral({ script: 'Früher', lines: ['dachte ich,', 'Liebe sei', 'einfach.'], subline: 'Wer hier schreibt und warum ich begleite.', foto: F('10-modnet.png') }),
], '../material/viral', { prefix: 'cover' })
console.log(files[0])
