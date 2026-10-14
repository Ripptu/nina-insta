// Stimm-Reels (1080 x 1920): Ninas echte Sprachaufnahmen (stimme/*.m4a, Wortzeiten aus Whisper in stimme/*.json) als Ton,
// dazu laufende Untertitel in großer Schrift (Foto-Typo) über ihren Fotos und den ruhigen Clips ohne Sprechen.
// Clips mit Sprechen (clip_01 bis clip_03) werden hier nie benutzt: Lippen und Ton würden nicht zusammenpassen.
// Eine Definition (data/stimm-reels.json) nennt Aufnahme, Zeitbereich (an Satzgrenzen), Hook, Caption und Hashtags.
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { execFileSync } from 'node:child_process'
import sharp from 'sharp'
import { CAT } from './engine.mjs'
import { ladeClips, gesichtsBox, textEbene } from './videoreel.mjs'

const HERE = new URL('.', import.meta.url).pathname
const ROOT = path.join(HERE, '..')
const lokal = (n) => { const f = path.join(os.homedir(), '.local/ffmpeg/bin', n); return fs.existsSync(f) ? f : n }
const FFMPEG = process.env.FFMPEG_PATH || lokal('ffmpeg')
const FFPROBE = process.env.FFPROBE_PATH || lokal('ffprobe')
const FPS = 30, W = 1080, PH = 1920
const BLOCK_ZIEL = 8.5 // Sekunden je Hintergrund
const MAX_SEKUNDEN = 90
const RUHIGE_CLIPS = ['clip_05.mp4', 'clip_06.mp4', 'clip_04.mp4']
const MUSTER = ['foto', 'clip', 'foto', 'foto', 'clip']

export const lesDefinitionen = () => JSON.parse(fs.readFileSync(path.join(ROOT, 'data/stimm-reels.json'), 'utf8'))

/** Wörter eines Zeitbereichs mit Zeiten relativ zum Schnittanfang. */
function woerterIm(aufnahme, von, bis) {
  const d = JSON.parse(fs.readFileSync(path.join(ROOT, 'stimme', aufnahme + '.json'), 'utf8'))
  return d.woerter.filter((w) => w.start >= von - 0.05 && w.end <= bis + 0.1).map((w) => ({ t: w.word.trim(), s: Math.max(0, w.start - von), e: Math.max(0, w.end - von) }))
}

/** Gruppiert Wörter zu kurzen Untertiteln (höchstens 38 Zeichen, an Satzzeichen getrennt). */
function gruppen(wo, ersetzen = []) {
  const out = []
  let cur = []
  const text = (c) => c.map((w) => w.t).join(' ')
  const flush = () => { if (cur.length) { out.push({ text: ersetzen.reduce((t, [a, b]) => t.replace(a, b), text(cur)), s: cur[0].s, e: cur[cur.length - 1].e }); cur = [] } }
  for (const w of wo) {
    if (cur.length && text([...cur, w]).length > 38) flush()
    cur.push(w)
    const len = text(cur).length
    if (/[.!?]["“”]?$/.test(w.t) || (/[,:;]$/.test(w.t) && len >= 16) || cur.length >= 7) flush()
  }
  flush()
  // sehr kurze Reste (ein Wort) an den Nachbarn hängen, wenn es passt
  for (let i = out.length - 1; i > 0; i--) {
    if (out[i].text.split(' ').length === 1 && !/[.!?]$/.test(out[i - 1].text) && (out[i - 1].text + ' ' + out[i].text).length <= 40 && out[i].s - out[i - 1].e < 0.5) {
      out[i - 1] = { text: out[i - 1].text + ' ' + out[i].text, s: out[i - 1].s, e: out[i].e }; out.splice(i, 1)
    }
  }
  // Anzeigezeiten: bis zum nächsten Untertitel, nach langen Pausen früher ausblenden
  out.forEach((g, i) => {
    const next = out[i + 1]
    g.von = Math.max(0, g.s - 0.06)
    g.bis = next ? (next.s - g.e > 1.1 ? g.e + 0.55 : next.s - 0.04) : g.e + 0.7
  })
  return out
}

const photoBox = (p) => {
  const sc = Math.max(W / p.w, PH / p.h)
  const ox = (p.w * sc - W) / 2, oy = (p.h * sc - PH) / 2
  const Z = 1.07 // Zoom im Verlauf
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9
  for (const [x, y, w, h] of p.faces) {
    x0 = Math.min(x0, x * sc - ox - w * sc * 0.35); x1 = Math.max(x1, (x + w) * sc - ox + w * sc * 0.35)
    y0 = Math.min(y0, y * sc - oy - h * sc * 1.1); y1 = Math.max(y1, (y + h) * sc - oy + h * sc * 1.5)
  }
  const zx = (x) => (x - W / 2) * Z + W / 2, zy = (y) => (y - PH / 2) * Z + PH / 2
  return { x0: zx(x0), x1: zx(x1), y0: zy(y0), y1: zy(y1) }
}

const fotoDatei = (p) => path.join(process.env.FOTO_DIR || path.join(os.homedir(), 'NINA'), p.file)
const probe = (file) => {
  const j = JSON.parse(execFileSync(FFPROBE, ['-v', 'error', '-print_format', 'json', '-show_streams', '-show_format', file]).toString())
  const v = j.streams.find((s) => s.codec_type === 'video'), a = j.streams.find((s) => s.codec_type === 'audio')
  return { dauer: +j.format.duration, codec: v?.codec_name, breite: v?.width, hoehe: v?.height, pix_fmt: v?.pix_fmt, fps: v ? eval(v.avg_frame_rate) : null, audio: a?.codec_name ?? null, groesse: +j.format.size }
}

export async function renderStimmReel(eng, def, outDir) {
  const log = []
  fs.mkdirSync(outDir, { recursive: true })
  const sd = path.join(outDir, `${def.id}-stills`)
  fs.mkdirSync(sd, { recursive: true })
  const clips = ladeClips().filter((c) => RUHIGE_CLIPS.includes(c.file))
  const wo = woerterIm(def.aufnahme, def.von, def.bis)
  if (wo.length < 5) throw new Error(`${def.id}: keine Wörter im Bereich ${def.von}–${def.bis}`)
  const gr = gruppen(wo, (def.ersetzen || []).map(([a, b]) => [new RegExp(a, 'g'), b]))
  const sprech = def.bis - def.von + 0.25
  const total = Math.ceil((sprech + 1.0) * 100) / 100
  if (total > MAX_SEKUNDEN) throw new Error(`${def.id}: ${total} s sind länger als ${MAX_SEKUNDEN} s`)

  // Ton: Ausschnitt, Rauschen unten weg, Lautheit angleichen, kurze Blenden, ein Moment Stille am Ende
  const audio = path.join(sd, 'ton.m4a')
  execFileSync(FFMPEG, ['-v', 'error', '-y', '-ss', String(def.von), '-t', String(sprech), '-i', path.join(ROOT, 'stimme', def.aufnahme + '.m4a'),
    '-af', `highpass=f=70,loudnorm=I=-16:TP=-1.5:LRA=11,afade=t=in:d=0.04,afade=t=out:st=${(sprech - 0.2).toFixed(2)}:d=0.2,apad=whole_dur=${total}`,
    '-ar', '44100', '-ac', '2', '-c:a', 'aac', '-b:a', '160k', audio])

  // Blöcke aus ganzen Untertiteln
  const blocks = []
  let cur = null
  for (const g of gr) {
    if (!cur) cur = { gr: [g], von: 0 }
    else if (g.von - cur.von >= BLOCK_ZIEL) { blocks.push(cur); cur = { gr: [g], von: g.von } }
    else cur.gr.push(g)
  }
  if (cur) blocks.push(cur)
  blocks.forEach((b, i) => { b.bis = i < blocks.length - 1 ? blocks[i + 1].von : total; b.dauer = b.bis - b.von })

  // Fotos: ruhige Porträts mit Gesicht, ohne Buchfotos und Ausgeschlossene
  const pool = CAT.filter((p) => p.kind === 'portrait' && p.faces.length && !p.buch && ![31, 32].includes(p.id))
    .sort((a, b) => a.tier - b.tier || a.id - b.id)
  let fi = (def.nr * 5) % pool.length, ci = def.nr % Math.max(1, clips.length)
  const benutzt = new Set()
  const blank = path.join(sd, 'leer.png')
  const logoPng = await sharp(path.join(HERE, '../assets/logo-creme.png')).resize({ width: 120 }).png().toBuffer()
  await sharp({ create: { width: W, height: PH, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).composite([{ input: logoPng, left: 56, top: 1440 }]).png().toFile(blank)

  const segs = []
  let n = 0
  for (const [bi, b] of blocks.entries()) {
    const art = MUSTER[(bi + def.nr) % MUSTER.length]
    let gewaehlt = null
    for (let versuch = 0; versuch < 14 && !gewaehlt; versuch++) {
      let bg, box
      if (art === 'clip' && clips.length && versuch < 6) {
        const clip = clips[(ci + versuch) % clips.length]
        const frei = Math.max(0, clip.dauer - b.dauer - 0.2)
        const ss = frei > 0 ? (((def.nr * 7 + bi * 13) % 100) / 100) * frei : 0
        bg = { clip: path.join(ROOT, 'videos', clip.file), ss, name: `${clip.file} ab ${ss.toFixed(1)} s` }
        box = gesichtsBox(clip, ss, b.dauer)
      } else {
        let p
        do { p = pool[fi % pool.length]; fi++ } while (benutzt.has(p.id) && benutzt.size < pool.length)
        bg = { foto: fotoDatei(p), id: p.id, name: `Foto ${p.id}` }
        box = photoBox(p)
      }
      const dateien = []
      let ok = true
      for (const g of b.gr) {
        const f = path.join(sd, `u${String(++n).padStart(3, '0')}.png`)
        const r = await textEbene(eng, { text: g.text, hook: false, box, file: f })
        if (!r.ok) { ok = false; break }
        dateien.push({ g, f })
      }
      if (ok) gewaehlt = { bg, box, dateien }
    }
    if (!gewaehlt) throw new Error(`${def.id}: Block ${bi + 1} findet keinen Hintergrund mit Platz für die Untertitel`)
    if (gewaehlt.bg.id != null) benutzt.add(gewaehlt.bg.id)
    log.push(`Block ${bi + 1} (${b.von.toFixed(1)}–${b.bis.toFixed(1)} s): ${gewaehlt.bg.name}`)
    segs.push({ ...gewaehlt, dauer: b.dauer, von: b.von })
  }

  // Cover: Hook über dem ersten Hintergrund
  const coverFile = path.join(outDir, `${def.id}-cover.jpg`)
  const s0 = segs[0]
  const frame = path.join(sd, 'cover-frame.jpg')
  if (s0.bg.clip) execFileSync(FFMPEG, ['-v', 'error', '-y', '-ss', (s0.bg.ss + 0.8).toFixed(2), '-i', s0.bg.clip, '-frames:v', '1', '-vf', `scale=${W}:${PH}:force_original_aspect_ratio=increase:flags=lanczos,crop=${W}:${PH}`, '-q:v', '2', frame])
  else await sharp(s0.bg.foto).rotate().resize(W, PH, { fit: 'cover' }).jpeg({ quality: 92 }).toFile(frame)
  const hookPng = path.join(sd, 'hook.png')
  let hr = await textEbene(eng, { text: def.hook, hook: true, box: s0.box, file: hookPng })
  if (!hr.ok) hr = await textEbene(eng, { text: def.hook, hook: true, box: null, file: hookPng })
  if (!hr.ok) throw new Error(`${def.id}: Hook passt nicht aufs Cover`)
  await sharp(frame).composite([{ input: hookPng }]).jpeg({ quality: 92 }).toFile(coverFile)
  fs.rmSync(frame)

  // Untertitelspur (PNG-Folge mit Dauern) lückenlos über die ganze Länge
  const lines = []
  let t = 0
  const add = (f, d) => { if (d > 0.005) { lines.push(`file '${f}'`, `duration ${d.toFixed(3)}`); t += d } }
  for (const s of segs) for (const { g, f } of s.dateien) { add(blank, g.von - t); add(f, g.bis - g.von) }
  add(blank, total - t)
  lines.push(`file '${blank}'`)
  const liste = path.join(sd, 'untertitel.txt')
  fs.writeFileSync(liste, lines.join('\n'))

  // Zusammenbau
  const video = path.join(outDir, `${def.id}.mp4`)
  const args = ['-y', '-hide_banner', '-loglevel', 'error']
  segs.forEach((s) => {
    const dur = s.dauer.toFixed(3)
    if (s.bg.clip) args.push('-stream_loop', '-1', '-ss', s.bg.ss.toFixed(2), '-t', dur, '-i', s.bg.clip)
    else args.push('-loop', '1', '-t', dur, '-i', s.bg.foto)
  })
  args.push('-f', 'concat', '-safe', '0', '-i', liste, '-i', audio)
  const ch = []
  segs.forEach((s, i) => {
    const frames = Math.round(s.dauer * FPS)
    if (s.bg.clip) ch.push(`[${i}:v]scale=${W}:${PH}:force_original_aspect_ratio=increase:flags=lanczos,crop=${W}:${PH},fps=${FPS},unsharp=5:5:0.45,setsar=1,format=yuv420p[b${i}]`)
    else ch.push(`[${i}:v]scale=2160:3840:force_original_aspect_ratio=increase:flags=lanczos,crop=2160:3840,zoompan=z='1+0.07*on/${Math.max(frames - 1, 1)}':x='(iw-iw/zoom)/2':y='(ih-ih/zoom)/2':d=${frames}:s=${W}x${PH}:fps=${FPS},setsar=1,format=yuv420p[b${i}]`)
  })
  const n0 = segs.length
  ch.push(`${segs.map((_, i) => `[b${i}]`).join('')}concat=n=${n0}:v=1:a=0[bg]`)
  ch.push(`[${n0}:v]fps=${FPS},format=rgba[ov]`)
  ch.push('[bg][ov]overlay=0:0:format=auto,format=yuv420p[vout]')
  args.push('-filter_complex', ch.join(';'), '-map', '[vout]', '-map', `${n0 + 1}:a`,
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '22', '-maxrate', '6M', '-bufsize', '12M', '-profile:v', 'high', '-pix_fmt', 'yuv420p', '-r', String(FPS),
    '-c:a', 'aac', '-b:a', '160k', '-ar', '44100', '-ac', '2', '-movflags', '+faststart', '-t', String(total), video)
  execFileSync(FFMPEG, args, { stdio: ['ignore', 'inherit', 'inherit'], maxBuffer: 1e8 })

  const pr = probe(video)
  const fehler = []
  if (pr.codec !== 'h264') fehler.push('Codec ' + pr.codec)
  if (pr.pix_fmt !== 'yuv420p') fehler.push('pix_fmt ' + pr.pix_fmt)
  if (pr.breite !== W || pr.hoehe !== PH) fehler.push(`${pr.breite}x${pr.hoehe}`)
  if (Math.round(pr.fps) !== FPS) fehler.push('fps ' + pr.fps)
  if (pr.audio !== 'aac') fehler.push('Audio ' + pr.audio)
  if (Math.abs(pr.dauer - total) > 0.3) fehler.push(`Dauer ${pr.dauer.toFixed(2)} statt ${total}`)
  if (fehler.length) throw new Error(`${def.id}: Prüfung fehlgeschlagen (${fehler.join(', ')})`)
  return { id: def.id, status: 'ok', video, cover: coverFile, coverFoto: 'stimme', dauer: pr.dauer, log, probe: pr }
}
