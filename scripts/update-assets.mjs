#!/usr/bin/env node
// Weekly image refresh.
//
// 1. Downloads the current Bluesky profile picture for @j4ck.xyz.
// 2. Writes public/avatar.png and the favicon set (ico, 16/32 px, apple-touch,
//    android-chrome 192/512).
// 3. Renders the Open Graph cards (public/og/{home,projects,now}.png, 1200×630)
//    with satori + resvg, using the site's fonts and the palette tokens in
//    styles/main.css, so the cards always match the site.
//
// Flags: --local  skip the download and reuse public/avatar-source.png
//                 (handy for tweaking card layouts offline).

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'
import satori from 'satori'
import { Resvg } from '@resvg/resvg-js'
import { loadNow, loadProjects, loadSite, weekLabel, NOW_FALLBACK } from './render.mjs'

const BSKY_ACTOR = 'j4ck.xyz'
const path = (p) => fileURLToPath(new URL(`../${p}`, import.meta.url))
const pub = (p) => path(`public/${p}`)
const SOURCE = path('scripts/og/avatar-source.png') // full-size copy, kept so --local works (not deployed)

/* --- Palette from styles/main.css ------------------------------------------ */

// OKLCH → sRGB hex (satori/resvg don't understand oklch()).
function oklchToHex(L, C, H) {
  const a = C * Math.cos((H * Math.PI) / 180)
  const b = C * Math.sin((H * Math.PI) / 180)
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3
  const lin = [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ]
  const gamma = (x) => {
    const v = Math.min(1, Math.max(0, x))
    return v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055
  }
  return `#${lin.map((x) => Math.round(gamma(x) * 255).toString(16).padStart(2, '0')).join('')}`
}

function lightPalette() {
  const css = readFileSync(path('styles/main.css'), 'utf8')
  const block = css.match(/:root\s*\{([^}]*)\}/)[1]
  const out = {}
  for (const [, name, L, C, H] of block.matchAll(/--([\w-]+):\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)\s*;/g)) {
    out[name] = oklchToHex(Number(L), Number(C), Number(H))
  }
  return out
}

/* --- Avatar ------------------------------------------------------------- */

async function fetchAvatar() {
  const res = await fetch(`https://public.api.bsky.app/xrpc/app.bsky.actor.getProfile?actor=${BSKY_ACTOR}`, {
    signal: AbortSignal.timeout(20_000),
  })
  if (!res.ok) throw new Error(`getProfile: ${res.status}`)
  const { avatar } = await res.json()
  if (!avatar) throw new Error('profile has no avatar')
  const img = await fetch(avatar, { signal: AbortSignal.timeout(30_000) })
  if (!img.ok) throw new Error(`avatar download: ${img.status}`)
  console.log(`Avatar: ${avatar}`)
  return Buffer.from(await img.arrayBuffer())
}

const circleMask = (size) =>
  Buffer.from(`<svg width="${size}" height="${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="#fff"/></svg>`)

const square = (src, size) => sharp(src).resize(size, size, { fit: 'cover' }).png({ compressionLevel: 9 }).toBuffer()

const round = async (src, size) =>
  sharp(await square(src, size))
    .composite([{ input: circleMask(size), blend: 'dest-in' }])
    .png({ compressionLevel: 9 })
    .toBuffer()

// Minimal .ico writer: a directory of embedded PNGs (supported by every
// browser since IE Vista-era).
function ico(pngs) {
  const header = Buffer.alloc(6)
  header.writeUInt16LE(0, 0)
  header.writeUInt16LE(1, 2)
  header.writeUInt16LE(pngs.length, 4)
  let offset = 6 + 16 * pngs.length
  const entries = pngs.map(({ size, data }) => {
    const e = Buffer.alloc(16)
    e.writeUInt8(size >= 256 ? 0 : size, 0)
    e.writeUInt8(size >= 256 ? 0 : size, 1)
    e.writeUInt16LE(1, 4) // colour planes
    e.writeUInt16LE(32, 6) // bits per pixel
    e.writeUInt32LE(data.length, 8)
    e.writeUInt32LE(offset, 12)
    offset += data.length
    return e
  })
  return Buffer.concat([header, ...entries, ...pngs.map((p) => p.data)])
}

async function writeIcons(src) {
  writeFileSync(pub('avatar.png'), await square(src, 256))
  writeFileSync(pub('apple-touch-icon.png'), await square(src, 180))
  writeFileSync(pub('android-chrome-192x192.png'), await square(src, 192))
  writeFileSync(pub('android-chrome-512x512.png'), await square(src, 512))
  const r16 = await round(src, 16)
  const r32 = await round(src, 32)
  const r48 = await round(src, 48)
  writeFileSync(pub('favicon-16x16.png'), r16)
  writeFileSync(pub('favicon-32x32.png'), r32)
  writeFileSync(
    pub('favicon.ico'),
    ico([
      { size: 16, data: r16 },
      { size: 32, data: r32 },
      { size: 48, data: r48 },
    ]),
  )
}

/* --- OG cards ----------------------------------------------------------- */

const W = 1200
const H = 630

// Tiny hyperscript for satori's element objects.
const h = (type, style = {}, ...children) => ({
  type,
  props: { style, children: children.flat().filter((c) => c !== null && c !== false && c !== undefined) },
})
const img = (src, style) => ({ type: 'img', props: { src, style } })
const circle = (style) => h('div', { position: 'absolute', borderRadius: 9999, ...style })

const fonts = [
  { name: 'Caprasimo', data: readFileSync(path('scripts/og/fonts/Caprasimo-Regular.ttf')), weight: 400, style: 'normal' },
  { name: 'Figtree', data: readFileSync(path('scripts/og/fonts/Figtree-Regular.ttf')), weight: 400, style: 'normal' },
  { name: 'Figtree', data: readFileSync(path('scripts/og/fonts/Figtree-SemiBold.ttf')), weight: 600, style: 'normal' },
]

async function render(tree, file) {
  const svg = await satori(tree, { width: W, height: H, fonts })
  const png = new Resvg(svg, { fitTo: { mode: 'width', value: W } }).render().asPng()
  writeFileSync(file, await sharp(png).png({ compressionLevel: 9, palette: true, quality: 95 }).toBuffer())
}

function cards(c, avatarUri) {
  const display = { fontFamily: 'Caprasimo', fontWeight: 400 }
  const frame = (bg, color, ...children) =>
    h('div', { width: W, height: H, display: 'flex', position: 'relative', overflow: 'hidden', background: bg, color, fontFamily: 'Figtree' }, ...children)
  const footer = (color) =>
    h('div', { position: 'absolute', left: 72, bottom: 56, display: 'flex', fontSize: 28, fontWeight: 600, color }, 'j4ck.xyz')

  const home = frame(
    c.paper,
    c.ink,
    circle({ width: 560, height: 560, right: -170, top: -230, background: c.red }),
    circle({ width: 150, height: 150, right: 250, top: 190, background: c.coral }),
    circle({ width: 260, height: 260, left: -120, bottom: -150, background: c['coral-soft'] }),
    h(
      'div',
      { position: 'absolute', left: 72, top: 64, display: 'flex', flexDirection: 'column', width: 760 },
      img(avatarUri, { width: 128, height: 128, borderRadius: 9999, marginBottom: 32 }),
      h('div', { ...display, fontSize: 104, lineHeight: 1 }, 'Jack.'),
      h('div', { ...display, fontSize: 68, lineHeight: 1.08, color: c.red, marginTop: 12 }, `${loadSite().age}, building on the open web.`),
    ),
    h('div', { position: 'absolute', right: 72, bottom: 56, display: 'flex', fontSize: 28, fontWeight: 600 }, 'j4ck.xyz'),
  )

  const projectStyles = {
    ink: { bg: c.inverse, fg: c['on-inverse'], tag: c['tag-on-ink'] },
    red: { bg: c.red, fg: c['on-red'], tag: c['on-red'] },
    coral: { bg: c.coral, fg: c['on-coral'], tag: c['on-coral'] },
    surface: { bg: c.surface, fg: c.ink, tag: c['tag-on-surface'] },
  }
  const projectList = loadProjects().slice(0, 4)
  const projects = frame(
    c.paper,
    c.ink,
    circle({ width: 420, height: 420, left: -190, top: -200, background: c.coral }),
    h(
      'div',
      { position: 'absolute', left: 72, top: 210, display: 'flex', flexDirection: 'column', width: 370 },
      h('div', { ...display, fontSize: 80, lineHeight: 1, display: 'flex' }, 'Projects', h('span', { color: c.red }, '.')),
      h('div', { fontSize: 28, lineHeight: 1.4, marginTop: 24, color: c.ink, opacity: 0.8 }, 'Open-source tools for Bluesky, AI agents and music.'),
    ),
    footer(c.ink),
    h(
      'div',
      { position: 'absolute', right: 48, top: 48, width: 640, height: 534, display: 'flex', gap: 18 },
      // Two explicit columns: satori's flex-wrap + gap mis-measures rows.
      [0, 1].map((col) =>
        h(
          'div',
          { width: 311, display: 'flex', flexDirection: 'column', gap: 18 },
          projectList
            .filter((_, i) => i % 2 === col)
            .map((p) => {
              const s = projectStyles[p.style] || projectStyles.surface
              return h(
                'div',
                // satori adds padding on top of width/height, so size the content box.
                { width: 251, height: 198, borderRadius: 44, background: s.bg, color: s.fg, padding: 30, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' },
                h('div', { ...display, fontSize: 34, lineHeight: 1.05 }, p.name),
                h('div', { fontSize: 17, fontWeight: 600, letterSpacing: 1.2, textTransform: 'uppercase', color: s.tag }, p.tag),
              )
            }),
        ),
      ),
    ),
  )

  const latest = loadNow()[0] || NOW_FALLBACK
  const dots = [c.red, c['dot-coral']]
  const now = frame(
    c.inverse,
    c['on-inverse'],
    circle({ width: 360, height: 360, right: -170, top: -200, background: c.red }),
    circle({ width: 80, height: 80, right: 48, bottom: 48, background: c.coral }),
    h(
      'div',
      { position: 'absolute', left: 72, top: 72, display: 'flex', flexDirection: 'column', width: 330 },
      img(avatarUri, { width: 96, height: 96, borderRadius: 9999, marginBottom: 28 }),
      h('div', { ...display, fontSize: 104, lineHeight: 1 }, 'Now'),
      latest.week ? h('div', { fontSize: 24, marginTop: 18, opacity: 0.7 }, weekLabel(latest.week)) : null,
    ),
    footer(c['on-inverse']),
    h(
      'div',
      { position: 'absolute', left: 440, top: 0, height: H, width: 620, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 28 },
      latest.items.slice(0, 3).map((item, i) =>
        h(
          'div',
          { display: 'flex', alignItems: 'flex-start', gap: 22 },
          h('div', { width: 20, height: 20, borderRadius: 9999, background: dots[i % 2], marginTop: 12, flexShrink: 0 }),
          h('div', { fontSize: 34, lineHeight: 1.28 }, item.text),
        ),
      ),
    ),
  )

  return { home, projects, now }
}

/* --- Main ----------------------------------------------------------------- */

let source
if (process.argv.includes('--local')) {
  if (!existsSync(SOURCE)) throw new Error('--local needs scripts/og/avatar-source.png; run once without --local first')
  source = readFileSync(SOURCE)
} else {
  source = await sharp(await fetchAvatar()).resize(1024, 1024, { fit: 'cover', withoutEnlargement: true }).png().toBuffer()
  writeFileSync(SOURCE, source)
}

await writeIcons(source)
const avatarUri = `data:image/png;base64,${(await square(source, 256)).toString('base64')}`

mkdirSync(pub('og'), { recursive: true })
const palette = lightPalette()
for (const [name, tree] of Object.entries(cards(palette, avatarUri))) {
  await render(tree, pub(`og/${name}.png`))
}
console.log('Wrote avatar, favicons and OG cards (home, projects, now).')
