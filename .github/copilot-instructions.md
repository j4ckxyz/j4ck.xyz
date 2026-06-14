# Copilot Instructions — j4ck.xyz

## Design Context

> Source of truth for design/UI work. Mirrored from `.impeccable.md`.
> **2026-06-14 — DIRECTION CHANGE:** moving away from the terminal/hacker aesthetic toward a
> refined, editorial **personal landing page**. The old "refined terminal" brief is retired.

### Owner & privacy (READ FIRST)
jack's own personal site. Refer to him only as `jack` or the handle `@j4ck.xyz`. **Never display
a real/full name, email beyond an intentional contact link, location, or any personal info.**

### Users
People who land here to find jack online and see what he makes — socials, Bluesky posts,
photography (Grain/Flashes), writing (Leaflet), code (GitHub). A hub and a calling card that
should feel like a real person's well-made corner of the internet.

### Brand Personality
**Confident, editorial, personal.** Modern and self-assured without shouting. Should read as
"a designer/builder with taste made this," not "hacker terminal theme." Personality comes from
typography, composition, and one decisive red — not system chrome.

### Aesthetic Direction — editorial personal landing page, red & black, professional
- **Structure:** hero + scrolling sections home page (NOT a dashboard or uniform tile grid).
  Strong intro hero (wordmark + short bio line), then scroll sections: latest posts, photo
  strip, links, code. Sub-pages keep working as today; only the look changes.
- **Theme:** dark, near-black canvas. Black is the field, red is the gesture.
- **Color:** refine the brand red from hot neon `#ff3333` toward a deeper scarlet/crimson
  (~`oklch(55% 0.20 25)`); use it as the 10% — one or two decisive moments per view. Keep the
  existing tinted OKLCH text ramp.
- **Type:** lead with a clean, confident sans; demote monospace to small accents only
  (timestamps, tags, code) — never body or headings. Drop `font-mono` as the global default.
  Avoid AI-reflex fonts (Inter, Geist, Space Grotesk, DM Sans…); validate a characterful
  editorial display + clean body sans + mono-accent pairing by eye during the build.
- **Composition:** intentional, slightly asymmetric, generous black space, left-aligned anchors.
  Not centered-everything, not a uniform card grid.

**Anti-references (do NOT add back):** the `root@j4ck-xyz:~$` shell prompt; `SYS_STATUS` /
`CONSOLE_LINK` / `TERMINAL_ACTIVE` / `SYSTEM_ID` / "JackOS" system language in the UI; monospace
as primary type; the outlined-red `.xyz` wordmark; scramble/typewriter gimmicks; the in-card CLI
terminal hero; dashboard-style "system" tiles. Still banned: scanlines, film grain, default-UI
glitch, cursor trail, Konami/vinyl. Devtools console easter eggs may stay (opt-in, invisible).

### Carries forward (don't regress)
- **Contrast policy:** text down to `--text-muted` clears AA 4.5:1; info text uses muted+;
  `--text-faint` is ornament only.
- **Reduced motion:** keep the CSS media query + `MotionConfig reducedMotion="user"` +
  `useReducedMotion()` system intact.
- **Performance:** lazy routes, deferred `@atproto`, split vendor chunks.
- **A11y:** real `<button>`s, visible focus, alt text, contiguous heading outline.
- **Same data & routes** — this is a reskin + re-layout, not a behavior rewrite.

### Design Principles
1. Black is the canvas, red is the gesture — one or two red moments per view, the rest near-black.
2. Type carries personality, not chrome — confident sans, real scale, generous space.
3. Editorial, not dashboard — intentional, slightly asymmetric, room to breathe.
4. It's jack's space, kept light — personal but never expose personal info; handle is `@j4ck.xyz`.
5. Sleek and fast — subtle motion, quick page, keep prior perf/a11y gains.
6. Mono is seasoning — only in small accents.
