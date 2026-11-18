import { test } from 'node:test'
import assert from 'node:assert/strict'
import { inWeek, isoWeek, lastCompleteWeek, londonMidnight, mondayOf, parseWeek, weekBounds, weekId, weekRange, weeksBetween } from '../week.mjs'

test('a week is Monday 00:00 to next Monday 00:00, London time (GMT)', () => {
  const b = weekBounds('2026-11-04')
  assert.equal(b.monday, '2026-11-02')
  assert.equal(b.sunday, '2026-11-08')
  assert.equal(b.start.toISOString(), '2026-11-02T00:00:00.000Z')
  assert.equal(b.end.toISOString(), '2026-11-09T00:00:00.000Z')
})

test('week bounds follow BST', () => {
  const b = weekBounds('2026-07-15')
  assert.equal(b.start.toISOString(), '2026-07-12T23:00:00.000Z') // Mon 13 Jul 00:00 BST
  assert.equal(b.end.toISOString(), '2026-07-19T23:00:00.000Z')
})

test('weeks containing a clock change are 167 or 169 hours long', () => {
  const spring = weekBounds('2026-03-23') // clocks go forward Sun 29 Mar
  assert.equal(spring.start.toISOString(), '2026-03-23T00:00:00.000Z')
  assert.equal(spring.end.toISOString(), '2026-03-29T23:00:00.000Z')
  const autumn = weekBounds('2026-10-19') // clocks go back Sun 25 Oct
  assert.equal(autumn.start.toISOString(), '2026-10-18T23:00:00.000Z')
  assert.equal(autumn.end.toISOString(), '2026-10-26T00:00:00.000Z')
  assert.equal(londonMidnight('2026-10-25').toISOString(), '2026-10-24T23:00:00.000Z')
})

test('cutoff: start is inclusive, end is exclusive, nothing leaks across weeks', () => {
  const w45 = weekBounds('2026-11-02')
  assert.equal(inWeek('2026-11-02T00:00:00.000Z', w45), true)
  assert.equal(inWeek('2026-11-08T23:59:59.999Z', w45), true)
  assert.equal(inWeek('2026-11-09T00:00:00.000Z', w45), false)
  assert.equal(inWeek('2026-11-01T23:59:59.999Z', w45), false)
  // The old bug: a run on Fri 6 Nov treated 30 Oct–5 Nov as one week.
  assert.equal(inWeek('2026-10-30T12:00:00Z', w45), false)
  assert.equal(inWeek('2026-11-05T12:00:00Z', weekBounds('2026-10-26')), false)
  // Summer: 23:30 UTC on a Sunday is already Monday in London.
  const july = weekBounds('2026-07-13')
  assert.equal(inWeek('2026-07-19T22:59:59Z', july), true)
  assert.equal(inWeek('2026-07-19T23:30:00Z', july), false)
  assert.equal(inWeek('2026-07-19T23:30:00Z', weekBounds('2026-07-20')), true)
  assert.equal(inWeek('not a date', july), false)
  assert.equal(inWeek(undefined, july), false)
})

test('consecutive weeks touch but never overlap', () => {
  const weeks = weeksBetween('2025-01-01', '2026-12-31').map(weekBounds)
  for (let i = 1; i < weeks.length; i++) assert.equal(weeks[i].start.getTime(), weeks[i - 1].end.getTime())
})

test('lastCompleteWeek picks the week that has fully ended in London', () => {
  assert.equal(lastCompleteWeek(new Date('2026-11-16T08:00:00Z')), '2026-11-09') // scheduled Monday run
  assert.equal(lastCompleteWeek(new Date('2026-11-16T18:00:00Z')), '2026-11-09') // delayed run
  assert.equal(lastCompleteWeek(new Date('2026-11-06T09:41:00Z')), '2026-10-26') // manual Friday run
  assert.equal(lastCompleteWeek(new Date('2026-11-15T23:59:00Z')), '2026-11-02') // still Sunday
  assert.equal(lastCompleteWeek(new Date('2026-07-19T23:30:00Z')), '2026-07-13') // Monday 00:30 BST
})

test('ISO week numbers and parsing', () => {
  assert.deepEqual(isoWeek('2026-10-26'), { year: 2026, week: 44 })
  assert.deepEqual(isoWeek('2026-11-02'), { year: 2026, week: 45 })
  assert.deepEqual(isoWeek('2024-12-30'), { year: 2025, week: 1 })
  assert.deepEqual(isoWeek('2027-01-03'), { year: 2026, week: 53 })
  assert.equal(weekId('2026-10-30'), '2026-w44')
  assert.equal(parseWeek('2026-W45'), '2026-11-02')
  assert.equal(parseWeek('2026-w01'), '2025-12-29')
  assert.equal(parseWeek('2026-11-08'), '2026-11-02')
  assert.equal(mondayOf('2026-11-02'), '2026-11-02')
  assert.throws(() => parseWeek('2025-W53'))
})

test('weekRange always shows Monday to Sunday', () => {
  assert.equal(weekRange('2026-10-26'), '26 Oct – 1 Nov')
  assert.equal(weekRange('2026-10-30'), '26 Oct – 1 Nov') // an old mid-week key renders as its ISO week
  assert.equal(weekRange('2026-11-02'), '2 Nov – 8 Nov')
})
