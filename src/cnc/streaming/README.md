# CNC Streaming Module

The streaming module provides advanced G-code file streaming capabilities for CNC machines, including chunked file processing, memory management, pause/resume functionality, and checkpoint-based recovery. It's designed to handle large files efficiently while maintaining system stability and providing comprehensive progress tracking.

## Components

### ChunkedFileStreamer
Main orchestrator for streaming large G-code files by breaking them into manageable chunks.

**Features:**
- Automatic file chunking based on configurable size limits
- Memory usage monitoring and optimization
- Pause/resume functionality with state preservation
- Checkpoint-based recovery for interrupted operations
- Progress tracking and statistics
- Component-based architecture for modularity

**Usage:**
```javascript
import { ChunkedFileStreamer } from './ChunkedFileStreamer.js';

const chunkedStreamer = new ChunkedFileStreamer(streamingManager, {
  chunkSize: 1000,
  enablePauseResume: true,
  enableCheckpointing: true,
  maxMemoryUsage: 50 * 1024 * 1024 // 50MB
});

chunkedStreamer.on('chunkCompleted', (event) => {
  console.log(`Chunk ${event.chunkIndex + 1} completed (${event.totalProgress.toFixed(1)}%)`);
});

await chunkedStreamer.startChunkedStreaming('/path/to/large-file.gcode');
```

### FileAnalyzer
Analyzes G-code files to extract metadata and prepare optimal chunking strategies.

**Features:**
- G-code parsing and metadata extraction
- Tool change and coordinate system detection
- Movement complexity analysis
- File validation and integrity checking
- Chunk optimization based on content analysis

**Usage:**
```javascript
import { FileAnalyzer } from './FileAnalyzer.js';

const analyzer = new FileAnalyzer({
  chunkSize: 1000,
  enableMetadata: true,
  validateChunks: true
});

const analysis = await analyzer.analyzeFile('/path/to/file.gcode');
console.log(`File has ${analysis.totalLines} lines in ${analysis.chunks.length} chunks`);
console.log(`Tool changes: ${analysis.metadata.toolChanges}`);
```

### ChunkProcessor
Handles the actual processing and streaming of individual chunks with concurrent processing and retry logic.

**Features:**
- Concurrent chunk processing with configurable limits
- Retry logic for failed chunks with exponential backoff
- Performance metrics and bottleneck detection
- Progress tracking per chunk and overall
- Error handling and failure recovery

**Usage:**
```javascript
import { ChunkProcessor } from './ChunkProcessor.js';

const processor = new ChunkProcessor(streamingManager, {
  maxConcurrentChunks: 3,
  retryFailedChunks: true,
  maxChunkRetries: 3
});

processor.on('chunkCompleted', (event) => {
  console.log(`Chunk ${event.chunk.index} processed in ${event.processingTime}ms`);
});

await processor.startProcessing(chunks);
```

### StreamPauseResume
Provides sophisticated pause and resume capabilities with state preservation.

**Features:**
- Graceful and immediate pause modes
- State preservation during pause periods
- Resume validation and recovery
- Pause timeout management
- Performance metrics for pause/resume operations

**Usage:**
```javascript
import { StreamPauseResume } from './StreamPauseResume.js';

const pauseResume = new StreamPauseResume({
  enableGracefulPause: true,
  maxPauseDuration: 300000, // 5 minutes
  saveStateOnPause: true
});

await pauseResume.requestPause('user_request');
await pauseResume.requestResume();
```

### CheckpointManager
Manages streaming progress checkpoints for recovery after interruptions.

**Features:**
- Automatic checkpoint creation at configurable intervals
- Checkpoint validation and integrity checking
- Disk persistence with compression support
- Multiple checkpoint retention with cleanup
- Resume capability from last valid checkpoint

**Usage:**
```javascript
import { CheckpointManager } from './CheckpointManager.js';

const checkpointManager = new CheckpointManager({
  enableCheckpointing: true,
  checkpointInterval: 5000,
  maxCheckpoints: 10
});

const checkpoint = await checkpointManager.createCheckpoint(streamingState);
const loadedCheckpoint = await checkpointManager.loadCheckpoint(filePath);
```

### MemoryManager
Monitors and controls memory usage during streaming operations.

**Features:**
- Real-time memory usage monitoring
- Configurable memory limits and thresholds
- Automatic garbage collection triggers
- Memory leak detection
- Performance optimization recommendations

**Usage:**
```javascript
import { MemoryManager } from './MemoryManager.js';

const memoryManager = new MemoryManager({
  maxMemoryUsage: 100 * 1024 * 1024, // 100MB
  warningThreshold: 0.8,
  enableGarbageCollection: true
});

memoryManager.on('memoryWarning', (event) => {
  console.log(`Memory usage: ${event.percentage.toFixed(1)}%`);
});

memoryManager.startMonitoring();
```

## Architecture

The streaming module follows a component-based architecture with clear separation of concerns:

```
streaming/
├── ChunkedFileStreamer.js    # Main orchestrator
├── FileAnalyzer.js           # File analysis and metadata
├── ChunkProcessor.js         # Chunk processing and streaming
├── StreamPauseResume.js      # Pause/resume functionality
├── CheckpointManager.js      # Progress checkpointing
├── MemoryManager.js          # Memory monitoring and control
├── __tests__/                # Comprehensive test suite
├── __mocks__/                # Mock objects for testing
├── README.md                 # This documentation
└── index.js                  # Module exports
```

## Event System

All streaming components extend EventEmitter and emit structured events:

### ChunkedFileStreamer Events
- `chunkedStreamingStarted` - Streaming has begun
- `fileAnalyzed` - File analysis completed
- `chunkCompleted` - Individual chunk completed
- `processingCompleted` - All chunks processed
- `streamingPaused` - Streaming paused
- `streamingResumed` - Streaming resumed
- `chunkedStreamingStopped` - Streaming stopped
- `checkpointCreated` - Progress checkpoint created
- `memoryWarning` - Memory usage warning

### FileAnalyzer Events
- `fileAnalyzed` - File analysis completed with metadata
- `analysisProgress` - Progress during analysis of large files
- `statisticsReset` - Analysis statistics reset

### ChunkProcessor Events
- `chunkCompleted` - Individual chunk processed successfully
- `chunkFailed` - Chunk processing failed
- `chunkRetryQueued` - Chunk queued for retry
- `processingCompleted` - All chunks completed
- `processingPaused` - Processing paused
- `processingResumed` - Processing resumed
- `processingStopped` - Processing stopped

## Configuration

Comprehensive configuration options for all components:

```javascript
const config = {
  // ChunkedFileStreamer
  chunkSize: 1000,                    // Lines per chunk
  enablePauseResume: true,            // Enable pause/resume
  enableCheckpointing: true,          // Enable checkpoints
  resumeFromCheckpoint: true,         // Resume from checkpoints
  maxMemoryUsage: 50 * 1024 * 1024,   // Memory limit (bytes)
  
  // FileAnalyzer
  bufferSize: 64 * 1024,              // File read buffer
  enableMetadata: true,               // Extract metadata
  validateChunks: true,               // Validate chunks
  skipEmptyLines: true,               // Skip empty lines
  skipComments: true,                 // Skip comment lines
  
  // ChunkProcessor
  maxConcurrentChunks: 3,             // Concurrent processing limit
  retryFailedChunks: true,            // Retry failed chunks
  maxChunkRetries: 3,                 // Max retries per chunk
  chunkTimeout: 30000,                // Chunk timeout (ms)
  
  // StreamPauseResume
  pauseTimeout: 5000,                 // Pause operation timeout
  resumeTimeout: 5000,                // Resume operation timeout
  maxPauseDuration: 300000,           // Max pause duration (ms)
  enableGracefulPause: true,          // Complete operations before pause
  
  // CheckpointManager
  checkpointInterval: 5000,           // Checkpoint interval (lines)
  maxCheckpoints: 10,                 // Max checkpoints to keep
  compressionEnabled: false,          // Enable checkpoint compression
  validateChecksums: true,            // Validate checkpoint integrity
  
  // MemoryManager
  warningThreshold: 0.8,              // Warning at 80% of limit
  criticalThreshold: 0.9,             // Critical at 90% of limit
  monitoringInterval: 1000,           // Monitoring interval (ms)
  enableGarbageCollection: true       // Enable forced GC
};
```

## Data Structures

### File Analysis Result
```javascript
{
  filePath: '/path/to/file.gcode',
  fileSize: 1024768,
  totalLines: 5000,
  totalBytes: 1024768,
  chunks: [
    {
      index: 0,
      startLine: 1,
      endLine: 1000,
      lineCount: 1000,
      lines: ['G0 X0 Y0', 'G1 X10 Y10', ...],
      metadata: {
        hasToolChange: false,
        hasCoordinateChange: true,
        complexity: 2.5
      }
    }
  ],
  metadata: {
    hasComments: true,
    hasSubPrograms: false,
    toolChanges: 3,
    coordinateSystemChanges: 2,
    estimatedTime: 1200, // seconds
    estimatedDistance: 500 // mm
  },
  chunkStatistics: {
    totalChunks: 5,
    averageChunkSize: 1000,
    largestChunk: 1000,
    smallestChunk: 1000,
    totalComplexity: 12.5
  }
}
```

### Checkpoint Data
```javascript
{
  id: 'cp_1634567890123_abc123',
  timestamp: 1634567890123,
  filePath: '/path/to/file.gcode',
  version: '1.0',
  state: {
    currentChunk: 3,
    totalChunks: 5,
    currentLine: 3000,
    totalLines: 5000,
    bytesProcessed: 614860,
    totalBytes: 1024768
  },
  metrics: {
    chunksSuccessful: 3,
    chunksFailed: 0,
    averageChunkTime: 2500
  },
  checksum: 'a1b2c3d4'
}
```

## Performance Optimization

### Memory Management
- Configurable memory limits with automatic enforcement
- Intelligent chunk size adjustment based on available memory
- Garbage collection triggers during high memory usage
- Memory leak detection and warnings

### Chunk Processing
- Concurrent processing with configurable limits
- Intelligent retry logic with exponential backoff
- Progress-based optimization of chunk sizes
- Bottleneck detection and resolution

### File I/O Optimization
- Streaming file reading with configurable buffer sizes
- Lazy loading of chunks to minimize memory usage
- Efficient temporary file management
- Disk-based checkpoint persistence

## Error Handling and Recovery

### Chunk Processing Errors
- Automatic retry with configurable limits
- Graceful degradation on repeated failures
- Detailed error logging and reporting
- Recovery strategies for different error types

### Memory Management
- Automatic memory optimization when limits approached
- Chunk size reduction during high memory usage
- Forced garbage collection when necessary
- Memory leak detection and alerting

### Checkpoint Recovery
- Automatic checkpoint validation
- Resume from last valid checkpoint
- Checkpoint corruption detection and handling
- Fallback to previous checkpoints when needed

## Testing

The module includes comprehensive test coverage:

```bash
npm test src/cnc/streaming/
```

Test coverage includes:
- Component integration and communication
- File analysis with various G-code formats
- Chunk processing under different conditions
- Pause/resume functionality
- Checkpoint creation and recovery
- Memory management and optimization
- Error conditions and recovery
- Performance under load

Mock objects provide realistic testing without hardware dependencies.

## Usage Patterns

### Basic Chunked Streaming
```javascript
const streamer = new ChunkedFileStreamer(streamingManager);
await streamer.startChunkedStreaming('/path/to/large-file.gcode');
```

### Advanced Configuration
```javascript
const streamer = new ChunkedFileStreamer(streamingManager, {
  chunkSize: 500,
  enableCheckpointing: true,
  maxMemoryUsage: 20 * 1024 * 1024
});

streamer.on('memoryWarning', (event) => {
  console.log(`Memory usage at ${event.percentage}%`);
});

await streamer.startChunkedStreaming('/path/to/file.gcode');
```

### Resume from Checkpoint
```javascript
await streamer.startChunkedStreaming('/path/to/file.gcode', {
  resumeFromCheckpoint: true
});
```

### Manual Pause/Resume Control
```javascript
// Pause streaming
await streamer.pauseStreaming();

// Resume after some time
setTimeout(async () => {
  await streamer.resumeStreaming();
}, 5000);
```

## Best Practices

1. **Configure appropriate chunk sizes** - Balance memory usage with processing efficiency
2. **Enable checkpointing for large files** - Provides recovery capability for long operations
3. **Monitor memory usage** - Set appropriate limits for your system
4. **Handle events promptly** - Process streaming events to prevent buffer overflow
5. **Use pause/resume judiciously** - Avoid frequent pausing which can impact performance
6. **Validate file integrity** - Enable chunk validation for critical operations
7. **Plan for recovery scenarios** - Design applications to handle streaming interruptions
8. **Test with representative files** - Use realistic G-code files for testing

## Troubleshooting

### High Memory Usage
- Reduce chunk size
- Enable memory management
- Increase memory limits if available
- Check for memory leaks in application code

### Slow Processing
- Increase concurrent chunk limit
- Optimize chunk sizes
- Check underlying streaming manager performance
- Review file complexity and adjust accordingly

### Checkpoint Issues
- Verify disk space availability
- Check file permissions
- Validate checkpoint integrity
- Review checkpoint retention settings

### Pause/Resume Problems
- Check pause timeout settings
- Verify state preservation configuration
- Review graceful pause settings
- Monitor for blocking operations