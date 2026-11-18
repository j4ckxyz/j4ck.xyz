import { test } from 'node:test'
import assert from 'node:assert/strict'
import { blueskyFeed, githubActivity } from '../sources.mjs'
import { weekBounds } from '../week.mjs'

const W45 = weekBounds('2026-11-02') // 2026-11-02T00:00Z .. 2026-11-09T00:00Z

const commit = (sha, date, message, repo = 'j4ckxyz/site', extra = {}) => ({
  sha,
  commit: { author: { date }, message },
  repository: { full_name: repo, description: 'A site', private: false, fork: false, ...extra },
})

function mockGithub(routes) {
  const calls = []
  const getJson = async (url) => {
    calls.push(url)
    for (const [match, body] of routes) if (url.includes(match)) return typeof body === 'function' ? body(url) : body
    throw new Error(`unexpected ${url}`)
  }
  return { getJson, calls }
}

test('GitHub activity is cut to the week, both ends', async () => {
  const { getJson, calls } = mockGithub([
    ['search/commits', { items: [
      commit('a', '2026-11-01T23:59:59Z', 'too early (Sunday of week 44)'),
      commit('b', '2026-11-02T00:00:00Z', 'first second of the week'),
      commit('c', '2026-11-08T23:59:59Z', 'last second of the week'),
      commit('d', '2026-11-09T00:00:00Z', 'too late (week 46)'),
      commit('e', '2026-11-04T10:00:00Z', 'private work', 'j4ckxyz/secret', { private: true }),
      commit('f', '2026-11-04T10:00:00Z', 'Merge pull request #1 from x/y'),
      commit('b', '2026-11-02T00:00:00Z', 'first second of the week'), // duplicate hit
    ] }],
    ['is%3Amerged', { items: [
      { title: 'Merged in week', repository_url: 'https://api.github.com/repos/j4ckxyz/site', html_url: 'u1', pull_request: { merged_at: '2026-11-05T12:00:00Z' } },
      { title: 'Merged next week', repository_url: 'https://api.github.com/repos/j4ckxyz/site', html_url: 'u2', pull_request: { merged_at: '2026-11-10T12:00:00Z' } },
    ] }],
    ['search/issues', { items: [
      { title: 'Opened in week', created_at: '2026-11-03T12:00:00Z', repository_url: 'https://api.github.com/repos/j4ckxyz/site', html_url: 'u3', pull_request: {} },
      { title: 'Opened last week', created_at: '2026-10-31T12:00:00Z', repository_url: 'https://api.github.com/repos/j4ckxyz/site', html_url: 'u4' },
    ] }],
    ['/users/j4ckxyz/repos', [
      { full_name: 'j4ckxyz/newthing', html_url: 'https://github.com/j4ckxyz/newthing', description: 'New', created_at: '2026-11-07T09:00:00Z', private: false, fork: false },
      { full_name: 'j4ckxyz/later', html_url: 'x', created_at: '2026-11-12T09:00:00Z', private: false, fork: false },
      { full_name: 'j4ckxyz/old', html_url: 'y', created_at: '2026-01-01T09:00:00Z', private: false, fork: false },
    ]],
    ['/releases', [
      { name: 'v1', html_url: 'r1', published_at: '2026-11-06T10:00:00Z', draft: false },
      { name: 'v0', html_url: 'r0', published_at: '2026-10-20T10:00:00Z', draft: false },
    ]],
  ])
  const repos = await githubActivity(W45, { getJson })
  const site = repos.find((r) => r.name === 'j4ckxyz/site')
  assert.deepEqual(site.commits, ['first second of the week', 'last second of the week'])
  assert.deepEqual(site.events.map((e) => e.text), ['Opened PR: Opened in week', 'Merged PR: Merged in week', 'Released v1'])
  assert.deepEqual(repos.map((r) => r.name).sort(), ['j4ckxyz/newthing', 'j4ckxyz/site'])
  assert.ok(calls.some((u) => decodeURIComponent(u).includes('author-date:2026-11-01..2026-11-09')))
})

test('a failing GitHub source is skipped, not fatal', async () => {
  const warn = console.warn
  console.warn = () => {}
  try {
    const repos = await githubActivity(W45, { getJson: async () => { throw new Error('boom') } })
    assert.deepEqual(repos, [])
  } finally {
    console.warn = warn
  }
})

const feedItem = (rkey, createdAt, text, extra = {}) => ({
  post: { uri: `at://did:plc:x/app.bsky.feed.post/${rkey}`, author: { handle: 'j4ck.xyz' }, record: { createdAt, text, ...(extra.record || {}) }, likeCount: 1 },
  ...(extra.item || {}),
})

test('Bluesky posts are cut to the week; later posts never leak into an earlier week', async () => {
  // Newest first, as the API returns them; two pages.
  const pages = [
    { feed: [
      feedItem('p1', '2026-11-10T09:00:00Z', 'week 46 post'),
      feedItem('p2', '2026-11-08T23:30:00Z', 'Sunday night, week 45'),
      feedItem('p3', '2026-11-06T07:43:15Z', 'Queen album'),
      feedItem('p4', '2026-11-05T10:00:00Z', 'a repost', { item: { reason: { $type: 'repost' } } }),
      feedItem('p5', '2026-11-05T09:00:00Z', 'a reply', { record: { reply: {} } }),
    ], cursor: 'c1' },
    { feed: [
      feedItem('p6', '2026-11-02T00:00:00Z', 'Monday midnight, week 45'),
      feedItem('p7', '2026-11-01T23:59:00Z', 'Sunday, week 44'),
      feedItem('p8', '2026-10-30T12:00:00Z', 'Friday, week 44'),
    ], cursor: 'c2' },
    { feed: [feedItem('p9', '2026-10-20T12:00:00Z', 'week 43')], cursor: 'c3' },
  ]
  let fetched = 0
  const feed = blueskyFeed({ getJson: async () => pages[fetched++] })

  const w45 = await feed.postsIn(W45)
  assert.deepEqual(w45.map((p) => p.text), ['Monday midnight, week 45', 'Queen album', 'Sunday night, week 45'])
  assert.equal(w45[0].url, 'https://bsky.app/profile/j4ck.xyz/post/p6')
  assert.equal(fetched, 2) // stops once it is two days past the week's start

  const w44 = await feed.postsIn(weekBounds('2026-10-26'))
  assert.deepEqual(w44.map((p) => p.text), ['Friday, week 44', 'Sunday, week 44'])
  assert.equal(fetched, 3) // only the one extra page; the first two are reused
  await feed.postsIn(W45)
  assert.equal(fetched, 3)
})

test('Bluesky week bounds are London time in summer', async () => {
  const feed = blueskyFeed({ getJson: async () => ({ feed: [
    feedItem('s1', '2026-07-19T23:30:00Z', 'Monday 00:30 BST'),
    feedItem('s2', '2026-07-19T22:30:00Z', 'Sunday 23:30 BST'),
    feedItem('s3', '2026-07-01T00:00:00Z', 'old'),
  ] }) })
  const posts = await feed.postsIn(weekBounds('2026-07-13'))
  assert.deepEqual(posts.map((p) => [p.text, p.date]), [['Sunday 23:30 BST', '2026-07-19']])
})
