export async function onRequest(context) {
  try {
    const response = await context.env.ASSETS.fetch(context.request);
    if (response.status === 404) {
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
