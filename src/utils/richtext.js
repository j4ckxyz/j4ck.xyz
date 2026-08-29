// Leaflet/Bluesky richtext facets index into the UTF-8 *bytes* of the
// plaintext, not into JS's UTF-16 string. Slice the encoded bytes at every
// facet boundary so emoji and accented characters don't shift the ranges.

const encoder = new TextEncoder();
const decoder = new TextDecoder();

/**
 * Split `plaintext` into contiguous segments, each carrying the facet features
 * that cover it. Overlapping facets (bold inside a link, say) both land on the
 * overlapping segment.
 *
 * @returns {{ text: string, features: object[] }[]}
 */
export function segmentFacets(plaintext, facets) {
    const text = plaintext ?? '';
    const list = Array.isArray(facets) ? facets.filter((f) => f?.index) : [];
    if (list.length === 0) return [{ text, features: [] }];

    const bytes = encoder.encode(text);
    const clamp = (n) => Math.max(0, Math.min(n, bytes.length));

    const boundaries = new Set([0, bytes.length]);
    for (const facet of list) {
        boundaries.add(clamp(facet.index.byteStart ?? 0));
        boundaries.add(clamp(facet.index.byteEnd ?? 0));
    }

    const cuts = [...boundaries].sort((a, b) => a - b);
    const segments = [];

    for (let i = 0; i < cuts.length - 1; i++) {
        const start = cuts[i];
        const end = cuts[i + 1];
        if (end <= start) continue;

        const features = [];
        for (const facet of list) {
            const fStart = clamp(facet.index.byteStart ?? 0);
            const fEnd = clamp(facet.index.byteEnd ?? 0);
            if (fStart <= start && fEnd >= end) features.push(...(facet.features || []));
        }

        segments.push({ text: decoder.decode(bytes.slice(start, end)), features });
    }

    return segments;
}

/** Pull the first link URI out of a segment's features, if any. */
export function linkFromFeatures(features) {
    const link = features.find(
        (f) => f?.$type === 'pub.leaflet.richtext.facet#link' || f?.$type === 'app.bsky.richtext.facet#link'
    );
    return link?.uri || null;
}

/** Feature `$type` suffixes present on a segment, e.g. `['bold', 'code']`. */
export function styleFlags(features) {
    return new Set(
        features
            .map((f) => (typeof f?.$type === 'string' ? f.$type.split('#')[1] : null))
            .filter(Boolean)
    );
}
