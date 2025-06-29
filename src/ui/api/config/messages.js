/**
 * API Messages Configuration
 * 
 * Centralized message loading and caching for internationalization.
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { error } from '../../../lib/logger/LoggerService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Cache for loaded messages
const messageCache = new Map();

/**
 * Load API messages for a specific language
 */
export function getApiMessages(language = 'en') {
  // Check cache first
  if (messageCache.has(language)) {
    return messageCache.get(language);
  }
  
  try {
    const messagePath = join(__dirname, '..', 'locales', language, 'api-messages.json');
    const messagesData = readFileSync(messagePath, 'utf8');
    const messages = JSON.parse(messagesData);
    
    // Cache the messages
    messageCache.set(language, messages);
    
    return messages;
  } catch (err) {
    // Fallback to English if language not found
    if (language !== 'en') {
      return getApiMessages('en');
    }
    
    // If even English fails, return basic error structure
    error('Failed to load API messages', { error: err.message, language });
    return {
      common: {
        errors: {
          internal_server_error: 'Internal server error',
          endpoint_not_found: 'Endpoint not found'
        }
      }
    };
  }
}

/**
 * Clear message cache (useful for testing or hot reloading)
 */
export function clearMessageCache() {
  messageCache.clear();
}

/**
 * Get supported languages
 */
export function getSupportedLanguages() {
  return ['en']; // Add more languages as they are implemented
}