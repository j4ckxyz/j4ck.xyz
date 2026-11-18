// Turns one week's activity into 3–5 short Now updates via OpenRouter.

import { fetchJson } from './sources.mjs'
import { MATCH_THRESHOLD, compareWeeks } from './similarity.mjs'

export const MODEL = 'deepseek/deepseek-v4.1-flash'
export const MAX_COUNT = 5
export const MIN_COUNT = 3
export const MIN_SOURCES = MIN_COUNT // below this, skip the week rather than pad it out

const clip = (s, n) => (s.length > n ? `${s.slice(0, n - 1)}…` : s)

export function buildSources(repos, posts) {
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

// The most updates a week can have: one per source, up to MAX_COUNT. The model
// may return fewer (down to MIN_COUNT) rather than pad a thin week.
export const countFor = (sources) => Math.min(MAX_COUNT, sources.length)

export const systemPrompt = (count) => `You write the "Now" section of Jack's personal website. Jack builds things on the open web: AI tools, Bluesky / AT Protocol apps, open-source software. Off-screen he plays guitar and listens to a lot of music.

From one week's activity, write ${count === MIN_COUNT ? `exactly ${count}` : `${MIN_COUNT} to ${count}`} short status updates of what Jack was up to that week.${count > MIN_COUNT ? ` Write ${count} when there are ${count} good, distinct things; fewer is better than filler.` : ''}

Style — match these examples:
- "Building tools for Bluesky and the AT Protocol."
- "Teaching AI agents new skills."
- "Learning songs on guitar."

Rules:
- Each update is 4 to 12 words, one sentence, present continuous ("Building…", "Working on…", "Trying out…"), ending with a full stop. No "I", no emoji, no hashtags.
- Write for a stranger visiting the site: general and easy to understand. No commit details, version numbers, issue/PR numbers, file names, usernames, @handles, in-jokes or jargon a non-developer wouldn't follow. A project name is fine only if the update also says what it is ("Polishing Aurelia, a music player for Jellyfin.").
- All updates must be about clearly different things, each from a different activity item. Never two about the same project or the same theme.
- Only use what this week's activity actually shows. Never invent projects, events or feelings.
- Skip anything that would read oddly out of context: one-off jokes, reactions to news or other companies, complaints, arguments, politics, or anything about other people.
- Never touch personal life: no grief, loss, health, family, friends, relationships, mood or taking breaks, even if a post mentions them. Music, guitar and gigs are fine.
- Never name places: no towns, islands, countries, venues or schools. No school or exam admin (licences, applications), and nothing about getting round school or work restrictions.
- If last week's updates are listed, don't repeat or reword them. Items marked "covered last week" were already mentioned. Up to ${Math.max(1, Math.ceil(count * 0.6) - 1)} updates may still cover them when they were among this week's main things, written fresh about what happened this week, not as a rewording of last week's line. Never fill a slot with something the rules above say to skip.
- For each update, give the id of the single activity item it is based on.`

const schema = (count) => ({
  name: 'now_updates',
  strict: true,
  schema: {
    type: 'object',
    additionalProperties: false,
    required: ['updates'],
    properties: {
      updates: {
        type: 'array',
        minItems: Math.min(MIN_COUNT, count),
        maxItems: count,
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['text', 'source'],
          properties: { text: { type: 'string' }, source: { type: 'string' } },
        },
      },
    },
  },
})

export function userPrompt({ rangeText, sources, previous }) {
  const used = new Set((previous || []).map((i) => i.url).filter(Boolean))
  const blocks = sources.map((s) => (used.has(s.url) ? s.block.replace(/^(\[\w+\])/, '$1 (covered last week)') : s.block))
  const prev = previous?.length
    ? `\n\nLast week's updates (don't repeat or reword these):\n${previous.map((i) => `- ${i.text}`).join('\n')}`
    : ''
  return `Activity for the week ${rangeText} (only this week):\n\n${blocks.join('\n\n')}${prev}`
}

// The model's reply as text, tolerating code fences and stray prose.
export function parseReply(raw) {
  const text = Array.isArray(raw) ? raw.map((p) => p?.text ?? '').join('') : String(raw ?? '')
  const stripped = text.replace(/^\s*```(?:json)?\s*|\s*```\s*$/g, '').trim()
  if (!stripped) throw new Error('empty reply')
  try {
    return JSON.parse(stripped)
  } catch {
    const m = stripped.match(/\{[\s\S]*\}/)
    if (!m) throw new Error(`no JSON in reply: ${clip(stripped, 120)}`)
    return JSON.parse(m[0])
  }
}

export function validate(updates, sources, count) {
  const min = Math.min(MIN_COUNT, count)
  if (!Array.isArray(updates) || updates.length < min || updates.length > count) {
    throw new Error(`expected ${min === count ? count : `${min} to ${count}`} updates, got ${updates?.length}`)
  }
  const byId = new Map(sources.map((s) => [s.id, s]))
  const seenText = new Set()
  const seenSource = new Set()
  return updates.map((u) => {
    const text = String(u.text || '').replace(/\s+/g, ' ').trim()
    const words = text.split(' ').length
    if (!text || words < 3 || words > 16) throw new Error(`bad length: "${text}"`)
    if (/[@#]|https?:\/\//.test(text)) throw new Error(`handle, hashtag or URL in: "${text}"`)
    const norm = text.toLowerCase().replace(/[^a-z0-9 ]/g, '')
    if (seenText.has(norm)) throw new Error(`duplicate update: "${text}"`)
    seenText.add(norm)
    const src = byId.get(String(u.source || '').replace(/[[\]]/g, '').trim())
    if (!src) throw new Error(`unknown source "${u.source}" for "${text}"`)
    if (seenSource.has(src.id)) throw new Error(`two updates from source ${src.id}`)
    seenSource.add(src.id)
    return { text: /[.!?]$/.test(text) ? text : `${text}.`, url: src.url }
  })
}

// Calls the model until it returns valid updates that aren't a near-duplicate
// of the previous week. Throws after `attempts` failures.
export async function generate({ sources, rangeText, previous, apiKey, getJson = fetchJson, attempts = 4, log = console }) {
  if (!apiKey) throw new Error('OPENROUTER_API_KEY is not set')
  const count = countFor(sources)
  const messages = [
    { role: 'system', content: systemPrompt(count) },
    { role: 'user', content: userPrompt({ rangeText, sources, previous }) },
  ]
  let lastError
  let feedback = [] // after a near-duplicate, the rejected reply and what to change
  let cutOff = false
  for (let attempt = 1; attempt <= attempts; attempt++) {
    // Strict JSON-schema output with a little reasoning first. Reasoning can use
    // up the whole token budget and leave an empty reply (what broke Week 46),
    // so after an empty reply reasoning is turned off, and the last attempts
    // fall back to plain JSON mode.
    const strict = attempt <= 2
    const reasoning = strict && !cutOff
    try {
      const data = await getJson('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://j4ck.xyz',
          'X-Title': 'j4ck.xyz',
        },
        body: JSON.stringify({
          model: MODEL,
          temperature: 0.6,
          max_tokens: reasoning ? 8000 : 2000,
          reasoning: reasoning ? { effort: 'low', exclude: true } : { enabled: false },
          response_format: strict ? { type: 'json_schema', json_schema: schema(count) } : { type: 'json_object' },
          messages: strict
            ? [...messages, ...feedback]
            : [...messages, ...feedback, { role: 'user', content: `Reply with only JSON: {"updates":[{"text":"…","source":"gh1"}, …]} with ${MIN_COUNT} to ${count} updates.` }],
        }),
      }, 120_000)
      const choice = data.choices?.[0]
      if (!choice) throw new Error(`no choices in response: ${clip(JSON.stringify(data), 200)}`)
      const content = choice.message?.content
      if (!content || (typeof content === 'string' && !content.trim())) {
        cutOff = true
        throw new Error(`empty reply (finish_reason: ${choice.finish_reason ?? 'unknown'})`)
      }
      const items = validate(parseReply(content).updates, sources, count)
      if (previous?.length) {
        const cmp = compareWeeks(items, previous)
        if (cmp.nearDuplicate) {
          const close = cmp.matches.filter((m) => m.score >= MATCH_THRESHOLD).map((m) => `- "${m.text}" (too close to "${m.with}")`)
          feedback = [
            { role: 'assistant', content: typeof content === 'string' ? content : JSON.stringify(content) },
            { role: 'user', content: `Too close to last week:\n${close.join('\n')}\nReplace those with other things from this week's activity that last week didn't cover, or leave them out (minimum ${MIN_COUNT} updates). Keep the rest.` },
          ]
          throw new Error(`near-duplicate of last week (${cmp.matched}/${items.length} items match)`)
        }
      }
      return items
    } catch (e) {
      lastError = e
      log.warn(`[openrouter] attempt ${attempt} rejected: ${e.message}`)
    }
  }
  throw lastError
}
