import React from 'react';
import { useData } from '../context/DataContext';
import SEO from '../components/SEO';

const Photos = () => {
    const { photos, loadingPhotos } = useData();

    return (
        <div className="w-full">
            <SEO
                title="Photos"
                description="Visual stream via Grain."
                image="photos.png"
                path="/photos"
            />
            <h1 className="text-4xl font-bold mb-12">
                /photos <span className="text-sm font-normal text-gray-600">via <a href="https://grain.social" target="_blank" rel="noopener noreferrer" className="hover:text-red-500 transition-colors underline decoration-dotted">Grain</a></span>
            </h1>

            {loadingPhotos ? (
                <div className="animate-pulse text-red-500 font-mono">Loading visuals...</div>
            ) : (
                <div className="columns-2 md:columns-3 lg:columns-4 gap-4 space-y-4">
                    {photos.map(({ node }) => {
                        if (!node.photo || !node.photo.url) return null;

                        return (
                            <div key={node.uri} className="break-inside-avoid bg-[#111] overflow-hidden rounded-lg border border-[#333] hover:border-red-500 transition-colors relative group mb-4">
                                <a href={node.photo.url} target="_blank" rel="noopener noreferrer">
                                    <img
                                        src={node.photo.url}
                                        alt={node.alt || "Grain photo"}
                                        className="w-full h-auto group-hover:opacity-80 transition-opacity duration-300"
                                        loading="lazy"
                                    />
                                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                        <span className="text-white font-mono font-bold text-sm">VIEW</span>
                                    </div>
                                </a>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    );
};

export default Photos;
