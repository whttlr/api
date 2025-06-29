/**
 * Logger Service Mock for API Testing
 */

export const mockLogger = {
  info: jest.fn(),
  log: jest.fn(),
  debug: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
};

// Reset all mocks before each test
export const resetLoggerMocks = () => {
  Object.values(mockLogger).forEach(mock => mock.mockClear());
};