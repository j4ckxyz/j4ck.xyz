// Week maths for the weekly Now update.
//
// One definition everywhere: a week is an ISO-8601 week, Monday 00:00 to
// Sunday 24:00 in Europe/London (so it follows BST/GMT). An entry's `week`
// field is that Monday as YYYY-MM-DD. Activity is included only if its
// timestamp falls in [start, end).

export const TZ = 'Europe/London'
const DAY = 86_400_000

const ymdUtc = (d) => d.toISOString().slice(0, 10)
const parseYmd = (ymd) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) throw new Error(`not a YYYY-MM-DD date: ${ymd}`)
  return new Date(`${ymd}T00:00:00Z`)
}

export const addDays = (ymd, n) => ymdUtc(new Date(parseYmd(ymd).getTime() + n * DAY))

// Calendar date in London for an instant.
export function londonDate(instant) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(instant)
}

// London's UTC offset (ms) at an instant: +1h in BST, 0 in GMT.
function londonOffset(instant) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: TZ, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).formatToParts(instant)
  const get = (t) => Number(parts.find((p) => p.type === t).value)
  const wall = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'))
  return wall - Math.floor(instant.getTime() / 1000) * 1000
}

// The instant London's clocks read 00:00 on this date. (UK clocks change at
// 01:00 GMT, so local midnight always exists and is unique.)
export function londonMidnight(ymd) {
  const wall = parseYmd(ymd).getTime()
  let t = wall - londonOffset(new Date(wall))
  t = wall - londonOffset(new Date(t))
  return new Date(t)
}

export function mondayOf(ymd) {
  const d = parseYmd(ymd)
  return addDays(ymd, -((d.getUTCDay() + 6) % 7))
}

// ISO-8601 week number and week-year for a YYYY-MM-DD date.
export function isoWeek(ymd) {
  const d = parseYmd(ymd)
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7) + 3) // Thursday of that week
  const year = d.getUTCFullYear()
  const firstThursday = new Date(Date.UTC(year, 0, 4))
  firstThursday.setUTCDate(firstThursday.getUTCDate() - ((firstThursday.getUTCDay() + 6) % 7) + 3)
  return { year, week: 1 + Math.round((d - firstThursday) / (7 * DAY)) }
}

export const weekId = (ymd) => {
  const { year, week } = isoWeek(ymd)
  return `${year}-w${String(week).padStart(2, '0')}`
}

export function mondayOfIsoWeek(year, week) {
  const jan4 = `${year}-01-04`
  const monday = addDays(mondayOf(jan4), (week - 1) * 7)
  if (isoWeek(monday).year !== year) throw new Error(`${year} has no ISO week ${week}`)
  return monday
}

// "2026-W45", "2026-w45" or any date in the week -> that week's Monday.
export function parseWeek(arg) {
  const m = /^(\d{4})-?w(\d{1,2})$/i.exec(String(arg).trim())
  if (m) return mondayOfIsoWeek(Number(m[1]), Number(m[2]))
  return mondayOf(String(arg).trim())
}

export function weekBounds(anyDayYmd) {
  const monday = mondayOf(anyDayYmd)
  const sunday = addDays(monday, 6)
  return { monday, sunday, start: londonMidnight(monday), end: londonMidnight(addDays(monday, 7)) }
}

export const inWeek = (instant, { start, end }) => {
  const t = instant instanceof Date ? instant.getTime() : Date.parse(instant)
  return Number.isFinite(t) && t >= start.getTime() && t < end.getTime()
}

// The most recent week that has fully ended in London at `now`.
export const lastCompleteWeek = (now = new Date()) => mondayOf(addDays(londonDate(now), -7))

// "2 Nov – 8 Nov"
export function weekRange(ymd) {
  const monday = mondayOf(ymd)
  const fmt = (d) => parseYmd(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' })
  return `${fmt(monday)} – ${fmt(addDays(monday, 6))}`
}

// Mondays from `from` to `to` inclusive, oldest first.
export function weeksBetween(from, to) {
  const out = []
  for (let w = mondayOf(from); w <= mondayOf(to); w = addDays(w, 7)) out.push(w)
  return out
}
