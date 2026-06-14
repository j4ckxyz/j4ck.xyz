export async function onRequest(context) {
  try {
    const response = await context.env.ASSETS.fetch(context.request);
    
    // If a request for a static asset falls back to index.html (which is text/html),
    // it means the static asset does not exist. We intercept this and return a 404.
    const contentType = response.headers.get("content-type") || "";
    if (response.status === 404 || contentType.includes("text/html")) {
      return new Response("Asset Not Found", {
        status: 404,
        headers: {
          "Content-Type": "text/plain",
          "Cache-Control": "no-cache, no-store, must-revalidate",
        },
      });
    }
    
    return response;
  } catch (err) {
    return new Response("Asset Not Found", {
      status: 404,
      headers: {
        "Content-Type": "text/plain",
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    });
  }
}
