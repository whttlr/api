/**
 * API Security Configuration
 * 
 * Security headers, CORS, and other security-related settings.
 */

export const securityConfig = {
  // Helmet configuration
  helmet: {
    contentSecurityPolicy: false, // Disable CSP for API
    crossOriginEmbedderPolicy: false, // Allow embedding for development
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    referrerPolicy: { policy: 'no-referrer' }
  },
  
  // CORS configuration
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Origin',
      'X-Requested-With',
      'Content-Type',
      'Accept',
      'Authorization',
      'Accept-Language'
    ],
    credentials: process.env.CORS_CREDENTIALS === 'true',
    maxAge: 86400 // 24 hours
  },
  
  // Rate limiting (if implemented)
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // limit each IP to 1000 requests per windowMs
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false
  },
  
  // API versioning
  versioning: {
    currentVersion: 'v1',
    supportedVersions: ['v1'],
    deprecationNotice: {
      enabled: false,
      message: 'This API version is deprecated. Please upgrade to the latest version.'
    }
  }
};