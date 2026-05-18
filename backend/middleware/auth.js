const jwt = require('jsonwebtoken');
const crypto = require('crypto');
require('dotenv').config();

/**
 * Professional JWT & MFA Authentication Middleware
 * Handles both ES256 (via JWKS) and HS256 (via Secret)
 */

let cachedKey = null;

/**
 * Helper: Fetches the Public Key from Supabase JWKS endpoint
 * Requires the ANON_KEY as an apikey header for project access
 */
async function getPublicKey() {
  if (cachedKey) return cachedKey;

  // Use the URI from your .env (ensure it includes .json if needed)
  const jwksUrl = process.env.SUPABASE_JWKS_URL;
  
  if (!jwksUrl) {
    throw new Error('SUPABASE_JWKS_URL is missing in .env');
  }

  const res = await fetch(jwksUrl, {
    headers: { 
      'apikey': process.env.SUPABASE_ANON_KEY 
    },
  });

  if (!res.ok) throw new Error(`JWKS fetch failed: ${res.status}`);

  const { keys } = await res.json();
  // Look for the Elliptic Curve (EC) key used for ES256
  const jwk = keys.find(k => k.kty === 'EC' && k.crv === 'P-256');
  
  if (!jwk) throw new Error('No EC P-256 key found in JWKS');

  // Convert the JWK into a PEM format string for the jwt library
  cachedKey = crypto.createPublicKey({ key: jwk, format: 'jwk' })
    .export({ type: 'spki', format: 'pem' });

  console.log('✅ JWKS key loaded and cached successfully');
  return cachedKey;
}

const authenticate = (requireMFA = false) => {
  return async (req, res, next) => {
    const authHeader = req.headers.authorization;

    // 1. Check for Header Existence
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Access denied. No valid token provided.',
      });
    }

    const token = authHeader.split(' ')[1];

    try {
      // 2. Decode header first to determine the algorithm
      const decodedHeader = jwt.decode(token, { complete: true });
      if (!decodedHeader) throw new Error('Invalid token structure');
      
      const alg = decodedHeader.header.alg;
      let decoded;

      // 3. Dynamic Verification Path
      if (alg === 'ES256') {
        // New ECC public key verification
        const publicKey = await getPublicKey();
        decoded = jwt.verify(token, publicKey, { algorithms: ['ES256'] });
      } else if (alg === 'HS256') {
        // Legacy shared secret verification
        decoded = jwt.verify(token, process.env.SUPABASE_JWT_SECRET, { algorithms: ['HS256'] });
      } else {
        throw new Error(`Unsupported algorithm: ${alg}`);
      }

      // 4. Contextual User Attachment
      // We attach the whole object, but 'sub' is the unique ID you'll use for DB queries
      req.user = decoded;
      console.log(`✅ Auth Success: ${decoded.email} [${decoded.aal}]`);

      // 5. Smart MFA Logic
      // Segment-based security check for sensitive system paths
      const sensitiveSegments = ['/automation', '/billing', '/admin'];
      const isSensitivePath = sensitiveSegments.some(s => req.originalUrl.startsWith(s));

      // Logic: If the route requires MFA OR it's a sensitive path...
      if (requireMFA || isSensitivePath) {
        // aal1 = standard login, aal2 = verified MFA
        if (decoded.aal !== 'aal2') {
          return res.status(403).json({
            error: 'Multi-Factor Authentication Required',
            code: 'MFA_REQUIRED',
            next_step: 'Please complete the second-factor challenge.',
          });
        }
      }

      next();
    } catch (error) {
      // 6. Explicit Error Handling
      console.error('❌ Auth error:', error.message);
      
      // If fetching the public key failed, clear cache to allow retry next time
      if (error.message.includes('JWKS')) cachedKey = null;

      const message = error.name === 'TokenExpiredError' ? 'Token expired' : 'Invalid token';
      return res.status(401).json({ error: 'Unauthorized', message });
    }
  };
};

module.exports = authenticate;