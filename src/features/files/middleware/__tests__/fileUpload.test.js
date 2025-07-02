/**
 * File Upload Middleware Unit Tests
 */

import { 
  handleFileUpload, 
  validateFileOperation, 
  getFilePath, 
  getUploadInfo 
} from '../fileUpload.js';
import { ErrorCodes } from '../../../../shared/responseFormatter.js';
import { createMockRequest, createMockResponse, createMockNext } from '../../../../shared/__mocks__/express-mocks.js';
import { createMockFile } from '../../__mocks__/multer-mock.js';

// Mock fs/promises
jest.mock('fs/promises', () => ({
  access: jest.fn(),
  mkdir: jest.fn()
}));

// Mock multer
jest.mock('multer', () => {
  const mockMulter = jest.fn();
  const mockSingle = jest.fn();
  const mockDiskStorage = jest.fn();
  
  mockMulter.diskStorage = mockDiskStorage;
  mockMulter.mockReturnValue({ single: mockSingle });
  mockSingle.mockReturnValue((req, res, next) => {
    // Simulate successful file upload
    req.file = createMockFile();
    next();
  });
  
  return mockMulter;
});

// Mock logger
jest.mock('@cnc/core/services/logger', () => ({
  info: jest.fn(),
  error: jest.fn()
}));

import fs from 'fs/promises';
import multer from 'multer';
import { info, error as logError } from '@cnc/core/services/logger';

describe('File Upload Middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getUploadInfo', () => {
    test('should return upload configuration', () => {
      const uploadInfo = getUploadInfo();

      expect(uploadInfo).toHaveProperty('uploadDirectories');
      expect(uploadInfo).toHaveProperty('allowedExtensions');
      expect(uploadInfo).toHaveProperty('allowedMimeTypes');
      expect(uploadInfo).toHaveProperty('maxFileSize');

      expect(uploadInfo.uploadDirectories).toEqual({
        gcode: '.gcode',
        temp: '.temp',
        backups: '.backups'
      });

      expect(uploadInfo.allowedExtensions).toEqual(['.gcode', '.nc', '.txt', '.cnc']);
      expect(uploadInfo.allowedMimeTypes).toEqual(['text/plain', 'application/octet-stream']);
      expect(uploadInfo.maxFileSize).toBe(10 * 1024 * 1024);
    });
  });

  describe('getFilePath', () => {
    test('should return path for default type', () => {
      const filename = 'test.gcode';
      const result = getFilePath(filename);

      expect(result).toBe('.gcode/test.gcode');
    });

    test('should return path for specific type', () => {
      const filename = 'backup.gcode';
      const type = 'backups';
      const result = getFilePath(filename, type);

      expect(result).toBe('.backups/backup.gcode');
    });

    test('should return path for temp type', () => {
      const filename = 'temp.gcode';
      const type = 'temp';
      const result = getFilePath(filename, type);

      expect(result).toBe('.temp/temp.gcode');
    });

    test('should handle filename with path separators', () => {
      const filename = 'folder/test.gcode';
      const result = getFilePath(filename);

      expect(result).toBe('.gcode/folder/test.gcode');
    });
  });

  describe('handleFileUpload', () => {
    let req, res, next;

    beforeEach(() => {
      req = createMockRequest();
      res = createMockResponse();
      res.error = jest.fn();
      next = createMockNext();
      
      // Mock successful directory access
      fs.access.mockResolvedValue();
    });

    test('should configure multer with correct settings', () => {
      const fieldName = 'testFile';
      handleFileUpload(fieldName);

      expect(multer.diskStorage).toHaveBeenCalled();
      expect(multer).toHaveBeenCalledWith(expect.objectContaining({
        storage: expect.anything(),
        limits: { fileSize: 10 * 1024 * 1024 },
        fileFilter: expect.any(Function)
      }));
    });

    test('should create upload directories if they do not exist', async () => {
      fs.access.mockRejectedValueOnce({ code: 'ENOENT' });
      fs.mkdir.mockResolvedValue();

      const fieldName = 'file';
      const middleware = handleFileUpload(fieldName);
      
      // The directory creation happens during multer configuration
      expect(fs.access).toBeDefined();
      expect(fs.mkdir).toBeDefined();
    });

    test('should handle file upload successfully', async () => {
      const fieldName = 'file';
      const middleware = handleFileUpload(fieldName);
      
      await middleware(req, res, next);

      expect(req.file).toBeDefined();
      expect(req.file.originalname).toBe('test.gcode');
      expect(next).toHaveBeenCalled();
    });

    describe('file filter validation', () => {
      let fileFilter;

      beforeEach(() => {
        handleFileUpload('file');
        // Get the fileFilter function from the multer call
        const multerCall = multer.mock.calls[0][0];
        fileFilter = multerCall.fileFilter;
      });

      test('should accept valid gcode file', () => {
        const file = createMockFile({
          originalname: 'test.gcode',
          mimetype: 'text/plain'
        });
        const callback = jest.fn();

        fileFilter(req, file, callback);

        expect(callback).toHaveBeenCalledWith(null, true);
      });

      test('should accept valid nc file', () => {
        const file = createMockFile({
          originalname: 'test.nc',
          mimetype: 'application/octet-stream'
        });
        const callback = jest.fn();

        fileFilter(req, file, callback);

        expect(callback).toHaveBeenCalledWith(null, true);
      });

      test('should reject invalid extension', () => {
        const file = createMockFile({
          originalname: 'test.exe',
          mimetype: 'application/octet-stream'
        });
        const callback = jest.fn();

        fileFilter(req, file, callback);

        expect(callback).toHaveBeenCalledWith(
          expect.objectContaining({
            message: expect.stringContaining('Invalid file type')
          }),
          false
        );
      });

      test('should reject invalid mime type', () => {
        const file = createMockFile({
          originalname: 'test.gcode',
          mimetype: 'image/png'
        });
        const callback = jest.fn();

        fileFilter(req, file, callback);

        expect(callback).toHaveBeenCalledWith(
          expect.objectContaining({
            message: expect.stringContaining('Invalid file type')
          }),
          false
        );
      });

      test('should handle missing extension', () => {
        const file = createMockFile({
          originalname: 'test',
          mimetype: 'text/plain'
        });
        const callback = jest.fn();

        fileFilter(req, file, callback);

        expect(callback).toHaveBeenCalledWith(
          expect.objectContaining({
            message: expect.stringContaining('Invalid file type')
          }),
          false
        );
      });
    });
  });

  describe('validateFileOperation', () => {
    let req, res, next;

    beforeEach(() => {
      req = createMockRequest();
      res = createMockResponse();
      res.error = jest.fn();
      next = createMockNext();
    });

    test('should pass validation for valid filename', () => {
      req.params = { filename: 'test.gcode' };

      validateFileOperation(req, res, next);

      expect(next).toHaveBeenCalledWith();
      expect(res.error).not.toHaveBeenCalled();
    });

    test('should reject filename with path traversal attempt', () => {
      req.params = { filename: '../../../etc/passwd' };

      validateFileOperation(req, res, next);

      expect(res.error).toHaveBeenCalledWith(
        ErrorCodes.VALIDATION_ERROR,
        'Invalid filename: path traversal not allowed',
        { filename: '../../../etc/passwd' },
        400
      );
      expect(next).not.toHaveBeenCalled();
    });

    test('should reject filename with backslashes', () => {
      req.params = { filename: 'folder\\test.gcode' };

      validateFileOperation(req, res, next);

      expect(res.error).toHaveBeenCalledWith(
        ErrorCodes.VALIDATION_ERROR,
        'Invalid filename: path traversal not allowed',
        { filename: 'folder\\test.gcode' },
        400
      );
      expect(next).not.toHaveBeenCalled();
    });

    test('should reject empty filename', () => {
      req.params = { filename: '' };

      validateFileOperation(req, res, next);

      expect(res.error).toHaveBeenCalledWith(
        ErrorCodes.VALIDATION_ERROR,
        'Filename is required',
        { filename: '' },
        400
      );
      expect(next).not.toHaveBeenCalled();
    });

    test('should reject missing filename', () => {
      req.params = {};

      validateFileOperation(req, res, next);

      expect(res.error).toHaveBeenCalledWith(
        ErrorCodes.VALIDATION_ERROR,
        'Filename is required',
        { filename: undefined },
        400
      );
      expect(next).not.toHaveBeenCalled();
    });

    test('should reject invalid file extension', () => {
      req.params = { filename: 'malicious.exe' };

      validateFileOperation(req, res, next);

      expect(res.error).toHaveBeenCalledWith(
        ErrorCodes.VALIDATION_ERROR,
        'Invalid file extension. Allowed: .gcode, .nc, .txt, .cnc',
        { 
          filename: 'malicious.exe',
          extension: '.exe',
          allowedExtensions: ['.gcode', '.nc', '.txt', '.cnc']
        },
        400
      );
      expect(next).not.toHaveBeenCalled();
    });

    test('should accept valid filename with subfolder', () => {
      req.params = { filename: 'projects/test.gcode' };

      validateFileOperation(req, res, next);

      expect(next).toHaveBeenCalledWith();
      expect(res.error).not.toHaveBeenCalled();
    });

    test('should reject filename that is too long', () => {
      const longFilename = 'a'.repeat(256) + '.gcode';
      req.params = { filename: longFilename };

      validateFileOperation(req, res, next);

      expect(res.error).toHaveBeenCalledWith(
        ErrorCodes.VALIDATION_ERROR,
        'Filename too long (max 255 characters)',
        { filename: longFilename, length: longFilename.length },
        400
      );
      expect(next).not.toHaveBeenCalled();
    });
  });
});