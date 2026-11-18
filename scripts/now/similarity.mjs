// Near-duplicate check between two weeks of Now items.
//
// The old rolling window let one week's notes come back the next week,
// reworded and reordered. Two signals catch that:
//  - the same Bluesky post cited again (a post belongs to exactly one week,
//    so with a strict cutoff this should never happen), and
//  - wording overlap: content words shared between an item and its closest
//    match in the other week.
// One shared topic is normal (ongoing projects recur). Most items matching is not.

const STOP = new Set(
  `a an the and or but of for to in on at by with from into onto over about as is are be being been this that these those
  it its his her their new some more most very really just still also up out off own one two few lot lots way
  building build working work trying try making make fixing fix adding add getting get using use writing write
  learning learn playing play listening listen looking look reading read testing test shipping ship tweaking tweak
  setting set polishing polish exploring explore putting put keeping keep giving give running run starting start
  jack jacks`.split(/\s+/),
)

const stem = (w) => w.replace(/(?:ing|ed|es|s)$/, '').replace(/(.)\1$/, '$1')

export function contentWords(text) {
  const words = String(text)
    .toLowerCase()
    .replace(/[’']/g, '')
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length > 1 && !STOP.has(w))
  return new Set(words.map(stem).filter((w) => w.length > 1 && !STOP.has(w)))
}

const jaccard = (a, b) => {
  if (!a.size || !b.size) return 0
  let shared = 0
  for (const w of a) if (b.has(w)) shared++
  return shared / (a.size + b.size - shared)
}

const POST_URL = /^https:\/\/bsky\.app\/profile\/[^/]+\/post\/[^/?#]+$/
export const isPostUrl = (url) => typeof url === 'string' && POST_URL.test(url)

export function itemSimilarity(a, b) {
  if (isPostUrl(a.url) && a.url === b.url) return 1
  return jaccard(contentWords(a.text), contentWords(b.text))
}

export const MATCH_THRESHOLD = 0.3
export const DUPLICATE_SHARE = 0.6 // 3 of 5 items

// Compares `current` (items) to `previous` (items). Returns the per-item best
// matches plus the verdict.
export function compareWeeks(current, previous) {
  const matches = current.map((item) => {
    let best = { score: 0, with: null }
    for (const other of previous) {
      const score = itemSimilarity(item, other)
      if (score > best.score) best = { score, with: other.text }
    }
    return { text: item.text, ...best }
  })
  const prevPosts = new Set(previous.map((i) => i.url).filter(isPostUrl))
  const sharedPosts = current.map((i) => i.url).filter((u) => isPostUrl(u) && prevPosts.has(u))
  const matched = matches.filter((m) => m.score >= MATCH_THRESHOLD).length
  const nearDuplicate = current.length > 0 && previous.length > 0 && matched >= Math.ceil(current.length * DUPLICATE_SHARE)
  return { nearDuplicate, matched, sharedPosts, matches }
}
