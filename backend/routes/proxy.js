const express = require('express');
const router = express.Router();

/**
 * GET /api/proxy/image
 * Proxies image requests to bypass CORS/Origin blocks.
 */
router.get('/image', async (req, res, next) => {
  try {
    const { url } = req.query;
    if (!url) return res.status(400).json({ error: 'URL is required.' });

    // Use built-in global fetch (available in Node.js 18+)
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to fetch image: ${response.statusText}`);

    const buffer = await response.arrayBuffer();
    res.set('Content-Type', response.headers.get('content-type') || 'image/jpeg');
    res.set('Cache-Control', 'public, max-age=3600');
    res.set('Cross-Origin-Resource-Policy', 'cross-origin');
    res.send(Buffer.from(buffer));
  } catch (error) {
    console.error('[Proxy Error]', error);
    res.status(500).json({ error: 'Failed to proxy image.' });
  }
});

module.exports = router;
