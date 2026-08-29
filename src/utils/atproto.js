export const DID = 'did:plc:4hawmtgzjx3vclfyphbhfn7v';
export const DEFAULT_PDS = 'https://eurosky.social';
export const DEFAULT_HANDLE = 'j4ck.xyz';

/**
 * fetch + JSON, with a hard timeout. Every remote in this app is a third-party
 * appview that can and does stall; without a deadline a single hung request
 * holds the whole page in its loading state.
 */
export async function fetchJson(url, { timeout = 8000, ...init } = {}) {
    const response = await fetch(url, {
        ...init,
        headers: { Accept: 'application/json', ...(init.headers || {}) },
        signal: AbortSignal.timeout(timeout),
    });
    if (!response.ok) throw new Error(`${response.status} ${response.statusText} — ${url}`);
    return response.json();
}

/**
 * Public CDN URL for a blob in a repo. Bluesky's image CDN serves any blob it
 * has mirrored, re-encoded and ~10x smaller than the PDS original; `blobFallbackUrl`
 * is the authoritative source to fall back to on error.
 */
export function blobUrl(cid, { did = DID, size = 'feed_fullsize' } = {}) {
    if (!cid) return null;
    return `https://cdn.bsky.app/img/${size}/plain/${did}/${cid}@jpeg`;
}

export function blobFallbackUrl(cid, { did = DID, pds = DEFAULT_PDS } = {}) {
    if (!cid) return null;
    return `${pds}/xrpc/com.atproto.sync.getBlob?did=${encodeURIComponent(did)}&cid=${encodeURIComponent(cid)}`;
}

/** Blob refs arrive as `{ ref: { $link } }` on records and as `{ $link }` when nested. */
export function blobCid(blob) {
    return blob?.ref?.$link || blob?.ref?.toString?.() || blob?.$link || null;
}

export function rkeyOf(uri) {
    return typeof uri === 'string' ? uri.split('/').pop() : null;
}

export function listRecordsUrl({ pds = DEFAULT_PDS, repo = DID, collection, limit = 100, cursor }) {
    const params = new URLSearchParams({ repo, collection, limit: String(limit) });
    if (cursor) params.set('cursor', cursor);
    return `${pds}/xrpc/com.atproto.repo.listRecords?${params}`;
}
