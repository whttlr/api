/**
 * CORS Configuration Middleware
 * 
 * Handles Cross-Origin Resource Sharing for the API
 */

import cors from 'cors';
import { info } from '../../../lib/logger/LoggerService.js';

/**
 * CORS configuration options
 */
const corsOptions = {
  // Allow requests from these origins (configure based on your needs)
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // In development, allow all origins
    if (process.env.NODE_ENV !== 'production') {
      return callback(null, true);
    }
    
    // In production, configure allowed origins
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:8080',
      // Add your frontend URLs here
    ];
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      info(`CORS blocked origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  
  // Allow these HTTP methods
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  
  // Allow these headers
  allowedHeaders: [
    'Origin',
    'X-Requested-With',
    'Content-Type',
    'Accept',
    'Authorization',
    'X-API-Key'
  ],
  
  // Expose these headers to the client
  exposedHeaders: [
    'X-Total-Count',
    'X-Execution-Time'
  ],
  
  // Allow credentials (cookies, authorization headers)
  credentials: true,
  
  // Cache preflight response for 24 hours
  maxAge: 86400
};

/**
 * Create CORS middleware
 */
export const corsMiddleware = cors(corsOptions);

/**
 * Manual CORS setup for WebSocket or custom handling
 */
export function setupCORS(req, res, next) {
  const origin = req.headers.origin;
  
  // Set CORS headers
  if (process.env.NODE_ENV !== 'production' || !origin || isAllowedOrigin(origin)) {
    res.header('Access-Control-Allow-Origin', origin || '*');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-API-Key');
    res.header('Access-Control-Expose-Headers', 'X-Total-Count, X-Execution-Time');
  }
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  next();
}

/**
 * Check if origin is allowed
 */
function isAllowedOrigin(origin) {
  const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:8080',
    // Add your frontend URLs here
  ];
  
  return allowedOrigins.includes(origin);
}

/**
 * Development CORS (allows all origins)
 */
export const devCorsMiddleware = cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['*']
});