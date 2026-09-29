// Reels (1080 x 1920, MP4 H.264 yuv420p, 30 fps, AAC) im Stil Foto-Typo.
// Quelle: docs/content-reels.md. Pro Zeitabschnitt der Tabelle "Zeit | Bild | Text im Bild" ein Standbild (Foto + Text über die Engine),
// per ffmpeg (zoompan-Bewegung, xfade-Übergänge) zu einem Video verbunden. Keine Musik (keine Lizenzen).
// Sprachnachricht-Reels brauchen Ninas Stimme: ohne opts.audio Status 'braucht-ton' und nichts wird gerendert.
import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import os from 'node:os'
import { ranked, CAT } from './engine.mjs'
import { renderSlide, SAFE, PH } from './story.mjs'
import { benutzteCoverFotos, registriereCover } from './covers.mjs'

const FFMPEG = process.env.FFMPEG_PATH || path.join(os.homedir(), '.local/ffmpeg/bin/ffmpeg')
const FFPROBE = process.env.FFPROBE_PATH || path.join(os.homedir(), '.local/ffmpeg/bin/ffprobe')
const FPS = 30
const XFADE = 0.4
export const MAX_SEKUNDEN = 90

const strip = (s) => s.replace(/\*\*/g, '').replace(/\s+/g, ' ').trim()
const quoted = (s) => {
  const a = s.indexOf('„')
  const b = Math.max(s.lastIndexOf('“'), s.lastIndexOf('"'))
  return a >= 0 && b > a ? strip(s.slice(a + 1, b)) : null
}

/** Liest docs/content-reels.md (20 Reels). */
export function readReels(file = new URL('../docs/content-reels.md', import.meta.url)) {
  const md = fs.readFileSync(file, 'utf8')
  const out = []
  for (const sec of md.split(/^## /m).slice(1)) {
    const head = sec.match(/^Reel (\d+): (.+)/)
    if (!head) continue
    const meta = {}
    for (const m of sec.matchAll(/^- ([^:\n]+): (.+)$/gm)) meta[m[1].trim().toLowerCase()] = m[2].trim()
    const hookLine = sec.match(/\*\*Hook[^\n]*\*\*\s*(.+)/)
    const ablauf = []
    let prev = 0
    for (const line of sec.split('\n')) {
      const m = line.match(/^\|\s*(\d+)\s*[–-]\s*(\d+)\s*s\s*\|\s*(.*?)\s*\|\s*(.*?)\s*\|\s*$/)
      if (!m) continue
      let cell = m[4].replace(/^groß:\s*/, '')
      const text = cell.trim() === '–' ? '' : (quoted(cell) ?? strip(cell))
      ablauf.push({ von: +m[1], bis: +m[2], dauer: +m[2] - prev, bild: m[3], text })
      prev = +m[2]
    }
    const skript = (sec.match(/\*\*Skript:\*\*\s*([\s\S]*?)\n\*\*Bildidee/) || [])[1]?.trim() ?? ''
    const bildidee = ((sec.match(/\*\*Bildidee:\*\*\s*(.+)/) || [])[1] ?? '').trim()
    const cap = sec.match(/\*\*Caption:\*\*\n([\s\S]*?)\n\*\*Hashtags:\*\*\s*(.+)/)
    // Fotohinweise aus der Bildidee: `08.20.23 (6)` heißt "WhatsApp Image 2026-09-15 at 08.20.23 (6).jpeg"; davor steht die Beschreibung.
    const hints = []
    for (const m of bildidee.matchAll(/`(\d\d\.\d\d\.\d\d(?: \(\d+\))?)`/g)) {
      const p = CAT.find((c) => c.file === `WhatsApp Image 2026-09-15 at ${m[1]}.jpeg`)
      if (p && p.kind !== 'ausgeschlossen') hints.push({ foto: p.id, kontext: bildidee.slice(Math.max(0, m.index - 75), m.index) })
    }
    const nr = +head[1]
    out.push({
      nr, id: `r${nr}`, titel: head[2].trim(), kernthema: parseInt(meta.kernthema) || null,
      serie: meta.serie && meta.serie !== '–' ? meta.serie.replace(/[„“"]/g, '') : null,
      hookArt: meta['hook-art'], umsetzung: meta.umsetzung, angebot: meta.angebot,
      fruehestens: meta['frühestens'] || null,
      hook: hookLine ? quoted(hookLine[1]) : null,
      ablauf, skript, sprechtext: /Sprechtext/.test(skript.split('\n')[0]), bildidee, hints,
      caption: cap ? cap[1].trim() : '', hashtags: cap ? cap[2].trim() : '',
      braucht_ton: meta.umsetzung === 'Sprachnachricht',
      dauer: ablauf.length ? ablauf[ablauf.length - 1].bis : 0,
    })
  }
  return out
}

// ---------- Fotoplanung ----------
const words = (s) => new Set((s.toLowerCase().match(/[a-zäöüß]{4,}/g) ?? []).filter((w) => !['nina', 'zoom', 'beginnt', 'langsamer', 'langsamem', 'mit', 'ihrem'].includes(w)))
const byId = (i) => CAT.find((p) => p.id === i)
/** Fotos 31 und 32 zeigen Nina mit dem Buch: nur für Buch-Angebote oder wenn der Ablauf sie nennt. */
const MIT_BUCH = new Set([31, 32])

/** Legt pro Abschnitt fest, welche Fotos in Frage kommen (Reihenfolge = Vorrang). */
function planFotos(reel, used) {
  const textReel = reel.umsetzung === 'Text-Reel' || /^Kein Foto/i.test(reel.bildidee)
  const hints = reel.hints.map((h) => ({ ...h, w: words(h.kontext) }))
  const taken = new Set()
  const plan = []
  let first = null
  let cur = null // { cands, buch }
  reel.ablauf.forEach((seg, i) => {
    const last = i === reel.ablauf.length - 1
    const bild = seg.bild
    let change
    if (textReel) change = true
    else if (i === 0) change = true
    else if (/aufgeschlagene|Buchseite|^Wechsel|^Nina (am|im|auf|mit|steht|sitzt|von)|^Porträt|zurück zu Nina/i.test(bild)) change = true
    else change = false
    if (!change) { plan.push({ ...cur, neu: false }); return }
    if (!textReel && i > 0 && /^Porträt|zurück zu Nina/i.test(bild) && first) { cur = first; plan.push({ ...cur, neu: true, zurueck: true }); return }
    // passenden Hinweis suchen (Wortüberschneidung zwischen Bildspalte und Beschreibung in der Bildidee)
    const bw = words(bild)
    let best = null
    for (const h of hints) {
      if (taken.has(h.foto)) continue
      const score = [...bw].filter((w) => h.w.has(w)).length
      if (score > 0 && (!best || score > best.score)) best = { h, score }
    }
    if (!best && textReel && last && hints.length) best = { h: hints.find((h) => !taken.has(h.foto)) ?? null }
    const hintFoto = best?.h ? byId(best.h.foto) : null
    if (hintFoto) taken.add(hintFoto.id)
    const back = /von hinten|Rücken/i.test(bild)
    const pool = ranked('portrait', used, reel.nr * 7 + i).filter((p) => (back ? p.kind === 'ruecken' : true))
    const rest = ranked('portrait', used, reel.nr * 7 + i).filter((p) => !pool.includes(p))
    const okBuch = reel.angebot === 'Buch'
    const cands = [...(hintFoto ? [hintFoto] : []), ...pool, ...rest].filter((p) => okBuch || p === hintFoto || !MIT_BUCH.has(p.id))
    cur = { cands: cands.filter((p, k) => cands.indexOf(p) === k), buch: hintFoto?.kind === 'buch' }
    if (!first) first = cur
    plan.push({ ...cur, neu: true })
  })
  return plan
}

// ---------- Bewegung ----------
/** zoompan-Ausdrücke aus der Bildspalte: Schwenk, Zoom zurück, Standbild, sonst langsamer Zoom hinein. Zoom bleibt ≤ 1,07 (Textrand). */
function motion(bild, n, i) {
  const t = `on/${Math.max(n - 1, 1)}`
  const cx = '(iw-iw/zoom)/2', cy = '(ih-ih/zoom)/2'
  if (/Standbild/i.test(bild)) return { z: `1+0.02*${t}`, x: cx, y: cy }
  if (/Schwenk/i.test(bild)) {
    const up = /oben|hinauf/i.test(bild)
    const left = /links/i.test(bild)
    if (up) return { z: '1.07', x: cx, y: `(ih-ih/zoom)*(0.85-0.7*${t})` }
    return left ? { z: '1.07', x: `(iw-iw/zoom)*(0.85-0.7*${t})`, y: cy } : { z: '1.07', x: `(iw-iw/zoom)*(0.15+0.7*${t})`, y: cy }
  }
  if (/zurück/i.test(bild)) return { z: `1.06-0.06*${t}`, x: cx, y: cy }
  return { z: `1+0.06*${t}`, x: cx, y: cy }
}

const probe = (file) => {
  const j = JSON.parse(execFileSync(FFPROBE, ['-v', 'error', '-print_format', 'json', '-show_streams', '-show_format', file]).toString())
  const v = j.streams.find((s) => s.codec_type === 'video')
  const a = j.streams.find((s) => s.codec_type === 'audio')
  return {
    dauer: +j.format.duration, codec: v?.codec_name, breite: v?.width, hoehe: v?.height, pix_fmt: v?.pix_fmt,
    fps: v ? eval(v.avg_frame_rate) : null, audio: a?.codec_name ?? null, groesse: +j.format.size,
  }
}

/** stills: [{file, dauer, bild}], Übergang XFADE. Schreibt out (MP4). */
function baueVideo(stills, out, { audio, total }) {
  const n = stills.length
  const args = ['-y', '-hide_banner', '-loglevel', 'error']
  for (const s of stills) args.push('-i', s.file)
  if (audio) args.push('-i', audio); else args.push('-f', 'lavfi', '-i', 'anullsrc=channel_layout=stereo:sample_rate=44100')
  const chains = []
  stills.forEach((s, i) => {
    const frames = Math.round((s.dauer + (i < n - 1 ? XFADE : 0)) * FPS)
    const m = motion(s.bild, frames, i)
    chains.push(`[${i}:v]scale=2160:3840:flags=lanczos,zoompan=z='${m.z}':x='${m.x}':y='${m.y}':d=${frames}:s=1080x1920:fps=${FPS},setsar=1[v${i}]`)
  })
  let prev = 'v0', acc = 0
  for (let i = 1; i < n; i++) {
    acc += stills[i - 1].dauer
    const o = i === n - 1 ? 'vx' : `x${i}`
    chains.push(`[${prev}][v${i}]xfade=transition=fade:duration=${XFADE}:offset=${acc.toFixed(3)}[${o}]`)
    prev = o
  }
  const vl = n === 1 ? 'v0' : 'vx'
  chains.push(`[${vl}]format=yuv420p[vout]`)
  chains.push(`[${n}:a]aresample=44100,apad=whole_dur=${total},atrim=0:${total},asetpts=N/SR/TB[aout]`)
  args.push('-filter_complex', chains.join(';'), '-map', '[vout]', '-map', '[aout]',
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-profile:v', 'high', '-pix_fmt', 'yuv420p', '-r', String(FPS),
    '-c:a', 'aac', '-b:a', '128k', '-ar', '44100', '-ac', '2', '-movflags', '+faststart', '-t', String(total), out)
  execFileSync(FFMPEG, args, { stdio: ['ignore', 'inherit', 'inherit'], maxBuffer: 1e8 })
}

const audioDauer = (f) => +execFileSync(FFPROBE, ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f]).toString().trim()

/**
 * Rendert ein Reel nach outDir: <id>.mp4, <id>-cover.jpg, Standbilder in <id>-stills/.
 * opts.audio: Audiodatei (Ninas Stimme); ohne sie werden Sprachnachricht-Reels nicht gerendert (status 'braucht-ton'),
 *             alle anderen bekommen eine stille AAC-Spur. Ist das Audio länger als der Ablauf, wird der letzte Abschnitt verlängert.
 * opts.used: Set bereits benutzter Foto-IDs (Variation über mehrere Reels). opts.coverRegistrieren: false schaltet covers.mjs-Eintrag ab.
 * Rückgabe: { id, status: 'ok'|'braucht-ton', video, cover, coverFoto, dauer, fotos, stills, probe, log }.
 */
export async function renderReel(eng, reel, outDir, opts = {}) {
  const log = []
  if (reel.braucht_ton && !opts.audio) return { id: reel.id, status: 'braucht-ton', video: null, cover: null, log: ['Sprachnachricht von Nina fehlt (Drive NINA/Sprachnachrichten)'] }
  if (!reel.ablauf.length) throw new Error(`${reel.id}: kein Ablauf`)
  let total = reel.dauer
  const durs = reel.ablauf.map((s) => s.dauer)
  if (opts.audio) {
    const ad = audioDauer(opts.audio)
    if (ad > total) { durs[durs.length - 1] += Math.ceil(ad - total); total = Math.ceil(ad) }
  }
  if (total > MAX_SEKUNDEN) throw new Error(`${reel.id}: ${total} s sind länger als ${MAX_SEKUNDEN} s`)
  fs.mkdirSync(outDir, { recursive: true })
  const sd = path.join(outDir, `${reel.id}-stills`)
  fs.mkdirSync(sd, { recursive: true })
  const used = opts.used ?? new Set()
  const plan = planFotos(reel, used)
  const stills = []
  const fotos = []
  let prevFile = null, prevFoto = null
  for (const [i, seg] of reel.ablauf.entries()) {
    const file = path.join(sd, `${String(i + 1).padStart(2, '0')}.jpg`)
    const pl = plan[i]
    if (!seg.text && prevFile) { fs.copyFileSync(prevFile, file); fotos.push(prevFoto); stills.push({ file, dauer: durs[i], bild: seg.bild }); continue }
    const text = seg.text || reel.hook
    // Kurze Sätze groß in Butter (Zitat-Modus), längere mit Betonung auf dem ersten Satz.
    const kind = i === 0 ? 'cover' : text.length <= 100 ? 'quote' : 'text'
    const spec = i === 0 ? { head: text } : { text }
    // Ein Foto pro Abschnitt: bei gleichem Foto wie zuvor zuerst das gleiche Foto versuchen.
    let cands = pl.cands
    if (pl.zurueck) cands = [byId(fotos[0]), ...cands].filter((p, k, a) => a.indexOf(p) === k)
    else if (!pl.neu && prevFoto != null) cands = [byId(prevFoto), ...cands].filter((p, k, a) => a.indexOf(p) === k)
    let r = await renderSlide(eng, { kind, spec, cands, file, log })
    if (!r) throw new Error(`${reel.id} Abschnitt ${i + 1}: kein Foto passt (${log.slice(-3).join('; ')})`)
    used.add(r.foto)
    fotos.push(r.foto)
    log.push(`Abschnitt ${i + 1} (${seg.von}-${seg.bis} s): Foto ${r.foto}, ${kind}`)
    prevFile = file; prevFoto = r.foto
    stills.push({ file, dauer: durs[i], bild: seg.bild })
  }

  // Cover (Regel: jedes Foto nur einmal als Cover). Das erste Standbild zeigt den Hook; ist sein Foto noch frei, ist es das Cover.
  const coverFile = path.join(outDir, `${reel.id}-cover.jpg`)
  const blocked = benutzteCoverFotos(reel.id)
  let coverFoto
  if (reel.hook === reel.ablauf[0].text && !blocked.has(fotos[0])) {
    fs.copyFileSync(stills[0].file, coverFile)
    coverFoto = fotos[0]
  } else {
    const free = plan[0].cands.filter((p) => !blocked.has(p.id))
    const r = free.length ? await renderSlide(eng, { kind: 'cover', spec: { head: reel.hook }, cands: free, file: coverFile, log }) : null
    if (r) coverFoto = r.foto
    else {
      const t = await eng.coverText({ head: reel.hook }, { PH, variant: reel.nr })
      if (!t) throw new Error(`${reel.id}: Cover-Text passt nicht`)
      await eng.renderHtml(t.html, coverFile, PH, false)
      coverFoto = 'text'
    }
    log.push(`Cover: ${coverFoto === 'text' ? 'reines Textcover' : 'Foto ' + coverFoto} (Foto ${fotos[0]} war schon Cover)`)
  }
  if (opts.coverRegistrieren !== false) registriereCover(reel.id, coverFoto)

  const video = path.join(outDir, `${reel.id}.mp4`)
  baueVideo(stills, video, { audio: opts.audio, total })
  const pr = probe(video)
  const fehler = []
  if (pr.codec !== 'h264') fehler.push('Codec ' + pr.codec)
  if (pr.pix_fmt !== 'yuv420p') fehler.push('pix_fmt ' + pr.pix_fmt)
  if (pr.breite !== 1080 || pr.hoehe !== 1920) fehler.push(`${pr.breite}x${pr.hoehe}`)
  if (Math.round(pr.fps) !== FPS) fehler.push('fps ' + pr.fps)
  if (pr.audio !== 'aac') fehler.push('Audio ' + pr.audio)
  if (Math.abs(pr.dauer - total) > 0.15) fehler.push(`Dauer ${pr.dauer.toFixed(2)} statt ${total}`)
  if (pr.dauer > MAX_SEKUNDEN) fehler.push('länger als 90 s')
  if (fehler.length) throw new Error(`${reel.id}: Prüfung fehlgeschlagen (${fehler.join(', ')})`)
  return { id: reel.id, status: 'ok', video, cover: coverFile, coverFoto, dauer: pr.dauer, fotos, stills: stills.map((s) => s.file), probe: pr, log }
}
