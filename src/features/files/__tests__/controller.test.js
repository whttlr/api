/**
 * Files Controller Tests
 * 
 * Comprehensive test suite for file upload, validation, and management functionality.
 * Tests file operations, security validation, and error handling.
 */

import { jest, describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import fs from 'fs';
import path from 'path';

// Mock the large controller functions
const mockController = {
  uploadFile: jest.fn(),
  validateFile: jest.fn(),
  getFileInfo: jest.fn(),
  deleteFile: jest.fn()
};

const mockFileProcessor = {
  validateGcodeFile: jest.fn(),
  analyzeFile: jest.fn(),
  getFileStats: jest.fn(),
  estimateExecutionTime: jest.fn()
};

const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  warn: jest.fn()
};

const mockApiMessages = {
  files: {
    success: {
      uploaded: 'File {filename} uploaded successfully',
      validated: 'File {filename} validated successfully',
      info_retrieved: 'File information retrieved for {filename}',
      deleted: 'File {filename} deleted successfully'
    },
    errors: {
      no_file: 'No file provided for upload',
      file_too_large: 'File size exceeds maximum limit of {maxSize}',
      invalid_extension: 'File extension {extension} not allowed',
      upload_failed: 'Failed to upload file {filename}',
      validation_failed: 'File validation failed for {filename}',
      file_not_found: 'File {filename} not found',
      delete_failed: 'Failed to delete file {filename}',
      malicious_content: 'File contains potentially malicious content'
    }
  }
};

// Mock file system operations
jest.mock('fs', () => ({
  promises: {
    access: jest.fn(),
    stat: jest.fn(),
    readFile: jest.fn(),
    writeFile: jest.fn(),
    unlink: jest.fn(),
    mkdir: jest.fn()
  },
  existsSync: jest.fn(),
  statSync: jest.fn(),
  createReadStream: jest.fn()
}));

// Mock multer for file upload handling
const mockMulter = {
  single: jest.fn(() => (req, res, next) => {
    req.file = {
      fieldname: 'file',
      originalname: 'test.gcode',
      encoding: '7bit',
      mimetype: 'text/plain',
      size: 1024,
      buffer: Buffer.from('G01 X10 Y10'),
      filename: 'test.gcode',
      path: '/uploads/test.gcode'
    };
    next();
  })
};

jest.mock('multer', () => () => mockMulter);

// Mock modules
jest.unstable_mockModule('@cnc/core/cnc/files', () => ({
  default: mockFileProcessor
}));

jest.unstable_mockModule('@cnc/core/services/logger', () => mockLogger);

jest.unstable_mockModule('../../config/messages.js', () => ({
  getApiMessages: jest.fn(() => mockApiMessages)
}));

// Import the controller after mocking
const { uploadFile, validateFile, getFileInfo, deleteFile } = await import('../controller.js');

describe('Files Controller', () => {
  let mockReq, mockRes;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Setup mock request and response objects
    mockReq = {
      file: null,
      body: {},
      params: {},
      query: {},
      headers: {}
    };
    
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      success: jest.fn().mockReturnThis(),
      error: jest.fn().mockReturnThis()
    };

    // Setup default successful behaviors
    fs.promises.access.mockResolvedValue();
    fs.promises.stat.mockResolvedValue({ size: 1024 });
    fs.promises.readFile.mockResolvedValue('G01 X10 Y10');
    fs.promises.writeFile.mockResolvedValue();
    fs.promises.unlink.mockResolvedValue();
    fs.existsSync.mockReturnValue(true);
    fs.statSync.mockReturnValue({ size: 1024, isFile: () => true });

    mockFileProcessor.validateGcodeFile.mockResolvedValue({
      valid: true,
      errors: [],
      warnings: []
    });

    mockFileProcessor.analyzeFile.mockResolvedValue({
      lineCount: 100,
      commandCount: 80,
      bounds: { x: [0, 100], y: [0, 100], z: [-5, 0] },
      tools: [1, 2, 3]
    });

    mockFileProcessor.getFileStats.mockResolvedValue({
      size: 1024,
      lines: 100,
      estimatedTime: 300
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('uploadFile', () => {
    test('should successfully upload valid G-code file', async () => {
      // Arrange
      mockReq.file = {
        fieldname: 'file',
        originalname: 'test.gcode',
        encoding: '7bit',
        mimetype: 'text/plain',
        size: 1024,
        buffer: Buffer.from('G01 X10 Y10\nG01 X20 Y20'),
        filename: 'test.gcode'
      };

      const expectedAnalysis = {
        lineCount: 2,
        commandCount: 2,
        bounds: { x: [0, 20], y: [0, 20], z: [0, 0] },
        estimatedTime: 120
      };

      mockFileProcessor.analyzeFile.mockResolvedValue(expectedAnalysis);

      // Act
      await uploadFile(mockReq, mockRes);

      // Assert
      expect(mockFileProcessor.validateGcodeFile).toHaveBeenCalledWith(
        expect.stringContaining('G01 X10 Y10')
      );
      expect(mockFileProcessor.analyzeFile).toHaveBeenCalledWith(
        expect.stringContaining('G01 X10 Y10')
      );
      expect(mockRes.success).toHaveBeenCalledWith(
        expect.objectContaining({
          filename: 'test.gcode',
          size: 1024,
          analysis: expectedAnalysis
        }),
        'File test.gcode uploaded successfully'
      );
      expect(mockLogger.info).toHaveBeenCalledWith('File uploaded successfully: test.gcode');
    });

    test('should reject upload when no file provided', async () => {
      // Arrange
      mockReq.file = null;

      // Act
      await uploadFile(mockReq, mockRes);

      // Assert
      expect(mockRes.error).toHaveBeenCalledWith(
        'No file provided for upload',
        400,
        'NO_FILE'
      );
      expect(mockFileProcessor.validateGcodeFile).not.toHaveBeenCalled();
    });

    test('should reject oversized files', async () => {
      // Arrange
      const largeFileSize = 100 * 1024 * 1024; // 100MB
      mockReq.file = {
        originalname: 'large.gcode',
        size: largeFileSize,
        buffer: Buffer.alloc(largeFileSize)
      };

      // Act
      await uploadFile(mockReq, mockRes);

      // Assert
      expect(mockRes.error).toHaveBeenCalledWith(
        expect.stringContaining('File size exceeds maximum limit'),
        413,
        'FILE_TOO_LARGE'
      );
      expect(mockLogger.warn).toHaveBeenCalledWith(
        `File upload rejected: large.gcode exceeds size limit (${largeFileSize} bytes)`
      );
    });

    test('should reject files with invalid extensions', async () => {
      // Arrange
      mockReq.file = {
        originalname: 'malicious.exe',
        size: 1024,
        mimetype: 'application/octet-stream'
      };

      // Act
      await uploadFile(mockReq, mockRes);

      // Assert
      expect(mockRes.error).toHaveBeenCalledWith(
        'File extension .exe not allowed',
        400,
        'INVALID_EXTENSION'
      );
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'File upload rejected: malicious.exe has invalid extension .exe'
      );
    });

    test('should handle G-code validation failures', async () => {
      // Arrange
      mockReq.file = {
        originalname: 'invalid.gcode',
        size: 1024,
        buffer: Buffer.from('INVALID GCODE CONTENT'),
        mimetype: 'text/plain'
      };

      mockFileProcessor.validateGcodeFile.mockResolvedValue({
        valid: false,
        errors: ['Invalid G-code command: INVALID'],
        warnings: []
      });

      // Act
      await uploadFile(mockReq, mockRes);

      // Assert
      expect(mockRes.error).toHaveBeenCalledWith(
        'File validation failed for invalid.gcode',
        400,
        'VALIDATION_FAILED',
        expect.objectContaining({
          errors: ['Invalid G-code command: INVALID']
        })
      );
    });

    test('should handle file system write errors', async () => {
      // Arrange
      mockReq.file = {
        originalname: 'test.gcode',
        size: 1024,
        buffer: Buffer.from('G01 X10 Y10'),
        mimetype: 'text/plain'
      };

      fs.promises.writeFile.mockRejectedValue(new Error('Disk full'));

      // Act
      await uploadFile(mockReq, mockRes);

      // Assert
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to save uploaded file test.gcode:',
        expect.any(Error)
      );
      expect(mockRes.error).toHaveBeenCalledWith(
        'Failed to upload file test.gcode',
        500,
        'UPLOAD_FAILED'
      );
    });

    test('should sanitize filenames for security', async () => {
      // Arrange
      const maliciousFilenames = [
        '../../../etc/passwd',
        '..\\..\\..\\windows\\system32\\config',
        'file with spaces.gcode',
        'file<>with|bad*chars.gcode',
        'normalfile.gcode'
      ];

      for (const filename of maliciousFilenames) {
        mockReq.file = {
          originalname: filename,
          size: 1024,
          buffer: Buffer.from('G01 X10 Y10'),
          mimetype: 'text/plain'
        };

        // Act
        await uploadFile(mockReq, mockRes);

        // Assert - Should either reject malicious names or sanitize them
        if (filename.includes('..') || filename.includes('<') || filename.includes('|')) {
          expect(mockRes.error).toHaveBeenCalledWith(
            expect.stringContaining('invalid'),
            400,
            expect.any(String)
          );
        } else {
          expect(mockRes.success).toHaveBeenCalled();
        }

        // Reset mocks for next iteration
        jest.clearAllMocks();
      }
    });

    test('should handle concurrent uploads', async () => {
      // Arrange
      const uploadPromises = Array.from({ length: 5 }, (_, i) => {
        const req = {
          file: {
            originalname: `test${i}.gcode`,
            size: 1024,
            buffer: Buffer.from(`G01 X${i} Y${i}`),
            mimetype: 'text/plain'
          }
        };
        const res = {
          success: jest.fn(),
          error: jest.fn()
        };
        return { req, res, promise: uploadFile(req, res) };
      });

      // Act
      await Promise.all(uploadPromises.map(({ promise }) => promise));

      // Assert
      uploadPromises.forEach(({ res }, i) => {
        expect(res.success).toHaveBeenCalledWith(
          expect.objectContaining({
            filename: `test${i}.gcode`
          }),
          `File test${i}.gcode uploaded successfully`
        );
      });
    });
  });

  describe('validateFile', () => {
    test('should validate uploaded file without saving', async () => {
      // Arrange
      mockReq.file = {
        originalname: 'validate.gcode',
        size: 1024,
        buffer: Buffer.from('G01 X10 Y10\nG02 X20 Y20 R5'),
        mimetype: 'text/plain'
      };

      const validationResult = {
        valid: true,
        errors: [],
        warnings: ['G02 command uses deprecated R format'],
        analysis: {
          lineCount: 2,
          commandCount: 2,
          bounds: { x: [0, 20], y: [0, 20], z: [0, 0] }
        }
      };

      mockFileProcessor.validateGcodeFile.mockResolvedValue(validationResult);

      // Act
      await validateFile(mockReq, mockRes);

      // Assert
      expect(mockFileProcessor.validateGcodeFile).toHaveBeenCalledWith(
        expect.stringContaining('G01 X10 Y10')
      );
      expect(mockRes.success).toHaveBeenCalledWith(
        validationResult,
        'File validate.gcode validated successfully'
      );
      expect(fs.promises.writeFile).not.toHaveBeenCalled(); // Should not save file
    });

    test('should handle validation of invalid G-code', async () => {
      // Arrange
      mockReq.file = {
        originalname: 'invalid.gcode',
        size: 1024,
        buffer: Buffer.from('INVALID COMMANDS\nG999 X999999'),
        mimetype: 'text/plain'
      };

      const validationResult = {
        valid: false,
        errors: [
          'Line 1: Unknown command INVALID',
          'Line 2: G999 is not a valid G-code command',
          'Line 2: X999999 exceeds maximum coordinate limit'
        ],
        warnings: []
      };

      mockFileProcessor.validateGcodeFile.mockResolvedValue(validationResult);

      // Act
      await validateFile(mockReq, mockRes);

      // Assert
      expect(mockRes.success).toHaveBeenCalledWith(
        validationResult,
        'File invalid.gcode validated successfully'
      );
      // Note: Validation success doesn't mean the file is valid, just that validation completed
    });

    test('should handle empty files', async () => {
      // Arrange
      mockReq.file = {
        originalname: 'empty.gcode',
        size: 0,
        buffer: Buffer.alloc(0),
        mimetype: 'text/plain'
      };

      // Act
      await validateFile(mockReq, mockRes);

      // Assert
      expect(mockRes.error).toHaveBeenCalledWith(
        'File is empty',
        400,
        'EMPTY_FILE'
      );
    });
  });

  describe('getFileInfo', () => {
    test('should return information for existing file', async () => {
      // Arrange
      mockReq.params = { filename: 'existing.gcode' };
      
      const fileStats = {
        size: 2048,
        lines: 150,
        estimatedTime: 600,
        created: '2024-06-24T12:00:00.000Z'
      };

      const fileAnalysis = {
        bounds: { x: [0, 100], y: [0, 100], z: [-10, 0] },
        tools: [1, 2],
        feedRates: [1000, 1500],
        spindleSpeeds: [12000]
      };

      mockFileProcessor.getFileStats.mockResolvedValue(fileStats);
      mockFileProcessor.analyzeFile.mockResolvedValue(fileAnalysis);

      // Act
      await getFileInfo(mockReq, mockRes);

      // Assert
      expect(fs.promises.access).toHaveBeenCalledWith(
        expect.stringContaining('existing.gcode')
      );
      expect(mockRes.success).toHaveBeenCalledWith(
        expect.objectContaining({
          filename: 'existing.gcode',
          stats: fileStats,
          analysis: fileAnalysis
        }),
        'File information retrieved for existing.gcode'
      );
    });

    test('should handle non-existent file', async () => {
      // Arrange
      mockReq.params = { filename: 'nonexistent.gcode' };
      fs.promises.access.mockRejectedValue(new Error('ENOENT'));

      // Act
      await getFileInfo(mockReq, mockRes);

      // Assert
      expect(mockRes.error).toHaveBeenCalledWith(
        'File nonexistent.gcode not found',
        404,
        'FILE_NOT_FOUND'
      );
    });

    test('should validate filename parameter', async () => {
      // Arrange - Test path traversal protection
      const maliciousFilenames = [
        '../../../etc/passwd',
        '..\\..\\..\\windows\\system32',
        'normal/../../../etc/passwd',
        ''
      ];

      for (const filename of maliciousFilenames) {
        mockReq.params = { filename };

        // Act
        await getFileInfo(mockReq, mockRes);

        // Assert
        expect(mockRes.error).toHaveBeenCalledWith(
          expect.stringContaining('Invalid filename'),
          400,
          'INVALID_FILENAME'
        );

        // Reset for next iteration
        jest.clearAllMocks();
      }
    });
  });

  describe('deleteFile', () => {
    test('should successfully delete existing file', async () => {
      // Arrange
      mockReq.params = { filename: 'delete-me.gcode' };

      // Act
      await deleteFile(mockReq, mockRes);

      // Assert
      expect(fs.promises.access).toHaveBeenCalledWith(
        expect.stringContaining('delete-me.gcode')
      );
      expect(fs.promises.unlink).toHaveBeenCalledWith(
        expect.stringContaining('delete-me.gcode')
      );
      expect(mockRes.success).toHaveBeenCalledWith(
        { deleted: true, filename: 'delete-me.gcode' },
        'File delete-me.gcode deleted successfully'
      );
      expect(mockLogger.info).toHaveBeenCalledWith('File deleted: delete-me.gcode');
    });

    test('should handle deletion of non-existent file', async () => {
      // Arrange
      mockReq.params = { filename: 'nonexistent.gcode' };
      fs.promises.access.mockRejectedValue(new Error('ENOENT'));

      // Act
      await deleteFile(mockReq, mockRes);

      // Assert
      expect(mockRes.error).toHaveBeenCalledWith(
        'File nonexistent.gcode not found',
        404,
        'FILE_NOT_FOUND'
      );
      expect(fs.promises.unlink).not.toHaveBeenCalled();
    });

    test('should handle file system deletion errors', async () => {
      // Arrange
      mockReq.params = { filename: 'locked.gcode' };
      fs.promises.unlink.mockRejectedValue(new Error('Permission denied'));

      // Act
      await deleteFile(mockReq, mockRes);

      // Assert
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to delete file locked.gcode:',
        expect.any(Error)
      );
      expect(mockRes.error).toHaveBeenCalledWith(
        'Failed to delete file locked.gcode',
        500,
        'DELETE_FAILED'
      );
    });

    test('should prevent deletion of system files', async () => {
      // Arrange - Test protection against dangerous deletions
      const dangerousFilenames = [
        '../../../etc/passwd',
        '..\\..\\..\\windows\\system32\\config',
        '/etc/passwd',
        'C:\\Windows\\System32\\config'
      ];

      for (const filename of dangerousFilenames) {
        mockReq.params = { filename };

        // Act
        await deleteFile(mockReq, mockRes);

        // Assert
        expect(mockRes.error).toHaveBeenCalledWith(
          expect.stringContaining('Invalid filename'),
          400,
          'INVALID_FILENAME'
        );
        expect(fs.promises.unlink).not.toHaveBeenCalled();

        // Reset for next iteration
        jest.clearAllMocks();
      }
    });
  });

  describe('Security and error handling', () => {
    test('should handle malformed multipart requests', async () => {
      // Arrange
      mockReq.file = undefined; // Simulates multer error

      // Act
      await uploadFile(mockReq, mockRes);

      // Assert
      expect(mockRes.error).toHaveBeenCalledWith(
        'No file provided for upload',
        400,
        'NO_FILE'
      );
    });

    test('should handle file processor service errors', async () => {
      // Arrange
      mockReq.file = {
        originalname: 'test.gcode',
        size: 1024,
        buffer: Buffer.from('G01 X10 Y10'),
        mimetype: 'text/plain'
      };

      mockFileProcessor.validateGcodeFile.mockRejectedValue(
        new Error('File processor service unavailable')
      );

      // Act
      await uploadFile(mockReq, mockRes);

      // Assert
      expect(mockLogger.error).toHaveBeenCalledWith(
        'File validation service error for test.gcode:',
        expect.any(Error)
      );
      expect(mockRes.error).toHaveBeenCalledWith(
        'File validation service temporarily unavailable',
        503,
        'SERVICE_UNAVAILABLE'
      );
    });

    test('should handle memory exhaustion during file processing', async () => {
      // Arrange
      const hugeFile = Buffer.alloc(500 * 1024 * 1024); // 500MB
      mockReq.file = {
        originalname: 'huge.gcode',
        size: hugeFile.length,
        buffer: hugeFile,
        mimetype: 'text/plain'
      };

      // Act
      await uploadFile(mockReq, mockRes);

      // Assert
      expect(mockRes.error).toHaveBeenCalledWith(
        expect.stringContaining('File size exceeds maximum limit'),
        413,
        'FILE_TOO_LARGE'
      );
    });
  });
});