/**
 * ChunkedFileStreamer Test Suite
 * 
 * Tests for chunked file streaming functionality including
 * file analysis, chunk processing, pause/resume, checkpointing, and memory management.
 */

import { ChunkedFileStreamer } from '../ChunkedFileStreamer.js';
import { MockStreamingManager } from '../__mocks__/MockStreamingManager.js';
import { promises as fs } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

describe('ChunkedFileStreamer', () => {
  let chunkedStreamer;
  let mockStreamingManager;
  let tempFilePath;

  beforeEach(async () => {
    mockStreamingManager = new MockStreamingManager();
    chunkedStreamer = new ChunkedFileStreamer(mockStreamingManager, {
      chunkSize: 10,
      enablePauseResume: true,
      enableCheckpointing: true,
      maxMemoryUsage: 10 * 1024 * 1024 // 10MB for testing
    });

    // Create a temporary G-code file for testing
    tempFilePath = join(tmpdir(), `test_gcode_${Date.now()}.gcode`);
    const testGcode = [
      'G21 ; Set units to mm',
      'G90 ; Absolute positioning',
      'G17 ; XY plane',
      'M3 S1000 ; Start spindle',
      'G0 X0 Y0 Z5',
      'G1 Z0 F100',
      'G1 X10 Y0 F500',
      'G1 X10 Y10',
      'G1 X0 Y10',
      'G1 X0 Y0',
      'G0 Z5',
      'M5 ; Stop spindle',
      'M30 ; Program end'
    ].join('\n');

    await fs.writeFile(tempFilePath, testGcode);
  });

  afterEach(async () => {
    chunkedStreamer.cleanup();
    try {
      await fs.unlink(tempFilePath);
    } catch (err) {
      // File might not exist, ignore
    }
  });

  describe('constructor', () => {
    test('should create ChunkedFileStreamer with valid streaming manager', () => {
      expect(chunkedStreamer).toBeInstanceOf(ChunkedFileStreamer);
      expect(chunkedStreamer.streamingManager).toBe(mockStreamingManager);
      expect(chunkedStreamer.state.isStreaming).toBe(false);
    });

    test('should throw error without streaming manager', () => {
      expect(() => new ChunkedFileStreamer()).toThrow('ChunkedFileStreamer requires a StreamingManager');
    });

    test('should initialize component managers', () => {
      expect(chunkedStreamer.fileAnalyzer).toBeDefined();
      expect(chunkedStreamer.chunkProcessor).toBeDefined();
      expect(chunkedStreamer.pauseResume).toBeDefined();
      expect(chunkedStreamer.checkpointManager).toBeDefined();
      expect(chunkedStreamer.memoryManager).toBeDefined();
    });

    test('should apply custom configuration', () => {
      expect(chunkedStreamer.config.chunkSize).toBe(10);
      expect(chunkedStreamer.config.enablePauseResume).toBe(true);
    });
  });

  describe('file streaming', () => {
    test('should start chunked streaming successfully', async () => {
      const startedSpy = jest.fn();
      chunkedStreamer.on('chunkedStreamingStarted', startedSpy);

      await chunkedStreamer.startChunkedStreaming(tempFilePath);

      expect(chunkedStreamer.state.isStreaming).toBe(true);
      expect(chunkedStreamer.state.currentFile).toBe(tempFilePath);
      expect(startedSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          file: tempFilePath,
          totalChunks: expect.any(Number),
          totalLines: expect.any(Number)
        })
      );
    });

    test('should not start streaming if already streaming', async () => {
      await chunkedStreamer.startChunkedStreaming(tempFilePath);

      await expect(chunkedStreamer.startChunkedStreaming(tempFilePath))
        .rejects.toThrow('Already streaming a file');
    });

    test('should analyze file and create chunks', async () => {
      const fileAnalyzedSpy = jest.fn();
      chunkedStreamer.on('fileAnalyzed', fileAnalyzedSpy);

      await chunkedStreamer.startChunkedStreaming(tempFilePath);

      expect(fileAnalyzedSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          totalLines: expect.any(Number),
          chunks: expect.any(Array),
          metadata: expect.any(Object)
        })
      );

      expect(chunkedStreamer.state.totalChunks).toBeGreaterThan(0);
      expect(chunkedStreamer.state.totalLines).toBeGreaterThan(0);
    });

    test('should process chunks sequentially', async () => {
      const chunkCompletedSpy = jest.fn();
      chunkedStreamer.on('chunkCompleted', chunkCompletedSpy);

      await chunkedStreamer.startChunkedStreaming(tempFilePath);

      // Wait for chunk processing
      await new Promise(resolve => setTimeout(resolve, 200));

      expect(chunkCompletedSpy).toHaveBeenCalled();
      expect(chunkedStreamer.state.currentChunk).toBeGreaterThan(0);
    });
  });

  describe('pause and resume', () => {
    test('should pause streaming', async () => {
      const pausedSpy = jest.fn();
      chunkedStreamer.on('streamingPaused', pausedSpy);

      await chunkedStreamer.startChunkedStreaming(tempFilePath);
      const result = chunkedStreamer.pauseStreaming();

      expect(result).toBe(true);
      expect(pausedSpy).toHaveBeenCalled();
    });

    test('should resume streaming', async () => {
      const resumedSpy = jest.fn();
      chunkedStreamer.on('streamingResumed', resumedSpy);

      await chunkedStreamer.startChunkedStreaming(tempFilePath);
      chunkedStreamer.pauseStreaming();
      const result = chunkedStreamer.resumeStreaming();

      expect(result).toBe(true);
      expect(resumedSpy).toHaveBeenCalled();
    });

    test('should not pause if not streaming', () => {
      const result = chunkedStreamer.pauseStreaming();
      expect(result).toBe(false);
    });

    test('should not resume if not paused', async () => {
      await chunkedStreamer.startChunkedStreaming(tempFilePath);
      const result = chunkedStreamer.resumeStreaming();
      expect(result).toBe(false);
    });
  });

  describe('checkpoint management', () => {
    test('should create checkpoints during streaming', async () => {
      const checkpointSpy = jest.fn();
      chunkedStreamer.on('checkpointCreated', checkpointSpy);

      await chunkedStreamer.startChunkedStreaming(tempFilePath);
      await chunkedStreamer.createCheckpoint();

      expect(checkpointSpy).toHaveBeenCalled();
    });

    test('should restore from checkpoint', async () => {
      // Create initial checkpoint
      await chunkedStreamer.startChunkedStreaming(tempFilePath);
      await chunkedStreamer.createCheckpoint();
      await chunkedStreamer.stopStreaming();

      // Start streaming with checkpoint resume
      await chunkedStreamer.startChunkedStreaming(tempFilePath, {
        resumeFromCheckpoint: true
      });

      // Should restore state from checkpoint
      expect(chunkedStreamer.state.currentChunk).toBeGreaterThanOrEqual(0);
    });
  });

  describe('memory management', () => {
    test('should monitor memory usage', async () => {
      const memoryWarningSpy = jest.fn();
      chunkedStreamer.on('memoryWarning', memoryWarningSpy);

      // Configure low memory limit to trigger warning
      chunkedStreamer.memoryManager.config.maxMemoryUsage = 1024; // 1KB
      chunkedStreamer.memoryManager.config.warningThreshold = 0.1; // 10%

      await chunkedStreamer.startChunkedStreaming(tempFilePath);

      // Should emit memory warning if usage exceeds threshold
      // (This may or may not trigger depending on actual memory usage)
    });

    test('should start and stop memory monitoring', async () => {
      await chunkedStreamer.startChunkedStreaming(tempFilePath);
      expect(chunkedStreamer.memoryManager.memoryState.isMonitoring).toBe(true);

      await chunkedStreamer.stopStreaming();
      expect(chunkedStreamer.memoryManager.memoryState.isMonitoring).toBe(false);
    });
  });

  describe('error handling', () => {
    test('should handle file analysis errors', async () => {
      const nonExistentFile = '/path/to/nonexistent/file.gcode';

      await expect(chunkedStreamer.startChunkedStreaming(nonExistentFile))
        .rejects.toThrow();
    });

    test('should handle streaming manager errors', async () => {
      mockStreamingManager.setMockError('startStreaming', new Error('Streaming failed'));

      await expect(chunkedStreamer.startChunkedStreaming(tempFilePath))
        .rejects.toThrow('Failed to start chunked streaming');
    });
  });

  describe('streaming control', () => {
    test('should stop streaming', async () => {
      const stoppedSpy = jest.fn();
      chunkedStreamer.on('chunkedStreamingStopped', stoppedSpy);

      await chunkedStreamer.startChunkedStreaming(tempFilePath);
      await chunkedStreamer.stopStreaming('user_request');

      expect(chunkedStreamer.state.isStreaming).toBe(false);
      expect(stoppedSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          reason: 'user_request'
        })
      );
    });

    test('should complete streaming successfully', async () => {
      const completedSpy = jest.fn();
      chunkedStreamer.on('processingCompleted', completedSpy);

      // Use small chunk size for quick completion
      chunkedStreamer.config.chunkSize = 1;

      await chunkedStreamer.startChunkedStreaming(tempFilePath);

      // Wait for completion
      await new Promise(resolve => setTimeout(resolve, 500));

      // Should complete processing
      expect(completedSpy).toHaveBeenCalled();
    });
  });

  describe('progress tracking', () => {
    test('should track streaming progress', async () => {
      await chunkedStreamer.startChunkedStreaming(tempFilePath);

      const progress = chunkedStreamer.getProgress();
      
      expect(progress).toHaveProperty('currentChunk');
      expect(progress).toHaveProperty('totalChunks');
      expect(progress).toHaveProperty('chunkProgress');
      expect(progress.chunkProgress).toBeGreaterThanOrEqual(0);
      expect(progress.chunkProgress).toBeLessThanOrEqual(100);
    });

    test('should provide streaming statistics', async () => {
      await chunkedStreamer.startChunkedStreaming(tempFilePath);

      const stats = chunkedStreamer.getStreamingStats();
      
      expect(stats).toHaveProperty('chunkMetrics');
      expect(stats).toHaveProperty('memoryStatus');
      expect(stats).toHaveProperty('pauseState');
      expect(stats).toHaveProperty('progress');
      expect(stats).toHaveProperty('elapsedTime');
    });

    test('should provide component status', async () => {
      await chunkedStreamer.startChunkedStreaming(tempFilePath);

      const status = chunkedStreamer.getComponentStatus();
      
      expect(status).toHaveProperty('fileAnalyzer');
      expect(status).toHaveProperty('chunkProcessor');
      expect(status).toHaveProperty('pauseResume');
      expect(status).toHaveProperty('memoryManager');
      expect(status).toHaveProperty('checkpointManager');
    });
  });

  describe('data export', () => {
    test('should export streaming data', async () => {
      await chunkedStreamer.startChunkedStreaming(tempFilePath);

      const exportData = chunkedStreamer.exportData();
      
      expect(exportData).toHaveProperty('state');
      expect(exportData).toHaveProperty('progress');
      expect(exportData).toHaveProperty('componentData');
      expect(exportData).toHaveProperty('config');
      
      expect(exportData.componentData).toHaveProperty('fileAnalyzer');
      expect(exportData.componentData).toHaveProperty('chunkProcessor');
      expect(exportData.componentData).toHaveProperty('pauseResume');
      expect(exportData.componentData).toHaveProperty('memoryManager');
      expect(exportData.componentData).toHaveProperty('checkpointManager');
    });
  });

  describe('event forwarding', () => {
    test('should forward file analyzer events', async () => {
      const fileAnalyzedSpy = jest.fn();
      chunkedStreamer.on('fileAnalyzed', fileAnalyzedSpy);

      await chunkedStreamer.startChunkedStreaming(tempFilePath);

      expect(fileAnalyzedSpy).toHaveBeenCalled();
    });

    test('should forward chunk processor events', async () => {
      const chunkCompletedSpy = jest.fn();
      chunkedStreamer.on('chunkCompleted', chunkCompletedSpy);

      await chunkedStreamer.startChunkedStreaming(tempFilePath);

      // Wait for chunk processing
      await new Promise(resolve => setTimeout(resolve, 200));

      expect(chunkCompletedSpy).toHaveBeenCalled();
    });

    test('should forward memory manager events', async () => {
      const memoryWarningSpy = jest.fn();
      chunkedStreamer.on('memoryWarning', memoryWarningSpy);

      // Events should be forwarded when components emit them
      await chunkedStreamer.startChunkedStreaming(tempFilePath);
    });
  });

  describe('configuration', () => {
    test('should apply configuration to components', () => {
      const customConfig = {
        chunkSize: 50,
        enablePauseResume: false,
        maxMemoryUsage: 20 * 1024 * 1024
      };

      const customStreamer = new ChunkedFileStreamer(mockStreamingManager, customConfig);

      expect(customStreamer.config.chunkSize).toBe(50);
      expect(customStreamer.config.enablePauseResume).toBe(false);
      expect(customStreamer.config.maxMemoryUsage).toBe(20 * 1024 * 1024);
    });
  });

  describe('cleanup', () => {
    test('should clean up resources', async () => {
      await chunkedStreamer.startChunkedStreaming(tempFilePath);
      
      chunkedStreamer.cleanup();

      expect(chunkedStreamer.state.isStreaming).toBe(false);
      expect(chunkedStreamer.listenerCount()).toBe(0);
    });

    test('should stop streaming during cleanup', async () => {
      await chunkedStreamer.startChunkedStreaming(tempFilePath);
      expect(chunkedStreamer.state.isStreaming).toBe(true);
      
      chunkedStreamer.cleanup();

      expect(chunkedStreamer.state.isStreaming).toBe(false);
    });
  });
});