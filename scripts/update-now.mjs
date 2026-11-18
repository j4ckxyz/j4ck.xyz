#!/usr/bin/env node
// Weekly "Now" update.
//
// A week is ISO Monday 00:00 to Sunday 24:00, Europe/London (scripts/now/week.mjs).
// Each entry is built only from activity timestamped inside its own week:
// public GitHub activity and top-level Bluesky posts (no replies, no reposts).
// DeepSeek V4.1 Flash (via OpenRouter) turns that into 3–5 short,
// general-audience status lines, each linked to its source. A result that is a
// near-duplicate of the previous week is rejected.
//
// By default it does the most recent fully finished week, and does nothing if
// that week already has an entry, so re-runs are safe.
//
// Flags:
//   --week 2026-W45 | 2026-11-04   a specific week (repeatable)
//   --from 2026-W01 --to 2026-W43  every week in a range, oldest first
//   --force                        replace weeks that already have an entry
//   --out FILE                     read/write FILE instead of data/now.json (for trials)
//   --dry-run                      gather activity and print the prompts; call nothing, write nothing
//
// Env: OPENROUTER_API_KEY (required unless --dry-run), GITHUB_TOKEN (optional,
// REST rate limits), GITHUB_SEARCH_TOKEN (optional; search is anonymous without it).

import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { parseArgs } from 'node:util'
import { NOW_FILE } from './render.mjs'
import { addDays, lastCompleteWeek, mondayOf, parseWeek, weekBounds, weekId, weekRange, weeksBetween } from './now/week.mjs'
import { blueskyFeed, githubActivity } from './now/sources.mjs'
import { MIN_SOURCES, MODEL, buildSources, countFor, generate, systemPrompt, userPrompt } from './now/model.mjs'

const { values: args } = parseArgs({
  options: {
    week: { type: 'string', multiple: true },
    from: { type: 'string' },
    to: { type: 'string' },
    force: { type: 'boolean', default: false },
    out: { type: 'string' },
    'dry-run': { type: 'boolean', default: false },
  },
})
const DRY_RUN = args['dry-run']
const FILE = args.out || NOW_FILE

let weeks
if (args.from || args.to) {
  if (!args.from || !args.to) throw new Error('--from and --to go together')
  weeks = weeksBetween(parseWeek(args.from), parseWeek(args.to))
} else if (args.week?.length) {
  weeks = [...new Set(args.week.map(parseWeek))].sort()
} else {
  weeks = [lastCompleteWeek()]
}
const unfinished = weeks.filter((w) => weekBounds(w).end > new Date())
if (unfinished.length) throw new Error(`${unfinished.map(weekId).join(', ')} hasn't finished yet`)

const load = () => (existsSync(FILE) ? JSON.parse(readFileSync(FILE, 'utf8')).entries || [] : [])
const save = (entries) => {
  entries.sort((a, b) => b.week.localeCompare(a.week)) // newest first
  writeFileSync(FILE, `${JSON.stringify({ entries }, null, 2)}\n`)
}

const feed = blueskyFeed()
const failed = []

for (const monday of weeks) {
  const bounds = weekBounds(monday)
  const label = `${weekId(monday)} (${weekRange(monday)})`
  const entries = load()
  const existing = entries.find((e) => mondayOf(e.week) === monday)
  if (existing && !args.force && !DRY_RUN) {
    console.log(`${label}: already has an entry; skipping (use --force to replace).`)
    continue
  }

  const [repos, posts] = await Promise.all([
    githubActivity(bounds, { token: process.env.GITHUB_TOKEN, searchToken: process.env.GITHUB_SEARCH_TOKEN }),
    feed.postsIn(bounds).catch((e) => {
      console.warn('[bluesky] fetch failed:', e.message)
      return []
    }),
  ])
  const sources = buildSources(repos, posts)
  console.log(`${label}: ${repos.length} active repos, ${posts.length} Bluesky posts.`)
  if (sources.length < MIN_SOURCES) {
    console.log(`${label}: only ${sources.length} activity items; skipping.`)
    continue
  }

  const previous = entries.find((e) => mondayOf(e.week) === addDays(monday, -7))?.items
  const rangeText = `${weekRange(monday)} ${monday.slice(0, 4)}`
  if (DRY_RUN) {
    console.log(`--- system ---\n${systemPrompt(countFor(sources))}\n\n--- user ---\n${userPrompt({ rangeText, sources, previous })}\n`)
    continue
  }

  try {
    const items = await generate({ sources, rangeText, previous, apiKey: process.env.OPENROUTER_API_KEY })
    const rest = load().filter((e) => mondayOf(e.week) !== monday)
    save([{ week: monday, generatedAt: new Date().toISOString(), model: MODEL, items }, ...rest])
    console.log(`${label}: wrote ${items.length} updates`)
    for (const i of items) console.log(`  • ${i.text}  (${i.url})`)
  } catch (e) {
    console.error(`${label}: not written: ${e.message}`)
    failed.push(weekId(monday))
  }
}

if (failed.length) {
  console.error(`Failed: ${failed.join(', ')}`)
  process.exit(1)
}
