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

        // Show relative time for < 24 hours
        if (diffMins < 1) return 'now';
        if (diffMins < 60) return `${diffMins}m`;
        if (diffHours < 24) return `${diffHours}h`;
        
        // After 24 hours, show the real date with time
        const year = date.getFullYear();
        const currentYear = now.getFullYear();
        
        const timeString = date.toLocaleTimeString('en-US', { 
            hour: 'numeric', 
            minute: '2-digit',
            hour12: true 
        });
        
        if (year === currentYear) {
            const dateString = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            return `${dateString} at ${timeString}`;
        } else {
            const dateString = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
            return `${dateString} at ${timeString}`;
        }
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

                    {/* Engagement icons - Twitter 2021 style */}
                    <div className="flex gap-6 mb-3 text-xs text-[#71767b]">
                        {post.replyCount > 0 && (
                            <span className="flex items-center gap-1.5 cursor-pointer hover:text-[#1d9bf0] transition-colors">
                                <svg viewBox="0 0 24 24" className="w-[18px] h-[18px]" fill="currentColor">
                                    <path d="M1.751 10c0-4.42 3.584-8 8.005-8h4.366c4.49 0 8.129 3.64 8.129 8.13 0 2.96-1.607 5.68-4.196 7.11l-8.054 4.46v-3.69h-.067c-4.49.1-8.183-3.51-8.183-8.01zm8.005-6c-3.317 0-6.005 2.69-6.005 6 0 3.37 2.77 6.08 6.138 6.01l.351-.01h1.761v2.3l5.087-2.81c1.951-1.08 3.163-3.13 3.163-5.36 0-3.39-2.744-6.13-6.129-6.13H9.756z"/>
                                </svg>
                                <span className="font-mono">{post.replyCount}</span>
                            </span>
                        )}
                        {post.repostCount > 0 && (
                            <span className="flex items-center gap-1.5 cursor-pointer hover:text-[#00ba7c] transition-colors">
                                <svg viewBox="0 0 24 24" className="w-[18px] h-[18px]" fill="currentColor">
                                    <path d="M4.5 3.88l4.432 4.14-1.364 1.46L5.5 7.55V16c0 1.1.896 2 2 2H13v2H7.5c-2.209 0-4-1.79-4-4V7.55L1.432 9.48.068 8.02 4.5 3.88zM16.5 6H11V4h5.5c2.209 0 4 1.79 4 4v8.45l2.068-1.93 1.364 1.46-4.432 4.14-4.432-4.14 1.364-1.46 2.068 1.93V8c0-1.1-.896-2-2-2z"/>
                                </svg>
                                <span className="font-mono">{post.repostCount}</span>
                            </span>
                        )}
                        {post.likeCount > 0 && (
                            <span className="flex items-center gap-1.5 cursor-pointer hover:text-[#f91880] transition-colors">
                                <svg viewBox="0 0 24 24" className="w-[18px] h-[18px]" fill="currentColor">
                                    <path d="M16.697 5.5c-1.222-.06-2.679.51-3.89 2.16l-.805 1.09-.806-1.09C9.984 6.01 8.526 5.44 7.304 5.5c-1.243.07-2.349.78-2.91 1.91-.552 1.12-.633 2.78.479 4.82 1.074 1.97 3.257 4.27 7.129 6.61 3.87-2.34 6.052-4.64 7.126-6.61 1.111-2.04 1.03-3.7.477-4.82-.561-1.13-1.666-1.84-2.908-1.91zm4.187 7.69c-1.351 2.48-4.001 5.12-8.379 7.67l-.503.3-.504-.3c-4.379-2.55-7.029-5.19-8.382-7.67-1.36-2.5-1.41-4.86-.514-6.67.887-1.79 2.647-2.91 4.601-3.01 1.651-.09 3.368.56 4.798 2.01 1.429-1.45 3.146-2.1 4.796-2.01 1.954.1 3.714 1.22 4.601 3.01.896 1.81.846 4.17-.514 6.67z"/>
                                </svg>
                                <span className="font-mono">{post.likeCount}</span>
                            </span>
                        )}
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

    // Detect scroll to bottom for infinite loading with mouse
    useEffect(() => {
        const handleScroll = () => {
            // Calculate if we're near the bottom (within 500px)
            const scrollPosition = window.scrollY + window.innerHeight;
            const pageHeight = document.documentElement.scrollHeight;
            const distanceFromBottom = pageHeight - scrollPosition;

            if (distanceFromBottom < 500 && hasMorePosts && !loadingPosts) {
                fetchMorePosts();
            }
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, [hasMorePosts, loadingPosts, fetchMorePosts]);

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
