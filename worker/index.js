/**
 * Cloudflare Worker entry point used by OpenAI Sites.
 * Static assets are served directly and client-side routes fall back to the SPA.
 */
export default {
  async fetch(request, env) {
    const response = await env.ASSETS.fetch(request)

    if (
      response.status === 404 &&
      request.method === 'GET' &&
      (request.headers.get('accept') ?? '').includes('text/html')
    ) {
      const fallbackUrl = new URL('/index.html', request.url)
      return env.ASSETS.fetch(new Request(fallbackUrl, request))
    }

    return response
  },
}
