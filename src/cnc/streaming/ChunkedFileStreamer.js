/**
 * Chunked File Streamer
 * 
 * Handles streaming of large G-code files by breaking them into manageable chunks
 * to prevent memory issues and enable pause/resume functionality.
 */

import { EventEmitter } from 'events';
import { debug, info, warn, error } from '../../lib/logger/LoggerService.js';
import { FileAnalyzer } from './FileAnalyzer.js';
import { ChunkProcessor } from './ChunkProcessor.js';
import { StreamPauseResume } from './StreamPauseResume.js';
import { CheckpointManager } from './CheckpointManager.js';
import { MemoryManager } from './MemoryManager.js';

export class ChunkedFileStreamer extends EventEmitter {
  constructor(streamingManager, config = {}) {
    super();
    
    if (!streamingManager) {
      throw new Error('ChunkedFileStreamer requires a StreamingManager');
    }
    
    this.streamingManager = streamingManager;
    this.config = {
      chunkSize: 1000,                  // Lines per chunk
      enablePauseResume: true,          // Enable pause/resume functionality
      enableCheckpointing: true,        // Save progress checkpoints
      resumeFromCheckpoint: true,       // Resume from last checkpoint
      maxMemoryUsage: 50 * 1024 * 1024, // 50MB memory limit
      ...config
    };
    
    this.state = {
      isStreaming: false,
      isPaused: false,
      currentFile: null,
      currentChunk: 0,
      totalChunks: 0,
      currentLine: 0,
      totalLines: 0,
      bytesProcessed: 0,
      totalBytes: 0,
      startTime: null,
      pauseTime: null,
      resumeTime: null
    };
    
    // Initialize component managers
    this.fileAnalyzer = new FileAnalyzer(this.config);
    this.chunkProcessor = new ChunkProcessor(this.streamingManager, this.config);
    this.pauseResume = new StreamPauseResume(this.config);
    this.checkpointManager = new CheckpointManager(this.config);
    this.memoryManager = new MemoryManager(this.config);
    
    // Set up component event forwarding
    this.setupComponentEvents();
  }

  /**
   * Set up component event forwarding
   */
  setupComponentEvents() {
    // File analyzer events
    this.fileAnalyzer.on('fileAnalyzed', (analysis) => {
      this.state.totalLines = analysis.totalLines;
      this.state.totalChunks = analysis.chunks.length;
      this.emit('fileAnalyzed', analysis);
    });
    
    // Chunk processor events
    this.chunkProcessor.on('chunkCompleted', (event) => {
      this.state.currentChunk = event.chunkIndex + 1;
      this.emit('chunkCompleted', event);
    });
    
    this.chunkProcessor.on('processingCompleted', (event) => {
      this.emit('processingCompleted', event);
    });
    
    // Pause/resume events
    this.pauseResume.on('streamPaused', (event) => {
      this.state.isPaused = true;
      this.state.pauseTime = Date.now();
      this.emit('streamingPaused', event);
    });
    
    this.pauseResume.on('streamResumed', (event) => {
      this.state.isPaused = false;
      this.state.resumeTime = Date.now();
      this.emit('streamingResumed', event);
    });
    
    // Checkpoint events
    this.checkpointManager.on('checkpointCreated', (event) => {
      this.emit('checkpointCreated', event);
    });
    
    // Memory events
    this.memoryManager.on('memoryWarning', (event) => {
      this.emit('memoryWarning', event);
    });
  }
  
  /**
   * Start streaming a large file in chunks
   */
  async startChunkedStreaming(filePath, options = {}) {
    try {
      if (this.state.isStreaming) {
        throw new Error('Already streaming a file');
      }
      
      info(`Starting chunked streaming: ${filePath}`);
      
      // Initialize state
      this.state = {
        ...this.state,
        isStreaming: true,
        isPaused: false,
        currentFile: filePath,
        currentChunk: 0,
        currentLine: 0,
        startTime: Date.now()
      };
      
      // Start memory monitoring
      this.memoryManager.startMonitoring();
      
      // Check if resuming from checkpoint
      if (this.config.resumeFromCheckpoint && options.resumeFromCheckpoint) {
        const checkpoint = await this.checkpointManager.loadCheckpoint(filePath);
        if (checkpoint) {
          this.restoreFromCheckpoint(checkpoint);
        }
      }
      
      // Analyze file and create chunks
      const analysis = await this.fileAnalyzer.analyzeFile(filePath, options);
      
      // Start chunk processing
      await this.chunkProcessor.startProcessing(analysis.chunks, {
        startIndex: this.state.currentChunk
      });
      
      this.emit('chunkedStreamingStarted', {
        file: filePath,
        totalChunks: this.state.totalChunks,
        totalLines: this.state.totalLines,
        chunkSize: this.config.chunkSize
      });
      
    } catch (err) {
      error('Failed to start chunked streaming', { error: err.message, file: filePath });
      this.state.isStreaming = false;
      this.memoryManager.stopMonitoring();
      throw err;
    }
  }

  /**
   * Restore state from checkpoint
   */
  restoreFromCheckpoint(checkpoint) {
    this.state.currentChunk = checkpoint.state.currentChunk;
    this.state.currentLine = checkpoint.state.currentLine;
    this.state.bytesProcessed = checkpoint.state.bytesProcessed;
    this.state.totalChunks = checkpoint.state.totalChunks;
    this.state.totalLines = checkpoint.state.totalLines;
    this.state.totalBytes = checkpoint.state.totalBytes;
    
    info('State restored from checkpoint', {
      chunk: checkpoint.state.currentChunk,
      line: checkpoint.state.currentLine,
      timestamp: new Date(checkpoint.timestamp)
    });
  }

  /**
   * Pause chunked streaming
   */
  pauseStreaming() {
    if (!this.pauseResume.canPause()) {
      return false;
    }
    
    return this.pauseResume.requestPause('user_request');
  }

  /**
   * Resume chunked streaming
   */
  resumeStreaming() {
    if (!this.pauseResume.canResume()) {
      return false;
    }
    
    return this.pauseResume.requestResume();
  }

  /**
   * Stop chunked streaming
   */
  async stopStreaming(reason = 'user_request') {
    if (!this.state.isStreaming) {
      return;
    }
    
    info(`Stopping chunked streaming: ${reason}`);
    
    this.state.isStreaming = false;
    this.state.isPaused = false;
    
    // Stop components
    this.chunkProcessor.stop();
    this.memoryManager.stopMonitoring();
    
    const stats = this.getStreamingStats();
    
    this.emit('chunkedStreamingStopped', {
      reason,
      stats,
      completed: this.state.currentChunk >= this.state.totalChunks
    });
    
    debug('Chunked streaming stopped', { reason, stats });
  }

  /**
   * Create checkpoint during streaming
   */
  async createCheckpoint() {
    if (!this.config.enableCheckpointing) {
      return;
    }
    
    await this.checkpointManager.createCheckpoint(this.state, {
      metrics: this.chunkProcessor.getMetrics(),
      chunksSuccessful: this.chunkProcessor.getMetrics().chunksSuccessful,
      chunksFailed: this.chunkProcessor.getMetrics().chunksFailed
    });
  }

  /**
   * Get current progress
   */
  getProgress() {
    return {
      currentChunk: this.state.currentChunk,
      totalChunks: this.state.totalChunks,
      currentLine: this.state.currentLine,
      totalLines: this.state.totalLines,
      bytesProcessed: this.state.bytesProcessed,
      totalBytes: this.state.totalBytes,
      chunkProgress: this.state.totalChunks > 0 ? 
        (this.state.currentChunk / this.state.totalChunks) * 100 : 0,
      lineProgress: this.state.totalLines > 0 ? 
        (this.state.currentLine / this.state.totalLines) * 100 : 0,
      byteProgress: this.state.totalBytes > 0 ? 
        (this.state.bytesProcessed / this.state.totalBytes) * 100 : 0
    };
  }

  /**
   * Get streaming statistics
   */
  getStreamingStats() {
    const elapsed = this.state.startTime ? Date.now() - this.state.startTime : 0;
    
    return {
      ...this.state,
      chunkMetrics: this.chunkProcessor.getMetrics(),
      memoryStatus: this.memoryManager.getMemoryStatus(),
      pauseState: this.pauseResume.getPauseState(),
      progress: this.getProgress(),
      elapsedTime: elapsed
    };
  }

  /**
   * Get component status
   */
  getComponentStatus() {
    return {
      fileAnalyzer: this.fileAnalyzer.getAnalysisStatistics(),
      chunkProcessor: this.chunkProcessor.getStatus(),
      pauseResume: this.pauseResume.getCapabilities(),
      memoryManager: this.memoryManager.getMemoryStatus(),
      checkpointManager: this.checkpointManager.getStatistics()
    };
  }

  /**
   * Export streaming data
   */
  exportData() {
    return {
      state: { ...this.state },
      progress: this.getProgress(),
      componentData: {
        fileAnalyzer: this.fileAnalyzer.exportData(),
        chunkProcessor: this.chunkProcessor.exportData(),
        pauseResume: this.pauseResume.exportData(),
        memoryManager: this.memoryManager.exportData(),
        checkpointManager: this.checkpointManager.exportData()
      },
      config: { ...this.config }
    };
  }

  /**
   * Clean up and dispose
   */
  cleanup() {
    if (this.state.isStreaming) {
      this.stopStreaming('cleanup');
    }
    
    // Cleanup all components
    this.fileAnalyzer.cleanup();
    this.chunkProcessor.cleanup();
    this.pauseResume.cleanup();
    this.checkpointManager.cleanup();
    this.memoryManager.cleanup();
    
    this.removeAllListeners();
    
    debug('Chunked file streamer cleaned up');
  }
}