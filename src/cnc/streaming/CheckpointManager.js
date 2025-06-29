/**
 * Checkpoint Manager
 * 
 * Handles saving and loading streaming progress checkpoints to enable
 * resume functionality after interruptions or failures.
 */

import { EventEmitter } from 'events';
import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import { debug, info, warn, error } from '../../lib/logger/LoggerService.js';

export class CheckpointManager extends EventEmitter {
  constructor(config = {}) {
    super();
    
    this.config = {
      enableCheckpointing: true,        // Enable checkpoint functionality
      checkpointInterval: 5000,         // Checkpoint interval (lines)
      checkpointDirectory: '.checkpoints', // Directory to store checkpoints
      maxCheckpoints: 10,               // Maximum checkpoints to keep per file
      compressionEnabled: false,        // Enable checkpoint compression
      validateChecksums: true,          // Validate checkpoint integrity
      autoCleanup: true,                // Auto cleanup old checkpoints
      retentionDays: 7,                 // Days to retain checkpoints
      ...config
    };
    
    this.checkpoints = new Map();
    this.checkpointHistory = [];
    
    this.metrics = {
      checkpointsCreated: 0,
      checkpointsLoaded: 0,
      checkpointsSaved: 0,
      checkpointsCorrupted: 0,
      totalCheckpointData: 0,
      averageCheckpointSize: 0
    };
  }
  
  /**
   * Create a new checkpoint
   */
  async createCheckpoint(streamingState, options = {}) {
    try {
      if (!this.config.enableCheckpointing) {
        debug('Checkpointing disabled');
        return null;
      }
      
      debug('Creating checkpoint', { 
        currentChunk: streamingState.currentChunk,
        currentLine: streamingState.currentLine 
      });
      
      const checkpoint = {
        id: this.generateCheckpointId(),
        timestamp: Date.now(),
        filePath: streamingState.currentFile,
        version: '1.0',
        state: {
          currentChunk: streamingState.currentChunk,
          totalChunks: streamingState.totalChunks,
          currentLine: streamingState.currentLine,
          totalLines: streamingState.totalLines,
          bytesProcessed: streamingState.bytesProcessed,
          totalBytes: streamingState.totalBytes,
          startTime: streamingState.startTime,
          pauseTime: streamingState.pauseTime
        },
        metrics: { ...options.metrics },
        chunks: options.processedChunks || [],
        metadata: {
          chunksSuccessful: options.chunksSuccessful || 0,
          chunksFailed: options.chunksFailed || 0,
          averageChunkTime: options.averageChunkTime || 0,
          lastError: options.lastError || null
        }
      };
      
      // Add checksum for validation
      if (this.config.validateChecksums) {
        checkpoint.checksum = this.calculateChecksum(checkpoint);
      }
      
      // Store checkpoint
      this.checkpoints.set(checkpoint.id, checkpoint);
      this.checkpointHistory.push(checkpoint.id);
      
      // Save to disk if enabled
      if (options.persistToDisk !== false) {
        await this.saveCheckpointToDisk(checkpoint);
      }
      
      // Cleanup old checkpoints
      if (this.config.autoCleanup) {
        await this.cleanupOldCheckpoints(streamingState.currentFile);
      }
      
      // Update metrics
      this.updateMetrics(checkpoint, 'created');
      
      info('Checkpoint created', {
        id: checkpoint.id.substring(0, 8),
        chunk: checkpoint.state.currentChunk,
        line: checkpoint.state.currentLine
      });
      
      this.emit('checkpointCreated', {
        checkpoint,
        filePath: streamingState.currentFile
      });
      
      return checkpoint;
      
    } catch (err) {
      error('Failed to create checkpoint', { error: err.message });
      this.emit('checkpointError', {
        operation: 'create',
        error: err.message
      });
      throw err;
    }
  }
  
  /**
   * Load checkpoint for resuming
   */
  async loadCheckpoint(filePath, options = {}) {
    try {
      debug('Loading checkpoint for file', { file: filePath });
      
      // Try to load from memory first
      let checkpoint = this.findLatestCheckpointForFile(filePath);
      
      // If not in memory, try loading from disk
      if (!checkpoint && options.loadFromDisk !== false) {
        checkpoint = await this.loadCheckpointFromDisk(filePath);
      }
      
      if (!checkpoint) {
        debug('No checkpoint found for file', { file: filePath });
        return null;
      }
      
      // Validate checkpoint
      if (!this.validateCheckpoint(checkpoint)) {
        warn('Checkpoint validation failed', { 
          id: checkpoint.id?.substring(0, 8),
          file: filePath 
        });
        return null;
      }
      
      // Update metrics
      this.updateMetrics(checkpoint, 'loaded');
      
      info('Checkpoint loaded successfully', {
        id: checkpoint.id.substring(0, 8),
        chunk: checkpoint.state.currentChunk,
        line: checkpoint.state.currentLine,
        age: Date.now() - checkpoint.timestamp
      });
      
      this.emit('checkpointLoaded', {
        checkpoint,
        filePath
      });
      
      return checkpoint;
      
    } catch (err) {
      error('Failed to load checkpoint', { error: err.message, file: filePath });
      this.emit('checkpointError', {
        operation: 'load',
        error: err.message,
        filePath
      });
      throw err;
    }
  }
  
  /**
   * Save checkpoint to disk
   */
  async saveCheckpointToDisk(checkpoint) {
    try {
      const checkpointDir = this.getCheckpointDirectory(checkpoint.filePath);
      await this.ensureDirectoryExists(checkpointDir);
      
      const filename = `${checkpoint.id}.json`;
      const filepath = join(checkpointDir, filename);
      
      // Prepare checkpoint data
      const checkpointData = {
        ...checkpoint,
        savedAt: Date.now()
      };
      
      // Compress if enabled
      let data;
      if (this.config.compressionEnabled) {
        data = await this.compressCheckpointData(checkpointData);
      } else {
        data = JSON.stringify(checkpointData, null, 2);
      }
      
      await fs.writeFile(filepath, data, 'utf8');
      
      this.updateMetrics(checkpoint, 'saved');
      
      debug('Checkpoint saved to disk', { 
        id: checkpoint.id.substring(0, 8),
        path: filepath 
      });
      
    } catch (err) {
      error('Failed to save checkpoint to disk', { 
        error: err.message,
        id: checkpoint.id 
      });
      throw err;
    }
  }
  
  /**
   * Load checkpoint from disk
   */
  async loadCheckpointFromDisk(filePath) {
    try {
      const checkpointDir = this.getCheckpointDirectory(filePath);
      
      // Check if checkpoint directory exists
      try {
        await fs.access(checkpointDir);
      } catch {
        debug('Checkpoint directory does not exist', { dir: checkpointDir });
        return null;
      }
      
      // Find latest checkpoint file
      const files = await fs.readdir(checkpointDir);
      const checkpointFiles = files.filter(f => f.endsWith('.json'))
        .sort((a, b) => b.localeCompare(a)); // Sort by name (timestamp-based)
      
      if (checkpointFiles.length === 0) {
        debug('No checkpoint files found', { dir: checkpointDir });
        return null;
      }
      
      // Try to load the latest checkpoint
      for (const filename of checkpointFiles) {
        try {
          const filepath = join(checkpointDir, filename);
          const data = await fs.readFile(filepath, 'utf8');
          
          let checkpoint;
          if (this.config.compressionEnabled && data.startsWith('compressed:')) {
            checkpoint = await this.decompressCheckpointData(data);
          } else {
            checkpoint = JSON.parse(data);
          }
          
          // Validate and return checkpoint
          if (this.validateCheckpoint(checkpoint)) {
            this.checkpoints.set(checkpoint.id, checkpoint);
            return checkpoint;
          }
          
        } catch (err) {
          warn('Failed to load checkpoint file', { 
            file: filename,
            error: err.message 
          });
          continue;
        }
      }
      
      warn('No valid checkpoints found on disk', { dir: checkpointDir });
      return null;
      
    } catch (err) {
      error('Failed to load checkpoint from disk', { 
        error: err.message,
        file: filePath 
      });
      return null;
    }
  }
  
  /**
   * Find latest checkpoint for file in memory
   */
  findLatestCheckpointForFile(filePath) {
    let latestCheckpoint = null;
    let latestTimestamp = 0;
    
    for (const checkpoint of this.checkpoints.values()) {
      if (checkpoint.filePath === filePath && checkpoint.timestamp > latestTimestamp) {
        latestCheckpoint = checkpoint;
        latestTimestamp = checkpoint.timestamp;
      }
    }
    
    return latestCheckpoint;
  }
  
  /**
   * Validate checkpoint integrity
   */
  validateCheckpoint(checkpoint) {
    if (!checkpoint || typeof checkpoint !== 'object') {
      return false;
    }
    
    // Check required fields
    const requiredFields = ['id', 'timestamp', 'filePath', 'state'];
    for (const field of requiredFields) {
      if (!checkpoint.hasOwnProperty(field)) {
        warn('Checkpoint missing required field', { field });
        return false;
      }
    }
    
    // Validate state structure
    if (!checkpoint.state || typeof checkpoint.state !== 'object') {
      warn('Checkpoint state is invalid');
      return false;
    }
    
    // Validate checksum if enabled
    if (this.config.validateChecksums && checkpoint.checksum) {
      const calculatedChecksum = this.calculateChecksum(checkpoint);
      if (calculatedChecksum !== checkpoint.checksum) {
        warn('Checkpoint checksum validation failed');
        this.metrics.checkpointsCorrupted++;
        return false;
      }
    }
    
    // Check if checkpoint is not too old
    const age = Date.now() - checkpoint.timestamp;
    const maxAge = this.config.retentionDays * 24 * 60 * 60 * 1000;
    if (age > maxAge) {
      debug('Checkpoint is too old', { 
        age: Math.round(age / 1000 / 60 / 60),
        maxHours: this.config.retentionDays * 24 
      });
      return false;
    }
    
    return true;
  }
  
  /**
   * Calculate checkpoint checksum
   */
  calculateChecksum(checkpoint) {
    // Create a copy without checksum for calculation
    const { checksum, ...checksumData } = checkpoint;
    const content = JSON.stringify(checksumData);
    
    // Simple hash function
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    return hash.toString(16);
  }
  
  /**
   * Generate unique checkpoint ID
   */
  generateCheckpointId() {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2);
    return `cp_${timestamp}_${random}`;
  }
  
  /**
   * Get checkpoint directory for file
   */
  getCheckpointDirectory(filePath) {
    const fileDir = dirname(filePath);
    return join(fileDir, this.config.checkpointDirectory);
  }
  
  /**
   * Ensure directory exists
   */
  async ensureDirectoryExists(dirPath) {
    try {
      await fs.mkdir(dirPath, { recursive: true });
    } catch (err) {
      if (err.code !== 'EEXIST') {
        throw err;
      }
    }
  }
  
  /**
   * Cleanup old checkpoints
   */
  async cleanupOldCheckpoints(filePath) {
    try {
      // Clean up memory checkpoints
      const fileCheckpoints = Array.from(this.checkpoints.values())
        .filter(cp => cp.filePath === filePath)
        .sort((a, b) => b.timestamp - a.timestamp);
      
      if (fileCheckpoints.length > this.config.maxCheckpoints) {
        const toRemove = fileCheckpoints.slice(this.config.maxCheckpoints);
        for (const checkpoint of toRemove) {
          this.checkpoints.delete(checkpoint.id);
        }
      }
      
      // Clean up disk checkpoints
      await this.cleanupDiskCheckpoints(filePath);
      
    } catch (err) {
      warn('Failed to cleanup old checkpoints', { error: err.message });
    }
  }
  
  /**
   * Cleanup disk checkpoints
   */
  async cleanupDiskCheckpoints(filePath) {
    try {
      const checkpointDir = this.getCheckpointDirectory(filePath);
      
      try {
        await fs.access(checkpointDir);
      } catch {
        return; // Directory doesn't exist
      }
      
      const files = await fs.readdir(checkpointDir);
      const checkpointFiles = files.filter(f => f.endsWith('.json'));
      
      if (checkpointFiles.length <= this.config.maxCheckpoints) {
        return; // No cleanup needed
      }
      
      // Sort by filename (which contains timestamp) and remove oldest
      const sortedFiles = checkpointFiles.sort().reverse();
      const filesToRemove = sortedFiles.slice(this.config.maxCheckpoints);
      
      for (const filename of filesToRemove) {
        try {
          await fs.unlink(join(checkpointDir, filename));
          debug('Removed old checkpoint file', { file: filename });
        } catch (err) {
          warn('Failed to remove checkpoint file', { 
            file: filename,
            error: err.message 
          });
        }
      }
      
    } catch (err) {
      warn('Failed to cleanup disk checkpoints', { error: err.message });
    }
  }
  
  /**
   * Compress checkpoint data
   */
  async compressCheckpointData(data) {
    // Simple string compression (in real implementation, use zlib)
    const jsonString = JSON.stringify(data);
    return `compressed:${Buffer.from(jsonString).toString('base64')}`;
  }
  
  /**
   * Decompress checkpoint data
   */
  async decompressCheckpointData(compressedData) {
    const base64Data = compressedData.replace('compressed:', '');
    const jsonString = Buffer.from(base64Data, 'base64').toString('utf8');
    return JSON.parse(jsonString);
  }
  
  /**
   * Update metrics
   */
  updateMetrics(checkpoint, operation) {
    const size = JSON.stringify(checkpoint).length;
    this.metrics.totalCheckpointData += size;
    
    switch (operation) {
      case 'created':
        this.metrics.checkpointsCreated++;
        break;
      case 'loaded':
        this.metrics.checkpointsLoaded++;
        break;
      case 'saved':
        this.metrics.checkpointsSaved++;
        break;
    }
    
    if (this.metrics.checkpointsCreated > 0) {
      this.metrics.averageCheckpointSize = 
        this.metrics.totalCheckpointData / this.metrics.checkpointsCreated;
    }
  }
  
  /**
   * Get all checkpoints for a file
   */
  getCheckpointsForFile(filePath) {
    return Array.from(this.checkpoints.values())
      .filter(cp => cp.filePath === filePath)
      .sort((a, b) => b.timestamp - a.timestamp);
  }
  
  /**
   * Remove checkpoint
   */
  async removeCheckpoint(checkpointId, removeFromDisk = true) {
    const checkpoint = this.checkpoints.get(checkpointId);
    if (!checkpoint) {
      return false;
    }
    
    this.checkpoints.delete(checkpointId);
    
    if (removeFromDisk) {
      try {
        const checkpointDir = this.getCheckpointDirectory(checkpoint.filePath);
        const filepath = join(checkpointDir, `${checkpointId}.json`);
        await fs.unlink(filepath);
      } catch (err) {
        debug('Failed to remove checkpoint from disk', { 
          id: checkpointId,
          error: err.message 
        });
      }
    }
    
    this.emit('checkpointRemoved', { checkpointId });
    return true;
  }
  
  /**
   * Clear all checkpoints
   */
  async clearAllCheckpoints(filePath = null) {
    if (filePath) {
      // Clear checkpoints for specific file
      const fileCheckpoints = this.getCheckpointsForFile(filePath);
      for (const checkpoint of fileCheckpoints) {
        await this.removeCheckpoint(checkpoint.id);
      }
    } else {
      // Clear all checkpoints
      this.checkpoints.clear();
      this.checkpointHistory = [];
    }
    
    this.emit('checkpointsCleared', { filePath });
  }
  
  /**
   * Get checkpoint statistics
   */
  getStatistics() {
    return {
      ...this.metrics,
      activeCheckpoints: this.checkpoints.size,
      memoryUsage: this.metrics.totalCheckpointData,
      averageAge: this.calculateAverageCheckpointAge()
    };
  }
  
  /**
   * Calculate average checkpoint age
   */
  calculateAverageCheckpointAge() {
    if (this.checkpoints.size === 0) {
      return 0;
    }
    
    const now = Date.now();
    const totalAge = Array.from(this.checkpoints.values())
      .reduce((sum, cp) => sum + (now - cp.timestamp), 0);
    
    return Math.round(totalAge / this.checkpoints.size);
  }
  
  /**
   * Export checkpoint data
   */
  exportData() {
    return {
      checkpoints: Array.from(this.checkpoints.values()),
      statistics: this.getStatistics(),
      config: { ...this.config }
    };
  }
  
  /**
   * Clean up resources
   */
  cleanup() {
    this.checkpoints.clear();
    this.checkpointHistory = [];
    this.removeAllListeners();
    
    debug('Checkpoint manager cleaned up');
  }
}