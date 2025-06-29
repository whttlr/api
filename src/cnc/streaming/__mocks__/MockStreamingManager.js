/**
 * Mock Streaming Manager
 * 
 * Provides a mock implementation of StreamingManager for testing
 * chunked streaming functionality without real hardware dependencies.
 */

import { EventEmitter } from 'events';

export class MockStreamingManager extends EventEmitter {
  constructor() {
    super();
    
    this.isStreaming = false;
    this.isPaused = false;
    this.mockResponses = new Map();
    this.mockErrors = new Map();
    this.mockDelay = 10;
    
    this.config = {
      batchSize: 10,
      pauseOnError: true,
      enableValidation: true
    };
    
    this.state = {
      isStreaming: false,
      isPaused: false,
      currentLine: 0,
      totalLines: 0,
      currentFile: null
    };
    
    this.commandHistory = [];
    this.sentLines = [];
    this.completedLines = 0;
    this.failedLines = 0;
    
    this.stats = {
      linesProcessed: 0,
      linesSuccessful: 0,
      linesFailed: 0,
      averageLineTime: 0,
      totalTime: 0
    };
  }

  /**
   * Set mock response for a command
   */
  setMockResponse(command, response) {
    this.mockResponses.set(command, response);
  }

  /**
   * Set mock error for a command
   */
  setMockError(command, error) {
    this.mockErrors.set(command, error);
  }

  /**
   * Set mock delay for operations
   */
  setMockDelay(delay) {
    this.mockDelay = delay;
  }

  /**
   * Start streaming a G-code file (mocked)
   */
  async startStreaming(filePath, options = {}) {
    if (this.isStreaming) {
      throw new Error('Already streaming');
    }

    // Check for mock error
    if (this.mockErrors.has('startStreaming')) {
      throw this.mockErrors.get('startStreaming');
    }

    this.isStreaming = true;
    this.state.isStreaming = true;
    this.state.currentFile = filePath;
    this.state.currentLine = 0;
    this.commandHistory = [];
    this.sentLines = [];
    this.completedLines = 0;
    this.failedLines = 0;

    // Simulate reading file to get line count
    try {
      const fs = await import('fs');
      const content = await fs.promises.readFile(filePath, 'utf8');
      this.state.totalLines = content.split('\n').filter(line => line.trim().length > 0).length;
    } catch (err) {
      this.state.totalLines = 100; // Default for testing
    }

    this.emit('streamingStarted', {
      file: filePath,
      totalLines: this.state.totalLines,
      options
    });

    // Simulate streaming process
    this.simulateStreaming();

    return {
      success: true,
      file: filePath,
      totalLines: this.state.totalLines
    };
  }

  /**
   * Send a single line (mocked)
   */
  async sendLine(line, options = {}) {
    if (!this.isStreaming) {
      throw new Error('Not streaming');
    }

    if (this.isPaused) {
      throw new Error('Streaming is paused');
    }

    // Apply delay
    if (this.mockDelay > 0) {
      await new Promise(resolve => setTimeout(resolve, this.mockDelay));
    }

    // Check for mock error
    if (this.mockErrors.has('sendLine')) {
      const error = this.mockErrors.get('sendLine');
      this.failedLines++;
      this.stats.linesFailed++;
      throw error;
    }

    // Record sent line
    this.sentLines.push({
      line,
      lineNumber: options.lineNumber || this.sentLines.length + 1,
      timestamp: Date.now(),
      options
    });

    this.state.currentLine = options.lineNumber || this.sentLines.length;

    // Simulate line processing
    const result = this.mockResponses.get('sendLine') || { 
      response: 'ok', 
      lineNumber: options.lineNumber,
      processingTime: this.mockDelay 
    };

    this.completedLines++;
    this.stats.linesProcessed++;
    this.stats.linesSuccessful++;
    this.stats.averageLineTime = (this.stats.averageLineTime * (this.stats.linesProcessed - 1) + this.mockDelay) / this.stats.linesProcessed;

    this.emit('lineCompleted', {
      line,
      lineNumber: options.lineNumber,
      result,
      progress: this.state.totalLines > 0 ? (this.state.currentLine / this.state.totalLines) * 100 : 0
    });

    return result;
  }

  /**
   * Pause streaming (mocked)
   */
  pauseStreaming(reason = 'user_request') {
    if (!this.isStreaming || this.isPaused) {
      return false;
    }

    this.isPaused = true;
    this.state.isPaused = true;

    this.emit('streamingPaused', {
      reason,
      currentLine: this.state.currentLine,
      totalLines: this.state.totalLines
    });

    return true;
  }

  /**
   * Resume streaming (mocked)
   */
  resumeStreaming() {
    if (!this.isStreaming || !this.isPaused) {
      return false;
    }

    this.isPaused = false;
    this.state.isPaused = false;

    this.emit('streamingResumed', {
      currentLine: this.state.currentLine,
      totalLines: this.state.totalLines
    });

    return true;
  }

  /**
   * Stop streaming (mocked)
   */
  async stopStreaming(reason = 'user_request') {
    if (!this.isStreaming) {
      return;
    }

    this.isStreaming = false;
    this.isPaused = false;
    this.state.isStreaming = false;
    this.state.isPaused = false;

    const completed = this.state.currentLine >= this.state.totalLines;

    this.stats.totalTime = Date.now() - this.startTime || 0;

    this.emit('streamingStopped', {
      reason,
      completed,
      stats: { ...this.stats },
      finalLine: this.state.currentLine,
      totalLines: this.state.totalLines
    });

    return {
      success: true,
      reason,
      completed,
      stats: { ...this.stats }
    };
  }

  /**
   * Simulate streaming process
   */
  async simulateStreaming() {
    this.startTime = Date.now();

    // Simulate processing lines
    const processLines = async () => {
      while (this.isStreaming && this.state.currentLine < this.state.totalLines) {
        if (this.isPaused) {
          await new Promise(resolve => setTimeout(resolve, 100));
          continue;
        }

        try {
          const mockLine = `G0 X${this.state.currentLine} Y${this.state.currentLine}`;
          await this.sendLine(mockLine, { 
            lineNumber: this.state.currentLine + 1 
          });
          
          this.state.currentLine++;
          
          // Small delay between lines
          await new Promise(resolve => setTimeout(resolve, this.mockDelay));
          
        } catch (err) {
          this.emit('streamingError', err);
          break;
        }
      }

      // Complete streaming if we processed all lines
      if (this.isStreaming && this.state.currentLine >= this.state.totalLines) {
        await this.stopStreaming('completed');
      }
    };

    // Start processing in background
    processLines().catch(err => {
      this.emit('streamingError', err);
    });
  }

  /**
   * Get streaming status
   */
  getStatus() {
    return {
      isStreaming: this.isStreaming,
      isPaused: this.isPaused,
      currentLine: this.state.currentLine,
      totalLines: this.state.totalLines,
      progress: this.state.totalLines > 0 ? (this.state.currentLine / this.state.totalLines) * 100 : 0,
      completedLines: this.completedLines,
      failedLines: this.failedLines
    };
  }

  /**
   * Get streaming statistics
   */
  getStats() {
    return { ...this.stats };
  }

  /**
   * Get sent lines history
   */
  getSentLines() {
    return [...this.sentLines];
  }

  /**
   * Get command history
   */
  getCommandHistory() {
    return [...this.commandHistory];
  }

  /**
   * Simulate connection error
   */
  simulateConnectionError() {
    this.emit('connectionError', new Error('Connection lost'));
  }

  /**
   * Simulate buffer full condition
   */
  simulateBufferFull() {
    this.emit('bufferFull', {
      bufferSize: 128,
      availableSpace: 0
    });
  }

  /**
   * Simulate alarm condition
   */
  simulateAlarm(alarmCode = 1) {
    this.emit('alarm', {
      code: alarmCode,
      message: `Alarm ${alarmCode}: Test alarm condition`
    });
  }

  /**
   * Set custom streaming behavior
   */
  setStreamingBehavior(behavior) {
    if (behavior.failAfterLines) {
      setTimeout(() => {
        if (this.isStreaming && this.state.currentLine >= behavior.failAfterLines) {
          this.setMockError('sendLine', new Error('Simulated streaming failure'));
        }
      }, 100);
    }

    if (behavior.pauseAfterLines) {
      setTimeout(() => {
        if (this.isStreaming && this.state.currentLine >= behavior.pauseAfterLines) {
          this.pauseStreaming('test_pause');
        }
      }, 100);
    }

    if (behavior.slowDown) {
      this.setMockDelay(behavior.slowDown);
    }
  }

  /**
   * Reset mock state
   */
  reset() {
    this.isStreaming = false;
    this.isPaused = false;
    this.mockResponses.clear();
    this.mockErrors.clear();
    this.mockDelay = 10;
    
    this.state = {
      isStreaming: false,
      isPaused: false,
      currentLine: 0,
      totalLines: 0,
      currentFile: null
    };
    
    this.commandHistory = [];
    this.sentLines = [];
    this.completedLines = 0;
    this.failedLines = 0;
    
    this.stats = {
      linesProcessed: 0,
      linesSuccessful: 0,
      linesFailed: 0,
      averageLineTime: 0,
      totalTime: 0
    };

    this.removeAllListeners();
  }

  /**
   * Clean up resources
   */
  cleanup() {
    if (this.isStreaming) {
      this.stopStreaming('cleanup');
    }
    this.reset();
  }
}