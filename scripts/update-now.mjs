#!/usr/bin/env node
// Weekly "Now" update.
//
// 1. Collects the last 7 days of public GitHub activity and Bluesky posts
//    (top-level posts only: no replies, no reposts).
// 2. Asks DeepSeek V4.1 Flash (via OpenRouter) for 5 short, distinct,
//    general-audience status updates, each tied to one source item.
// 3. Prepends the result to data/now.json (re-running in the same week
//    replaces that week's entry instead of adding a duplicate).
//
// Env: OPENROUTER_API_KEY (required unless --dry-run), GITHUB_TOKEN (optional,
// raises GitHub rate limits; Actions provides one).
// Flags: --dry-run  gather activity and print the prompt, call nothing, write nothing.

import { readFileSync, writeFileSync } from 'node:fs'
import { NOW_FILE, weekId } from './render.mjs'

const GITHUB_USER = 'j4ckxyz'
const BSKY_ACTOR = 'j4ck.xyz'
const MODEL = 'deepseek/deepseek-v4.1-flash'
const DAYS = 7
const COUNT = 5
const MIN_SOURCES = 3 // below this, skip the week rather than pad it out

const DRY_RUN = process.argv.includes('--dry-run')
const now = new Date()
const since = new Date(now.getTime() - DAYS * 86_400_000)
const sinceDate = since.toISOString().slice(0, 10)

const ghHeaders = {
  Accept: 'application/vnd.github+json',
  'User-Agent': 'j4ck.xyz-now-updater',
  ...(process.env.GITHUB_TOKEN ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {}),
}

async function getJson(url, init = {}, timeoutMs = 30_000) {
  const res = await fetch(url, { ...init, signal: AbortSignal.timeout(timeoutMs) })
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${url}: ${(await res.text()).slice(0, 300)}`)
  return res.json()
}

const firstLine = (s = '') => s.split('\n')[0].trim()
const clip = (s, n) => (s.length > n ? `${s.slice(0, n - 1)}…` : s)

/* --- GitHub --------------------------------------------------------------- */

async function githubActivity() {
  const repos = new Map() // full_name -> { name, description, url, commits: [], events: [] }
  const repo = (full, extra = {}) => {
    if (!repos.has(full)) repos.set(full, { name: full, description: '', url: `https://github.com/${full}`, commits: [], events: [] })
    const r = repos.get(full)
    if (extra.description && !r.description) r.description = extra.description
    return r
  }

  // Commit messages (the events feed no longer carries them reliably).
  // Searched without the token: the repo-scoped token Actions provides only
  // sees this repo's commits, and one unauthenticated search a week is well
  // inside the anonymous rate limit.
  try {
    const q = encodeURIComponent(`author:${GITHUB_USER} author-date:>=${sinceDate}`)
    const { Authorization: _token, ...anonHeaders } = ghHeaders
    const data = await getJson(`https://api.github.com/search/commits?q=${q}&sort=author-date&order=desc&per_page=100`, { headers: anonHeaders })
    for (const item of data.items || []) {
      if (item.repository?.private) continue // never put private work on a public page
      const msg = firstLine(item.commit?.message)
      if (!msg || /^merge (pull request|branch)/i.test(msg)) continue
      repo(item.repository.full_name, { description: item.repository.description }).commits.push(msg)
    }
  } catch (e) {
    console.warn('[github] commit search failed:', e.message)
  }

  // PRs, issues, releases, new repos.
  try {
    for (let page = 1; page <= 3; page++) {
      const events = await getJson(`https://api.github.com/users/${GITHUB_USER}/events/public?per_page=100&page=${page}`, { headers: ghHeaders })
      if (!events.length) break
      let reachedOld = false
      for (const ev of events) {
        if (new Date(ev.created_at) < since) { reachedOld = true; continue }
        if (ev.public === false) continue
        const r = () => repo(ev.repo.name)
        const p = ev.payload || {}
        if (ev.type === 'PullRequestEvent' && ['opened', 'closed'].includes(p.action)) {
          const merged = p.action === 'closed' && p.pull_request?.merged
          if (p.action === 'closed' && !merged) continue
          // Newer event payloads omit PR titles; merged PRs still show up as commits.
          if (p.pull_request?.title) r().events.push({ text: `${merged ? 'Merged' : 'Opened'} PR: ${p.pull_request.title}`, url: p.pull_request.html_url })
        } else if (ev.type === 'IssuesEvent' && p.action === 'opened') {
          if (p.issue?.title) r().events.push({ text: `Opened issue: ${p.issue.title}`, url: p.issue.html_url })
        } else if (ev.type === 'ReleaseEvent' && p.action === 'published') {
          r().events.push({ text: `Released ${p.release?.name || p.release?.tag_name}`, url: p.release?.html_url })
        } else if (ev.type === 'CreateEvent' && p.ref_type === 'repository') {
          r().events.push({ text: `Created new repository${p.description ? `: ${p.description}` : ''}`, url: `https://github.com/${ev.repo.name}` })
        }
      }
      if (reachedOld) break
    }
  } catch (e) {
    console.warn('[github] events fetch failed:', e.message)
  }

  return [...repos.values()].filter((r) => r.commits.length || r.events.length)
}

/* --- Bluesky -------------------------------------------------------------- */

async function blueskyPosts() {
  const posts = []
  let cursor
  for (let page = 0; page < 5; page++) {
    const params = new URLSearchParams({ actor: BSKY_ACTOR, filter: 'posts_no_replies', limit: '100' })
    if (cursor) params.set('cursor', cursor)
    const data = await getJson(`https://public.api.bsky.app/xrpc/app.bsky.feed.getAuthorFeed?${params}`)
    let reachedOld = false
    for (const item of data.feed || []) {
      const post = item.post
      if (item.reason) continue // repost
      if (post.record?.reply) continue // reply (belt and braces; the filter should drop these)
      if (post.author?.handle !== BSKY_ACTOR) continue
      const created = new Date(post.record?.createdAt || post.indexedAt)
      if (created < since) { reachedOld = true; continue }
      const ext = post.embed?.external || post.record?.embed?.external
      const rkey = post.uri.split('/').pop()
      posts.push({
        text: (post.record?.text || '').trim(),
        link: ext ? `${ext.title || ''} ${ext.uri || ''}`.trim() : '',
        hasImages: Boolean(post.embed?.images?.length || post.embed?.media?.images?.length),
        likes: post.likeCount || 0,
        date: created.toISOString().slice(0, 10),
        url: `https://bsky.app/profile/${BSKY_ACTOR}/post/${rkey}`,
      })
    }
    cursor = data.cursor
    if (reachedOld || !cursor) break
  }
  return posts.filter((p) => p.text || p.link)
}

/* --- Prompt --------------------------------------------------------------- */

function buildSources(repos, posts) {
  const sources = []
  repos.forEach((r, i) => {
    const lines = [
      ...r.events.map((e) => `  - ${clip(e.text, 160)}`),
      ...r.commits.slice(0, 15).map((c) => `  - commit: ${clip(c, 140)}`),
    ]
    if (r.commits.length > 15) lines.push(`  - …and ${r.commits.length - 15} more commits`)
    sources.push({
      id: `gh${i + 1}`,
      url: r.events.find((e) => e.url)?.url || r.url,
      block: `[gh${i + 1}] GitHub repo ${r.name}${r.description ? ` — "${clip(r.description, 200)}"` : ''}\n${lines.join('\n')}`,
    })
  })
  posts.forEach((p, i) => {
    const extras = [p.link && `link: ${clip(p.link, 200)}`, p.hasImages && 'has photos', p.likes && `${p.likes} likes`].filter(Boolean)
    sources.push({
      id: `bs${i + 1}`,
      url: p.url,
      block: `[bs${i + 1}] Bluesky post, ${p.date}: "${clip(p.text, 600)}"${extras.length ? ` (${extras.join('; ')})` : ''}`,
    })
  })
  return sources
}

const SYSTEM = `You write the "Now" section of Jack's personal website. Jack is 17 and builds things on the open web: AI tools, Bluesky / AT Protocol apps, open-source software. Off-screen he plays guitar and listens to a lot of music.

From the past week's activity, write exactly ${COUNT} short status updates of what Jack is up to.

Style — match these examples:
- "Building tools for Bluesky and the AT Protocol."
- "Teaching AI agents new skills."
- "Learning songs on guitar."

Rules:
- Each update is 4 to 12 words, one sentence, present continuous ("Building…", "Working on…", "Trying out…"), ending with a full stop. No "I", no emoji, no hashtags.
- Write for a stranger visiting the site: general and easy to understand. No commit details, version numbers, issue/PR numbers, file names, usernames, @handles, in-jokes or jargon a non-developer wouldn't follow. A project name is fine only if the update also says what it is ("Polishing Aurelia, a music player for Jellyfin.").
- All ${COUNT} updates must be about clearly different things. Never two about the same project or the same theme.
- Only use what the activity actually shows. Never invent projects, events or feelings.
- Skip anything that would read oddly out of context: one-off jokes, reactions to news or other companies, complaints, arguments, politics, or anything about other people.
- Never touch personal life: no grief, loss, health, family, friends, relationships, mood or taking breaks, even if a post mentions them. Music, guitar and gigs are fine.
- For each update, give the id of the single activity item it is based on.`

const SCHEMA = {
  name: 'now_updates',
  strict: true,
  schema: {
    type: 'object',
    additionalProperties: false,
    required: ['updates'],
    properties: {
      updates: {
        type: 'array',
        minItems: COUNT,
        maxItems: COUNT,
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['text', 'source'],
          properties: { text: { type: 'string' }, source: { type: 'string' } },
        },
      },
    },
  },
}

async function generate(sources) {
  const user = `Activity from ${sinceDate} to ${now.toISOString().slice(0, 10)}:\n\n${sources.map((s) => s.block).join('\n\n')}`
  if (DRY_RUN) {
    console.log(`--- system ---\n${SYSTEM}\n\n--- user ---\n${user}`)
    return null
  }
  const key = process.env.OPENROUTER_API_KEY
  if (!key) throw new Error('OPENROUTER_API_KEY is not set')

  const byId = new Map(sources.map((s) => [s.id, s]))
  let lastError
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const data = await getJson('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${key}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://j4ck.xyz',
          'X-Title': 'j4ck.xyz',
        },
        body: JSON.stringify({
          model: MODEL,
          temperature: 0.6,
          max_tokens: 2000,
          // Short task: little reasoning needed, and it keeps the reply fast.
          reasoning: { effort: 'low' },
          response_format: { type: 'json_schema', json_schema: SCHEMA },
          messages: [
            { role: 'system', content: SYSTEM },
            { role: 'user', content: user },
          ],
        }),
      }, 120_000)
      const raw = data.choices?.[0]?.message?.content || ''
      const parsed = JSON.parse(raw.replace(/^```(?:json)?\s*|\s*```$/g, ''))
      const items = validate(parsed.updates, byId)
      return items
    } catch (e) {
      lastError = e
      console.warn(`[openrouter] attempt ${attempt} rejected: ${e.message}`)
    }
  }
  throw lastError
}

function validate(updates, byId) {
  if (!Array.isArray(updates) || updates.length !== COUNT) throw new Error(`expected ${COUNT} updates, got ${updates?.length}`)
  const seen = new Set()
  return updates.map((u) => {
    const text = String(u.text || '').replace(/\s+/g, ' ').trim()
    const words = text.split(' ').length
    if (!text || words < 3 || words > 16) throw new Error(`bad length: "${text}"`)
    if (/[@#]|https?:\/\//.test(text)) throw new Error(`handle, hashtag or URL in: "${text}"`)
    const norm = text.toLowerCase().replace(/[^a-z0-9 ]/g, '')
    if (seen.has(norm)) throw new Error(`duplicate update: "${text}"`)
    seen.add(norm)
    const src = byId.get(u.source)
    return { text: /[.!?]$/.test(text) ? text : `${text}.`, url: src?.url ?? null }
  })
}

/* --- Main ----------------------------------------------------------------- */

const [repos, posts] = await Promise.all([
  githubActivity(),
  blueskyPosts().catch((e) => {
    console.warn('[bluesky] fetch failed:', e.message)
    return []
  }),
])
const sources = buildSources(repos, posts)
console.log(`Found ${repos.length} active repos and ${posts.length} Bluesky posts since ${sinceDate}.`)

if (sources.length < MIN_SOURCES) {
  console.log(`Only ${sources.length} activity items; skipping this week.`)
  process.exit(0)
}

const items = await generate(sources)
if (!items) process.exit(0)

const file = JSON.parse(readFileSync(NOW_FILE, 'utf8'))
// One entry per ISO week: a re-run (or a manual run mid-week) replaces it.
const entries = (file.entries || []).filter((e) => weekId(e.week) !== weekId(sinceDate))
entries.unshift({ week: sinceDate, generatedAt: now.toISOString(), model: MODEL, items })
writeFileSync(NOW_FILE, `${JSON.stringify({ entries }, null, 2)}\n`)
console.log(`Wrote week of ${sinceDate}:`)
for (const i of items) console.log(`  • ${i.text}${i.url ? `  (${i.url})` : ''}`)
