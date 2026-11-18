# j4ck.xyz

My personal site. Static HTML styled with Tailwind, built with Vite. No JS framework.

- `index.html`: the whole site on one page, with `#projects` and `#now` sections
- `projects.html`, `now.html`: share-card pages. Link previews read their Open Graph tags; visitors are sent on to `/#projects` and `/#now`
- `weeks.html`: `/weeks`, every past Now update grouped by year and ISO week number (each week linkable, e.g. `/weeks#2026-w44`)
- `404.html`: not-found page
- `scripts/render.mjs`: build-time partials (head/meta, nav, project cards, Now) filled in by `vite.config.js`
- `styles/main.css`: palette tokens for light and dark, plus components
- `data/projects.json`: the four project cards (home, /projects, OG card); everything else lives on GitHub
- `data/site.json`: facts the weekly job keeps current (age)
- `public/fonts/`: self-hosted Caprasimo and Figtree (OFL); `public/icons/`: single-colour Surf and blog marks for the link pills (used as CSS masks; Bluesky and GitHub are inline Simple Icons SVGs, CC0)
- `data/now.json`: Now updates, newest first

## Weekly update

`.github/workflows/weekly.yml` runs every Monday at 08:00 UTC (or by hand from the Actions tab), then commits what changed, which triggers a Cloudflare Pages rebuild.

1. **Now** (`scripts/update-now.mjs`, helpers in `scripts/now/`): summarises the last finished week. A week is ISO Monday 00:00 to Sunday 24:00, Europe/London, and each entry uses only public GitHub activity (commits, PRs, issues, new repos, releases) and Bluesky posts (no replies or reposts) timestamped inside that week. DeepSeek V4.1 Flash on OpenRouter writes 3 to 5 short, distinct, general-audience status lines, each linked to its source. The result is rejected if it's a near-duplicate of the previous week. Entries are keyed by their Monday in `data/now.json`, one per week. A week that already has an entry is left alone unless you pass `--force`. Needs the `OPENROUTER_API_KEY` repository secret; skipped without it.
   - Preview the input: `node scripts/update-now.mjs --dry-run` (add `--week 2026-W45` for a specific week)
   - Fill in or redo weeks: `--week 2026-W46`, `--from 2026-W01 --to 2026-W10`, `--force`; try them out without publishing with `--out /tmp/trial.json`
   - Run by hand from the Actions tab with an optional `week` input
2. **Age** (`scripts/update-age.mjs`): recomputes the age from the `BIRTHDATE` repository secret (`YYYY-MM-DD`) and writes only the number to `data/site.json`. Skipped without the secret.
3. **Images** (`scripts/update-assets.mjs`): downloads the current Bluesky profile picture and regenerates `public/avatar.png`, the favicon set and the Open Graph cards in `public/og/` (home, projects, now; the now card is shared by `/now` and `/weeks` and shows the newest week's items). Cards are rendered with satori + resvg using the vendored fonts in `scripts/og/fonts/` and the palette from `styles/main.css`. `--local` reuses the last downloaded avatar.

Image URLs in the HTML carry a content hash (`?v=…`), so a new avatar or card replaces the cached one.

## Development

```bash
npm install
npm run dev     # local server (the log page is at /now.html in dev)
npm run build   # outputs to dist/
npm test        # week cutoff, sources, model output checks and data/now.json sanity
```

## Deployment

Cloudflare Pages: build command `npm run build`, output directory `dist`, Node 22 (pinned in `.nvmrc`; the image tooling needs Node 20.9+).
`public/_redirects` sends the old `/photos`, `/blogs` and `/repos` routes to Grain, the blog and GitHub.

## License

You can fork this repo and use it for yourself as long as you remove my personal information (Jack, j4ck.xyz, etc.)
