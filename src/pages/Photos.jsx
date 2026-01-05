import React, { useRef, useMemo, useState, useCallback } from 'react';
import { useData } from '../context/DataContext';
import SEO from '../components/SEO';
import useKeyboardNav from '../hooks/useKeyboardNav';

const PhotoItem = React.memo(({ photo, aspectClass, onLoad }) => {
    const [isLoaded, setIsLoaded] = useState(false);

    const handleImageLoad = useCallback(() => {
        setIsLoaded(true);
        onLoad(photo.id);
    }, [photo.id, onLoad]);

    return (
        <div className={`photo-grid-item ${aspectClass}`}>
            <a 
                href={photo.url} 
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
                        src={photo.image.thumb}
                        alt={photo.image.alt}
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
                            <span className="text-white font-mono font-bold text-xs">VIEW ON FLASHES</span>
                        </div>
                    )}

                    {/* Alt text indicator */}
                    {photo.image.alt && (
                        <div className="absolute bottom-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <div className="bg-black/80 px-2 py-1 rounded text-xs font-mono text-[#999] max-w-[200px] truncate">
                                {photo.image.alt}
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
    const { photos, loadingPhotos } = useData();
    const containerRef = useRef(null);
    const [loadedCount, setLoadedCount] = useState(0);
    useKeyboardNav(containerRef, 'a[href]');

    // Determine aspect class based on aspect ratio
    const photoData = useMemo(() => {
        return photos.map(photo => {
            let aspectClass = 'square';
            if (photo.image.aspectRatio) {
                const ratio = photo.image.aspectRatio.width / photo.image.aspectRatio.height;
                if (ratio > 1.3) {
                    aspectClass = 'landscape';
                } else if (ratio < 0.7) {
                    aspectClass = 'portrait';
                }
            }
            return { ...photo, aspectClass };
        });
    }, [photos]);

    // Optimized image load handler
    const handleImageLoad = useCallback(() => {
        setLoadedCount(prev => prev + 1);
    }, []);

    return (
        <div className="w-full">
            <SEO
                title="Photos"
                description="Photography from Flashes.blue."
                image="photos.png"
                path="/photos"
            />
            <h1 className="text-3xl font-bold mb-8">
                /photos <span className="text-sm font-normal text-gray-600">via <a href="https://flashes.blue" target="_blank" rel="noopener noreferrer" className="hover:text-red-500 transition-colors underline decoration-dotted">Flashes</a></span>
            </h1>

            {/* Initial loading state */}
            {loadingPhotos && photoData.length === 0 && (
                <div className="text-center py-12">
                    <div className="animate-pulse text-red-500 font-mono mb-2">Loading photos...</div>
                    <div className="text-[#555] text-xs font-mono">Fetching from Flashes</div>
                </div>
            )}

            {/* Photo grid */}
            {photoData.length > 0 && (
                <>
                    <div ref={containerRef} className="photo-grid">
                        {photoData.map((photo) => (
                            <PhotoItem
                                key={photo.id}
                                photo={photo}
                                aspectClass={photo.aspectClass}
                                onLoad={handleImageLoad}
                            />
                        ))}
                    </div>

                    {/* Stats footer */}
                    <div className="text-[#555] font-mono mt-8 text-center text-xs space-y-1">
                        <div>{photoData.length} photos {loadingPhotos && '(loading more...)'}</div>
                        {loadedCount < photoData.length && photoData.length > 0 && (
                            <div className="text-[#333]">
                                {loadedCount} / {photoData.length} loaded
                            </div>
                        )}
                    </div>
                </>
            )}

            {/* No photos fallback */}
            {!loadingPhotos && photoData.length === 0 && (
                <div className="text-center py-12">
                    <div className="text-[#555] font-mono mb-4">
                        No photos found on Flashes yet.
                    </div>
                    <div className="text-[#333] font-mono text-xs">
                        Share photos at <a href="https://flashes.blue" target="_blank" rel="noopener noreferrer" className="text-red-500 hover:underline">flashes.blue</a>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Photos;
