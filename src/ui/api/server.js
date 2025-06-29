#!/usr/bin/env node

/**
 * CNC G-code Sender API Server
 * 
 * Express.js server providing REST API access to CNC functionality
 */

import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import { info, error as logError } from '../../lib/logger/LoggerService.js';
import { corsMiddleware } from './middleware/cors.js';
import { responseFormatter } from './shared/responseFormatter.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { setupSwagger } from './docs/swagger.js';
import apiRoutes from './routes/index.js';

// Create Express app
const app = express();

// Get port from environment or default to 3000
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

/**
 * Middleware Setup
 */

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false, // Disable CSP for API
  crossOriginEmbedderPolicy: false // Allow embedding for development
}));

// CORS middleware
app.use(corsMiddleware);

// Logging middleware
app.use(morgan('combined', {
  stream: {
    write: (message) => info(`API: ${message.trim()}`)
  }
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' })); // Allow larger JSON payloads for G-code files
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Response formatting middleware
app.use(responseFormatter);

// Setup Swagger documentation
setupSwagger(app);

/**
 * Routes
 */

// API root endpoint
app.get('/', (req, res) => {
  res.success({
    service: 'CNC G-code Sender API',
    version: '1.0.0',
    message: 'Welcome to the CNC G-code Sender API',
    documentation: '/api/v1/info',
    endpoints: {
      connection: '/api/v1/connection',
      machine: '/api/v1/machine',
      health: '/api/v1/health',
      docs: '/api/v1/docs'
    }
  }, 'CNC API is running');
});

// Mount API routes
app.use('/api/v1', apiRoutes);

/**
 * Error Handling
 */

// 404 handler for unmatched routes
app.use(notFoundHandler);

// Global error handler (must be last)
app.use(errorHandler);

/**
 * Server Startup
 */

// Graceful shutdown handler
function gracefulShutdown(signal) {
  info(`API: Received ${signal}, shutting down gracefully...`);
  
  server.close(() => {
    info('API: Server closed successfully');
    process.exit(0);
  });
  
  // Force close after 10 seconds
  setTimeout(() => {
    logError('API: Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
}

// Start server
const server = app.listen(PORT, HOST, () => {
  info(`🚀 CNC API Server started successfully`);
  info(`📡 Server listening on http://${HOST}:${PORT}`);
  info(`🔍 Health check: http://${HOST}:${PORT}/api/v1/health`);
  info(`📖 API info: http://${HOST}:${PORT}/api/v1/info`);
  info(`📚 API documentation: http://${HOST}:${PORT}/api/v1/docs`);
  info(`🔌 Connection endpoints: http://${HOST}:${PORT}/api/v1/connection`);
  info(`🤖 Machine endpoints: http://${HOST}:${PORT}/api/v1/machine`);
  info(`⚙️  G-code endpoints: http://${HOST}:${PORT}/api/v1/gcode`);
  info(`📁 File endpoints: http://${HOST}:${PORT}/api/v1/files`);
  info(`🎯 Preset endpoints: http://${HOST}:${PORT}/api/v1/presets`);
  
  if (process.env.NODE_ENV !== 'production') {
    info('🛠️  Running in development mode');
  }
});

// Handle server errors
server.on('error', (error) => {
  if (error.syscall !== 'listen') {
    throw error;
  }

  const bind = typeof PORT === 'string' ? 'Pipe ' + PORT : 'Port ' + PORT;

  switch (error.code) {
    case 'EACCES':
      logError(`${bind} requires elevated privileges`);
      process.exit(1);
    case 'EADDRINUSE':
      logError(`${bind} is already in use`);
      process.exit(1);
    default:
      throw error;
  }
});

// Graceful shutdown on SIGTERM and SIGINT
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logError('API: Uncaught Exception:', error);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logError('API: Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

export default app;