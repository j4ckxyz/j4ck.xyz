import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import { useData } from '../context/DataContext';
import SEO from '../components/SEO';
import TwemojiText from '../components/TwemojiText';

// Helper to convert UTF-8 byte indices to JavaScript string indices
const byteSlice = (text, byteStart, byteEnd) => {
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    const bytes = encoder.encode(text);
    const slicedBytes = bytes.slice(byteStart, byteEnd);
    return decoder.decode(slicedBytes);
};

// Memoized PostCard component
const PostCard = React.memo(({ post, index, focusedIndex, postRef }) => {
    const relativeTime = useMemo(() => {
        const date = new Date(post.date_published);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'now';
        if (diffMins < 60) return `${diffMins}m`;
        if (diffHours < 24) return `${diffHours}h`;
        if (diffDays < 7) return `${diffDays}d`;
        
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }, [post.date_published]);

    // Format text with facets
    const formatPostText = useCallback((text, facets = []) => {
        if (!text) return null;
        if (!facets || facets.length === 0) {
            return <TwemojiText>{text}</TwemojiText>;
        }

        const encoder = new TextEncoder();
        const decoder = new TextDecoder();
        const textBytes = encoder.encode(text);

        let result = [];
        let lastByteIndex = 0;

        const sortedFacets = [...facets].sort((a, b) => a.index.byteStart - b.index.byteStart);

        sortedFacets.forEach((facet, i) => {
            const { byteStart, byteEnd } = facet.index;

            // Add text before facet
            if (byteStart > lastByteIndex) {
                const beforeBytes = textBytes.slice(lastByteIndex, byteStart);
                const beforeText = decoder.decode(beforeBytes);
                result.push(
                    <TwemojiText key={`text-${i}`}>
                        {beforeText}
                    </TwemojiText>
                );
            }

            // Extract facet text using byte indices
            const facetBytes = textBytes.slice(byteStart, byteEnd);
            const facetText = decoder.decode(facetBytes);

            if (facet.features?.[0]?.['$type'] === 'app.bsky.richtext.facet#link') {
                const uri = facet.features[0].uri;
                result.push(
                    <a
                        key={`link-${i}`}
                        href={uri}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-red-500 hover:underline"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <TwemojiText>{facetText}</TwemojiText>
                    </a>
                );
            } else if (facet.features?.[0]?.['$type'] === 'app.bsky.richtext.facet#mention') {
                result.push(
                    <span key={`mention-${i}`} className="text-blue-400">
                        <TwemojiText>{facetText}</TwemojiText>
                    </span>
                );
            } else if (facet.features?.[0]?.['$type'] === 'app.bsky.richtext.facet#tag') {
                result.push(
                    <span key={`tag-${i}`} className="text-red-400">
                        <TwemojiText>{facetText}</TwemojiText>
                    </span>
                );
            } else {
                result.push(
                    <TwemojiText key={`other-${i}`}>{facetText}</TwemojiText>
                );
            }

            lastByteIndex = byteEnd;
        });

        // Add remaining text after last facet
        if (lastByteIndex < textBytes.length) {
            const remainingBytes = textBytes.slice(lastByteIndex);
            const remainingText = decoder.decode(remainingBytes);
            result.push(
                <TwemojiText key="text-end">
                    {remainingText}
                </TwemojiText>
            );
        }

        return result;
    }, []);

    return (
        <div
            ref={postRef}
            className={`post-card bg-[#111] border ${
                focusedIndex === index ? 'border-red-500' : 'border-[#333]'
            } rounded-lg hover:border-red-500 transition-colors group overflow-hidden`}
        >
            <a
                href={post.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block"
            >
                {/* Post content and metadata */}
                <div className="p-4">
                    {/* Header with timestamp */}
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-[#555] font-mono">
                            {relativeTime}
                        </span>
                        {post.images && post.images.length > 0 && (
                            <span className="text-xs text-[#555] font-mono">📷</span>
                        )}
                    </div>

                    {/* Text content */}
                    <div className="post-content-compact text-[#ccc] text-sm leading-relaxed mb-3">
                        {formatPostText(post.text, post.facets)}
                    </div>

                    {/* Hashtags */}
                    {post.hashtags && post.hashtags.length > 0 && (
                        <div className="flex gap-2 flex-wrap mb-3">
                            {post.hashtags.slice(0, 5).map((tag) => (
                                <span
                                    key={tag}
                                    className="text-xs px-2 py-0.5 bg-[#1a1a1a] border border-[#2a2a2a] rounded text-[#777] font-mono"
                                >
                                    #{tag}
                                </span>
                            ))}
                        </div>
                    )}
                </div>

                {/* Images - cropped to fixed height */}
                {post.images && post.images.length > 0 && (
                    <div className={`grid gap-1 ${
                        post.images.length === 1 ? 'grid-cols-1' :
                        post.images.length === 2 ? 'grid-cols-2' :
                        post.images.length === 3 ? 'grid-cols-3' :
                        'grid-cols-2'
                    }`}>
                        {post.images.slice(0, 4).map((image, idx) => (
                            <div
                                key={idx}
                                className="relative overflow-hidden bg-[#0a0a0a]"
                                style={{
                                    height: post.images.length === 1 ? '320px' : '200px'
                                }}
                            >
                                <img
                                    src={image.thumb}
                                    alt={image.alt}
                                    className="w-full h-full object-cover group-hover:opacity-90 transition-opacity"
                                    loading="lazy"
                                    decoding="async"
                                />
                                {idx === 3 && post.images.length > 4 && (
                                    <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                                        <span className="text-white font-bold text-2xl">
                                            +{post.images.length - 4}
                                        </span>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </a>
        </div>
    );
});

PostCard.displayName = 'PostCard';

const Posts = () => {
    const { posts, loadingPosts, hasMorePosts, fetchMorePosts } = useData();
    const containerRef = useRef(null);
    const postRefs = useRef([]);
    const [focusedIndex, setFocusedIndex] = useState(0);

    // Keyboard navigation (j/k keys)
    useEffect(() => {
        const handleKeyPress = (e) => {
            if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;

            const postsCount = posts.length;
            if (postsCount === 0) return;

            let newIndex = focusedIndex;

            switch (e.key) {
                case 'j': // Move down
                    e.preventDefault();
                    newIndex = Math.min(focusedIndex + 1, postsCount - 1);
                    break;
                case 'k': // Move up
                    e.preventDefault();
                    newIndex = Math.max(focusedIndex - 1, 0);
                    break;
                case 'Enter': // Open focused post
                    e.preventDefault();
                    if (postRefs.current[focusedIndex]) {
                        const link = postRefs.current[focusedIndex].querySelector('a');
                        if (link) link.click();
                    }
                    return;
                default:
                    return;
            }

            setFocusedIndex(newIndex);

            // Scroll focused post into view
            if (postRefs.current[newIndex]) {
                postRefs.current[newIndex].scrollIntoView({
                    behavior: 'smooth',
                    block: 'center'
                });
            }

            // Check if we're 3 posts away from the bottom
            if (newIndex >= postsCount - 3 && hasMorePosts && !loadingPosts) {
                fetchMorePosts();
            }
        };

        window.addEventListener('keydown', handleKeyPress);
        return () => window.removeEventListener('keydown', handleKeyPress);
    }, [focusedIndex, posts.length, hasMorePosts, loadingPosts, fetchMorePosts]);

    // Add keyboard-nav class when using keyboard
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (['j', 'k'].includes(e.key)) {
                document.body.classList.add('keyboard-nav');
            }
        };
        const handleMouseDown = () => {
            document.body.classList.remove('keyboard-nav');
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('mousedown', handleMouseDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('mousedown', handleMouseDown);
        };
    }, []);

    return (
        <div className="w-full max-w-[700px] mx-auto">
            <SEO
                title="Posts"
                description="Latest posts from Bluesky."
                image="posts.png"
                path="/posts"
            />
            <h1 className="text-3xl font-bold mb-8">
                /posts <span className="text-sm font-normal text-gray-600">via <a href="https://bsky.app/profile/j4ck.xyz" target="_blank" rel="noopener noreferrer" className="hover:text-red-500 transition-colors underline decoration-dotted">Bluesky</a></span>
            </h1>

            {loadingPosts && posts.length === 0 ? (
                <div className="animate-pulse text-red-500 font-mono">Loading posts...</div>
            ) : (
                <>
                    <div ref={containerRef} className="space-y-3">
                        {posts.map((post, index) => (
                            <PostCard
                                key={post.id}
                                post={post}
                                index={index}
                                focusedIndex={focusedIndex}
                                postRef={(el) => (postRefs.current[index] = el)}
                            />
                        ))}
                    </div>

                    {/* Loading more indicator */}
                    {loadingPosts && posts.length > 0 && (
                        <div className="animate-pulse text-red-500 font-mono mt-6 text-center text-sm">
                            Loading more posts...
                        </div>
                    )}

                    {/* End of posts message */}
                    {!hasMorePosts && posts.length > 0 && (
                        <div className="text-[#555] font-mono mt-6 text-center text-xs">
                            — End of feed —
                        </div>
                    )}

                    {/* Keyboard hints */}
                    <div className="text-[#333] font-mono mt-8 text-center text-xs">
                        <span className="text-[#555]">[j/k]</span> navigate · <span className="text-[#555]">[enter]</span> open
                    </div>
                </>
            )}
        </div>
    );
};

export default Posts;
