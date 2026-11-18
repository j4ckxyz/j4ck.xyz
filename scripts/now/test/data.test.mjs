// Checks the published data itself: one entry per ISO week, keyed by its
// Monday, newest first, and no week a near-duplicate of the week before.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { NOW_FILE } from '../../render.mjs'
import { addDays, mondayOf } from '../week.mjs'
import { compareWeeks } from '../similarity.mjs'

const { entries } = JSON.parse(readFileSync(NOW_FILE, 'utf8'))

test('entries are keyed by Monday, unique and newest first', () => {
  const weeks = entries.map((e) => e.week)
  for (const w of weeks) assert.equal(mondayOf(w), w, `${w} is not a Monday`)
  assert.equal(new Set(weeks).size, weeks.length, 'duplicate week')
  assert.deepEqual(weeks, [...weeks].sort().reverse(), 'not newest first')
})

test('each entry has 3–5 linked items', () => {
  for (const e of entries) {
    assert.ok(e.items.length >= 3 && e.items.length <= 5, `${e.week}: ${e.items.length} items`)
    for (const i of e.items) assert.match(i.text, /^\S.*[.!?]$/, `${e.week}: "${i.text}"`)
  }
})

test('no week is a near-duplicate of the week before', () => {
  for (const e of entries) {
    const prev = entries.find((p) => p.week === addDays(e.week, -7))
    if (!prev) continue
    const r = compareWeeks(e.items, prev.items)
    assert.equal(r.nearDuplicate, false, `${e.week} repeats ${prev.week}: ${JSON.stringify(r.matches, null, 1)}`)
  }
})
