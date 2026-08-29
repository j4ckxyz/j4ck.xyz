import React, { useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useData } from '../context/DataContext';
import SEO from '../components/SEO';
import LeafletContent from '../components/LeafletContent';
import { rkeyOf } from '../utils/atproto';

/**
 * The post body is rendered inline from the `site.standard.document` record in
 * the repo. Everything social about the post — comments, subscriptions,
 * replies — lives on the publication itself and on Bluesky, so both get a
 * standing invitation rather than being hidden behind a bare "read more".
 */
const OpenBanner = ({ post, variant }) => {
    if (!post.canonicalUrl && !post.bskyPostRef) return null;

    const bskyUrl = post.bskyPostRef?.uri
        ? `https://bsky.app/profile/j4ck.xyz/post/${rkeyOf(post.bskyPostRef.uri)}`
        : null;

    if (variant === 'inline') {
        return (
            <div className="mt-8 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-[var(--border-color)] bg-[var(--card-bg)] px-4 py-3 font-mono text-xs text-[var(--text-muted)]">
                <span className="text-[var(--accent-red)]">↳</span>
                <span>Reading a mirror of this post.</span>
                {post.canonicalUrl && (
                    <a
                        href={post.canonicalUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[var(--text-primary)] underline decoration-dotted underline-offset-4 hover:text-[var(--accent-red)]"
                    >
                        Open on {post.publicationName || 'the blog'} ↗
                    </a>
                )}
            </div>
        );
    }

    return (
        <aside className="mt-16 rounded-2xl border border-[var(--border-color)] bg-[var(--card-bg)] p-6">
            <h2 className="font-mono text-xs uppercase tracking-[0.25em] text-[var(--accent-red)]">Join in</h2>
            <p className="prose-text mt-3 max-w-[52ch] text-[var(--text-secondary)]">
                {post.showComments
                    ? 'Comments, reactions and subscriptions live on the publication — this page is just the reading copy.'
                    : 'This page is the reading copy. The published version lives on the blog.'}
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
                {post.canonicalUrl && (
                    <a
                        href={post.canonicalUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-[var(--accent-red)] px-5 font-mono text-sm text-white transition-colors hover:bg-[var(--accent-red-bright)]"
                    >
                        {post.showComments ? 'Read & comment' : 'Read on the blog'} ↗
                    </a>
                )}
                {bskyUrl && (
                    <a
                        href={bskyUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-[var(--border-color)] px-5 font-mono text-sm text-[var(--text-secondary)] transition-colors hover:border-[var(--accent-red)] hover:text-[var(--text-primary)]"
                    >
                        Discuss on Bluesky ↗
                    </a>
                )}
            </div>
        </aside>
    );
};

const BlogPost = () => {
    const { rkey } = useParams();
    const { blogs, loadingBlogs } = useData();
    const post = blogs.find((p) => p.rkey === rkey);

    useEffect(() => {
        window.scrollTo(0, 0);
    }, [rkey]);

    if (!post) {
        return (
            <div className="w-full py-16 text-center">
                {loadingBlogs ? (
                    <div className="animate-pulse font-mono text-[var(--accent-red)]">Loading post…</div>
                ) : (
                    <>
                        <p className="font-mono text-[var(--text-muted)]">No post with that key.</p>
                        <Link to="/blogs" className="mt-4 inline-block font-mono text-sm text-[var(--accent-red)] hover:underline">
                            ← back to /writing
                        </Link>
                    </>
                )}
            </div>
        );
    }

    return (
        <article className="w-full max-w-[var(--measure)] mx-auto">
            <SEO
                title={post.title}
                description={post.description || ''}
                image="blogs.png"
                path={`/blogs/${post.rkey}`}
            />

            <Link
                to="/blogs"
                className="inline-block font-mono text-xs uppercase tracking-[0.25em] text-[var(--text-muted)] transition-colors hover:text-[var(--accent-red)]"
            >
                ← /writing
            </Link>

            <header className="mt-6">
                <h1 className="font-display text-[length:var(--text-h1)] font-extrabold leading-tight tracking-tight text-[var(--text-primary)]">
                    {post.title}
                </h1>
                {post.description && (
                    <p className="prose-text mt-4 text-[var(--text-muted)]">{post.description}</p>
                )}
                <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-2 font-mono text-xs text-[var(--text-muted)]">
                    <time dateTime={post.publishedAt}>
                        {new Date(post.publishedAt).toLocaleDateString(undefined, {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                        })}
                    </time>
                    {post.tags.map((tag) => (
                        <span key={tag} className="rounded-full border border-[var(--border-color)] px-2 py-0.5">
                            {tag}
                        </span>
                    ))}
                </div>
                <OpenBanner post={post} variant="inline" />
            </header>

            <div className="mt-10 border-t border-[var(--border-color)] pt-10">
                <LeafletContent content={post.content} textContent={post.textContent} />
            </div>

            <OpenBanner post={post} variant="footer" />
        </article>
    );
};

export default BlogPost;
