/**
 * CNC Streaming Module
 * 
 * Provides comprehensive streaming functionality for G-code files using a component-based architecture.
 * This module exports all streaming components and utilities.
 */

import { ChunkedFileStreamer } from './ChunkedFileStreamer.js';
import { FileAnalyzer } from './FileAnalyzer.js';
import { ChunkProcessor } from './ChunkProcessor.js';
import { StreamPauseResume } from './StreamPauseResume.js';
import { CheckpointManager } from './CheckpointManager.js';
import { MemoryManager } from './MemoryManager.js';

// Main streaming managers (orchestrate components)
export { ChunkedFileStreamer };

// Component managers
export { FileAnalyzer };
export { ChunkProcessor };
export { StreamPauseResume };
export { CheckpointManager };
export { MemoryManager };

// Convenience factory functions
export function createChunkedFileStreamer(streamingManager, config = {}) {
  return new ChunkedFileStreamer(streamingManager, config);
}

export function createFileAnalyzer(config = {}) {
  return new FileAnalyzer(config);
}

export function createChunkProcessor(streamingManager, config = {}) {
  return new ChunkProcessor(streamingManager, config);
}

export function createStreamPauseResume(config = {}) {
  return new StreamPauseResume(config);
}

export function createCheckpointManager(config = {}) {
  return new CheckpointManager(config);
}

export function createMemoryManager(config = {}) {
  return new MemoryManager(config);
}

// Default export is the main chunked file streamer
export default ChunkedFileStreamer;