import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { BskyAgent } from '@atproto/api';

const DataContext = createContext();

const CACHE_KEY = 'bluesky_posts_cache';
const PHOTOS_CACHE_KEY = 'flashes_photos_cache';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const HANDLE = 'j4ck.xyz';
const DID = 'did:plc:4hawmtgzjx3vclfyphbhfn7v';
const PDS_URL = 'https://pds.j4ck.xyz';
const QUICKSLICES_URL = 'https://quickslices.atproto.uk/graphql';

export const DataProvider = ({ children }) => {
    const [blogs, setBlogs] = useState([]);
    const [posts, setPosts] = useState([]);
    const [allPosts, setAllPosts] = useState([]);
    const [photos, setPhotos] = useState([]);
    const [loadingBlogs, setLoadingBlogs] = useState(true);
    const [loadingPosts, setLoadingPosts] = useState(true);
    const [loadingPhotos, setLoadingPhotos] = useState(true);
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

    // Fetch Flashes photos
    const fetchFlashesPhotos = useCallback(async () => {
        try {
            // Query Flashes posts using QuickSlices GraphQL API
            const query = `
                query GetFlashesPosts {
                    blueFlashesFeedPost(
                        first: 100
                        where: { did: { eq: "${DID}" } }
                        sortBy: [{ field: createdAt, direction: DESC }]
                    ) {
                        edges {
                            node {
                                uri
                                cid
                                did
                                createdAt
                                actorHandle
                            }
                        }
                    }
                }
            `;
            
            const response = await fetch(QUICKSLICES_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ query })
            });
            
            if (!response.ok) {
                throw new Error('Failed to fetch from QuickSlices');
            }
            
            const result = await response.json();
            const flashesPosts = result.data?.blueFlashesFeedPost?.edges || [];
            const photos = [];
            
            // For each Flashes post, get the linked Bluesky posts with images
            for (const edge of flashesPosts) {
                const flashesPost = edge.node;
                
                // Extract rkey from URI for the root post
                const rkey = flashesPost.uri.split('/').pop();
                
                // Try to get the corresponding Bluesky post from PDS
                // The pattern is: Flashes post has same rkey as root Bluesky post
                try {
                    const bskyResponse = await fetch(
                        `${PDS_URL}/xrpc/com.atproto.repo.getRecord?repo=${DID}&collection=app.bsky.feed.post&rkey=${rkey}`
                    );
                    
                    if (bskyResponse.ok) {
                        const bskyData = await bskyResponse.json();
                        const bskyPost = bskyData.value;
                        
                        // Check if post has images
                        if (bskyPost.embed?.$type === 'app.bsky.embed.images' && bskyPost.embed.images) {
                            bskyPost.embed.images.forEach((img) => {
                                const cid = img.image.ref.$link;
                                photos.push({
                                    id: `${flashesPost.uri}-${cid}`,
                                    url: `https://bsky.app/profile/${HANDLE}/post/${rkey}`,
                                    flashesUri: flashesPost.uri,
                                    postUri: bskyData.uri,
                                    image: {
                                        thumb: `${PDS_URL}/xrpc/com.atproto.sync.getBlob?did=${DID}&cid=${cid}`,
                                        fullsize: `${PDS_URL}/xrpc/com.atproto.sync.getBlob?did=${DID}&cid=${cid}`,
                                        alt: img.alt || '',
                                        aspectRatio: img.aspectRatio
                                    },
                                    text: bskyPost.text || '',
                                    createdAt: flashesPost.createdAt,
                                    tags: bskyPost.tags || []
                                });
                            });
                        }
                    }
                } catch (e) {
                    console.error(`Failed to fetch Bluesky post for ${rkey}:`, e);
                }
            }
            
            console.log(`[QuickSlices] Fetched ${photos.length} photos from Flashes`);
            
            return photos;
        } catch (e) {
            console.error("Failed to fetch Flashes photos:", e);
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

        const fetchPhotos = async () => {
            setLoadingPhotos(true);
            
            // Try cache first
            try {
                const cached = localStorage.getItem(PHOTOS_CACHE_KEY);
                if (cached) {
                    const { data, timestamp } = JSON.parse(cached);
                    const age = Date.now() - timestamp;
                    
                    if (age < CACHE_DURATION) {
                        console.log('[Cache] Using cached Flashes photos:', data.length, 'photos');
                        setPhotos(data);
                        setLoadingPhotos(false);
                        
                        // Background refresh
                        setTimeout(async () => {
                            const fresh = await fetchFlashesPhotos();
                            if (fresh.length > 0) {
                                setPhotos(fresh);
                                localStorage.setItem(PHOTOS_CACHE_KEY, JSON.stringify({
                                    data: fresh,
                                    timestamp: Date.now()
                                }));
                            }
                        }, 1000);
                        return;
                    }
                }
            } catch (e) {
                console.error('Photos cache load error:', e);
            }
            
            // No cache - fetch
            console.log('[API] Fetching Flashes photos...');
            const flashesPhotos = await fetchFlashesPhotos();
            
            if (flashesPhotos.length > 0) {
                setPhotos(flashesPhotos);
                try {
                    localStorage.setItem(PHOTOS_CACHE_KEY, JSON.stringify({
                        data: flashesPhotos,
                        timestamp: Date.now()
                    }));
                } catch (e) {
                    console.error('Photos cache save error:', e);
                }
            }
            
            setLoadingPhotos(false);
        };

        fetchBlogs();
        initializePosts();
        fetchPhotos();
    }, [fetchBlueskyPosts, fetchFlashesPhotos]);

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
            photos,
            loadingBlogs, 
            loadingPosts,
            loadingPhotos,
            hasMorePosts,
            fetchMorePosts
        }}>
            {children}
        </DataContext.Provider>
    );
};

export const useData = () => useContext(DataContext);
