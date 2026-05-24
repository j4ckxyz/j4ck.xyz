export async function onRequest(context) {
    const { env } = context;
    
    // Fallback headers for CORS/JSON
    const headers = {
        'content-type': 'application/json',
        'access-control-allow-origin': '*',
        'access-control-allow-methods': 'GET, POST, OPTIONS',
        'access-control-allow-headers': 'Content-Type'
    };

    // Handle CORS preflight options
    if (context.request.method === 'OPTIONS') {
        return new Response(null, { headers });
    }

    // Default mock fallback for local dev if KV namespace HITS_KV is not bound
    if (!env || !env.HITS_KV) {
        return new Response(JSON.stringify({ 
            hits: 1337, 
            status: 'offline_fallback',
            message: 'To activate live counter: Bind a Cloudflare KV Namespace named "HITS_KV" to your Pages project in the CF Dashboard.'
        }), { headers });
    }

    try {
        // Extract client IP and hash it for privacy
        const ip = context.request.headers.get('cf-connecting-ip') || '127.0.0.1';
        const encoder = new TextEncoder();
        const data = encoder.encode(ip);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const ipHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        
        const rateLimitKey = `rate_limit:${ipHash}`;
        
        // Check if this IP has visited in the cooldown window
        const isCooldown = await env.HITS_KV.get(rateLimitKey);
        
        // Retrieve current hits count
        const currentCountStr = await env.HITS_KV.get('hits_total');
        let currentCount = parseInt(currentCountStr) || 0;
        
        if (!isCooldown) {
            // First visit in window -> Increment
            currentCount += 1;
            
            // Save count back to KV
            await env.HITS_KV.put('hits_total', currentCount.toString());
            
            // Set 30-minute cooldown window for this IP hash
            await env.HITS_KV.put(rateLimitKey, '1', { expirationTtl: 1800 });
            
            return new Response(JSON.stringify({ 
                hits: currentCount, 
                status: 'synchronized' 
            }), { headers });
        } else {
            // Duplicate refresh -> Return count without incrementing
            return new Response(JSON.stringify({ 
                hits: currentCount, 
                status: 'cooldown_active' 
            }), { headers });
        }
    } catch (e) {
        return new Response(JSON.stringify({ 
            error: e.message, 
            status: 'error_fallback',
            hits: 999 
        }), { 
            status: 500, 
            headers 
        });
    }
}
