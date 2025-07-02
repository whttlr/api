/**
 * Express Request/Response Mocks for API Testing
 */

export const createMockRequest = (overrides = {}) => {
  return {
    body: {},
    params: {},
    query: {},
    headers: {},
    method: 'GET',
    url: '/test',
    ip: '127.0.0.1',
    language: 'en',
    get: jest.fn((header) => {
      switch (header) {
        case 'User-Agent':
          return 'Jest Test Agent';
        default:
          return null;
      }
    }),
    ...overrides
  };
};

export const createMockResponse = () => {
  const res = {
    status: jest.fn(),
    json: jest.fn(),
    send: jest.fn(),
    setHeader: jest.fn(),
    success: jest.fn(),
    error: jest.fn(),
    locals: {}
  };
  
  // Chain status calls
  res.status.mockReturnValue(res);
  res.json.mockReturnValue(res);
  res.send.mockReturnValue(res);
  
  return res;
};

export const createMockNext = () => jest.fn();

export const createMockError = (message = 'Test error', code = 'TEST_ERROR', statusCode = 500) => {
  const error = new Error(message);
  error.code = code;
  error.statusCode = statusCode;
  error.details = { test: true };
  return error;
};