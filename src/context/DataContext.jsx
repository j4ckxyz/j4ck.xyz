import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { BskyAgent } from '@atproto/api';

const DataContext = createContext();

const CACHE_KEY = 'bluesky_posts_cache';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const HANDLE = 'j4ck.xyz';

export const DataProvider = ({ children }) => {
    const [blogs, setBlogs] = useState([]);
    const [posts, setPosts] = useState([]);
    const [allPosts, setAllPosts] = useState([]);
    const [loadingBlogs, setLoadingBlogs] = useState(true);
    const [loadingPosts, setLoadingPosts] = useState(true);
    const [hasMorePosts, setHasMorePosts] = useState(true);

    // Load from cache
    const loadFromCache = () => {
        try {
            const cached = localStorage.getItem(CACHE_KEY);
            if (cached) {
                const { data, timestamp } = JSON.parse(cached);
                const age = Date.now() - timestamp;
                
                if (age < CACHE_DURATION) {
                    console.log('[Cache] Using cached Bluesky posts:', data.length, 'posts');
                    return data;
                }
            }
        } catch (e) {
            console.error('Cache load error:', e);
        }
        return null;
    };

    // Save to cache
    const saveToCache = (data) => {
        try {
            localStorage.setItem(CACHE_KEY, JSON.stringify({
                data,
                timestamp: Date.now()
            }));
        } catch (e) {
            console.error('Cache save error:', e);
        }
    };

    // Extract hashtags from post text and facets
    const extractHashtags = (text, facets = []) => {
        const tags = [];
        
        // Extract from facets (most reliable)
        if (facets) {
            facets.forEach(facet => {
                if (facet.features?.[0]?.['$type'] === 'app.bsky.richtext.facet#tag') {
                    tags.push(facet.features[0].tag.toLowerCase());
                }
            });
        }
        
        // Also extract from text as fallback
        const hashtagMatches = text.match(/#[\w]+/g) || [];
        hashtagMatches.forEach(tag => {
            tags.push(tag.substring(1).toLowerCase());
        });
        
        return [...new Set(tags)]; // Remove duplicates
    };

    // Transform Bluesky post to our format
    const transformBlueskyPost = (feedItem) => {
        const post = feedItem.post;
        const record = post.record;
        
        // Extract images
        const images = [];
        if (post.embed?.$type === 'app.bsky.embed.images#view') {
            post.embed.images.forEach(img => {
                images.push({
                    thumb: img.thumb,
                    fullsize: img.fullsize,
                    alt: img.alt || ''
                });
            });
        }
        
        // Handle recordWithMedia (images + quote)
        if (post.embed?.$type === 'app.bsky.embed.recordWithMedia#view' && 
            post.embed.media?.$type === 'app.bsky.embed.images#view') {
            post.embed.media.images.forEach(img => {
                images.push({
                    thumb: img.thumb,
                    fullsize: img.fullsize,
                    alt: img.alt || ''
                });
            });
        }
        
        // Extract hashtags
        const hashtags = extractHashtags(record.text, record.facets);
        
        // Get post URL
        const parts = post.uri.split('/');
        const postId = parts[parts.length - 1];
        const url = `https://bsky.app/profile/${post.author.handle}/post/${postId}`;
        
        return {
            id: post.uri,
            url,
            text: record.text,
            facets: record.facets,
            date_published: post.indexedAt,
            author: {
                handle: post.author.handle,
                displayName: post.author.displayName,
                avatar: post.author.avatar
            },
            images,
            hashtags,
            embed: post.embed,
            isReply: !!record.reply,
            isRepost: !!feedItem.reason
        };
    };

    // Fetch posts from Bluesky
    const fetchBlueskyPosts = useCallback(async (limit = 100) => {
        try {
            const response = await fetch(
                `https://public.api.bsky.app/xrpc/app.bsky.feed.getAuthorFeed?actor=${HANDLE}&limit=${limit}`,
                {
                    headers: {
                        'Accept': 'application/json',
                    }
                }
            );

            if (!response.ok) {
                throw new Error('Failed to fetch Bluesky posts');
            }

            const data = await response.json();
            
            // Transform and filter posts
            const transformed = data.feed
                .map(transformBlueskyPost)
                .filter(post => !post.isReply && !post.isRepost); // Exclude replies and reposts
            
            return transformed;
        } catch (e) {
            console.error("Failed to fetch Bluesky posts:", e);
            return [];
        }
    }, []);

    // Initial load
    useEffect(() => {
        const initializePosts = async () => {
            setLoadingPosts(true);

            // Try cache first
            const cached = loadFromCache();
            if (cached && cached.length > 0) {
                setAllPosts(cached);
                setPosts(cached.slice(0, 10));
                setHasMorePosts(true);
                setLoadingPosts(false);
                
                // Background refresh
                setTimeout(async () => {
                    const fresh = await fetchBlueskyPosts(100);
                    if (fresh.length > 0) {
                        setAllPosts(fresh);
                        saveToCache(fresh);
                    }
                }, 1000);
                return;
            }

            // No cache - fetch
            console.log('[API] Fetching Bluesky posts...');
            const blueskyPosts = await fetchBlueskyPosts(100);
            
            if (blueskyPosts.length > 0) {
                setAllPosts(blueskyPosts);
                setPosts(blueskyPosts.slice(0, 10));
                setHasMorePosts(true);
                saveToCache(blueskyPosts);
            }
            
            setLoadingPosts(false);
        };

        const fetchBlogs = async () => {
            const agent = new BskyAgent({ service: 'https://pds.j4ck.xyz' });
            try {
                const records = await agent.api.com.atproto.repo.listRecords({
                    repo: 'j4ck.xyz',
                    collection: 'pub.leaflet.document',
                    limit: 20,
                });
                setBlogs(records.data.records);
            } catch (e) {
                console.error("Failed to fetch blogs:", e);
            } finally {
                setLoadingBlogs(false);
            }
        };

        fetchBlogs();
        initializePosts();
    }, [fetchBlueskyPosts]);

    // Fetch more posts (for infinite scroll in /posts page)
    const fetchMorePosts = useCallback(() => {
        if (!loadingPosts && hasMorePosts) {
            const itemsPerPage = 10;
            const newOffset = posts.length;
            const newPosts = allPosts.slice(0, newOffset + itemsPerPage);
            setPosts(newPosts);
            setHasMorePosts(newPosts.length < allPosts.length);
        }
    }, [loadingPosts, hasMorePosts, posts.length, allPosts]);

    return (
        <DataContext.Provider value={{ 
            blogs, 
            posts, 
            allPosts,
            loadingBlogs, 
            loadingPosts,
            hasMorePosts,
            fetchMorePosts
        }}>
            {children}
        </DataContext.Provider>
    );
};

export const useData = () => useContext(DataContext);
