import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { DID, DEFAULT_PDS, DEFAULT_HANDLE, fetchJson, listRecordsUrl, rkeyOf } from '../utils/atproto';

const DataContext = createContext();

const PHOTOS_CACHE_KEY = 'photos_cache_v2';
const DOCS_CACHE_KEY = 'standard_docs_cache_v1';
const REPOS_CACHE_KEY = 'repos_cache_v1';
// Cache is served immediately on load regardless of age; this only decides
// whether to kick off a background refresh behind it.
const CACHE_FRESH_FOR = 5 * 60 * 1000;

const GRAIN_FEED = 'https://grain.social/xrpc/dev.hatk.getFeed';
const GITHUB_USER = 'j4ckxyz';

const readCache = (key) => {
    try {
        const raw = localStorage.getItem(key);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (!parsed?.data) return null;
        return parsed;
    } catch {
        return null;
    }
};

const writeCache = (key, data) => {
    try {
        localStorage.setItem(key, JSON.stringify({ data, timestamp: Date.now() }));
    } catch {
        /* quota or private mode — cache is an optimisation, not a requirement */
    }
};

const byNewest = (a, b) => new Date(b.date_published) - new Date(a.date_published);

export const DataProvider = ({ children }) => {
    const [blogs, setBlogs] = useState(() => readCache(DOCS_CACHE_KEY)?.data ?? []);
    const [publications, setPublications] = useState([]);
    const [photos, setPhotos] = useState(() => readCache(PHOTOS_CACHE_KEY)?.data ?? []);
    const [loadingBlogs, setLoadingBlogs] = useState(() => !readCache(DOCS_CACHE_KEY));
    const [loadingPhotos, setLoadingPhotos] = useState(() => !readCache(PHOTOS_CACHE_KEY));
    const [resolvedHandle, setResolvedHandle] = useState(DEFAULT_HANDLE);
    const [resolvedPds, setResolvedPds] = useState(DEFAULT_PDS);
    const [hitsCount, setHitsCount] = useState(null);
    const [repos, setRepos] = useState(() => readCache(REPOS_CACHE_KEY)?.data ?? []);
    const [loadingRepos, setLoadingRepos] = useState(() => !readCache(REPOS_CACHE_KEY));
    // Distinguishes "GitHub said no repos" from "GitHub wouldn't answer" (most
    // often its unauthenticated 60/hr rate limit) — Home/Repos shouldn't show
    // the same empty state for both.
    const [reposError, setReposError] = useState(null);

    // Photos stream in from two independent sources. Merging through a ref keeps
    // whichever arrives first on screen without the other overwriting it.
    const photoSources = useRef({ flashes: null, grain: null });

    const mergePhotos = useCallback((source, items) => {
        photoSources.current[source] = items;
        const { flashes, grain } = photoSources.current;
        const merged = [...(grain || []), ...(flashes || [])].sort(byNewest);
        if (merged.length > 0) setPhotos(merged);
        if (flashes !== null && grain !== null) {
            setLoadingPhotos(false);
            if (merged.length > 0) writeCache(PHOTOS_CACHE_KEY, merged);
        }
    }, []);

    /* --- Flashes -------------------------------------------------------------
       The portfolio record lists post URIs; the Bluesky appview hydrates them.
       Read the portfolio straight from the PDS — it's the source of truth and
       answers in ~250ms, where the third-party index in front of it has been
       unreliable enough to hang the page for a minute.
    ------------------------------------------------------------------------- */
    const fetchFlashesPhotos = useCallback(async (pds) => {
        let postUris = [];
        try {
            const data = await fetchJson(
                listRecordsUrl({ pds, collection: 'blue.flashes.actor.portfolio', limit: 100 }),
                { timeout: 6000 }
            );
            const records = data.records || [];
            records.sort((a, b) => {
                const orderA = a.value.sortOrder ?? 0;
                const orderB = b.value.sortOrder ?? 0;
                if (orderA !== orderB) return orderA - orderB;
                return new Date(b.value.createdAt) - new Date(a.value.createdAt);
            });
            postUris = records.map((r) => r.value.subject?.uri).filter(Boolean);
        } catch (e) {
            console.error('[Flashes] portfolio fetch failed:', e);
            return [];
        }

        if (postUris.length === 0) return [];

        // All chunks in flight at once — serially awaiting them multiplied the
        // wait by the number of chunks for no reason.
        const chunks = [];
        for (let i = 0; i < postUris.length; i += 25) chunks.push(postUris.slice(i, i + 25));

        const results = await Promise.allSettled(
            chunks.map((chunk) => {
                const params = chunk.map((uri) => `uris=${encodeURIComponent(uri)}`).join('&');
                return fetchJson(`https://public.api.bsky.app/xrpc/app.bsky.feed.getPosts?${params}`, { timeout: 8000 });
            })
        );

        const bskyPosts = results.flatMap((r) => (r.status === 'fulfilled' ? r.value.posts || [] : []));

        return bskyPosts
            .map((post) => {
                const record = post.record || {};
                const view =
                    post.embed?.$type === 'app.bsky.embed.images#view'
                        ? post.embed
                        : post.embed?.media?.$type === 'app.bsky.embed.images#view'
                          ? post.embed.media
                          : null;
                if (!view) return null;

                const recordImages = record.embed?.images || record.embed?.media?.images || [];
                const images = view.images.map((img, i) => ({
                    thumb: img.thumb,
                    fullsize: img.fullsize,
                    alt: img.alt || '',
                    aspectRatio: img.aspectRatio || recordImages[i]?.aspectRatio,
                }));

                return {
                    id: post.uri,
                    url: `https://bsky.app/profile/${post.author.handle}/post/${rkeyOf(post.uri)}`,
                    text: record.text || '',
                    date_published: post.indexedAt,
                    author: {
                        handle: post.author.handle,
                        displayName: post.author.displayName,
                        avatar: post.author.avatar,
                    },
                    images,
                    image: images[0],
                    source: 'flashes',
                };
            })
            .filter(Boolean);
    }, []);

    /* --- Grain ---------------------------------------------------------------
       `dev.hatk.getFeed` is Grain's own published API (declared in the lexicons
       of grainsocial/grain); `feed=actor` is the galleries feed for one DID.
    ------------------------------------------------------------------------- */
    const fetchGrainPhotos = useCallback(async () => {
        try {
            const params = new URLSearchParams({ feed: 'actor', actor: DID, limit: '30' });
            const data = await fetchJson(`${GRAIN_FEED}?${params}`, { timeout: 8000 });

            return (data.items || [])
                .map((gallery) => {
                    const images = (gallery.items || []).map((img) => ({
                        thumb: img.thumb,
                        fullsize: img.fullsize,
                        alt: img.alt || '',
                        aspectRatio: img.aspectRatio,
                    }));
                    if (images.length === 0) return null;

                    return {
                        id: gallery.uri,
                        url: `https://grain.social/profile/${gallery.creator.did}/gallery/${rkeyOf(gallery.uri)}`,
                        text: gallery.description || gallery.title || '',
                        date_published: gallery.createdAt,
                        author: {
                            handle: gallery.creator.handle,
                            displayName: gallery.creator.displayName,
                            avatar: gallery.creator.avatar,
                        },
                        images,
                        image: images[0],
                        source: 'grain',
                    };
                })
                .filter(Boolean);
        } catch (e) {
            console.error('[Grain] feed fetch failed:', e);
            return [];
        }
    }, []);

    /* --- standard.site -------------------------------------------------------
       `site.standard.document` carries the full post body, so posts render
       inline here; `site.standard.publication` gives the canonical web home of
       each one (publication.url + document.path).
    ------------------------------------------------------------------------- */
    const fetchDocuments = useCallback(async (pds) => {
        const [pubResult, docResult] = await Promise.allSettled([
            fetchJson(listRecordsUrl({ pds, collection: 'site.standard.publication', limit: 100 }), { timeout: 6000 }),
            fetchJson(listRecordsUrl({ pds, collection: 'site.standard.document', limit: 100 }), { timeout: 6000 }),
        ]);

        const pubs = (pubResult.status === 'fulfilled' ? pubResult.value.records || [] : []).map((r) => ({
            uri: r.uri,
            url: r.value.url,
            name: r.value.name,
            description: r.value.description,
            showComments: r.value.preferences?.showComments !== false,
        }));
        setPublications(pubs);

        if (docResult.status !== 'fulfilled') {
            console.error('[standard.site] document fetch failed:', docResult.reason);
            return null;
        }

        const pubByUri = Object.fromEntries(pubs.map((p) => [p.uri, p]));

        const docs = (docResult.value.records || [])
            .map((record) => {
                const value = record.value;
                const publication = pubByUri[value.site];
                const base = publication?.url?.replace(/\/$/, '');
                const path = value.path?.startsWith('/') ? value.path : value.path ? `/${value.path}` : '';

                return {
                    uri: record.uri,
                    rkey: rkeyOf(record.uri),
                    title: value.title,
                    description: value.description,
                    publishedAt: value.publishedAt,
                    tags: value.tags || [],
                    content: value.content,
                    textContent: value.textContent,
                    bskyPostRef: value.bskyPostRef,
                    canonicalUrl: base ? `${base}${path}` : null,
                    publicationName: publication?.name || null,
                    showComments: publication?.showComments ?? true,
                };
            })
            .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));

        return docs;
    }, []);

    /* --- GitHub ----------------------------------------------------------
       Shared by Home's preview strip and the /repos listing, so it's fetched
       and cached exactly once instead of each page re-hitting GitHub's
       unauthenticated (60/hr) rate limit independently.
    ----------------------------------------------------------------------- */
    const fetchRepos = useCallback(async () => {
        try {
            const data = await fetchJson(
                `https://api.github.com/users/${GITHUB_USER}/repos?sort=updated&per_page=10`,
                { timeout: 6000 }
            );
            return { repos: Array.isArray(data) ? data : [], error: null };
        } catch (e) {
            console.error('[GitHub] repos fetch failed:', e);
            const rateLimited = /\b403\b/.test(e.message || '');
            return { repos: null, error: rateLimited ? 'rate_limited' : 'error' };
        }
    }, []);

    useEffect(() => {
        let cancelled = false;

        const load = async () => {
            // Start the data fetches against the known PDS immediately and let the
            // DID resolution run alongside them. Blocking every request behind a
            // plc.directory round trip added ~400ms to first paint for a value
            // that has not changed.
            const pds = DEFAULT_PDS;

            fetchJson(`https://plc.directory/${DID}`, { timeout: 6000 })
                .then((doc) => {
                    if (cancelled) return;
                    const service = doc.service?.find(
                        (s) => s.id === '#atproto_pds' || s.type === 'AtprotoPersonalDataServer'
                    );
                    if (service?.serviceEndpoint) setResolvedPds(service.serviceEndpoint);
                    const alias = doc.alsoKnownAs?.find((a) => a.startsWith('at://'));
                    if (alias) setResolvedHandle(alias.substring(5));
                })
                .catch((e) => console.error('[DID] PLC resolution failed, using defaults:', e));

            fetchDocuments(pds).then((docs) => {
                if (cancelled) return;
                if (docs) {
                    setBlogs(docs);
                    writeCache(DOCS_CACHE_KEY, docs);
                }
                setLoadingBlogs(false);
            });

            const cachedPhotos = readCache(PHOTOS_CACHE_KEY);
            const photosAreFresh = cachedPhotos && Date.now() - cachedPhotos.timestamp < CACHE_FRESH_FOR;
            if (cachedPhotos) setLoadingPhotos(false);

            const refreshPhotos = () => {
                fetchFlashesPhotos(pds).then((items) => !cancelled && mergePhotos('flashes', items));
                fetchGrainPhotos().then((items) => !cancelled && mergePhotos('grain', items));
            };

            if (photosAreFresh) {
                // Let the cached grid paint and settle before spending bandwidth.
                setTimeout(() => !cancelled && refreshPhotos(), 1200);
            } else {
                refreshPhotos();
            }

            fetchJson('/api/hits', { timeout: 5000 })
                .then((data) => !cancelled && setHitsCount(typeof data?.hits === 'number' ? data.hits : 1337))
                .catch(() => !cancelled && setHitsCount(1337));

            fetchRepos().then(({ repos: fresh, error }) => {
                if (cancelled) return;
                if (fresh) {
                    setRepos(fresh);
                    writeCache(REPOS_CACHE_KEY, fresh);
                    setReposError(null);
                } else {
                    setReposError(error);
                }
                setLoadingRepos(false);
            });
        };

        load();
        return () => {
            cancelled = true;
        };
    }, [fetchFlashesPhotos, fetchGrainPhotos, fetchDocuments, fetchRepos, mergePhotos]);

    return (
        <DataContext.Provider
            value={{
                blogs,
                publications,
                photos,
                loadingBlogs,
                loadingPhotos,
                resolvedHandle,
                resolvedPds,
                hitsCount,
                repos,
                loadingRepos,
                reposError,
            }}
        >
            {children}
        </DataContext.Provider>
    );
};

export const useData = () => useContext(DataContext);
