import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildSources, countFor, generate, parseReply, userPrompt, validate } from '../model.mjs'

const sources = buildSources(
  [{ name: 'j4ckxyz/site', description: 'Site', url: 'https://github.com/j4ckxyz/site', commits: ['feat: x'], events: [] }],
  ['a', 'b', 'c', 'd'].map((k) => ({ text: `post ${k}`, link: '', hasImages: false, likes: 0, date: '2026-11-03', url: `https://bsky.app/profile/j4ck.xyz/post/${k}` })),
)
const good = [
  { text: 'Rebuilding a personal website from scratch', source: 'gh1' },
  { text: 'Learning a new song on guitar.', source: 'bs1' },
  { text: 'Teaching AI agents to write tests.', source: 'bs2' },
  { text: 'Running a news bot on a Raspberry Pi.', source: 'bs3' },
  { text: 'Pre-ordering a live album on CD.', source: 'bs4' },
]

test('validate links each update to its source and enforces the rules', () => {
  const items = validate(good, sources, 5)
  assert.equal(items[0].text, 'Rebuilding a personal website from scratch.')
  assert.equal(items[0].url, 'https://github.com/j4ckxyz/site')
  assert.equal(items[1].url, 'https://bsky.app/profile/j4ck.xyz/post/a')
  assert.equal(validate(good.slice(0, 3), sources, 5).length, 3) // thin week: fewer, not filler
  assert.throws(() => validate(good.slice(0, 2), sources, 5), /expected 3 to 5/)
  assert.throws(() => validate([...good, good[0]], sources, 5), /expected 3 to 5/)
  assert.throws(() => validate([...good.slice(0, 4), { text: 'Something else entirely here.', source: 'bs1' }], sources, 5), /two updates from source/)
  assert.throws(() => validate([...good.slice(0, 4), { text: 'Something else entirely here.', source: 'bs9' }], sources, 5), /unknown source/)
  assert.throws(() => validate([...good.slice(0, 4), { text: 'Chatting with @someone about stuff.', source: 'bs4' }], sources, 5), /handle/)
})

test('quiet weeks get fewer updates', () => {
  assert.equal(countFor(sources), 5)
  assert.equal(countFor(sources.slice(0, 3)), 3)
})

test('parseReply tolerates fences and surrounding prose', () => {
  assert.deepEqual(parseReply('```json\n{"updates":[]}\n```'), { updates: [] })
  assert.deepEqual(parseReply('Here you go: {"updates":[]} done'), { updates: [] })
  assert.deepEqual(parseReply([{ type: 'text', text: '{"updates":[]}' }]), { updates: [] })
  assert.throws(() => parseReply(''), /empty/)
})

const reply = (content, finish = 'stop') => ({ choices: [{ message: { content }, finish_reason: finish }] })
const quiet = { warn() {} }

test('generate retries an empty reply (the Week 46 failure) and then succeeds', async () => {
  const bodies = []
  const responses = [reply('', 'length'), reply(JSON.stringify({ updates: good }))]
  const items = await generate({
    sources, rangeText: '2 Nov – 8 Nov 2026', apiKey: 'k', log: quiet,
    getJson: async (_url, init) => { bodies.push(JSON.parse(init.body)); return responses.shift() },
  })
  assert.equal(items.length, 5)
  assert.equal(bodies.length, 2)
  assert.deepEqual(bodies[1].reasoning, { enabled: false })
})

test('generate rejects a near-duplicate of last week and gives up after the attempts', async () => {
  const previous = good.map((g) => ({ text: g.text, url: null }))
  let calls = 0
  await assert.rejects(
    generate({ sources, rangeText: 'x', previous, apiKey: 'k', log: quiet, attempts: 3, getJson: async () => { calls++; return reply(JSON.stringify({ updates: good })) } }),
    /near-duplicate/,
  )
  assert.equal(calls, 3)
})

test('generate passes last week to the model so it can avoid repeating it', async () => {
  let sent
  await generate({
    sources, rangeText: 'x', apiKey: 'k', log: quiet,
    previous: [{ text: 'Porting a feed algorithm to Bluesky.', url: null }],
    getJson: async (_u, init) => { sent = JSON.parse(init.body); return reply(JSON.stringify({ updates: good })) },
  })
  assert.match(sent.messages[1].content, /Last week's updates[\s\S]*Porting a feed algorithm to Bluesky\./)
})

test('sources last week already cited are labelled', () => {
  const prompt = userPrompt({ rangeText: 'x', sources, previous: [{ text: 'Old.', url: 'https://bsky.app/profile/j4ck.xyz/post/b' }] })
  assert.match(prompt, /\[bs2\] \(covered last week\) Bluesky post/)
  assert.doesNotMatch(prompt, /\[bs1\] \(covered/)
})

test('after a near-duplicate, the retry tells the model which lines were too close', async () => {
  const previous = good.slice(0, 3).map((g) => ({ text: g.text, url: null }))
  const fresh = [
    { text: 'Rebuilding a personal website from scratch.', source: 'gh1' },
    { text: 'Pre-ordering a live album on CD.', source: 'bs4' },
    { text: 'Sketching ideas for a new Bluesky app.', source: 'bs1' },
  ]
  const responses = [reply(JSON.stringify({ updates: good })), reply(JSON.stringify({ updates: fresh }))]
  const sent = []
  const items = await generate({
    sources, rangeText: 'x', previous, apiKey: 'k', log: quiet,
    getJson: async (_u, init) => { sent.push(JSON.parse(init.body)); return responses.shift() },
  })
  assert.equal(items.length, 3)
  const retry = sent[1].messages
  assert.equal(retry.at(-2).role, 'assistant')
  assert.match(retry.at(-1).content, /Too close to last week:[\s\S]*Learning a new song on guitar/)
})
