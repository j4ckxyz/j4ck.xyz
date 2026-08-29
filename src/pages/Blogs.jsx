import React, { useRef } from 'react';
import { Link } from 'react-router-dom';
import { useData } from '../context/DataContext';
import SEO from '../components/SEO';
import useKeyboardNav from '../hooks/useKeyboardNav';

const Blogs = () => {
    const { blogs, loadingBlogs } = useData();
    const containerRef = useRef(null);
    useKeyboardNav(containerRef, 'a[href]');

    return (
        <div className="w-full">
            <SEO
                title="Writing"
                description="Longer-form posts, published to the ATmosphere with standard.site."
                image="blogs.png"
                path="/blogs"
            />

            <h1 className="text-4xl font-bold mb-3">
                /writing{' '}
                <span className="text-sm font-normal text-[var(--text-muted)]">
                    via{' '}
                    <a
                        href="https://standard.site"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline decoration-dotted transition-colors hover:text-[var(--accent-red)]"
                    >
                        standard.site
                    </a>
                </span>
            </h1>
            <p className="mb-10 max-w-[60ch] text-sm text-[var(--text-muted)]">
                Read here, or open a post on{' '}
                <a
                    href="https://blog.j4ck.xyz"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[var(--accent-red)] underline decoration-dotted underline-offset-4"
                >
                    blog.j4ck.xyz
                </a>{' '}
                to comment and subscribe.
            </p>

            {loadingBlogs && blogs.length === 0 ? (
                <div className="animate-pulse font-mono text-[var(--accent-red)]">Loading data stream...</div>
            ) : (
                <div ref={containerRef} className="grid gap-6">
                    {blogs.map((post) => (
                        <Link
                            key={post.uri}
                            to={`/blogs/${post.rkey}`}
                            className="group block rounded-xl border border-[var(--border-color)] bg-[var(--card-bg)] p-6 transition-colors hover:border-[var(--accent-red)]"
                        >
                            <h2 className="mb-2 font-mono text-2xl font-bold transition-colors group-hover:text-[var(--accent-red)]">
                                {post.title}
                            </h2>
                            {post.description && (
                                <p className="mb-4 line-clamp-2 font-sans text-[var(--text-secondary)]">{post.description}</p>
                            )}
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-2 font-mono text-xs uppercase tracking-widest text-[var(--text-muted)]">
                                <span>{new Date(post.publishedAt).toLocaleDateString()}</span>
                                {post.tags.slice(0, 3).map((tag) => (
                                    <span key={tag} className="rounded-full border border-[var(--border-color)] px-2 py-0.5 normal-case tracking-normal">
                                        {tag}
                                    </span>
                                ))}
                            </div>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
};

export default Blogs;
