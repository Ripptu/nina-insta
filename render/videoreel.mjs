// Video-Reels (1080 x 1920): Ninas echte Clips (videos/clip_NN.mp4) als bewegter Hintergrund, darüber die Textfolge
// aus docs/content-reels.md im Stil Foto-Typo (große weiße Grotesk, Betonung in Butter, Logo unten).
// Buchseiten-Abschnitte laufen über Buchfotos mit langsamem Zoom. Die Clips tragen Alltagsgespräch (Nina erklärt, wie
// sie gerade filmt), deshalb wird ihr Ton nie verwendet: Die Spur im Ergebnis ist still.
// Das Gesicht bleibt frei: data/clips.json hält Gesichter je halber Sekunde (YuNet), der Text sucht sich das freie Band.
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { execFileSync } from 'node:child_process'
import sharp from 'sharp'
import * as Y from './typo.mjs'
import { CAT } from './engine.mjs'
import { SAFE } from './story.mjs'

const HERE = new URL('.', import.meta.url).pathname
const ROOT = path.join(HERE, '..')
const CLIPS_DIR = path.join(ROOT, 'videos')
const CLIPS_JSON = path.join(ROOT, 'data/clips.json')
const lokal = (n) => { const f = path.join(os.homedir(), '.local/ffmpeg/bin', n); return fs.existsSync(f) ? f : n }
const FFMPEG = process.env.FFMPEG_PATH || lokal('ffmpeg')
const FFPROBE = process.env.FFPROBE_PATH || lokal('ffprobe')
const FPS = 30
const XFADE = 0 // harte Schnitte: Überblendungen zeigen zwei Textebenen übereinander (Qualitätsprüfung 03.10.2026)
const W = 1080, PH = 1920
const SAMPLE = 2 // Analysebilder pro Sekunde
export const MAX_SEKUNDEN = 90

// Reihenfolge der Clips: draußen und ruhig zuerst, Innenräume mit Sprechen danach
const CLIP_ORDER = ['clip_05.mp4', 'clip_06.mp4', 'clip_04.mp4', 'clip_02.mp4', 'clip_01.mp4', 'clip_03.mp4']
const BUCH_SEITEN = [55, 56, 61, 62] // aufgeschlagene Buchseiten
const BUCH_COVER = [60, 65]

export const ladeClips = () => (fs.existsSync(CLIPS_JSON) ? JSON.parse(fs.readFileSync(CLIPS_JSON, 'utf8')) : [])
export const clipsVorhanden = () => ladeClips().length > 0

/** Analysiert alle Clips in videos/: Dauer, Maße (nach Drehung), Gesichter je halbe Sekunde. Schreibt data/clips.json. */
export async function analysiereClips() {
  const VENV = path.join(HERE, 'py/.venv/bin/python')
  const PY = process.env.PYTHON_BIN || (fs.existsSync(VENV) ? VENV : 'python3')
  const files = fs.readdirSync(CLIPS_DIR).filter((f) => /^clip_\d+\.mp4$/.test(f)).sort()
  const out = []
  for (const f of files) {
    const abs = path.join(CLIPS_DIR, f)
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'clip-'))
    execFileSync(FFMPEG, ['-v', 'error', '-y', '-i', abs, '-vf', `fps=${SAMPLE}`, '-q:v', '3', path.join(tmp, '%04d.jpg')])
    const frames = fs.readdirSync(tmp).sort().map((x) => path.join(tmp, x))
    const res = JSON.parse(execFileSync(PY, [path.join(HERE, 'py/faces.py'), ...frames], { maxBuffer: 1e8, stdio: ['ignore', 'pipe', 'ignore'] }).toString())
    const meta = await sharp(frames[0]).metadata()
    const dauer = +execFileSync(FFPROBE, ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', abs]).toString().trim()
    out.push({ file: f, dauer, w: meta.width, h: meta.height, faces: frames.map((fr) => (res[fr] || []).filter((r) => r[4] > 0.7).map((r) => r.slice(0, 4).map(Math.round))) })
    fs.rmSync(tmp, { recursive: true, force: true })
  }
  fs.writeFileSync(CLIPS_JSON, JSON.stringify(out))
  return out
}

/** Bereich im 1080x1920-Bild, den Kopf und Hals von Nina im Zeitfenster [ss, ss+d] belegen (mit Haar- und Halsreserve). */
function gesichtsBox(clip, ss, d) {
  const sc = Math.max(W / clip.w, PH / clip.h)
  const ox = (clip.w * sc - W) / 2, oy = (clip.h * sc - PH) / 2
  const a = Math.max(0, Math.floor(ss * SAMPLE) - 1), b = Math.min(clip.faces.length - 1, Math.ceil((ss + d) * SAMPLE) + 1)
  const sammeln = (von, bis) => { const l = []; for (let i = von; i <= bis; i++) l.push(...clip.faces[i]); return l }
  let list = sammeln(a, b)
  if (!list.length) list = sammeln(0, clip.faces.length - 1) // Ersatz: alle Fundstellen des Clips
  if (!list.length) return { x0: 250, y0: 480, x1: 830, y1: 1100, geraten: true } // Gesicht nie gefunden: Bildmitte frei lassen
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9
  for (const [x, y, w, h] of list) {
    x0 = Math.min(x0, x * sc - ox); x1 = Math.max(x1, (x + w) * sc - ox)
    y0 = Math.min(y0, y * sc - oy - h * sc * 0.9); y1 = Math.max(y1, (y + h) * sc - oy + h * sc * 1.2)
  }
  return { x0, y0, x1, y1 }
}

/**
 * Baut die Textebene (transparentes PNG, 1080x1920) für einen Abschnitt. box = freizuhaltender Bereich oder null.
 * Gibt { ok, band, size } zurück; ok=false, wenn kein Band hoch genug ist.
 */
async function textEbene(eng, { text, hook, box, file }) {
  const { ctx, meas, pageHtml } = eng._i
  const lo = SAFE.lo, hi = SAFE.hi
  const oben = box ? Math.max(0, box.y0 - 30 - lo) : hi - lo
  const unten = box ? Math.max(0, hi - (box.y1 + 30)) : hi - lo
  const band = unten >= oben ? { pos: 'unten', y0: box ? box.y1 + 30 : lo, y1: hi } : { pos: 'oben', y0: lo, y1: box.y0 - 30 }
  const hoehe = band.y1 - band.y0
  if (hoehe < 300) return { ok: false }
  const ss = text.replace(/\s+/g, ' ').trim().match(/(?:[^.!?]|[.!?](?=[^\s"“”.!?]))+[.!?]+["“”]*\s*|.+$/g)?.map((s) => s.trim()) ?? [text]
  const kurz = text.length <= 100
  let layout = null
  const sizes = hook ? [150, 136, 122, 110, 98, 88, 78, 70, 62, 56] : [132, 118, 106, 96, 86, 78, 70, 62, 56, 50]
  for (const hs of sizes) {
    let html, h
    if (kurz) {
      html = ss.length > 1 ? `${Y.esc(ss.slice(0, -1).join(' '))} <span style="color:${Y.BUTTER}">${Y.esc(ss[ss.length - 1])}</span>` : Y.esc(text)
      h = await meas(html, 960, 'hd', hs, 'line-height:1.02;letter-spacing:-.04em;color:#fff')
      if (h <= hoehe - 20) { layout = { html, h, hs, tx: null }; break }
    } else {
      const head = ss[0], rest = ss.slice(1).join(' ')
      const bs = Math.round(hs * 0.62)
      const h1 = await meas(Y.esc(head), 960, 'hd', hs, 'line-height:1.02;letter-spacing:-.04em;color:#fff')
      const h2 = rest ? await meas(Y.esc(rest), 960, 'tx', bs, 'color:#fff') : 0
      h = h1 + (rest ? h2 + 36 : 0)
      if (h <= hoehe - 20) { layout = { html: Y.esc(head), h, hs, h1, tx: rest ? { t: rest, bs } : null }; break }
    }
  }
  if (!layout) return { ok: false }
  const y = band.pos === 'oben' ? band.y0 + Math.max(0, Math.min(20, (hoehe - layout.h) / 2)) : band.y1 - layout.h - Math.max(0, Math.min(20, (hoehe - layout.h) / 2))
  const glow = 'text-shadow:0 2px 26px rgba(24,32,22,.55),0 0 2px rgba(24,32,22,.25)'
  let body = `<div class="abs" style="left:0;top:${y - 140}px;width:1080px;height:${layout.h + 280}px;background:linear-gradient(rgba(30,40,28,0),rgba(30,40,28,.34) 28%,rgba(30,40,28,.34) 72%,rgba(30,40,28,0))"></div>`
  body += `<div class="abs hd" style="left:60px;top:${y}px;width:960px;font-size:${layout.hs}px;line-height:1.02;letter-spacing:-.04em;color:#fff;${glow}">${layout.html}</div>`
  if (layout.tx) body += `<div class="abs tx" style="left:60px;top:${y + layout.h1 + 36}px;width:960px;font-size:${layout.tx.bs}px;color:#fff;${glow}">${Y.esc(layout.tx.t)}</div>`
  body += `<img class="logo" src="file://${HERE}../assets/logo-creme.png" style="width:120px;left:56px;top:1440px;opacity:.95">`
  const html = pageHtml(body, PH, '').replace('</head>', '<style>html,body,.page{background:transparent!important}</style></head>')
  const tmp = path.join(path.dirname(file), '.o-' + path.basename(file) + '.html')
  fs.writeFileSync(tmp, html)
  const page = await ctx.newPage()
  await page.setViewportSize({ width: W, height: PH })
  await page.goto('file://' + path.resolve(tmp))
  await page.evaluate(() => document.fonts.ready)
  await page.waitForFunction(() => [...document.images].every((im) => im.complete))
  await page.screenshot({ path: file, type: 'png', omitBackground: true })
  await page.close()
  fs.rmSync(tmp)
  return { ok: true, band: band.pos, size: layout.hs }
}

const istBuch = (bild) => /aufgeschlagene|Buchseite|Buchcover|Cover des Buchs|Buch\b/i.test(bild)

/** Bewegtes Standbild eines Fotos (Zoom), für Buchseiten. */
const fotoDatei = (p) => path.join(process.env.FOTO_DIR || path.join(os.homedir(), 'NINA'), p.file)

function baueVideo(segs, out, total) {
  const n = segs.length
  const args = ['-y', '-hide_banner', '-loglevel', 'error']
  segs.forEach((s, i) => {
    const t = (s.dauer + (i < n - 1 ? XFADE : 0)).toFixed(3)
    if (s.clip) args.push('-stream_loop', '-1', '-ss', s.ss.toFixed(2), '-t', t, '-i', s.clip)
    else args.push('-loop', '1', '-t', t, '-i', s.foto)
    args.push('-loop', '1', '-t', t, '-i', s.overlay)
  })
  args.push('-f', 'lavfi', '-i', 'anullsrc=channel_layout=stereo:sample_rate=44100')
  const ch = []
  segs.forEach((s, i) => {
    const a = i * 2, b = i * 2 + 1
    const frames = Math.round((s.dauer + (i < n - 1 ? XFADE : 0)) * FPS)
    if (s.clip) ch.push(`[${a}:v]scale=${W}:${PH}:force_original_aspect_ratio=increase:flags=lanczos,crop=${W}:${PH},fps=${FPS},unsharp=5:5:0.45,setsar=1,format=yuv420p[bg${i}]`)
    else ch.push(`[${a}:v]scale=2160:3840:force_original_aspect_ratio=increase:flags=lanczos,crop=2160:3840,zoompan=z='1+0.07*on/${Math.max(frames - 1, 1)}':x='(iw-iw/zoom)/2':y='(ih-ih/zoom)/2':d=${frames}:s=${W}x${PH}:fps=${FPS},setsar=1,format=yuv420p[bg${i}]`)
    ch.push(`[${b}:v]fps=${FPS},format=rgba[ov${i}]`)
    ch.push(`[bg${i}][ov${i}]overlay=0:0:format=auto,format=yuv420p[v${i}]`)
  })
  const vl = n === 1 ? 'v0' : 'vx'
  if (n > 1) ch.push(`${segs.map((_, i) => `[v${i}]`).join('')}concat=n=${n}:v=1:a=0[vx]`)
  ch.push(`[${vl}]format=yuv420p[vout]`)
  ch.push(`[${n * 2}:a]aresample=44100,atrim=0:${total},asetpts=N/SR/TB[aout]`)
  args.push('-filter_complex', ch.join(';'), '-map', '[vout]', '-map', '[aout]',
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '22', '-maxrate', '6M', '-bufsize', '12M', '-profile:v', 'high', '-pix_fmt', 'yuv420p', '-r', String(FPS),
    '-c:a', 'aac', '-b:a', '128k', '-ar', '44100', '-ac', '2', '-movflags', '+faststart', '-t', String(total), out)
  execFileSync(FFMPEG, args, { stdio: ['ignore', 'inherit', 'inherit'], maxBuffer: 1e8 })
}

const probe = (file) => {
  const j = JSON.parse(execFileSync(FFPROBE, ['-v', 'error', '-print_format', 'json', '-show_streams', '-show_format', file]).toString())
  const v = j.streams.find((s) => s.codec_type === 'video')
  const a = j.streams.find((s) => s.codec_type === 'audio')
  return { dauer: +j.format.duration, codec: v?.codec_name, breite: v?.width, hoehe: v?.height, pix_fmt: v?.pix_fmt, fps: v ? eval(v.avg_frame_rate) : null, audio: a?.codec_name ?? null, groesse: +j.format.size }
}

/** Rendert ein Reel mit Videohintergrund. Rückgabe wie renderReel. */
export async function renderVideoReel(eng, reel, outDir, opts = {}) {
  const log = []
  const clips = ladeClips()
  if (!clips.length) throw new Error('keine Clips analysiert (node render/videoreel.mjs --analysieren)')
  if (!reel.ablauf.length) throw new Error(`${reel.id}: kein Ablauf`)
  // Abschnitte ohne eigenen Text verlängern den vorigen Abschnitt
  const abs = []
  for (const [i, seg] of reel.ablauf.entries()) {
    if (!seg.text && abs.length) { abs[abs.length - 1].dauer += seg.dauer; continue }
    abs.push({ ...seg, text: seg.text || reel.hook, erster: i === 0 })
  }
  const total = abs.reduce((s, x) => s + x.dauer, 0)
  if (total > MAX_SEKUNDEN) throw new Error(`${reel.id}: ${total} s sind länger als ${MAX_SEKUNDEN} s`)
  fs.mkdirSync(outDir, { recursive: true })
  const sd = path.join(outDir, `${reel.id}-stills`)
  fs.mkdirSync(sd, { recursive: true })

  const reihe = CLIP_ORDER.map((f) => clips.find((c) => c.file === f)).filter(Boolean)
  const segs = []
  let letzterClip = null
  for (const [i, seg] of abs.entries()) {
    const overlay = path.join(sd, `${String(i + 1).padStart(2, '0')}.png`)
    const need = seg.dauer + (i < abs.length - 1 ? XFADE : 0)
    let gewaehlt = null
    if (istBuch(seg.bild)) {
      // Buchfoto mit Text; Cover-Fotos zuerst, wenn der Abschnitt das Cover meint
      const pool = /Cover|Titel/i.test(seg.bild) ? [...BUCH_COVER, ...BUCH_SEITEN] : [...BUCH_SEITEN, ...BUCH_COVER]
      const start = (reel.nr + i) % pool.length
      for (let k = 0; k < pool.length && !gewaehlt; k++) {
        const p = CAT[pool[(start + k) % pool.length]]
        const r = await textEbene(eng, { text: seg.text, hook: seg.erster, box: null, file: overlay })
        if (r.ok) gewaehlt = { foto: fotoDatei(p), overlay, info: `Buchfoto ${p.id}, Text ${r.band} (${r.size} px)` }
      }
    }
    for (let k = 0; k < reihe.length && !gewaehlt; k++) {
      const clip = reihe[(reel.nr + i + k) % reihe.length]
      if (clip === letzterClip && reihe.length > 1) continue
      const frei = Math.max(0, clip.dauer - need - 0.2)
      const ss = frei > 0 ? ((reel.nr * 3 + i * 5) % 100) / 100 * frei : 0
      const box = gesichtsBox(clip, ss, need)
      const r = await textEbene(eng, { text: seg.text, hook: seg.erster, box, file: overlay })
      if (r.ok) { gewaehlt = { clip: path.join(CLIPS_DIR, clip.file), ss, overlay, info: `${clip.file} ab ${ss.toFixed(1)} s, Text ${r.band} (${r.size} px)${box.geraten ? ', Gesicht geraten' : ''}`, clipRef: clip } }
    }
    if (!gewaehlt) throw new Error(`${reel.id} Abschnitt ${i + 1}: Text passt in keinen Clip (${seg.text.slice(0, 40)})`)
    if (gewaehlt.clipRef) letzterClip = gewaehlt.clipRef
    log.push(`Abschnitt ${i + 1} (${seg.von}-${seg.bis} s): ${gewaehlt.info}`)
    segs.push({ ...gewaehlt, dauer: seg.dauer })
  }

  // Cover: erstes Bild des ersten Abschnitts mit Hook-Text
  const coverFile = path.join(outDir, `${reel.id}-cover.jpg`)
  const s0 = segs[0]
  const frame = path.join(sd, 'cover-frame.jpg')
  if (s0.clip) execFileSync(FFMPEG, ['-v', 'error', '-y', '-ss', (s0.ss + 0.8).toFixed(2), '-i', s0.clip, '-frames:v', '1', '-vf', `scale=${W}:${PH}:force_original_aspect_ratio=increase:flags=lanczos,crop=${W}:${PH}`, '-q:v', '2', frame])
  else await sharp(s0.foto).rotate().resize(W, PH, { fit: 'cover' }).jpeg({ quality: 92 }).toFile(frame)
  await sharp(frame).composite([{ input: s0.overlay }]).jpeg({ quality: 92 }).toFile(coverFile)
  fs.rmSync(frame)

  const video = path.join(outDir, `${reel.id}.mp4`)
  baueVideo(segs, video, total)
  const pr = probe(video)
  const fehler = []
  if (pr.codec !== 'h264') fehler.push('Codec ' + pr.codec)
  if (pr.pix_fmt !== 'yuv420p') fehler.push('pix_fmt ' + pr.pix_fmt)
  if (pr.breite !== W || pr.hoehe !== PH) fehler.push(`${pr.breite}x${pr.hoehe}`)
  if (Math.round(pr.fps) !== FPS) fehler.push('fps ' + pr.fps)
  if (pr.audio !== 'aac') fehler.push('Audio ' + pr.audio)
  if (Math.abs(pr.dauer - total) > 0.15) fehler.push(`Dauer ${pr.dauer.toFixed(2)} statt ${total}`)
  if (fehler.length) throw new Error(`${reel.id}: Prüfung fehlgeschlagen (${fehler.join(', ')})`)
  return { id: reel.id, status: 'ok', video, cover: coverFile, coverFoto: 'clip', dauer: pr.dauer, fotos: [], stills: segs.map((s) => s.overlay), probe: pr, log }
}

// Aufruf: node render/videoreel.mjs --analysieren
if (process.argv[1] && process.argv[1].endsWith('videoreel.mjs') && process.argv.includes('--analysieren')) {
  const r = await analysiereClips()
  for (const c of r) console.log(`${c.file}: ${c.dauer.toFixed(1)} s, ${c.w}x${c.h}, Gesichter in ${c.faces.filter((f) => f.length).length}/${c.faces.length} Bildern`)
}
