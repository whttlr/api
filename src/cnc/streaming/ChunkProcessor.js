/**
 * Chunk Processor
 * 
 * Handles processing and streaming of G-code chunks with retry logic,
 * concurrent processing, and progress tracking.
 */

import { EventEmitter } from 'events';
import { debug, info, warn, error } from '../../lib/logger/LoggerService.js';

export class ChunkProcessor extends EventEmitter {
  constructor(streamingManager, config = {}) {
    super();
    
    if (!streamingManager) {
      throw new Error('ChunkProcessor requires a StreamingManager');
    }
    
    this.streamingManager = streamingManager;
    this.config = {
      maxConcurrentChunks: 3,           // Max chunks processing simultaneously
      retryFailedChunks: true,          // Retry failed chunks
      maxChunkRetries: 3,               // Max retries per chunk
      chunkTimeout: 30000,              // Chunk processing timeout (ms)
      enablePrioritization: true,       // Enable chunk priority processing
      validateChunkCompletion: true,    // Validate chunk completion
      trackProcessingMetrics: true,     // Track detailed metrics
      ...config
    };
    
    this.processingState = {
      isProcessing: false,
      isPaused: false,
      currentChunkIndex: 0,
      totalChunks: 0,
      processedChunks: 0,
      failedChunks: 0,
      startTime: null
    };
    
    this.activeChunks = new Map();
    this.failedChunks = new Map();
    this.completedChunks = new Set();
    this.chunkQueue = [];
    this.retryQueue = [];
    
    this.metrics = {
      chunksProcessed: 0,
      chunksSuccessful: 0,
      chunksFailed: 0,
      chunksRetried: 0,
      averageChunkTime: 0,
      totalChunkTime: 0,
      maxConcurrentReached: 0,
      totalRetryTime: 0
    };
  }
  
  /**
   * Start processing chunks
   */
  async startProcessing(chunks, options = {}) {
    try {
      if (this.processingState.isProcessing) {
        throw new Error('Chunk processing already in progress');
      }
      
      debug('Starting chunk processing', { chunks: chunks.length });
      
      // Initialize processing state
      this.processingState = {
        isProcessing: true,
        isPaused: false,
        currentChunkIndex: options.startIndex || 0,
        totalChunks: chunks.length,
        processedChunks: 0,
        failedChunks: 0,
        startTime: Date.now()
      };
      
      // Initialize chunk queue
      this.chunkQueue = chunks.slice(this.processingState.currentChunkIndex);
      
      // Start processing chunks
      await this.processChunkQueue();
      
      info('Chunk processing completed', {
        processed: this.processingState.processedChunks,
        failed: this.processingState.failedChunks,
        total: this.processingState.totalChunks
      });
      
      this.emit('processingCompleted', {
        totalChunks: this.processingState.totalChunks,
        processedChunks: this.processingState.processedChunks,
        failedChunks: this.processingState.failedChunks,
        processingTime: Date.now() - this.processingState.startTime
      });
      
    } catch (err) {
      error('Chunk processing failed', { error: err.message });
      this.processingState.isProcessing = false;
      throw err;
    }
  }
  
  /**
   * Process the chunk queue
   */
  async processChunkQueue() {
    while (this.chunkQueue.length > 0 && this.processingState.isProcessing && !this.processingState.isPaused) {
      // Wait if we've reached the concurrent limit
      if (this.activeChunks.size >= this.config.maxConcurrentChunks) {
        await this.waitForChunkCompletion();
        continue;
      }
      
      // Get next chunk
      const chunk = this.chunkQueue.shift();
      if (!chunk) {
        break;
      }
      
      // Start processing chunk
      this.processChunk(chunk);
      
      // Update metrics
      this.metrics.maxConcurrentReached = Math.max(
        this.metrics.maxConcurrentReached,
        this.activeChunks.size
      );
    }
    
    // Wait for all remaining chunks to complete
    while (this.activeChunks.size > 0 && this.processingState.isProcessing) {
      await this.waitForChunkCompletion();
    }
    
    // Process any retry queue items
    if (this.retryQueue.length > 0 && this.config.retryFailedChunks) {
      await this.processRetryQueue();
    }
    
    this.processingState.isProcessing = false;
  }
  
  /**
   * Process individual chunk
   */
  async processChunk(chunk) {
    const chunkStartTime = Date.now();
    const chunkId = `chunk_${chunk.index}`;
    
    try {
      debug('Processing chunk', { index: chunk.index, lines: chunk.lineCount });
      
      // Add to active chunks
      this.activeChunks.set(chunkId, {
        chunk,
        startTime: chunkStartTime,
        timeout: setTimeout(() => {
          this.handleChunkTimeout(chunkId);
        }, this.config.chunkTimeout)
      });
      
      // Process chunk lines
      const result = await this.streamChunkLines(chunk);
      
      // Handle successful completion
      await this.handleChunkSuccess(chunkId, result, chunkStartTime);
      
    } catch (err) {
      // Handle chunk failure
      await this.handleChunkFailure(chunkId, err, chunkStartTime);
    }
  }
  
  /**
   * Stream chunk lines to the machine
   */
  async streamChunkLines(chunk) {
    const results = [];
    
    for (let i = 0; i < chunk.lines.length; i++) {
      const line = chunk.lines[i];
      const lineNumber = chunk.startLine + i;
      
      try {
        // Send line to streaming manager
        const result = await this.streamingManager.sendLine(line, {
          lineNumber,
          chunkIndex: chunk.index,
          isLastLineInChunk: i === chunk.lines.length - 1
        });
        
        results.push({
          lineNumber,
          line,
          result,
          success: true
        });
        
        // Emit progress
        this.emit('lineProcessed', {
          chunkIndex: chunk.index,
          lineNumber,
          line,
          result
        });
        
      } catch (err) {
        results.push({
          lineNumber,
          line,
          error: err.message,
          success: false
        });
        
        // Continue processing other lines in chunk
        warn('Line processing failed', { 
          lineNumber, 
          line: line.substring(0, 50),
          error: err.message 
        });
      }
    }
    
    return results;
  }
  
  /**
   * Handle successful chunk completion
   */
  async handleChunkSuccess(chunkId, result, startTime) {
    const activeChunk = this.activeChunks.get(chunkId);
    if (!activeChunk) {
      return;
    }
    
    // Clear timeout
    clearTimeout(activeChunk.timeout);
    
    // Remove from active chunks
    this.activeChunks.delete(chunkId);
    
    // Add to completed chunks
    this.completedChunks.add(activeChunk.chunk.index);
    
    // Update processing state
    this.processingState.processedChunks++;
    this.processingState.currentChunkIndex = activeChunk.chunk.index + 1;
    
    // Update metrics
    const processingTime = Date.now() - startTime;
    this.updateProcessingMetrics(true, processingTime);
    
    // Validate chunk completion if enabled
    if (this.config.validateChunkCompletion) {
      this.validateChunkCompletion(activeChunk.chunk, result);
    }
    
    debug('Chunk processing completed', {
      index: activeChunk.chunk.index,
      lines: activeChunk.chunk.lineCount,
      processingTime: `${processingTime}ms`
    });
    
    this.emit('chunkCompleted', {
      chunk: activeChunk.chunk,
      result,
      processingTime
    });
  }
  
  /**
   * Handle chunk processing failure
   */
  async handleChunkFailure(chunkId, err, startTime) {
    const activeChunk = this.activeChunks.get(chunkId);
    if (!activeChunk) {
      return;
    }
    
    // Clear timeout
    clearTimeout(activeChunk.timeout);
    
    // Remove from active chunks
    this.activeChunks.delete(chunkId);
    
    // Update processing state
    this.processingState.failedChunks++;
    
    // Update metrics
    const processingTime = Date.now() - startTime;
    this.updateProcessingMetrics(false, processingTime);
    
    // Handle retry logic
    const retryCount = this.failedChunks.get(activeChunk.chunk.index) || 0;
    
    if (this.config.retryFailedChunks && retryCount < this.config.maxChunkRetries) {
      // Add to retry queue
      this.failedChunks.set(activeChunk.chunk.index, retryCount + 1);
      this.retryQueue.push(activeChunk.chunk);
      
      warn('Chunk failed, queued for retry', {
        index: activeChunk.chunk.index,
        retryCount: retryCount + 1,
        error: err.message
      });
      
      this.emit('chunkRetryQueued', {
        chunk: activeChunk.chunk,
        retryCount: retryCount + 1,
        error: err.message
      });
      
    } else {
      // Final failure
      error('Chunk processing failed permanently', {
        index: activeChunk.chunk.index,
        retryCount,
        error: err.message
      });
      
      this.emit('chunkFailed', {
        chunk: activeChunk.chunk,
        error: err.message,
        retryCount
      });
    }
  }
  
  /**
   * Handle chunk timeout
   */
  handleChunkTimeout(chunkId) {
    const activeChunk = this.activeChunks.get(chunkId);
    if (!activeChunk) {
      return;
    }
    
    const timeoutError = new Error(`Chunk processing timeout after ${this.config.chunkTimeout}ms`);
    this.handleChunkFailure(chunkId, timeoutError, activeChunk.startTime);
  }
  
  /**
   * Process retry queue
   */
  async processRetryQueue() {
    debug('Processing retry queue', { retries: this.retryQueue.length });
    
    while (this.retryQueue.length > 0 && this.processingState.isProcessing) {
      // Wait if we've reached the concurrent limit
      if (this.activeChunks.size >= this.config.maxConcurrentChunks) {
        await this.waitForChunkCompletion();
        continue;
      }
      
      // Get next retry chunk
      const chunk = this.retryQueue.shift();
      if (!chunk) {
        break;
      }
      
      // Mark as retry
      this.metrics.chunksRetried++;
      
      // Process chunk
      await this.processChunk(chunk);
    }
  }
  
  /**
   * Wait for at least one chunk to complete
   */
  async waitForChunkCompletion() {
    return new Promise((resolve) => {
      const checkCompletion = () => {
        if (this.activeChunks.size < this.config.maxConcurrentChunks || !this.processingState.isProcessing) {
          resolve();
        } else {
          setTimeout(checkCompletion, 100);
        }
      };
      checkCompletion();
    });
  }
  
  /**
   * Validate chunk completion
   */
  validateChunkCompletion(chunk, result) {
    // Check if all lines were processed
    const processedLines = result.filter(r => r.success).length;
    const failedLines = result.filter(r => !r.success).length;
    
    if (processedLines + failedLines !== chunk.lineCount) {
      warn('Chunk completion validation failed: line count mismatch', {
        expected: chunk.lineCount,
        processed: processedLines,
        failed: failedLines
      });
    }
    
    // Check for critical failures
    if (failedLines > chunk.lineCount * 0.1) { // More than 10% failed
      warn('Chunk has high failure rate', {
        chunkIndex: chunk.index,
        failureRate: (failedLines / chunk.lineCount) * 100
      });
    }
  }
  
  /**
   * Pause chunk processing
   */
  pause() {
    if (!this.processingState.isProcessing) {
      return false;
    }
    
    this.processingState.isPaused = true;
    debug('Chunk processing paused');
    
    this.emit('processingPaused', {
      currentChunk: this.processingState.currentChunkIndex,
      remainingChunks: this.chunkQueue.length
    });
    
    return true;
  }
  
  /**
   * Resume chunk processing
   */
  resume() {
    if (!this.processingState.isProcessing || !this.processingState.isPaused) {
      return false;
    }
    
    this.processingState.isPaused = false;
    debug('Chunk processing resumed');
    
    this.emit('processingResumed', {
      currentChunk: this.processingState.currentChunkIndex,
      remainingChunks: this.chunkQueue.length
    });
    
    // Continue processing
    this.processChunkQueue();
    
    return true;
  }
  
  /**
   * Stop chunk processing
   */
  stop() {
    if (!this.processingState.isProcessing) {
      return false;
    }
    
    this.processingState.isProcessing = false;
    this.processingState.isPaused = false;
    
    // Clear all timeouts
    this.activeChunks.forEach(activeChunk => {
      clearTimeout(activeChunk.timeout);
    });
    
    // Clear queues
    this.chunkQueue = [];
    this.retryQueue = [];
    this.activeChunks.clear();
    
    debug('Chunk processing stopped');
    
    this.emit('processingStopped', {
      processedChunks: this.processingState.processedChunks,
      failedChunks: this.processingState.failedChunks
    });
    
    return true;
  }
  
  /**
   * Update processing metrics
   */
  updateProcessingMetrics(success, processingTime) {
    this.metrics.chunksProcessed++;
    this.metrics.totalChunkTime += processingTime;
    this.metrics.averageChunkTime = this.metrics.totalChunkTime / this.metrics.chunksProcessed;
    
    if (success) {
      this.metrics.chunksSuccessful++;
    } else {
      this.metrics.chunksFailed++;
    }
  }
  
  /**
   * Get processing status
   */
  getStatus() {
    return {
      isProcessing: this.processingState.isProcessing,
      isPaused: this.processingState.isPaused,
      currentChunk: this.processingState.currentChunkIndex,
      totalChunks: this.processingState.totalChunks,
      processedChunks: this.processingState.processedChunks,
      failedChunks: this.processingState.failedChunks,
      activeChunks: this.activeChunks.size,
      queuedChunks: this.chunkQueue.length,
      retryQueueSize: this.retryQueue.length,
      progress: this.processingState.totalChunks > 0 ? 
        (this.processingState.processedChunks / this.processingState.totalChunks) * 100 : 0
    };
  }
  
  /**
   * Get processing metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      successRate: this.metrics.chunksProcessed > 0 ? 
        (this.metrics.chunksSuccessful / this.metrics.chunksProcessed) * 100 : 0,
      failureRate: this.metrics.chunksProcessed > 0 ? 
        (this.metrics.chunksFailed / this.metrics.chunksProcessed) * 100 : 0,
      retryRate: this.metrics.chunksProcessed > 0 ? 
        (this.metrics.chunksRetried / this.metrics.chunksProcessed) * 100 : 0
    };
  }
  
  /**
   * Export processing data
   */
  exportData() {
    return {
      state: { ...this.processingState },
      metrics: this.getMetrics(),
      completedChunks: Array.from(this.completedChunks),
      failedChunks: Object.fromEntries(this.failedChunks),
      config: { ...this.config }
    };
  }
  
  /**
   * Reset processing statistics
   */
  resetStatistics() {
    this.metrics = {
      chunksProcessed: 0,
      chunksSuccessful: 0,
      chunksFailed: 0,
      chunksRetried: 0,
      averageChunkTime: 0,
      totalChunkTime: 0,
      maxConcurrentReached: 0,
      totalRetryTime: 0
    };
    
    this.completedChunks.clear();
    this.failedChunks.clear();
    
    debug('Processing statistics reset');
    this.emit('statisticsReset');
  }
  
  /**
   * Clean up resources
   */
  cleanup() {
    this.stop();
    this.removeAllListeners();
  }
}