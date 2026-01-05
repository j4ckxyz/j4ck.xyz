import React, { useRef, useMemo, useState, useCallback } from 'react';
import { useData } from '../context/DataContext';
import SEO from '../components/SEO';
import useKeyboardNav from '../hooks/useKeyboardNav';

const PHOTOGRAPHY_HASHTAGS = [
    'photography',
    'shotoniphone',
    'photooftheday',
    'photo',
    'shotonpixel',
    'shotongalaxy',
    'mobilephotography',
    'iphonephotography',
    'photographer',
    'photos'
];

const PhotoItem = React.memo(({ post, image, aspectClass, onLoad }) => {
    const [isLoaded, setIsLoaded] = useState(false);

    const handleImageLoad = useCallback(() => {
        setIsLoaded(true);
        onLoad(post.id);
    }, [post.id, onLoad]);

    return (
        <div className={`photo-grid-item ${aspectClass}`}>
            <a 
                href={post.url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="block relative group h-full"
            >
                <div className="relative h-full overflow-hidden rounded-lg border border-[#333] hover:border-red-500 transition-colors bg-[#111]">
                    {/* Loading skeleton */}
                    {!isLoaded && (
                        <div className="absolute inset-0 bg-[#1a1a1a] animate-pulse" />
                    )}
                    
                    <img
                        src={image.fullsize || image.thumb}
                        alt={image.alt}
                        className={`w-full h-full object-cover group-hover:opacity-80 transition-opacity duration-300 ${
                            isLoaded ? 'opacity-100' : 'opacity-0'
                        }`}
                        loading="lazy"
                        decoding="async"
                        onLoad={handleImageLoad}
                    />
                    
                    {/* Hover overlay */}
                    {isLoaded && (
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <span className="text-white font-mono font-bold text-xs">VIEW POST</span>
                        </div>
                    )}

                    {/* Hashtag indicator */}
                    {post.hashtags && post.hashtags.length > 0 && (
                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <div className="bg-black/80 px-2 py-1 rounded text-xs font-mono text-[#999]">
                                #{post.hashtags[0]}
                            </div>
                        </div>
                    )}
                </div>
            </a>
        </div>
    );
});

PhotoItem.displayName = 'PhotoItem';

const Photos = () => {
    const { allPosts, loadingPosts } = useData();
    const containerRef = useRef(null);
    const [loadedCount, setLoadedCount] = useState(0);
    useKeyboardNav(containerRef, 'a[href]');

    // Filter posts that have images AND photography-related hashtags
    const photoData = useMemo(() => {
        return allPosts
            .filter(post => {
                // Must have images
                if (!post.images || post.images.length === 0) return false;
                
                // Must have at least one photography hashtag
                if (!post.hashtags || post.hashtags.length === 0) return false;
                
                const hasPhotographyTag = post.hashtags.some(tag => 
                    PHOTOGRAPHY_HASHTAGS.includes(tag.toLowerCase())
                );
                
                return hasPhotographyTag;
            })
            .flatMap(post => {
                // Create one entry per image
                return post.images.map((image, idx) => ({
                    post,
                    image,
                    aspectClass: 'square' // Default, can be enhanced based on image dimensions
                }));
            });
    }, [allPosts]);

    // Optimized image load handler
    const handleImageLoad = useCallback(() => {
        setLoadedCount(prev => prev + 1);
    }, []);

    return (
        <div className="w-full">
            <SEO
                title="Photos"
                description="Photography posts from Bluesky."
                image="photos.png"
                path="/photos"
            />
            <h1 className="text-3xl font-bold mb-8">
                /photos <span className="text-sm font-normal text-gray-600">via <a href="https://bsky.app/profile/j4ck.xyz" target="_blank" rel="noopener noreferrer" className="hover:text-red-500 transition-colors underline decoration-dotted">Bluesky</a></span>
            </h1>

            <div className="text-xs text-[#555] font-mono mb-4">
                Showing posts with: {PHOTOGRAPHY_HASHTAGS.slice(0, 3).map(tag => `#${tag}`).join(', ')}...
            </div>

            {/* Initial loading state */}
            {loadingPosts && photoData.length === 0 && (
                <div className="text-center py-12">
                    <div className="animate-pulse text-red-500 font-mono mb-2">Loading photos...</div>
                    <div className="text-[#555] text-xs font-mono">Fetching from Bluesky</div>
                </div>
            )}

            {/* Photo grid */}
            {photoData.length > 0 && (
                <>
                    <div ref={containerRef} className="photo-grid">
                        {photoData.map(({ post, image, aspectClass }, idx) => (
                            <PhotoItem
                                key={`${post.id}-${idx}`}
                                post={post}
                                image={image}
                                aspectClass={aspectClass}
                                onLoad={handleImageLoad}
                            />
                        ))}
                    </div>

                    {/* Stats footer */}
                    <div className="text-[#555] font-mono mt-8 text-center text-xs space-y-1">
                        <div>{photoData.length} photos {loadingPosts && '(loading more...)'}</div>
                        {loadedCount < photoData.length && photoData.length > 0 && (
                            <div className="text-[#333]">
                                {loadedCount} / {photoData.length} loaded
                            </div>
                        )}
                    </div>
                </>
            )}

            {/* No photos fallback */}
            {!loadingPosts && photoData.length === 0 && (
                <div className="text-center py-12">
                    <div className="text-[#555] font-mono mb-4">
                        No photos found with photography hashtags.
                    </div>
                    <div className="text-[#333] font-mono text-xs">
                        Try posting with #{PHOTOGRAPHY_HASHTAGS[0]} or #{PHOTOGRAPHY_HASHTAGS[1]}
                    </div>
                </div>
            )}
        </div>
    );
};

export default Photos;
