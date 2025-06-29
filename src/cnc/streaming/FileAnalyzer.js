/**
 * File Analyzer
 * 
 * Handles file analysis, metadata extraction, and chunk preparation
 * for large G-code files before streaming.
 */

import { EventEmitter } from 'events';
import { promises as fs } from 'fs';
import { createReadStream } from 'fs';
import { createInterface } from 'readline';
import { debug, info, warn, error } from '../../lib/logger/LoggerService.js';

export class FileAnalyzer extends EventEmitter {
  constructor(config = {}) {
    super();
    
    this.config = {
      chunkSize: 1000,                  // Lines per chunk
      bufferSize: 64 * 1024,           // File read buffer size
      enableMetadata: true,             // Extract file metadata
      validateChunks: true,             // Validate chunk integrity
      maxAnalysisTime: 30000,           // Maximum analysis time (ms)
      skipEmptyLines: true,             // Skip empty lines in analysis
      skipComments: true,               // Skip comment lines in analysis
      extractEstimates: true,           // Extract time/distance estimates
      ...config
    };
    
    this.analysisMetrics = {
      totalFiles: 0,
      totalLines: 0,
      totalBytes: 0,
      averageAnalysisTime: 0,
      totalAnalysisTime: 0
    };
  }
  
  /**
   * Analyze file and create chunk metadata
   */
  async analyzeFile(filePath, options = {}) {
    const analysisStartTime = Date.now();
    
    try {
      debug('Starting file analysis', { file: filePath });
      
      // Get basic file stats
      const fileStats = await fs.stat(filePath);
      
      // Initialize analysis result
      const analysis = {
        filePath,
        fileSize: fileStats.size,
        fileModified: fileStats.mtime,
        totalLines: 0,
        totalBytes: fileStats.size,
        chunks: [],
        metadata: {
          hasComments: false,
          hasSubPrograms: false,
          toolChanges: 0,
          coordinateSystemChanges: 0,
          estimatedTime: 0,
          estimatedDistance: 0
        },
        analysisTime: 0
      };
      
      // Perform detailed analysis
      await this.performDetailedAnalysis(filePath, analysis, options);
      
      // Create chunks based on analysis
      this.createChunkMetadata(analysis);
      
      // Calculate analysis time
      analysis.analysisTime = Date.now() - analysisStartTime;
      
      // Update metrics
      this.updateAnalysisMetrics(analysis);
      
      info('File analysis completed', {
        file: filePath,
        lines: analysis.totalLines,
        chunks: analysis.chunks.length,
        analysisTime: `${analysis.analysisTime}ms`
      });
      
      this.emit('fileAnalyzed', analysis);
      
      return analysis;
      
    } catch (err) {
      error('File analysis failed', { error: err.message, file: filePath });
      throw err;
    }
  }
  
  /**
   * Perform detailed file analysis
   */
  async performDetailedAnalysis(filePath, analysis, options) {
    let currentChunk = [];
    let lineCount = 0;
    let byteOffset = 0;
    
    // Create read stream
    const readStream = createReadStream(filePath, {
      highWaterMark: this.config.bufferSize
    });
    
    // Create line reader
    const lineReader = createInterface({
      input: readStream,
      crlfDelay: Infinity
    });
    
    try {
      for await (const line of lineReader) {
        const lineBytes = Buffer.byteLength(line + '\\n', 'utf8');
        const trimmedLine = line.trim();
        
        // Skip processing based on configuration
        if (this.shouldSkipLine(trimmedLine)) {
          byteOffset += lineBytes;
          continue;
        }
        
        // Analyze line content
        this.analyzeLine(trimmedLine, analysis.metadata);
        
        // Add line to current chunk
        currentChunk.push({
          number: lineCount + 1,
          content: line,
          byteOffset,
          byteLength: lineBytes
        });
        
        lineCount++;
        byteOffset += lineBytes;
        
        // Create chunk when size limit reached
        if (currentChunk.length >= this.config.chunkSize) {
          analysis.chunks.push(this.createChunkFromLines(currentChunk, analysis.chunks.length));
          currentChunk = [];
        }
        
        // Emit progress for large files
        if (lineCount % 10000 === 0) {
          this.emit('analysisProgress', {
            linesProcessed: lineCount,
            bytesProcessed: byteOffset,
            chunksCreated: analysis.chunks.length
          });
        }
      }
      
      // Add remaining lines as final chunk
      if (currentChunk.length > 0) {
        analysis.chunks.push(this.createChunkFromLines(currentChunk, analysis.chunks.length));
      }
      
      analysis.totalLines = lineCount;
      
    } finally {
      lineReader.close();
      readStream.destroy();
    }
  }
  
  /**
   * Determine if line should be skipped during analysis
   */
  shouldSkipLine(line) {
    // Skip empty lines
    if (this.config.skipEmptyLines && line.length === 0) {
      return true;
    }
    
    // Skip comment lines
    if (this.config.skipComments && (line.startsWith(';') || line.startsWith('('))) {
      return true;
    }
    
    return false;
  }
  
  /**
   * Analyze individual line content
   */
  analyzeLine(line, metadata) {
    if (!this.config.enableMetadata) {
      return;
    }
    
    // Check for comments
    if (line.includes(';') || line.includes('(')) {
      metadata.hasComments = true;
    }
    
    // Check for subroutines
    if (line.includes('M98') || line.includes('M99')) {
      metadata.hasSubPrograms = true;
    }
    
    // Check for tool changes
    if (line.match(/T\\d+/) || line.includes('M6')) {
      metadata.toolChanges++;
    }
    
    // Check for coordinate system changes
    if (line.match(/G5[4-9]/)) {
      metadata.coordinateSystemChanges++;
    }
    
    // Extract feed rates for time estimation
    const feedMatch = line.match(/F([\\d.]+)/);
    if (feedMatch) {
      const feedRate = parseFloat(feedMatch[1]);
      // Simple time estimation based on feed rate
      // This would be more sophisticated in a real implementation
      metadata.estimatedTime += 0.1; // Placeholder calculation
    }
    
    // Extract movement distances for distance estimation
    const moveMatch = line.match(/G0[01]/);
    if (moveMatch) {
      // Simple distance estimation
      // This would be more sophisticated in a real implementation
      metadata.estimatedDistance += 1.0; // Placeholder calculation
    }
  }
  
  /**
   * Create chunk metadata from lines
   */
  createChunkFromLines(lines, chunkIndex) {
    if (lines.length === 0) {
      return null;
    }
    
    const firstLine = lines[0];
    const lastLine = lines[lines.length - 1];
    
    return {
      index: chunkIndex,
      startLine: firstLine.number,
      endLine: lastLine.number,
      lineCount: lines.length,
      startByteOffset: firstLine.byteOffset,
      endByteOffset: lastLine.byteOffset + lastLine.byteLength,
      byteLength: (lastLine.byteOffset + lastLine.byteLength) - firstLine.byteOffset,
      lines: lines.map(line => line.content),
      metadata: {
        hasToolChange: lines.some(line => 
          line.content.includes('T') || line.content.includes('M6')
        ),
        hasCoordinateChange: lines.some(line => 
          line.content.match(/G5[4-9]/)
        ),
        complexity: this.calculateChunkComplexity(lines)
      }
    };
  }
  
  /**
   * Calculate complexity score for a chunk
   */
  calculateChunkComplexity(lines) {
    let complexity = 0;
    
    lines.forEach(line => {
      const content = line.content.trim();
      
      // Linear moves are simple
      if (content.includes('G01') || content.includes('G1')) {
        complexity += 1;
      }
      
      // Rapid moves are simple
      if (content.includes('G00') || content.includes('G0')) {
        complexity += 0.5;
      }
      
      // Arc moves are more complex
      if (content.includes('G02') || content.includes('G03')) {
        complexity += 3;
      }
      
      // Tool changes add complexity
      if (content.includes('T') || content.includes('M6')) {
        complexity += 5;
      }
      
      // Coordinate system changes add complexity
      if (content.match(/G5[4-9]/)) {
        complexity += 2;
      }
    });
    
    return Math.round(complexity / lines.length * 10) / 10; // Average complexity per line
  }
  
  /**
   * Create chunk metadata structure
   */
  createChunkMetadata(analysis) {
    // Validate chunks
    if (this.config.validateChunks) {
      this.validateChunks(analysis.chunks);
    }
    
    // Add chunk statistics
    analysis.chunkStatistics = {
      totalChunks: analysis.chunks.length,
      averageChunkSize: analysis.chunks.length > 0 ? 
        Math.round(analysis.totalLines / analysis.chunks.length) : 0,
      largestChunk: Math.max(...analysis.chunks.map(c => c.lineCount)),
      smallestChunk: Math.min(...analysis.chunks.map(c => c.lineCount)),
      totalComplexity: analysis.chunks.reduce((sum, c) => sum + c.metadata.complexity, 0)
    };
    
    debug('Chunk metadata created', {
      totalChunks: analysis.chunkStatistics.totalChunks,
      averageSize: analysis.chunkStatistics.averageChunkSize,
      totalComplexity: analysis.chunkStatistics.totalComplexity
    });
  }
  
  /**
   * Validate chunks for consistency
   */
  validateChunks(chunks) {
    let expectedStartLine = 1;
    
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      
      // Validate chunk index
      if (chunk.index !== i) {
        warn(`Chunk index mismatch: expected ${i}, got ${chunk.index}`);
      }
      
      // Validate line continuity
      if (chunk.startLine !== expectedStartLine) {
        warn(`Line continuity broken: expected start line ${expectedStartLine}, got ${chunk.startLine}`);
      }
      
      // Validate chunk integrity
      if (chunk.endLine < chunk.startLine) {
        warn(`Invalid chunk: end line ${chunk.endLine} < start line ${chunk.startLine}`);
      }
      
      expectedStartLine = chunk.endLine + 1;
    }
    
    debug('Chunk validation completed', { chunks: chunks.length });
  }
  
  /**
   * Update analysis metrics
   */
  updateAnalysisMetrics(analysis) {
    this.analysisMetrics.totalFiles++;
    this.analysisMetrics.totalLines += analysis.totalLines;
    this.analysisMetrics.totalBytes += analysis.totalBytes;
    this.analysisMetrics.totalAnalysisTime += analysis.analysisTime;
    this.analysisMetrics.averageAnalysisTime = 
      this.analysisMetrics.totalAnalysisTime / this.analysisMetrics.totalFiles;
  }
  
  /**
   * Get file metadata without full analysis
   */
  async getFileMetadata(filePath) {
    try {
      const fileStats = await fs.stat(filePath);
      
      return {
        filePath,
        fileName: filePath.split('/').pop(),
        fileSize: fileStats.size,
        fileModified: fileStats.mtime,
        isAccessible: true
      };
      
    } catch (err) {
      error('Failed to get file metadata', { error: err.message, file: filePath });
      return {
        filePath,
        fileName: filePath.split('/').pop(),
        fileSize: 0,
        fileModified: null,
        isAccessible: false,
        error: err.message
      };
    }
  }
  
  /**
   * Estimate analysis time for a file
   */
  async estimateAnalysisTime(filePath) {
    try {
      const metadata = await this.getFileMetadata(filePath);
      
      if (!metadata.isAccessible) {
        return 0;
      }
      
      // Rough estimation based on file size and historical data
      const avgBytesPerSecond = this.analysisMetrics.totalBytes > 0 ? 
        this.analysisMetrics.totalBytes / (this.analysisMetrics.totalAnalysisTime / 1000) : 
        1024 * 1024; // 1MB/s default
      
      return Math.round((metadata.fileSize / avgBytesPerSecond) * 1000); // Return in milliseconds
      
    } catch (err) {
      warn('Failed to estimate analysis time', { error: err.message, file: filePath });
      return 0;
    }
  }
  
  /**
   * Get analysis statistics
   */
  getAnalysisStatistics() {
    return {
      ...this.analysisMetrics,
      avgLinesPerFile: this.analysisMetrics.totalFiles > 0 ? 
        Math.round(this.analysisMetrics.totalLines / this.analysisMetrics.totalFiles) : 0,
      avgBytesPerFile: this.analysisMetrics.totalFiles > 0 ? 
        Math.round(this.analysisMetrics.totalBytes / this.analysisMetrics.totalFiles) : 0
    };
  }
  
  /**
   * Export analysis data
   */
  exportData() {
    return {
      metrics: { ...this.analysisMetrics },
      config: { ...this.config }
    };
  }
  
  /**
   * Reset analysis statistics
   */
  resetStatistics() {
    this.analysisMetrics = {
      totalFiles: 0,
      totalLines: 0,
      totalBytes: 0,
      averageAnalysisTime: 0,
      totalAnalysisTime: 0
    };
    
    debug('Analysis statistics reset');
    this.emit('statisticsReset');
  }
  
  /**
   * Clean up resources
   */
  cleanup() {
    this.removeAllListeners();
  }
}