import { log, error as logError } from '../../../../../lib/logger/LoggerService.js';

export class ExecutionService {
  constructor() {
    this.isExecuting = false;
    this.isPaused = false;
    this.currentLine = 0;
    this.totalLines = 0;
    this.startTime = null;
    this.pausedTime = 0;
    this.lines = [];
    this.onProgressCallback = null;
    this.onStatusCallback = null;
  }

  async executeGcode(gcode, onProgress, onStatus) {
    if (this.isExecuting) {
      throw new Error('Execution already in progress');
    }

    this.onProgressCallback = onProgress;
    this.onStatusCallback = onStatus;
    this.lines = gcode.split('\n').filter(line => {
      const trimmed = line.trim();
      return trimmed && !trimmed.startsWith(';') && !trimmed.startsWith('(');
    });
    
    this.totalLines = this.lines.length;
    this.currentLine = 0;
    this.isExecuting = true;
    this.isPaused = false;
    this.startTime = Date.now();
    this.pausedTime = 0;

    log('Starting G-code execution', { 
      totalLines: this.totalLines,
      estimatedTime: this.estimateExecutionTime()
    });

    this.updateStatus('running');

    try {
      for (let i = 0; i < this.lines.length; i++) {
        if (!this.isExecuting) {
          break;
        }

        while (this.isPaused) {
          await this.sleep(100);
        }

        const line = this.lines[i];
        this.currentLine = i + 1;
        
        await this.executeLine(line, i + 1);
        this.updateProgress();
      }

      if (this.isExecuting) {
        this.updateStatus('completed');
        log('G-code execution completed successfully');
      } else {
        this.updateStatus('stopped');
        log('G-code execution stopped by user');
      }

    } catch (error) {
      this.updateStatus('error');
      logError('G-code execution failed', { error: error.message, line: this.currentLine });
      throw error;
    } finally {
      this.reset();
    }
  }

  async executeLine(line, lineNumber) {
    try {
      await this.sleep(50);
      
      log(`Executing line ${lineNumber}: ${line}`);
      
      this.onStatusCallback?.({
        type: 'line_executed',
        lineNumber,
        line,
        timestamp: Date.now()
      });

    } catch (error) {
      throw new Error(`Error executing line ${lineNumber}: ${error.message}`);
    }
  }

  pause() {
    if (!this.isExecuting || this.isPaused) {
      return false;
    }

    this.isPaused = true;
    this.pauseStartTime = Date.now();
    this.updateStatus('paused');
    log('G-code execution paused', { currentLine: this.currentLine });
    return true;
  }

  resume() {
    if (!this.isExecuting || !this.isPaused) {
      return false;
    }

    this.pausedTime += Date.now() - this.pauseStartTime;
    this.isPaused = false;
    this.updateStatus('running');
    log('G-code execution resumed', { currentLine: this.currentLine });
    return true;
  }

  stop() {
    if (!this.isExecuting) {
      return false;
    }

    this.isExecuting = false;
    this.isPaused = false;
    this.updateStatus('stopped');
    log('G-code execution stopped', { currentLine: this.currentLine });
    return true;
  }

  getProgress() {
    if (this.totalLines === 0) return 0;
    return (this.currentLine / this.totalLines) * 100;
  }

  getElapsedTime() {
    if (!this.startTime) return 0;
    const now = this.isPaused ? this.pauseStartTime : Date.now();
    return now - this.startTime - this.pausedTime;
  }

  getEstimatedTimeRemaining() {
    if (this.currentLine === 0) return this.estimateExecutionTime();
    
    const elapsed = this.getElapsedTime();
    const avgTimePerLine = elapsed / this.currentLine;
    const remainingLines = this.totalLines - this.currentLine;
    
    return remainingLines * avgTimePerLine;
  }

  estimateExecutionTime() {
    return this.totalLines * 100;
  }

  updateProgress() {
    const progress = {
      currentLine: this.currentLine,
      totalLines: this.totalLines,
      percentage: this.getProgress(),
      elapsedTime: this.getElapsedTime(),
      estimatedTimeRemaining: this.getEstimatedTimeRemaining(),
      status: this.isPaused ? 'paused' : 'running'
    };

    this.onProgressCallback?.(progress);
  }

  updateStatus(status) {
    this.onStatusCallback?.({
      type: 'status_change',
      status,
      timestamp: Date.now(),
      currentLine: this.currentLine,
      totalLines: this.totalLines
    });
  }

  reset() {
    this.isExecuting = false;
    this.isPaused = false;
    this.currentLine = 0;
    this.totalLines = 0;
    this.startTime = null;
    this.pausedTime = 0;
    this.lines = [];
    this.onProgressCallback = null;
    this.onStatusCallback = null;
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  getStatus() {
    return {
      isExecuting: this.isExecuting,
      isPaused: this.isPaused,
      currentLine: this.currentLine,
      totalLines: this.totalLines,
      progress: this.getProgress(),
      elapsedTime: this.getElapsedTime(),
      estimatedTimeRemaining: this.getEstimatedTimeRemaining()
    };
  }
}