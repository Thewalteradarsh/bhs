/**
 * Vercel serverless proxy: /api/stream-proxy?url=<encoded CDN url>
 *
 * Pipes audio from aac.saavncdn.com through our origin so browsers
 * never hit a CORS block. Uses Node https module — no fetch needed.
 * Supports Range requests for seek/scrub.
 */
import https from 'https';
import http from 'http';

export default function handler(req, res) {
  const rawUrl = req.query && req.query.url;

  if (!rawUrl) {
    res.status(400).json({ error: 'Missing url param' });
    return;
  }

  let target;
  try {
    target = new URL(decodeURIComponent(rawUrl));
  } catch (e) {
    res.status(400).json({ error: 'Invalid url: ' + e.message });
    return;
  }

  const allowedHosts = ['aac.saavncdn.com', 'c.saavncdn.com', 'audio.saavn.com'];
  if (!allowedHosts.some(h => target.hostname === h || target.hostname.endsWith('.' + h))) {
    res.status(403).json({ error: 'Forbidden host: ' + target.hostname });
    return;
  }

  const lib = target.protocol === 'https:' ? https : http;

  const options = {
    hostname: target.hostname,
    port: target.port || (target.protocol === 'https:' ? 443 : 80),
    path: target.pathname + target.search,
    method: 'GET',
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': '*/*',
      'Origin': 'https://www.jiosaavn.com',
      'Referer': 'https://www.jiosaavn.com/',
    },
  };

  if (req.headers['range']) {
    options.headers['Range'] = req.headers['range'];
  }

  const proxyReq = lib.request(options, (upstream) => {
    const fwdHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, HEAD',
      'Cache-Control': 'public, max-age=3600',
    };

    ['content-type', 'content-length', 'content-range', 'accept-ranges'].forEach(h => {
      if (upstream.headers[h]) fwdHeaders[h] = upstream.headers[h];
    });

    res.writeHead(upstream.statusCode, fwdHeaders);
    upstream.pipe(res);

    upstream.on('error', (err) => {
      console.error('[stream-proxy] upstream read error:', err.message);
      if (!res.writableEnded) res.end();
    });
  });

  proxyReq.on('error', (err) => {
    console.error('[stream-proxy] request error:', err.message);
    if (!res.headersSent) {
      res.status(502).json({ error: 'Upstream error', detail: err.message });
    } else {
      res.end();
    }
  });

  proxyReq.end();
}
