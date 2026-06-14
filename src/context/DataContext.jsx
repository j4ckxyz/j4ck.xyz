import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';

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
    const [resolvedHandle, setResolvedHandle] = useState('j4ck.xyz');
    const [resolvedPds, setResolvedPds] = useState('https://eurosky.social');
    const [hitsCount, setHitsCount] = useState(null);

    // Load from cache
    const loadFromCache = () => {
        try {
            const cached = localStorage.getItem(CACHE_KEY);
            if (cached) {
                const { data, timestamp } = JSON.parse(cached);
                const age = Date.now() - timestamp;
                
                if (age < CACHE_DURATION) {
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
    const fetchBlueskyPosts = useCallback(async (targetCount = 100, actorId = DID) => {
        try {
            let allPosts = [];
            let cursor = undefined;
            const maxIterations = 10; // Safety limit to prevent infinite loops
            let iterations = 0;
            
            // Keep fetching until we have targetCount original posts (non-replies, non-reposts)
            while (allPosts.length < targetCount && iterations < maxIterations) {
                const url = cursor 
                    ? `https://public.api.bsky.app/xrpc/app.bsky.feed.getAuthorFeed?actor=${actorId}&limit=100&cursor=${cursor}`
                    : `https://public.api.bsky.app/xrpc/app.bsky.feed.getAuthorFeed?actor=${actorId}&limit=100`;
                
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
                    break;
                }
                
                cursor = data.cursor;
                iterations++;
                
            }
            
            return allPosts;
        } catch (e) {
            console.error("Failed to fetch Bluesky posts:", e);
            return [];
        }
    }, [transformBlueskyPost]);

    // Fetch Flashes photos using QuickSlices GraphQL API or PDS Fallback
    const fetchFlashesPhotos = useCallback(async (resolvedPdsUrl = 'https://eurosky.social') => {
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
                        postUris = edges.map(e => e.node.subject?.uri).filter(Boolean);
                    }
                }
            } catch (e) {
                console.warn('[QuickSlices] Fetch failed, trying fallback:', e);
            }

            // 2. Fallback to PDS if QuickSlices returned nothing
            if (postUris.length === 0) {
                try {
                    const pdsUrl = `${resolvedPdsUrl}/xrpc/com.atproto.repo.listRecords?repo=${DID}&collection=blue.flashes.actor.portfolio&limit=100`;
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
                    image: post.images[0], // Use first image for main display
                    source: 'flashes'
                }));

            return photos;
            
        } catch (e) {
            console.error("Failed to fetch Flashes photos:", e);
            return [];
        }
    }, [transformBlueskyPost]);

    // Fetch Grain photos using grain.social public feed API
    const fetchGrainPhotos = useCallback(async () => {
        try {
            const url = `https://grain.social/xrpc/dev.hatk.getFeed?feed=actor&actor=${DID}&limit=30`;
            const response = await fetch(url, {
                headers: { 'Accept': 'application/json' }
            });
            if (!response.ok) {
                throw new Error('Failed to fetch Grain feed');
            }
            const data = await response.json();
            if (!data.items) return [];

            const photos = data.items.map(gallery => {
                const images = (gallery.items || []).map(img => ({
                    thumb: img.thumb,
                    fullsize: img.fullsize,
                    alt: img.alt || '',
                    aspectRatio: img.aspectRatio
                }));
                const parts = gallery.uri.split('/');
                const rkey = parts[parts.length - 1];
                const galleryUrl = `https://grain.social/profile/${gallery.creator.did}/gallery/${rkey}`;

                return {
                    id: gallery.uri,
                    url: galleryUrl,
                    text: gallery.description || gallery.title || '',
                    date_published: gallery.createdAt,
                    author: {
                        handle: gallery.creator.handle,
                        displayName: gallery.creator.displayName,
                        avatar: gallery.creator.avatar
                    },
                    images,
                    image: images[0] || null,
                    hashtags: [],
                    source: 'grain'
                };
            }).filter(p => p.image);

            return photos;
        } catch (e) {
            console.error("Failed to fetch Grain photos:", e);
            return [];
        }
    }, []);

    // Initial load
    useEffect(() => {
        const resolveDidAndLoad = async () => {
            let currentPds = 'https://eurosky.social';
            let currentHandle = 'j4ck.xyz';
            try {
                const response = await fetch(`https://plc.directory/${DID}`);
                if (response.ok) {
                    const doc = await response.json();
                    const pdsService = doc.service?.find(
                        s => s.id === '#atproto_pds' || s.type === 'AtprotoPersonalDataServer'
                    );
                    if (pdsService?.serviceEndpoint) {
                        currentPds = pdsService.serviceEndpoint;
                    }
                    const alias = doc.alsoKnownAs?.find(a => a.startsWith('at://'));
                    if (alias) {
                        currentHandle = alias.substring(5);
                    }
                }
            } catch (e) {
                console.error('[DID] Failed to resolve from PLC directory, using fallbacks:', e);
            }

            setResolvedPds(currentPds);
            setResolvedHandle(currentHandle);

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
                        const fresh = await fetchBlueskyPosts(100, DID);
                        if (fresh.length > 0) {
                            setAllPosts(fresh);
                            saveToCache(fresh);
                        }
                    }, 1000);
                    return;
                }

                // No cache - fetch
                const blueskyPosts = await fetchBlueskyPosts(100, DID);
                
                if (blueskyPosts.length > 0) {
                    setAllPosts(blueskyPosts);
                    setPosts(blueskyPosts.slice(0, 10));
                    setHasMorePosts(true);
                    saveToCache(blueskyPosts);
                }
                
                setLoadingPosts(false);
            };

            const fetchBlogs = async () => {
                // Loaded on demand so @atproto/api stays out of the initial bundle.
                const { BskyAgent } = await import('@atproto/api');
                const agent = new BskyAgent({ service: currentPds });
                try {
                    const records = await agent.api.com.atproto.repo.listRecords({
                        repo: currentHandle,
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
                        const hasGrain = data && data.some(p => p.source === 'grain');
                        if (age < CACHE_DURATION && hasGrain) {
                            setPhotos(data);
                            setLoadingPhotos(false);
                            
                            // Background refresh
                            setTimeout(async () => {
                                try {
                                    const flashesFresh = await fetchFlashesPhotos(currentPds);
                                    const grainFresh = await fetchGrainPhotos();
                                    const fresh = [...grainFresh, ...flashesFresh].sort(
                                        (a, b) => new Date(b.date_published) - new Date(a.date_published)
                                    );
                                    if (fresh.length > 0) {
                                        setPhotos(fresh);
                                        localStorage.setItem(PHOTOS_CACHE_KEY, JSON.stringify({
                                            data: fresh,
                                            timestamp: Date.now()
                                        }));
                                    }
                                } catch (err) {
                                    console.error('Background refresh error:', err);
                                }
                            }, 1000);
                            return;
                        }
                    }
                } catch (e) {
                    console.error('Photos cache load error:', e);
                }
                
                // No cache - fetch both in parallel
                try {
                    const [flashesPhotos, grainPhotos] = await Promise.all([
                        fetchFlashesPhotos(currentPds),
                        fetchGrainPhotos()
                    ]);

                    const hybridPhotos = [...grainPhotos, ...flashesPhotos].sort(
                        (a, b) => new Date(b.date_published) - new Date(a.date_published)
                    );

                    if (hybridPhotos.length > 0) {
                        setPhotos(hybridPhotos);
                        try {
                            localStorage.setItem(PHOTOS_CACHE_KEY, JSON.stringify({
                                data: hybridPhotos,
                                timestamp: Date.now()
                            }));
                        } catch (e) {
                            console.error('Photos cache save error:', e);
                        }
                    }
                } catch (err) {
                    console.error('Error fetching hybrid photos:', err);
                }
                
                setLoadingPhotos(false);
            };

            const fetchHits = async () => {
                try {
                    const response = await fetch('/api/hits');
                    if (response.ok) {
                        const data = await response.json();
                        if (data && typeof data.hits === 'number') {
                            setHitsCount(data.hits);
                        } else {
                            setHitsCount(1337);
                        }
                    } else {
                        setHitsCount(1337);
                    }
                } catch (e) {
                    console.error('[Hits] Failed to fetch visitor counter:', e);
                    setHitsCount(1337);
                }
            };

            fetchBlogs();
            initializePosts();
            fetchPhotos();
            fetchHits();
        };

        resolveDidAndLoad();
    }, [fetchBlueskyPosts, fetchFlashesPhotos, fetchGrainPhotos]);

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
            fetchMorePosts,
            resolvedHandle,
            resolvedPds,
            hitsCount
        }}>
            {children}
        </DataContext.Provider>
    );
};

export const useData = () => useContext(DataContext);
