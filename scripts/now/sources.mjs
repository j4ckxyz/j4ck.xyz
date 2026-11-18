// Collects one week's public activity: GitHub (commits, PRs, issues, new
// repos, releases) and top-level Bluesky posts. Everything is filtered to the
// week's exact [start, end) window, so a run on any day, or a re-run months
// later, sees the same items.
//
// Every source is queried by date (search APIs, timestamps), never by
// "recent", so past weeks can be generated too.

import { addDays, inWeek, londonDate } from './week.mjs'

export const GITHUB_USER = 'j4ckxyz'
export const BSKY_ACTOR = 'j4ck.xyz'

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const firstLine = (s = '') => s.split('\n')[0].trim()

// fetch -> JSON, with a timeout and a wait-and-retry on GitHub rate limits.
export async function fetchJson(url, init = {}, timeoutMs = 30_000) {
  for (let attempt = 1; ; attempt++) {
    const res = await fetch(url, { ...init, signal: AbortSignal.timeout(timeoutMs) })
    if (res.ok) return res.json()
    const body = (await res.text()).slice(0, 300)
    const limited = (res.status === 403 || res.status === 429) && /rate limit/i.test(body)
    if (limited && attempt < 4) {
      const reset = Number(res.headers.get('x-ratelimit-reset')) * 1000
      const retryAfter = Number(res.headers.get('retry-after')) * 1000
      const wait = Math.min(Math.max(retryAfter || (reset ? reset - Date.now() : 0), 5_000), 70_000)
      console.warn(`[rate limit] waiting ${Math.round(wait / 1000)}s for ${new URL(url).pathname}`)
      await sleep(wait)
      continue
    }
    throw new Error(`${res.status} ${res.statusText} for ${url}: ${body}`)
  }
}

/* --- GitHub --------------------------------------------------------------- */

// `token` is used for the REST calls. Search goes through `searchToken`
// (unset = anonymous): the token Actions provides is scoped to this repo and
// would hide commits made elsewhere. A personal token is fine for local
// backfills; private repos are dropped below either way.
export async function githubActivity(bounds, { getJson = fetchJson, token, searchToken } = {}) {
  const base = { Accept: 'application/vnd.github+json', 'User-Agent': 'j4ck.xyz-now-updater' }
  const rest = { ...base, ...(token ? { Authorization: `Bearer ${token}` } : {}) }
  const search = { ...base, ...(searchToken ? { Authorization: `Bearer ${searchToken}` } : {}) }
  // Search qualifiers take whole UTC dates; widen by a day and filter exactly.
  const range = `${addDays(bounds.monday, -1)}..${addDays(bounds.sunday, 1)}`

  const repos = new Map()
  const repo = (full, description) => {
    if (!repos.has(full)) repos.set(full, { name: full, description: '', url: `https://github.com/${full}`, commits: [], events: [] })
    const r = repos.get(full)
    if (description && !r.description) r.description = description
    return r
  }

  async function searchAll(kind, q) {
    const items = []
    for (let page = 1; page <= 10; page++) {
      const data = await getJson(`https://api.github.com/search/${kind}?q=${encodeURIComponent(q)}&per_page=100&page=${page}`, { headers: search })
      items.push(...(data.items || []))
      if (!data.items || data.items.length < 100) break
    }
    return items
  }

  const warn = (what) => (e) => console.warn(`[github] ${what} failed: ${e.message}`)

  // Commits.
  await searchAll('commits', `author:${GITHUB_USER} author-date:${range}`)
    .then((items) => {
      const seen = new Set()
      for (const item of items) {
        if (item.repository?.private || item.repository?.fork) continue // public, own work only
        if (seen.has(item.sha)) continue
        seen.add(item.sha)
        if (!inWeek(item.commit?.author?.date, bounds)) continue
        const msg = firstLine(item.commit?.message)
        if (!msg || /^merge (pull request|branch)/i.test(msg)) continue
        repo(item.repository.full_name, item.repository.description).commits.push(msg)
      }
    })
    .catch(warn('commit search'))

  // PRs and issues opened this week, PRs merged this week.
  const repoOf = (item) => item.repository_url?.replace('https://api.github.com/repos/', '')
  await searchAll('issues', `author:${GITHUB_USER} is:public created:${range}`)
    .then((items) => {
      for (const it of items) {
        if (!inWeek(it.created_at, bounds) || !repoOf(it)) continue
        const kind = it.pull_request ? 'Opened PR' : 'Opened issue'
        repo(repoOf(it)).events.push({ text: `${kind}: ${it.title}`, url: it.html_url })
      }
    })
    .catch(warn('issue search'))
  await searchAll('issues', `author:${GITHUB_USER} is:public is:pr is:merged merged:${range}`)
    .then((items) => {
      for (const it of items) {
        if (!inWeek(it.pull_request?.merged_at, bounds) || !repoOf(it)) continue
        repo(repoOf(it)).events.push({ text: `Merged PR: ${it.title}`, url: it.html_url })
      }
    })
    .catch(warn('merged PR search'))

  // New public repositories.
  try {
    for (let page = 1; page <= 10; page++) {
      const list = await getJson(`https://api.github.com/users/${GITHUB_USER}/repos?type=owner&sort=created&direction=desc&per_page=100&page=${page}`, { headers: rest })
      for (const r of list) {
        if (r.private || r.fork || !inWeek(r.created_at, bounds)) continue
        repo(r.full_name, r.description).events.push({ text: `Created new repository${r.description ? `: ${r.description}` : ''}`, url: r.html_url })
      }
      if (list.length < 100 || Date.parse(list.at(-1).created_at) < bounds.start.getTime()) break
    }
  } catch (e) {
    warn('repo list')(e)
  }

  // Releases from Jack's own repos that were active this week.
  for (const r of repos.values()) {
    if (!r.name.toLowerCase().startsWith(`${GITHUB_USER.toLowerCase()}/`)) continue
    try {
      const releases = await getJson(`https://api.github.com/repos/${r.name}/releases?per_page=30`, { headers: rest })
      for (const rel of releases) {
        if (rel.draft || !inWeek(rel.published_at, bounds)) continue
        r.events.push({ text: `Released ${rel.name || rel.tag_name}`, url: rel.html_url })
      }
    } catch (e) {
      warn(`releases for ${r.name}`)(e)
    }
  }

  return [...repos.values()].filter((r) => r.commits.length || r.events.length)
}

/* --- Bluesky -------------------------------------------------------------- */

// The author feed runs newest to oldest. Pages are kept between calls, so a
// multi-week backfill walks the feed only once.
export function blueskyFeed({ getJson = fetchJson, actor = BSKY_ACTOR, maxPages = 400 } = {}) {
  const items = []
  let cursor
  let done = false
  let pages = 0

  const oldest = () => (items.length ? Date.parse(items.at(-1).post.record?.createdAt || items.at(-1).post.indexedAt) : Infinity)

  async function fill(until) {
    while (!done && pages < maxPages && !(oldest() < until)) {
      const params = new URLSearchParams({ actor, filter: 'posts_no_replies', limit: '100' })
      if (cursor) params.set('cursor', cursor)
      const data = await getJson(`https://public.api.bsky.app/xrpc/app.bsky.feed.getAuthorFeed?${params}`)
      items.push(...(data.feed || []))
      pages++
      cursor = data.cursor
      if (!cursor || !data.feed?.length) done = true
    }
  }

  return {
    async postsIn(bounds) {
      // A post's createdAt can lag the feed order slightly; read two days past the start.
      await fill(bounds.start.getTime() - 2 * 86_400_000)
      const posts = []
      for (const item of items) {
        const post = item.post
        if (item.reason) continue // repost
        if (post.record?.reply) continue // reply (belt and braces; the filter should drop these)
        if (post.author?.handle !== actor) continue
        const created = new Date(post.record?.createdAt || post.indexedAt)
        if (!inWeek(created, bounds)) continue
        const ext = post.embed?.external || post.record?.embed?.external
        const text = (post.record?.text || '').trim()
        const link = ext ? `${ext.title || ''} ${ext.uri || ''}`.trim() : ''
        if (!text && !link) continue
        posts.push({
          text,
          link,
          hasImages: Boolean(post.embed?.images?.length || post.embed?.media?.images?.length),
          likes: post.likeCount || 0,
          createdAt: created.toISOString(),
          date: londonDate(created),
          url: `https://bsky.app/profile/${actor}/post/${post.uri.split('/').pop()}`,
        })
      }
      return posts.sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    },
  }
}
