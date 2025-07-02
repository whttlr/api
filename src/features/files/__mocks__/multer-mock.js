/**
 * Multer Mock for File Upload Testing
 */

export const createMockMulter = () => {
  const mockMulter = jest.fn();
  const mockSingle = jest.fn();
  const mockDiskStorage = jest.fn();
  
  mockMulter.diskStorage = mockDiskStorage;
  mockMulter.mockReturnValue({ single: mockSingle });
  mockSingle.mockReturnValue((req, res, next) => next());
  
  return {
    multer: mockMulter,
    single: mockSingle,
    diskStorage: mockDiskStorage
  };
};

export const createMockFile = (overrides = {}) => ({
  fieldname: 'file',
  originalname: 'test.gcode',
  encoding: '7bit',
  mimetype: 'text/plain',
  destination: '.gcode',
  filename: 'test-123.gcode',
  path: '.gcode/test-123.gcode',
  size: 1024,
  ...overrides
});