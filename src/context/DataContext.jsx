import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { BskyAgent } from '@atproto/api';

const DataContext = createContext();

const CACHE_KEY = 'bluesky_posts_cache';
const PHOTOS_CACHE_KEY = 'flashes_photos_cache';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const HANDLE = 'j4ck.xyz';
const DID = 'did:plc:4hawmtgzjx3vclfyphbhfn7v';
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
    const transformBlueskyPost = useCallback((feedItem) => {
        const post = feedItem.post;
        const record = post.record;
        
        // Extract images
        const images = [];
        if (post.embed?.$type === 'app.bsky.embed.images#view') {
            post.embed.images.forEach((img, index) => {
                // Try to get aspect ratio from record if not in view
                let aspectRatio = img.aspectRatio;
                if (!aspectRatio && record.embed?.images?.[index]?.aspectRatio) {
                    aspectRatio = record.embed.images[index].aspectRatio;
                }

                images.push({
                    thumb: img.thumb,
                    fullsize: img.fullsize,
                    alt: img.alt || '',
                    aspectRatio
                });
            });
        }
        
        // Handle recordWithMedia (images + quote)
        if (post.embed?.$type === 'app.bsky.embed.recordWithMedia#view' && 
            post.embed.media?.$type === 'app.bsky.embed.images#view') {
            post.embed.media.images.forEach((img, index) => {
                // Try to get aspect ratio from record media if not in view
                let aspectRatio = img.aspectRatio;
                if (!aspectRatio && record.embed?.media?.images?.[index]?.aspectRatio) {
                    aspectRatio = record.embed.media.images[index].aspectRatio;
                }

                images.push({
                    thumb: img.thumb,
                    fullsize: img.fullsize,
                    alt: img.alt || '',
                    aspectRatio
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
            isRepost: !!feedItem.reason,
            likeCount: post.likeCount || 0,
            repostCount: post.repostCount || 0,
            replyCount: post.replyCount || 0
        };
    }, []);

    // Fetch posts from Bluesky with pagination to get enough original posts
    const fetchBlueskyPosts = useCallback(async (targetCount = 100) => {
        try {
            let allPosts = [];
            let cursor = undefined;
            const maxIterations = 10; // Safety limit to prevent infinite loops
            let iterations = 0;
            
            // Keep fetching until we have targetCount original posts (non-replies, non-reposts)
            while (allPosts.length < targetCount && iterations < maxIterations) {
                const url = cursor 
                    ? `https://public.api.bsky.app/xrpc/app.bsky.feed.getAuthorFeed?actor=${HANDLE}&limit=100&cursor=${cursor}`
                    : `https://public.api.bsky.app/xrpc/app.bsky.feed.getAuthorFeed?actor=${HANDLE}&limit=100`;
                
                const response = await fetch(url, {
                    headers: {
                        'Accept': 'application/json',
                    }
                });

                if (!response.ok) {
                    throw new Error('Failed to fetch Bluesky posts');
                }

                const data = await response.json();
                
                // Transform and filter posts
                const transformed = data.feed
                    .map(transformBlueskyPost)
                    .filter(post => !post.isReply && !post.isRepost); // Exclude replies and reposts
                
                allPosts = [...allPosts, ...transformed];
                
                // Check if there's more data
                if (!data.cursor) {
                    console.log(`[Bluesky] Reached end of feed after ${iterations + 1} iterations`);
                    break;
                }
                
                cursor = data.cursor;
                iterations++;
                
                console.log(`[Bluesky] Iteration ${iterations}: Fetched ${transformed.length} original posts (total: ${allPosts.length})`);
            }
            
            console.log(`[Bluesky] Final count: ${allPosts.length} original posts`);
            return allPosts;
        } catch (e) {
            console.error("Failed to fetch Bluesky posts:", e);
            return [];
        }
    }, [transformBlueskyPost]);

    // Fetch Flashes photos using QuickSlices GraphQL API or PDS Fallback
    const fetchFlashesPhotos = useCallback(async () => {
        try {
            let postUris = [];

            // 1. Try QuickSlices (GraphQL)
            try {
                // Query Flashes portfolio from QuickSlices
                // Note: using blueFlashesActorPortfolio which contains the subject reference
                const query = `
                    query GetFlashesPortfolio($did: String!) {
                        blueFlashesActorPortfolio(
                            where: { did: { eq: $did } }
                            sortBy: [{ field: sortOrder, direction: ASC }, { field: createdAt, direction: DESC }]
                            first: 100
                        ) {
                            edges {
                                node {
                                    subject {
                                        uri
                                    }
                                }
                            }
                        }
                    }
                `;
                
                const response = await fetch(QUICKSLICES_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ query, variables: { did: DID } })
                });

                if (response.ok) {
                    const result = await response.json();
                    const edges = result.data?.blueFlashesActorPortfolio?.edges || [];
                    if (edges.length > 0) {
                        console.log(`[QuickSlices] Found ${edges.length} portfolio items`);
                        postUris = edges.map(e => e.node.subject?.uri).filter(Boolean);
                    }
                }
            } catch (e) {
                console.warn('[QuickSlices] Fetch failed, trying fallback:', e);
            }

            // 2. Fallback to PDS if QuickSlices returned nothing
            if (postUris.length === 0) {
                console.log('[Flashes] QuickSlices empty, fetching from PDS...');
                try {
                    const pdsUrl = `https://pds.j4ck.xyz/xrpc/com.atproto.repo.listRecords?repo=${DID}&collection=blue.flashes.actor.portfolio&limit=100`;
                    const response = await fetch(pdsUrl);
                    if (response.ok) {
                        const data = await response.json();
                        // Sort by sortOrder (asc) then createdAt (desc)
                        const records = data.records || [];
                        records.sort((a, b) => {
                            const orderA = a.value.sortOrder ?? 0;
                            const orderB = b.value.sortOrder ?? 0;
                            if (orderA !== orderB) return orderA - orderB;
                            return new Date(b.value.createdAt) - new Date(a.value.createdAt);
                        });
                        
                        postUris = records.map(r => r.value.subject?.uri).filter(Boolean);
                        console.log(`[PDS] Found ${postUris.length} portfolio items`);
                    }
                } catch (e) {
                    console.error('[PDS] Fetch failed:', e);
                }
            }

            if (postUris.length === 0) return [];

            // 3. Fetch full posts from Bluesky AppView
            const chunkSize = 25;
            let allBlueskyPosts = [];

            for (let i = 0; i < postUris.length; i += chunkSize) {
                const chunk = postUris.slice(i, i + chunkSize);
                const queryParams = chunk.map(uri => `uris=${encodeURIComponent(uri)}`).join('&');
                
                try {
                    const bskyResponse = await fetch(`https://public.api.bsky.app/xrpc/app.bsky.feed.getPosts?${queryParams}`, {
                        headers: { 'Accept': 'application/json' }
                    });

                    if (bskyResponse.ok) {
                        const bskyData = await bskyResponse.json();
                        if (bskyData.posts) {
                            allBlueskyPosts = [...allBlueskyPosts, ...bskyData.posts];
                        }
                    }
                } catch (err) {
                    console.error(`[Bluesky] Error fetching chunk ${i}:`, err);
                }
            }

            // 4. Transform into photo objects
            const photos = allBlueskyPosts
                .map(post => transformBlueskyPost({ post, reason: undefined }))
                .filter(post => post.images && post.images.length > 0) // Only posts with images
                .map(post => ({
                    ...post,
                    image: post.images[0] // Use first image for main display
                }));

            console.log(`[Photos] Processed ${photos.length} photos`);
            return photos;
            
        } catch (e) {
            console.error("Failed to fetch Flashes photos:", e);
            return [];
        }
    }, [transformBlueskyPost]);

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
            console.log('[API] Fetching Flashes photos from QuickSlices...');
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
