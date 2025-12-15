import React from 'react';
import { useData } from '../context/DataContext';
import SEO from '../components/SEO';

const Blogs = () => {
    const { blogs, loadingBlogs } = useData();

    const getPostUrl = (uri) => {
        const rkey = uri.split('/').pop();
        return `https://blog.j4ck.xyz/${rkey}`;
    };

    return (
        <div className="w-full">
            <SEO
                title="Blogs"
                description="Thoughts and articles via Leaflet."
                image="blogs.png"
                path="/blogs"
            />
            <h1 className="text-4xl font-bold mb-12">
                /blogs <span className="text-sm font-normal text-gray-600">via <a href="https://leaflet.pub" target="_blank" rel="noopener noreferrer" className="hover:text-red-500 transition-colors underline decoration-dotted">Leaflet</a></span>
            </h1>

            {loadingBlogs ? (
                <div className="animate-pulse text-red-500 font-mono">Loading data stream...</div>
            ) : (
                <div className="grid gap-6">
                    {blogs.map((post) => {
                        const content = post.value;
                        return (
                            <a
                                key={post.uri}
                                href={getPostUrl(post.uri)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block bg-[#111] border border-[#333] p-6 rounded-xl hover:border-red-500 transition-colors group"
                            >
                                <h2 className="text-2xl font-bold mb-2 group-hover:text-red-500 transition-colors font-mono">{content.title}</h2>
                                <p className="text-[#888] mb-4 line-clamp-2">{content.description}</p>
                                <div className="text-xs text-[#555] uppercase tracking-widest font-mono">
                                    {new Date(content.publishedAt || content.createdAt).toLocaleDateString()}
                                </div>
                            </a>
                        )
                    })}
                </div>
            )}
        </div>
    );
};

export default Blogs;
