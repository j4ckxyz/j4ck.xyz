// Build-time HTML partials for the static pages. vite.config.js swaps these
// placeholders before Vite processes each page:
//
//   <!--meta:PAGE-->      title, description, Open Graph / Twitter tags, icons, fonts, CSS, theme script
//   <!--nav:PAGE-->       top bar (marks the current page) + theme toggle wiring
//   <!--projects[:h2]-->  project cards from data/projects.json (card titles h3 by default)
//   <!--now:panel-->      latest Now week (home page)
//   <!--now:weeks-->      every Now week grouped by year (/weeks)
//   %YEAR%                current year
//   %AGE%                 Jack's age from data/site.json
//   %v:/path%             public file path with a content-hash ?v= for cache busting
//
// Tailwind scans this file, so class names written here are kept in the CSS.
import { createHash } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const root = (p) => fileURLToPath(new URL(`../${p}`, import.meta.url))
export const NOW_FILE = root('data/now.json')
export const PROJECTS_FILE = root('data/projects.json')
export const SITE_FILE = root('data/site.json')
export const SITE = 'https://j4ck.xyz'

export const PAGES = {
  home: {
    path: '/',
    title: 'j4ck.xyz',
    description: 'Jack. %AGE%, building on the open web. AI, the decentralised web, guitar and a lot of music.',
    og: 'home',
    ogAlt: 'Jack. %AGE%, building on the open web.',
  },
  projects: {
    path: '/projects',
    title: 'Projects · j4ck.xyz',
    description: 'Things Jack has built: tools for Bluesky, AI agents and music.',
    og: 'projects',
    ogAlt: "Jack's projects",
  },
  notfound: {
    path: '/404',
    title: 'Not found · j4ck.xyz',
    description: "This page doesn't exist.",
    og: 'home',
    ogAlt: 'Jack. %AGE%, building on the open web.',
  },
  now: {
    path: '/now',
    title: 'Now · j4ck.xyz',
    description: 'What Jack has been up to this week.',
    og: 'now',
    ogAlt: 'What Jack is up to this week',
  },
  weeks: {
    path: '/weeks',
    title: 'Past weeks · j4ck.xyz',
    description: "Every weekly Now update from Jack, by week number.",
    og: 'now',
    ogAlt: 'What Jack is up to this week',
  },
}

const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])

const readJson = (file, fallback) => {
  try {
    return JSON.parse(readFileSync(file, 'utf8'))
  } catch {
    return fallback
  }
}

// "/og/home.png" -> "/og/home.png?v=1a2b3c4d" so social sites and browsers
// pick up a regenerated image instead of a cached one.
export function versioned(publicPath) {
  const file = root(`public${publicPath}`)
  if (!existsSync(file)) return publicPath
  const hash = createHash('sha256').update(readFileSync(file)).digest('hex').slice(0, 8)
  return `${publicPath}?v=${hash}`
}

// Facts kept current by the weekly job (age comes from the BIRTHDATE secret).
export const loadSite = () => readJson(SITE_FILE, { age: 17 })

/* --- <head> --------------------------------------------------------------- */

// --paper from styles/main.css as hex, for <meta name="theme-color">.
const PAPER_HEX = { light: '#fdfbfa', dark: '#120e0e' }

const THEME_SCRIPT = `<!-- Theme: follows the system (live) unless the visitor picks the other one.
         Picking the theme that matches the system again returns to auto. -->
    <script>
      (function () {
        var KEY = 'theme-choice';
        var root = document.documentElement;
        root.classList.add('js'); // the theme button only shows when this script runs
        var mq = window.matchMedia('(prefers-color-scheme: dark)');
        function saved() { try { return localStorage.getItem(KEY); } catch (e) { return null; } }
        function sync() {
          var dark = root.classList.contains('dark');
          var b = document.getElementById('theme-toggle');
          if (b) b.setAttribute('aria-pressed', String(dark));
          // Browser chrome / overscroll colour follows the theme actually shown.
          var m = document.querySelector('meta[name="theme-color"]');
          if (m) m.setAttribute('content', dark ? '${PAPER_HEX.dark}' : '${PAPER_HEX.light}');
        }
        function apply() {
          var t = saved();
          root.classList.toggle('dark', t ? t === 'dark' : mq.matches);
          sync();
        }
        window.syncThemeButton = sync;
        apply();
        mq.addEventListener('change', apply);
        window.toggleTheme = function () {
          var dark = !root.classList.contains('dark');
          try {
            if (dark === mq.matches) localStorage.removeItem(KEY);
            else localStorage.setItem(KEY, dark ? 'dark' : 'light');
          } catch (e) {}
          root.classList.toggle('dark', dark);
          sync();
        };
      })();
    </script>`

export function renderMeta(pageKey) {
  const p = PAGES[pageKey]
  const url = `${SITE}${p.path === '/' ? '' : p.path}`
  const image = `${SITE}${versioned(`/og/${p.og}.png`)}`
  return `<meta name="theme-color" content="${PAPER_HEX.light}" />
    ${THEME_SCRIPT}

    <title>${esc(p.title)}</title>
    <meta name="description" content="${esc(p.description)}" />
    <link rel="canonical" href="${url}" />

    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="j4ck.xyz" />
    <meta property="og:title" content="${esc(p.title)}" />
    <meta property="og:description" content="${esc(p.description)}" />
    <meta property="og:url" content="${url}" />
    <meta property="og:image" content="${image}" />
    <meta property="og:image:type" content="image/png" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:image:alt" content="${esc(p.ogAlt)}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:creator" content="@jglypt" />
    <meta name="twitter:image" content="${image}" />

    <link rel="me" href="https://sifa.id/p/j4ck.xyz" />
    <link rel="me" href="https://bsky.app/profile/j4ck.xyz" />
    <link rel="me" href="https://github.com/j4ckxyz" />

    <link rel="icon" type="image/x-icon" href="${versioned('/favicon.ico')}" />
    <link rel="icon" type="image/png" sizes="32x32" href="${versioned('/favicon-32x32.png')}" />
    <link rel="icon" type="image/png" sizes="16x16" href="${versioned('/favicon-16x16.png')}" />
    <link rel="apple-touch-icon" sizes="180x180" href="${versioned('/apple-touch-icon.png')}" />
    <link rel="manifest" href="/site.webmanifest" />

    <link rel="preload" href="/fonts/caprasimo-latin.woff2" as="font" type="font/woff2" crossorigin />
    <link rel="preload" href="/fonts/figtree-latin.woff2" as="font" type="font/woff2" crossorigin />
    <link rel="stylesheet" href="/styles/main.css" />`
}

/* --- Nav ------------------------------------------------------------------ */

export function renderNav(pageKey) {
  // Projects and Now are sections of the home page. /projects and /now only
  // exist to carry their own share cards, and send people to these anchors.
  const base = pageKey === 'home' ? '' : '/'
  const targets = { projects: `${base}#projects`, now: `${base}#now` }
  const link = (key, label) => {
    const current = pageKey === 'weeks' && key === 'now'
    return `<a href="${targets[key]}"${current ? ' aria-current="page"' : ''} class="inline-flex h-11 items-center rounded-full px-3 font-semibold hover:bg-coral-soft active:bg-coral sm:h-9${current ? ' bg-coral-soft' : ''}">${label}</a>`
  }
  // The links sit on their own paper capsule so they never have to be read
  // against the decorative red circle behind them.
  return `<nav class="relative flex items-center gap-3 px-[clamp(16px,5vw,72px)] py-4 text-sm">
        <a href="/" class="font-display mr-auto inline-flex min-h-11 items-center text-base sm:text-lg">j4ck.xyz</a>
        <div class="flex items-center gap-0.5 rounded-full border-2 border-ink bg-paper p-1">
        ${link('projects', 'Projects')}
        ${link('now', 'Now')}
        <button id="theme-toggle" type="button" aria-label="Dark mode" aria-pressed="false" class="relative hidden h-11 w-11 shrink-0 items-center justify-center rounded-full hover:bg-coral-soft active:bg-coral sm:h-9 sm:w-9 [.js_&]:inline-flex">
          <svg class="dark:hidden" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>
          <svg class="hidden dark:block" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></svg>
        </button>
        </div>
      </nav>
      <script>document.getElementById('theme-toggle').addEventListener('click', window.toggleTheme); window.syncThemeButton();</script>`
}

/* --- Projects ------------------------------------------------------------- */

export const PROJECT_STYLES = {
  // body: muted body text, except on red where white needs full strength for 4.5:1.
  ink: { card: 'bg-inverse text-on-inverse', tag: 'text-tag-on-ink', body: 'opacity-85' },
  red: { card: 'bg-red text-on-red', tag: 'text-on-red', body: '' },
  coral: { card: 'bg-coral text-on-coral', tag: 'text-on-coral', body: 'opacity-85' },
  surface: { card: 'bg-surface text-ink', tag: 'text-tag-on-surface', body: 'opacity-85' },
}

export const loadProjects = () => readJson(PROJECTS_FILE, { projects: [] }).projects

export function renderProjects(projects, heading = 'h3') {
  return projects
    .map((p) => {
      const s = PROJECT_STYLES[p.style] || PROJECT_STYLES.surface
      return `<li>
              <a href="${esc(p.url)}" class="card group ${s.card}">
                <div class="card-head"><${heading} class="font-display text-2xl decoration-2 underline-offset-4 group-hover:underline">${esc(p.name)}</${heading}><svg class="arrow" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 17 17 7M7 7h10v10"/></svg></div>
                <p class="${s.body}">${esc(p.body)}</p>
                <span class="card-tag ${s.tag}">${esc(p.tag)}</span>
              </a>
            </li>`
    })
    .join('\n')
}

/* --- Now ------------------------------------------------------------------ */

// Shown until the first weekly update has been generated.
export const NOW_FALLBACK = {
  week: null,
  items: [
    { text: 'Building tools for Bluesky and the AT Protocol.', url: null },
    { text: 'Teaching AI agents new skills.', url: null },
    { text: 'Learning songs on guitar.', url: null },
  ],
}

export const loadNow = () => {
  const data = readJson(NOW_FILE, { entries: [] })
  return Array.isArray(data.entries) ? data.entries : []
}

// ISO-8601 week number and week-year for a YYYY-MM-DD date.
export function isoWeek(iso) {
  const d = new Date(`${iso}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7) + 3) // Thursday of that week
  const year = d.getUTCFullYear()
  const firstThursday = new Date(Date.UTC(year, 0, 4))
  firstThursday.setUTCDate(firstThursday.getUTCDate() - ((firstThursday.getUTCDay() + 6) % 7) + 3)
  return { year, week: 1 + Math.round((d - firstThursday) / (7 * 86_400_000)) }
}

// "26 Oct – 1 Nov": the seven days an entry summarises.
export function weekRange(iso) {
  const start = new Date(`${iso}T00:00:00Z`)
  const end = new Date(start.getTime() + 6 * 86_400_000)
  const fmt = (d) => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' })
  return `${fmt(start)} – ${fmt(end)}`
}

export const weekLabel = (iso) => `Week ${isoWeek(iso).week} · ${weekRange(iso)}`
export const weekId = (iso) => {
  const { year, week } = isoWeek(iso)
  return `${year}-w${String(week).padStart(2, '0')}`
}

const DOTS = ['bg-red', 'bg-dot-coral']

function renderItems(items, { size = 'text-lg' } = {}) {
  return items
    .map((item, i) => {
      const text = esc(item.text)
      const body = item.url
        ? `<a href="${esc(item.url)}" class="decoration-2 underline-offset-4 hover:underline">${text}<svg class="arrow ml-1.5 inline-block h-[0.8em] w-[0.8em] align-baseline opacity-60" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 17 17 7M7 7h10v10"/></svg></a>`
        : text
      return `<li class="grid grid-cols-[14px_minmax(0,1fr)] items-baseline gap-[18px]"><span class="h-3.5 w-3.5 translate-y-px rounded-full ${DOTS[i % 2]}" aria-hidden="true"></span><p class="${size} leading-relaxed">${body}</p></li>`
    })
    .join('\n')
}

// The dark panel on the home page: latest week only.
export function renderNowPanel(entries) {
  const latest = entries[0] || NOW_FALLBACK
  const meta = latest.week
    ? `<p class="mt-3 text-sm text-on-inverse/70">${esc(weekLabel(latest.week))}</p>
          <p class="mt-1 text-sm text-on-inverse/70">Summarised weekly from my GitHub and Bluesky.</p>`
    : ''
  const history =
    entries.length > 1
      ? `<a href="/weeks" class="mt-3 inline-flex min-h-11 items-center text-sm font-semibold underline decoration-2 underline-offset-4 decoration-current/40 hover:decoration-current">Past weeks →</a>`
      : ''
  return `<div>
          <h2 class="font-display text-4xl leading-tight">Now</h2>
          ${meta}
          ${history}
        </div>
        <ul class="grid gap-[22px]">
${renderItems(latest.items)}
        </ul>`
}

// /weeks: every entry, grouped by year, labelled by ISO week number.
// Each week has an id (e.g. #2026-w44) so a single week can be linked.
export function renderWeeks(entries) {
  if (entries.length === 0) {
    return `<p class="text-lg text-ink/80">No updates yet. They'll start appearing here each week.</p>`
  }
  const years = new Map()
  for (const entry of entries) {
    const { year } = isoWeek(entry.week)
    if (!years.has(year)) years.set(year, [])
    years.get(year).push(entry)
  }
  return [...years.entries()]
    .map(
      ([year, list]) => `<section class="grid gap-8" aria-labelledby="y${year}">
          <h2 id="y${year}" class="font-display text-4xl leading-tight">${year}</h2>
${list
  .map(
    (entry) => `          <article id="${weekId(entry.week)}" class="grid scroll-mt-6 gap-4 border-t-2 border-divider pt-6 md:grid-cols-[220px_minmax(0,1fr)] md:gap-16">
            <h3 class="font-display text-2xl leading-tight">Week ${isoWeek(entry.week).week}<span class="mt-1 block font-sans text-sm font-normal text-ink/70">${esc(weekRange(entry.week))}</span></h3>
            <ul class="grid gap-4">
${renderItems(entry.items, { size: 'text-base' })}
            </ul>
          </article>`,
  )
  .join('\n')}
        </section>`,
    )
    .join('\n')
}

/* --- Everything ----------------------------------------------------------- */

export function renderPage(html) {
  const now = loadNow()
  return html
    .replace(/<!--meta:(\w+)-->/, (_, key) => renderMeta(key))
    .replace(/<!--nav:(\w+)-->/, (_, key) => renderNav(key))
    .replace(/<!--projects(?::(h[23]))?-->/, (_, h) => renderProjects(loadProjects(), h || 'h3'))
    .replace('<!--now:panel-->', () => renderNowPanel(now))
    .replace('<!--now:weeks-->', () => renderWeeks(now))
    .replaceAll('%YEAR%', String(new Date().getFullYear()))
    .replaceAll('%AGE%', String(loadSite().age))
    .replace(/%v:([^%]+)%/g, (_, path) => versioned(path))
}
