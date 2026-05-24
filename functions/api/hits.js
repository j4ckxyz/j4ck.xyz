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
        // Retrieve current hits count
        const currentCountStr = await env.HITS_KV.get('hits_total');
        let currentCount = parseInt(currentCountStr) || 0;
        
        // Increment hits
        currentCount += 1;
        
        // Save count back to KV
        await env.HITS_KV.put('hits_total', currentCount.toString());

        return new Response(JSON.stringify({ 
            hits: currentCount, 
            status: 'synchronized' 
        }), { headers });
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
