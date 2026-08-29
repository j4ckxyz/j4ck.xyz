import { Link } from 'react-router-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faGithub, faBluesky } from '@fortawesome/free-brands-svg-icons'
import { faCamera, faEnvelope, faStar } from '@fortawesome/free-solid-svg-icons'
import { useData } from '../context/DataContext'
import SEO from '../components/SEO'

const BLUESKY = 'https://bsky.app/profile/j4ck.xyz'
const GITHUB = 'https://github.com/j4ckxyz'
const GRAIN = 'https://grain.social/profile/did:plc:4hawmtgzjx3vclfyphbhfn7v'
const EMAIL = 'mailto:jack@jglypt.net'

// Circular icon button — used only for the hero's *external* profile links.
// Internal destinations (photos, writing, code) live in the top nav and in
// each section's own CTA below; keeping them out of here is what stops the
// hero from just repeating the page around it.
const IconLink = ({ href, label, icon }) => (
    <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={label}
        title={label}
        className="group inline-flex h-11 w-11 items-center justify-center rounded-full border border-[var(--border-color)] text-[var(--text-secondary)] transition-colors hover:border-[var(--accent-red)] hover:text-[var(--accent-red)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--accent-red)]"
    >
        <FontAwesomeIcon icon={icon} className="text-[17px]" />
    </a>
)

// Section scaffold: hairline divider, small mono red label, optional CTA
const Section = ({ label, cta, to, children }) => (
    <section className="border-t border-[var(--border-color)] mt-16 pt-8 md:mt-20">
        <div className="flex items-baseline justify-between mb-7">
            <h2 className="font-mono text-xs uppercase tracking-[0.25em] text-[var(--accent-red)]">{label}</h2>
            {cta && (
                <Link to={to} className="text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
                    {cta} →
                </Link>
            )}
        </div>
        {children}
    </section>
)

function Home() {
    // repos/loadingRepos come from DataContext — shared with Repos.jsx so the
    // page doesn't spend a second, uncached GitHub API call on every visit.
    const { photos, loadingPhotos, blogs, loadingBlogs, repos, loadingRepos } = useData()
    const photoStrip = (photos || []).slice(0, 6)
    const latestPosts = (blogs || []).slice(0, 3)
    const repoPreview = (repos || []).slice(0, 3)

    return (
        <div className="w-full max-w-[1100px] mx-auto px-1 pb-8">
            <SEO
                title="Home"
                description="jack — creative developer & photographer on the open social web."
                image="home.png"
                path="/"
            />

            {/* Hero */}
            <section className="pt-10 md:pt-20">
                <h1 className="font-display font-extrabold tracking-[-0.03em] leading-[0.92] text-[var(--text-primary)] text-[clamp(3.5rem,13vw,9rem)]">
                    j4ck<span className="text-[var(--accent-red)]">.xyz</span>
                </h1>
                <p className="mt-6 max-w-[46ch] text-lg md:text-xl leading-relaxed text-[var(--text-secondary)]">
                    creative developer &amp; photographer, building on the open social web.
                </p>
                <div className="mt-8 flex items-center gap-3">
                    <IconLink href={BLUESKY} label="Bluesky" icon={faBluesky} />
                    <IconLink href={GITHUB} label="GitHub" icon={faGithub} />
                    <IconLink href={GRAIN} label="Grain (photos)" icon={faCamera} />
                    <IconLink href={EMAIL} label="Email" icon={faEnvelope} />
                </div>
            </section>

            {/* Photos */}
            <Section label="photography" cta="all photos" to="/photos">
                {photoStrip.length > 0 ? (
                    <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                        {photoStrip.map((photo) => (
                            <a
                                key={photo.id}
                                href={photo.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="group relative block aspect-square overflow-hidden rounded-sm bg-[var(--card-bg)]"
                            >
                                <img
                                    src={photo.image.thumb}
                                    alt={photo.image.alt || ''}
                                    loading="lazy"
                                    decoding="async"
                                    className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.04] group-hover:opacity-90"
                                />
                            </a>
                        ))}
                    </div>
                ) : (
                    <p className="text-[var(--text-muted)]">{loadingPhotos ? 'Loading photos…' : 'No photos yet.'}</p>
                )}
            </Section>

            {/* Writing */}
            <Section label="writing" cta="all writing" to="/blogs">
                {latestPosts.length > 0 ? (
                    <ul className="divide-y divide-[var(--border-color)] border-t border-[var(--border-color)]">
                        {latestPosts.map((post) => (
                            <li key={post.uri}>
                                <Link
                                    to={`/blogs/${post.rkey}`}
                                    className="group flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 py-4"
                                >
                                    <span className="max-w-[46ch] text-[var(--text-secondary)] transition-colors group-hover:text-[var(--text-primary)]">
                                        {post.title}
                                    </span>
                                    <span className="font-mono text-xs text-[var(--text-muted)]">
                                        {new Date(post.publishedAt).toLocaleDateString(undefined, {
                                            year: 'numeric',
                                            month: 'short',
                                        })}
                                    </span>
                                </Link>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className="max-w-[55ch] text-[var(--text-secondary)]">
                        {loadingBlogs ? 'Loading posts…' : 'Notes and essays, published to the open web.'}
                    </p>
                )}
            </Section>

            {/* Code */}
            <Section label="code" cta="all repos" to="/repos">
                {repoPreview.length > 0 ? (
                    <ul className="divide-y divide-[var(--border-color)] border-t border-[var(--border-color)]">
                        {repoPreview.map((repo) => (
                            <li key={repo.id}>
                                <a
                                    href={repo.html_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="group flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 py-4"
                                >
                                    <span className="max-w-[46ch] font-mono text-[var(--text-secondary)] transition-colors group-hover:text-[var(--text-primary)]">
                                        {repo.name}
                                    </span>
                                    <span className="flex items-center gap-3 font-mono text-xs text-[var(--text-muted)]">
                                        {repo.language && <span>{repo.language}</span>}
                                        {repo.stargazers_count > 0 && (
                                            <span className="inline-flex items-center gap-1">
                                                <FontAwesomeIcon icon={faStar} className="text-[10px]" />
                                                {repo.stargazers_count}
                                            </span>
                                        )}
                                    </span>
                                </a>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className="max-w-[55ch] text-[var(--text-secondary)]">
                        {loadingRepos ? 'Loading repos…' : 'Open-source experiments, mostly built around the AT Protocol.'}
                    </p>
                )}
            </Section>
        </div>
    )
}

export default Home
