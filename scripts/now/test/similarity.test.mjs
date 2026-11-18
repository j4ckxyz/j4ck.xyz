import { test } from 'node:test'
import assert from 'node:assert/strict'
import { compareWeeks } from '../similarity.mjs'

const post = (id) => `https://bsky.app/profile/j4ck.xyz/post/${id}`
const site = 'https://github.com/j4ckxyz/j4ck.xyz'

// Week 44 and Week 45 as published on 2026-11-09: the same week reworded.
const w44 = [
  { text: 'Rebuilding a personal site as a one-page static site.', url: site },
  { text: 'Listening to a new Queen live album.', url: post('3mzmv3x2g3k2q') },
  { text: 'Fixing a feed bot that kept reposting the same links.', url: post('3mzin3wk5nc2z') },
  { text: 'Making promo videos for code projects with AI.', url: post('3mzif7kvdt22q') },
  { text: 'Porting a social media recommendation algorithm to Bluesky.', url: post('3mzggvft4ss2s') },
]
const oldW45 = [
  { text: 'Rebuilding a personal site as a one-page static site.', url: site },
  { text: 'Porting a personalised feed algorithm from Twitter to Bluesky.', url: post('3mzggvft4ss2s') },
  { text: 'Debugging a news bot that kept reposting the same links.', url: post('3mzin3wk5nc2z') },
  { text: 'Listening to the Queen Budapest live album on Spotify.', url: post('3mzmv3x2g3k2q') },
  { text: 'Trying out AI-made promo videos for open-source projects.', url: post('3mzif7kvdt22q') },
]

test('flags the old Week 45 as a near-duplicate of Week 44', () => {
  const r = compareWeeks(oldW45, w44)
  assert.equal(r.nearDuplicate, true)
  assert.equal(r.matched, 5)
  assert.equal(r.sharedPosts.length, 4)
})

test('flags rewording even without shared links', () => {
  const noLinks = (items) => items.map(({ text }) => ({ text, url: null }))
  assert.equal(compareWeeks(noLinks(oldW45), noLinks(w44)).nearDuplicate, true)
})

test('one or two recurring projects are fine', () => {
  const next = [
    { text: 'Rebuilding a personal site as a one-page static site.', url: site },
    { text: 'Fixing a feed bot that kept reposting the same links.', url: post('aaa') },
    { text: 'Learning a new song on guitar.', url: post('bbb') },
    { text: 'Writing a guide to self-hosting a Bluesky server.', url: post('ccc') },
    { text: 'Teaching AI agents to review code.', url: post('ddd') },
  ]
  const r = compareWeeks(next, w44)
  assert.equal(r.matched, 2)
  assert.equal(r.nearDuplicate, false)
})

test('different weeks are not flagged', () => {
  const other = [
    { text: 'Building tools for Bluesky and the AT Protocol.', url: null },
    { text: 'Teaching AI agents new skills.', url: null },
    { text: 'Learning songs on guitar.', url: null },
  ]
  assert.equal(compareWeeks(other, w44).nearDuplicate, false)
  assert.equal(compareWeeks(other, []).nearDuplicate, false)
})
