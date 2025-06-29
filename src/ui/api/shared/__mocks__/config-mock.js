/**
 * Config Mocks for API Testing
 */

export const mockGetApiMessages = jest.fn(() => ({
  errors: {
    internal_error: 'An internal error occurred',
    validation_error: 'Validation failed',
    not_found: 'Resource not found'
  }
}));

// Mock the config/messages module
jest.mock('../../config/messages.js', () => ({
  getApiMessages: mockGetApiMessages
}));