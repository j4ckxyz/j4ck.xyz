import React, { useEffect, useMemo, useState } from 'react';
import { segmentFacets, linkFromFeatures, styleFlags } from '../utils/richtext';
import { blobUrl, blobFallbackUrl, blobCid, fetchJson, rkeyOf } from '../utils/atproto';

/* ---------------------------------------------------------------------------
   Renders `pub.leaflet.content` — the block format standard.site documents use
   for their `content` field. Block types present across the repo:
     header, text, blockquote, unorderedList (+ #listItem), image, code, bskyPost
   Anything unrecognised falls through to its `plaintext`, so a new block type
   degrades to readable text rather than a hole in the page.
--------------------------------------------------------------------------- */

const RichText = ({ plaintext, facets }) => {
    const segments = useMemo(() => segmentFacets(plaintext, facets), [plaintext, facets]);

    return segments.map((segment, i) => {
        const flags = styleFlags(segment.features);
        const href = linkFromFeatures(segment.features);

        let node = segment.text;
        if (flags.has('code')) {
            node = (
                <code className="font-mono text-[0.875em] bg-[var(--card-bg)] border border-[var(--border-color)] rounded px-1.5 py-0.5">
                    {node}
                </code>
            );
        }
        if (flags.has('bold')) node = <strong className="font-semibold text-[var(--text-primary)]">{node}</strong>;
        if (flags.has('italic')) node = <em>{node}</em>;
        if (flags.has('strikethrough')) node = <s>{node}</s>;
        if (flags.has('underline')) node = <span className="underline underline-offset-4 decoration-[var(--accent-red)]">{node}</span>;
        if (flags.has('highlight')) node = <mark className="bg-[var(--accent-red)]/20 text-[var(--text-primary)]">{node}</mark>;

        if (href) {
            node = (
                <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[var(--accent-red)] underline underline-offset-4 decoration-dotted hover:decoration-solid"
                >
                    {node}
                </a>
            );
        }

        return <React.Fragment key={i}>{node}</React.Fragment>;
    });
};

const DocImage = ({ block }) => {
    const cid = blobCid(block.image);
    const [src, setSrc] = useState(() => blobUrl(cid));
    const ratio = block.aspectRatio;

    if (!cid) return null;

    return (
        <figure className="my-8">
            <img
                src={src}
                alt={block.alt || ''}
                width={ratio?.width}
                height={ratio?.height}
                loading="lazy"
                decoding="async"
                onError={() => {
                    // CDN misses blobs it hasn't mirrored; the PDS always has the original.
                    const fallback = blobFallbackUrl(cid);
                    if (fallback && src !== fallback) setSrc(fallback);
                }}
                className="w-full h-auto rounded-xl border border-[var(--border-color)] bg-[var(--card-bg)]"
                style={ratio ? { aspectRatio: `${ratio.width} / ${ratio.height}` } : undefined}
            />
            {block.alt && (
                <figcaption className="mt-2 text-xs text-[var(--text-muted)] font-mono">{block.alt}</figcaption>
            )}
        </figure>
    );
};

const BskyPost = ({ post }) => {
    if (!post) {
        return (
            <div className="my-6 rounded-xl border border-dashed border-[var(--border-color)] p-4 text-xs font-mono text-[var(--text-muted)]">
                embedded post unavailable
            </div>
        );
    }

    const url = `https://bsky.app/profile/${post.author.handle}/post/${rkeyOf(post.uri)}`;
    const images =
        post.embed?.$type === 'app.bsky.embed.images#view'
            ? post.embed.images
            : post.embed?.media?.$type === 'app.bsky.embed.images#view'
              ? post.embed.media.images
              : [];

    return (
        <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="my-6 block rounded-xl border border-[var(--border-color)] bg-[var(--card-bg)] p-4 transition-colors hover:border-[var(--accent-red)]"
        >
            <div className="flex items-center gap-2.5">
                {post.author.avatar && (
                    <img src={post.author.avatar} alt="" width="32" height="32" loading="lazy" className="h-8 w-8 rounded-full" />
                )}
                <span className="text-sm font-semibold text-[var(--text-primary)]">{post.author.displayName}</span>
                <span className="font-mono text-xs text-[var(--text-muted)]">@{post.author.handle}</span>
            </div>
            <p className="mt-3 whitespace-pre-wrap text-[0.95rem] leading-relaxed text-[var(--text-secondary)]">
                {post.record?.text}
            </p>
            {images.length > 0 && (
                <div className={`mt-3 grid gap-2 ${images.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                    {images.map((img) => (
                        <img
                            key={img.thumb}
                            src={img.thumb}
                            alt={img.alt || ''}
                            loading="lazy"
                            decoding="async"
                            className="w-full rounded-lg border border-[var(--border-color)] object-cover"
                        />
                    ))}
                </div>
            )}
        </a>
    );
};

const listItemsOf = (block) => block.children || [];

const Block = ({ block, posts }) => {
    switch (block?.$type) {
        case 'pub.leaflet.blocks.header': {
            const Tag = `h${Math.min(Math.max(block.level ?? 2, 2), 6)}`;
            const size = block.level <= 2 ? 'text-2xl md:text-3xl' : block.level === 3 ? 'text-xl md:text-2xl' : 'text-lg';
            return (
                <Tag className={`font-display font-bold text-[var(--text-primary)] mt-12 mb-4 first:mt-0 ${size}`}>
                    <RichText plaintext={block.plaintext} facets={block.facets} />
                </Tag>
            );
        }

        case 'pub.leaflet.blocks.text': {
            // Leaflet uses empty text blocks as spacers; skip rather than render a gap.
            if (!block.plaintext?.trim()) return null;
            return (
                <p className="prose-text my-5 text-[var(--text-secondary)]">
                    <RichText plaintext={block.plaintext} facets={block.facets} />
                </p>
            );
        }

        case 'pub.leaflet.blocks.blockquote':
            return (
                <blockquote className="my-7 border-l-2 border-[var(--accent-red)] pl-5 italic text-[var(--text-bright)]">
                    <RichText plaintext={block.plaintext} facets={block.facets} />
                </blockquote>
            );

        case 'pub.leaflet.blocks.unorderedList':
            return (
                <ul className="my-5 list-disc space-y-2 pl-6 marker:text-[var(--accent-red)]">
                    {listItemsOf(block).map((item, i) => (
                        <li key={i} className="prose-text text-[var(--text-secondary)]">
                            <Block block={item.content} posts={posts} />
                            {item.children?.length > 0 && (
                                <ul className="mt-2 list-[circle] space-y-2 pl-6 marker:text-[var(--text-faint)]">
                                    {item.children.map((child, j) => (
                                        <li key={j} className="prose-text text-[var(--text-secondary)]">
                                            <Block block={child.content} posts={posts} />
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </li>
                    ))}
                </ul>
            );

        case 'pub.leaflet.blocks.orderedList':
            return (
                <ol className="my-5 list-decimal space-y-2 pl-6 marker:text-[var(--accent-red)]">
                    {listItemsOf(block).map((item, i) => (
                        <li key={i} className="prose-text text-[var(--text-secondary)]">
                            <Block block={item.content} posts={posts} />
                        </li>
                    ))}
                </ol>
            );

        case 'pub.leaflet.blocks.image':
            return <DocImage block={block} />;

        case 'pub.leaflet.blocks.code':
            return (
                <pre className="my-7 overflow-x-auto rounded-xl border border-[var(--border-color)] bg-[var(--card-bg)] p-4">
                    <code className="font-mono text-[0.8125rem] leading-relaxed text-[var(--text-bright)]">
                        {block.plaintext}
                    </code>
                </pre>
            );

        case 'pub.leaflet.blocks.horizontalRule':
            return <hr className="my-10 border-t border-[var(--border-color)]" />;

        case 'pub.leaflet.blocks.bskyPost':
            return <BskyPost post={posts[block.postRef?.uri]} />;

        case 'pub.leaflet.blocks.website':
            return (
                <a
                    href={block.src}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="my-6 block rounded-xl border border-[var(--border-color)] bg-[var(--card-bg)] p-4 font-mono text-sm text-[var(--accent-red)] transition-colors hover:border-[var(--accent-red)]"
                >
                    {block.description || block.src}
                </a>
            );

        default:
            // Unknown block: show its text if it has any, otherwise stay out of the way.
            return block?.plaintext ? (
                <p className="prose-text my-5 text-[var(--text-secondary)]">
                    <RichText plaintext={block.plaintext} facets={block.facets} />
                </p>
            ) : null;
    }
};

/** Every `at://` post URI referenced by a bskyPost block, in document order. */
function collectPostRefs(content) {
    const uris = [];
    const walk = (node) => {
        if (Array.isArray(node)) return node.forEach(walk);
        if (!node || typeof node !== 'object') return;
        if (node.$type === 'pub.leaflet.blocks.bskyPost' && node.postRef?.uri) uris.push(node.postRef.uri);
        Object.values(node).forEach(walk);
    };
    walk(content);
    return [...new Set(uris)];
}

const LeafletContent = ({ content, textContent }) => {
    const [posts, setPosts] = useState({});
    const refs = useMemo(() => collectPostRefs(content), [content]);

    useEffect(() => {
        if (refs.length === 0) return;
        let cancelled = false;

        // One batched call per 25 URIs, all in flight together.
        const chunks = [];
        for (let i = 0; i < refs.length; i += 25) chunks.push(refs.slice(i, i + 25));

        Promise.allSettled(
            chunks.map((chunk) => {
                const params = chunk.map((uri) => `uris=${encodeURIComponent(uri)}`).join('&');
                return fetchJson(`https://public.api.bsky.app/xrpc/app.bsky.feed.getPosts?${params}`, { timeout: 6000 });
            })
        ).then((results) => {
            if (cancelled) return;
            const byUri = {};
            for (const result of results) {
                if (result.status !== 'fulfilled') continue;
                for (const post of result.value.posts || []) byUri[post.uri] = post;
            }
            setPosts(byUri);
        });

        return () => {
            cancelled = true;
        };
    }, [refs]);

    const pages = content?.pages || [];
    const blocks = pages.flatMap((page) => page.blocks || []);

    if (blocks.length === 0) {
        // Content in a format we don't render (the field is an open union) —
        // standard.site's plain-text mirror is the graceful degradation.
        return textContent ? (
            <div className="prose-text whitespace-pre-wrap text-[var(--text-secondary)]">{textContent}</div>
        ) : null;
    }

    return (
        <div>
            {blocks.map((entry, i) => (
                <Block key={i} block={entry.block ?? entry} posts={posts} />
            ))}
        </div>
    );
};

export default LeafletContent;
