#!/usr/bin/env node
// Writes Jack's current age to data/site.json from the BIRTHDATE secret
// (YYYY-MM-DD). Only the computed age is stored in the (public) repo; the
// date itself never leaves the environment and is never logged.
// Without BIRTHDATE it does nothing, so the last committed age stays.

import { readFileSync, writeFileSync } from 'node:fs'
import { SITE_FILE } from './render.mjs'

const raw = (process.env.BIRTHDATE || '').trim()
const m = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/)
if (!m) {
  console.log(raw ? 'BIRTHDATE is not in YYYY-MM-DD form; leaving age unchanged.' : 'BIRTHDATE not set; leaving age unchanged.')
  process.exit(0)
}

const [, y, mo, d] = m.map(Number)
const today = new Date()
let age = today.getUTCFullYear() - y
const hadBirthday = today.getUTCMonth() + 1 > mo || (today.getUTCMonth() + 1 === mo && today.getUTCDate() >= d)
if (!hadBirthday) age -= 1

const site = JSON.parse(readFileSync(SITE_FILE, 'utf8'))
if (site.age === age) {
  console.log('Age unchanged.')
} else {
  site.age = age
  writeFileSync(SITE_FILE, `${JSON.stringify(site, null, 2)}\n`)
  console.log('Age updated.')
}
