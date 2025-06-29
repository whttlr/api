/**
 * FileAnalyzer Test Suite
 * 
 * Tests for file analysis functionality including metadata extraction,
 * chunk preparation, and G-code parsing capabilities.
 */

import { FileAnalyzer } from '../FileAnalyzer.js';
import { promises as fs } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

describe('FileAnalyzer', () => {
  let fileAnalyzer;
  let tempFilePath;
  let complexFilePath;

  beforeEach(async () => {
    fileAnalyzer = new FileAnalyzer({
      chunkSize: 5,
      enableMetadata: true,
      validateChunks: true,
      skipEmptyLines: true,
      skipComments: false
    });

    // Create a simple test G-code file
    tempFilePath = join(tmpdir(), `test_simple_${Date.now()}.gcode`);
    const simpleGcode = [
      'G21 ; Set units to mm',
      'G90 ; Absolute positioning',
      'G0 X0 Y0 Z5',
      'G1 Z0 F100',
      'G1 X10 Y0 F500',
      'G1 X10 Y10',
      'G1 X0 Y10',
      'G1 X0 Y0',
      'G0 Z5',
      'M30 ; Program end'
    ].join('\n');

    await fs.writeFile(tempFilePath, simpleGcode);

    // Create a complex test G-code file with various features
    complexFilePath = join(tmpdir(), `test_complex_${Date.now()}.gcode`);
    const complexGcode = [
      '; Complex G-code file with various features',
      'G21 ; Units in mm',
      'G90 ; Absolute positioning',
      'G17 ; XY plane',
      'T1 M6 ; Tool change to tool 1',
      'M3 S1000 ; Start spindle',
      'G0 X0 Y0 Z5',
      'G54 ; Work coordinate system 1',
      'G1 Z0 F100',
      'G2 X10 Y0 I5 J0 F500 ; Arc move',
      'G3 X0 Y10 I-5 J5 ; Another arc',
      'G55 ; Change to coordinate system 2',
      'T2 M6 ; Tool change to tool 2',
      '(Subroutine call)',
      'M98 P1000',
      'G0 Z10',
      'M5 ; Stop spindle',
      'M99 ; End subroutine',
      'M30 ; Program end',
      '',
      '; Empty line above',
      'G0 X0 Y0 ; Final move'
    ].join('\n');

    await fs.writeFile(complexFilePath, complexGcode);
  });

  afterEach(async () => {
    fileAnalyzer.cleanup();
    try {
      await fs.unlink(tempFilePath);
      await fs.unlink(complexFilePath);
    } catch (err) {
      // Files might not exist, ignore
    }
  });

  describe('constructor', () => {
    test('should create FileAnalyzer with default configuration', () => {
      const defaultAnalyzer = new FileAnalyzer();
      expect(defaultAnalyzer).toBeInstanceOf(FileAnalyzer);
      expect(defaultAnalyzer.config.chunkSize).toBe(1000);
      expect(defaultAnalyzer.config.enableMetadata).toBe(true);
    });

    test('should apply custom configuration', () => {
      expect(fileAnalyzer.config.chunkSize).toBe(5);
      expect(fileAnalyzer.config.enableMetadata).toBe(true);
      expect(fileAnalyzer.config.validateChunks).toBe(true);
    });
  });

  describe('file analysis', () => {
    test('should analyze simple G-code file', async () => {
      const fileAnalyzedSpy = jest.fn();
      fileAnalyzer.on('fileAnalyzed', fileAnalyzedSpy);

      const analysis = await fileAnalyzer.analyzeFile(tempFilePath);

      expect(analysis).toHaveProperty('filePath', tempFilePath);
      expect(analysis).toHaveProperty('fileSize');
      expect(analysis).toHaveProperty('totalLines');
      expect(analysis).toHaveProperty('chunks');
      expect(analysis).toHaveProperty('metadata');
      expect(analysis).toHaveProperty('analysisTime');

      expect(analysis.totalLines).toBeGreaterThan(0);
      expect(analysis.chunks.length).toBeGreaterThan(0);
      expect(analysis.fileSize).toBeGreaterThan(0);

      expect(fileAnalyzedSpy).toHaveBeenCalledWith(analysis);
    });

    test('should analyze complex G-code file with metadata', async () => {
      const analysis = await fileAnalyzer.analyzeFile(complexFilePath);

      expect(analysis.metadata.hasComments).toBe(true);
      expect(analysis.metadata.hasSubPrograms).toBe(true);
      expect(analysis.metadata.toolChanges).toBeGreaterThan(0);
      expect(analysis.metadata.coordinateSystemChanges).toBeGreaterThan(0);
    });

    test('should create chunks from file content', async () => {
      const analysis = await fileAnalyzer.analyzeFile(tempFilePath);

      expect(analysis.chunks.length).toBeGreaterThan(1); // Should create multiple chunks
      
      analysis.chunks.forEach((chunk, index) => {
        expect(chunk).toHaveProperty('index', index);
        expect(chunk).toHaveProperty('startLine');
        expect(chunk).toHaveProperty('endLine');
        expect(chunk).toHaveProperty('lineCount');
        expect(chunk).toHaveProperty('lines');
        expect(chunk.lines.length).toBeLessThanOrEqual(fileAnalyzer.config.chunkSize);
      });
    });

    test('should calculate chunk complexity', async () => {
      const analysis = await fileAnalyzer.analyzeFile(complexFilePath);

      analysis.chunks.forEach(chunk => {
        expect(chunk.metadata).toHaveProperty('complexity');
        expect(chunk.metadata.complexity).toBeGreaterThanOrEqual(0);
      });
    });

    test('should handle file not found error', async () => {
      const nonExistentFile = '/path/to/nonexistent/file.gcode';

      await expect(fileAnalyzer.analyzeFile(nonExistentFile))
        .rejects.toThrow();
    });
  });

  describe('line processing', () => {
    test('should skip empty lines when configured', async () => {
      fileAnalyzer.config.skipEmptyLines = true;

      const testFile = join(tmpdir(), `test_empty_lines_${Date.now()}.gcode`);
      const contentWithEmpty = [
        'G0 X0 Y0',
        '',
        'G1 X10 Y10',
        '',
        'M30'
      ].join('\n');

      await fs.writeFile(testFile, contentWithEmpty);

      const analysis = await fileAnalyzer.analyzeFile(testFile);

      // Should skip empty lines in processing
      const totalNonEmptyLines = contentWithEmpty.split('\n').filter(line => line.trim().length > 0).length;
      expect(analysis.totalLines).toBeLessThanOrEqual(totalNonEmptyLines);

      await fs.unlink(testFile);
    });

    test('should skip comment lines when configured', async () => {
      fileAnalyzer.config.skipComments = true;

      const testFile = join(tmpdir(), `test_comments_${Date.now()}.gcode`);
      const contentWithComments = [
        '; This is a comment',
        'G0 X0 Y0',
        '(Another comment)',
        'G1 X10 Y10',
        'M30'
      ].join('\n');

      await fs.writeFile(testFile, contentWithComments);

      const analysis = await fileAnalyzer.analyzeFile(testFile);

      // Should process fewer lines when skipping comments
      const totalLines = contentWithComments.split('\n').length;
      expect(analysis.totalLines).toBeLessThan(totalLines);

      await fs.unlink(testFile);
    });

    test('should detect G-code features in lines', async () => {
      const analysis = await fileAnalyzer.analyzeFile(complexFilePath);

      expect(analysis.metadata.hasComments).toBe(true);
      expect(analysis.metadata.toolChanges).toBeGreaterThan(0);
      expect(analysis.metadata.coordinateSystemChanges).toBeGreaterThan(0);
      expect(analysis.metadata.hasSubPrograms).toBe(true);
    });
  });

  describe('chunk validation', () => {
    test('should validate chunk integrity', async () => {
      fileAnalyzer.config.validateChunks = true;

      const analysis = await fileAnalyzer.analyzeFile(tempFilePath);

      // Check chunk continuity
      for (let i = 0; i < analysis.chunks.length - 1; i++) {
        const currentChunk = analysis.chunks[i];
        const nextChunk = analysis.chunks[i + 1];
        
        expect(nextChunk.startLine).toBe(currentChunk.endLine + 1);
      }

      // Check chunk indexes
      analysis.chunks.forEach((chunk, index) => {
        expect(chunk.index).toBe(index);
      });
    });

    test('should create chunk statistics', async () => {
      const analysis = await fileAnalyzer.analyzeFile(tempFilePath);

      expect(analysis).toHaveProperty('chunkStatistics');
      expect(analysis.chunkStatistics).toHaveProperty('totalChunks');
      expect(analysis.chunkStatistics).toHaveProperty('averageChunkSize');
      expect(analysis.chunkStatistics).toHaveProperty('largestChunk');
      expect(analysis.chunkStatistics).toHaveProperty('smallestChunk');
      expect(analysis.chunkStatistics).toHaveProperty('totalComplexity');
    });
  });

  describe('metadata extraction', () => {
    test('should extract metadata when enabled', async () => {
      fileAnalyzer.config.enableMetadata = true;

      const analysis = await fileAnalyzer.analyzeFile(complexFilePath);

      expect(analysis.metadata).toHaveProperty('hasComments');
      expect(analysis.metadata).toHaveProperty('hasSubPrograms');
      expect(analysis.metadata).toHaveProperty('toolChanges');
      expect(analysis.metadata).toHaveProperty('coordinateSystemChanges');
      expect(analysis.metadata).toHaveProperty('estimatedTime');
      expect(analysis.metadata).toHaveProperty('estimatedDistance');
    });

    test('should skip metadata when disabled', async () => {
      fileAnalyzer.config.enableMetadata = false;

      const analysis = await fileAnalyzer.analyzeFile(tempFilePath);

      // Metadata should still exist but be minimal
      expect(analysis.metadata.hasComments).toBe(false);
      expect(analysis.metadata.toolChanges).toBe(0);
    });

    test('should detect tool changes', async () => {
      const analysis = await fileAnalyzer.analyzeFile(complexFilePath);

      expect(analysis.metadata.toolChanges).toBeGreaterThan(0);
    });

    test('should detect coordinate system changes', async () => {
      const analysis = await fileAnalyzer.analyzeFile(complexFilePath);

      expect(analysis.metadata.coordinateSystemChanges).toBeGreaterThan(0);
    });
  });

  describe('file metadata utility', () => {
    test('should get basic file metadata', async () => {
      const metadata = await fileAnalyzer.getFileMetadata(tempFilePath);

      expect(metadata).toHaveProperty('filePath', tempFilePath);
      expect(metadata).toHaveProperty('fileName');
      expect(metadata).toHaveProperty('fileSize');
      expect(metadata).toHaveProperty('fileModified');
      expect(metadata).toHaveProperty('isAccessible', true);
    });

    test('should handle inaccessible files', async () => {
      const badFile = '/path/to/inaccessible/file.gcode';
      const metadata = await fileAnalyzer.getFileMetadata(badFile);

      expect(metadata.isAccessible).toBe(false);
      expect(metadata).toHaveProperty('error');
    });

    test('should estimate analysis time', async () => {
      const estimatedTime = await fileAnalyzer.estimateAnalysisTime(tempFilePath);

      expect(estimatedTime).toBeGreaterThanOrEqual(0);
    });
  });

  describe('progress tracking', () => {
    test('should emit analysis progress for large files', async () => {
      const progressSpy = jest.fn();
      fileAnalyzer.on('analysisProgress', progressSpy);

      // Create a larger file to trigger progress events
      const largeFile = join(tmpdir(), `test_large_${Date.now()}.gcode`);
      const largeContent = Array(12000).fill(0).map((_, i) => `G0 X${i} Y${i}`).join('\n');
      
      await fs.writeFile(largeFile, largeContent);

      await fileAnalyzer.analyzeFile(largeFile);

      // Should emit progress for large files
      expect(progressSpy).toHaveBeenCalled();

      await fs.unlink(largeFile);
    });
  });

  describe('statistics', () => {
    test('should track analysis statistics', async () => {
      await fileAnalyzer.analyzeFile(tempFilePath);
      await fileAnalyzer.analyzeFile(complexFilePath);

      const stats = fileAnalyzer.getAnalysisStatistics();

      expect(stats.totalFiles).toBe(2);
      expect(stats.totalLines).toBeGreaterThan(0);
      expect(stats.totalBytes).toBeGreaterThan(0);
      expect(stats.averageAnalysisTime).toBeGreaterThan(0);
      expect(stats.avgLinesPerFile).toBeGreaterThan(0);
      expect(stats.avgBytesPerFile).toBeGreaterThan(0);
    });

    test('should reset statistics', () => {
      fileAnalyzer.resetStatistics();

      const stats = fileAnalyzer.getAnalysisStatistics();
      expect(stats.totalFiles).toBe(0);
      expect(stats.totalLines).toBe(0);
      expect(stats.totalBytes).toBe(0);
    });
  });

  describe('data export', () => {
    test('should export analysis data', async () => {
      await fileAnalyzer.analyzeFile(tempFilePath);

      const exportData = fileAnalyzer.exportData();

      expect(exportData).toHaveProperty('metrics');
      expect(exportData).toHaveProperty('config');
      expect(exportData.metrics).toHaveProperty('totalFiles');
      expect(exportData.config).toHaveProperty('chunkSize');
    });
  });

  describe('cleanup', () => {
    test('should clean up resources', () => {
      fileAnalyzer.cleanup();

      expect(fileAnalyzer.listenerCount()).toBe(0);
    });
  });
});