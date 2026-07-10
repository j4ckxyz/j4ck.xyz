import { Link } from 'react-router-dom'
import { useData } from '../context/DataContext'
import SEO from '../components/SEO'

const BLUESKY = 'https://bsky.app/profile/j4ck.xyz'
const GITHUB = 'https://github.com/j4ckxyz'
const GRAIN = 'https://grain.social/profile/did:plc:4hawmtgzjx3vclfyphbhfn7v'
const EMAIL = 'mailto:jack@jglypt.net'

// External link with an understated arrow that warms to red on hover
const Out = ({ href, children }) => (
    <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="group inline-flex items-center gap-1.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
    >
        {children}
        <span className="text-[var(--text-faint)] transition-colors group-hover:text-[var(--accent-red)]" aria-hidden="true">↗</span>
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
    const { photos, loadingPhotos } = useData()
    const photoStrip = (photos || []).slice(0, 6)

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
                <div className="mt-8 flex flex-wrap items-center gap-x-7 gap-y-3 text-[15px]">
                    <Out href={BLUESKY}>bluesky</Out>
                    <Out href={GITHUB}>github</Out>
                    <Out href={GRAIN}>photos</Out>
                    <Link to="/blogs" className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">writing</Link>
                    <Out href={EMAIL}>email</Out>
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
                <p className="max-w-[55ch] text-[var(--text-secondary)]">
                    Notes and essays, published on the open web via Leaflet.
                </p>
            </Section>

            {/* Code */}
            <Section label="code" cta="all repos" to="/repos">
                <p className="max-w-[55ch] text-[var(--text-secondary)]">
                    Open-source experiments and small tools, mostly built around the AT Protocol.
                </p>
                <div className="mt-5">
                    <Out href={GITHUB}>github.com/j4ckxyz</Out>
                </div>
            </Section>
        </div>
    )
}

export default Home
