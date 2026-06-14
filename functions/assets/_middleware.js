export async function onRequest(context) {
  return new Response("Asset Not Found", {
    status: 404,
    headers: {
      "Content-Type": "text/plain",
      "Cache-Control": "no-cache, no-store, must-revalidate",
    },
  });
}
