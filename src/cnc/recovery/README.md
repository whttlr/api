# CNC Recovery Module

The recovery module provides comprehensive error handling, alarm recovery, and retry management for CNC machines. It implements intelligent recovery strategies, automated alarm handling, and resilient communication patterns to ensure reliable machine operation.

## Components

### AlarmRecoveryManager
Automated alarm recovery system with safe recovery sequences, position verification, and state restoration.

**Features:**
- Automatic alarm detection and classification
- Safe recovery sequences for different alarm types
- Position and state restoration after recovery
- Recovery attempt tracking and limiting
- Custom recovery workflow support
- Machine state synchronization

**Usage:**
```javascript
import { AlarmRecoveryManager } from './AlarmRecoveryManager.js';

const recoveryManager = new AlarmRecoveryManager(commandManager, {
  enableAutoRecovery: true,
  maxRecoveryAttempts: 3,
  recoveryTimeout: 30000,
  safeHeight: 5.0,
  enablePositionRestore: true
});

// Handle alarm automatically
recoveryManager.on('alarm', async (alarmData) => {
  const result = await recoveryManager.recoverFromAlarm(alarmData.code);
  console.log('Recovery result:', result);
});

// Manual recovery trigger
const result = await recoveryManager.recoverFromAlarm(2); // Soft limit
if (result.success) {
  console.log('Recovery completed successfully');
} else {
  console.log('Recovery failed:', result.reason);
}
```

### ErrorClassifier
Smart error classification system with pattern learning and contextual analysis.

**Features:**
- GRBL error code mapping and classification
- Communication error pattern recognition
- Machine learning-based pattern detection
- Contextual error analysis
- Recovery strategy recommendation
- Error correlation analysis

**Usage:**
```javascript
import { ErrorClassifier } from './ErrorClassifier.js';

const classifier = new ErrorClassifier({
  enableLearning: true,
  confidenceThreshold: 0.8,
  enableContextualAnalysis: true
});

// Classify an error
const error = new Error('Soft limit exceeded');
const classification = classifier.classifyError(error, 'hardware');

console.log('Error type:', classification.type);
console.log('Severity:', classification.severity);
console.log('Retryable:', classification.retryable);

// Get recovery strategy
const strategy = classifier.getRecoveryStrategy(classification);
console.log('Recovery actions:', strategy.suggestedActions);
```

### RetryManager
Intelligent retry management with exponential backoff and circuit breaker patterns.

**Features:**
- Exponential backoff with jitter
- Command-specific retry strategies
- Circuit breaker pattern for failure protection
- Retry statistics and monitoring
- Cancellable retry operations
- Error classification integration

**Usage:**
```javascript
import { RetryManager } from './RetryManager.js';

const retryManager = new RetryManager({
  maxRetries: 3,
  initialDelay: 500,
  backoffMultiplier: 2,
  enableCircuitBreaker: true
});

// Execute function with retry logic
const result = await retryManager.executeWithRetry(
  async () => commandManager.sendCommand('G0 X10 Y10'),
  {
    commandType: 'movement',
    errorType: 'timeout'
  }
);

// Custom retry strategy
retryManager.setCustomStrategy('probe', {
  maxRetries: 0, // Never retry probe commands
  requiresConfirmation: true
});
```

## Architecture

The recovery module follows a component-based architecture with clear separation of concerns:

```
recovery/
├── AlarmRecoveryManager.js     # Alarm detection and recovery orchestration
├── ErrorClassifier.js         # Error analysis and classification
├── RetryManager.js            # Retry logic and exponential backoff
├── __tests__/                 # Comprehensive test suite
├── __mocks__/                 # Mock objects for testing
├── README.md                  # This documentation
└── index.js                   # Module exports
```

## Event System

All recovery components extend EventEmitter and emit structured events:

### AlarmRecoveryManager Events
- `recoveryStarted` - Recovery sequence initiated
- `recoveryCompleted` - Recovery sequence completed successfully
- `recoveryFailed` - Recovery sequence failed
- `positionRestored` - Machine position restored after recovery
- `stateRestored` - Machine state restored after recovery

### ErrorClassifier Events
- `errorClassified` - Error has been classified
- `patternLearned` - New error pattern learned
- `correlationDetected` - Error correlation identified
- `confidenceUpdated` - Classification confidence updated

### RetryManager Events
- `retryStarted` - Retry attempt initiated
- `retrySucceeded` - Retry attempt succeeded
- `retryFailed` - Retry attempt failed
- `circuitBreakerOpened` - Circuit breaker opened due to failures
- `circuitBreakerClosed` - Circuit breaker closed after recovery

## Recovery Strategies

### Alarm-Specific Recovery

**Soft Limit (Alarm 2)**
1. Unlock machine (`$X`)
2. Home machine (`$H`)
3. Move to safe height
4. Restore work coordinates
5. Verify position accuracy

**Hard Limit (Alarm 1)**
- Manual intervention required
- Safety inspection needed
- No automatic recovery

**Abort Cycle (Alarm 3)**
1. Clear alarm state
2. Verify machine safety
3. Restore previous state
4. Resume operation if safe

**Homing Failure (Alarm 8)**
1. Check limit switch status
2. Clear alarm state
3. Retry homing sequence
4. Verify home position

### Communication Error Recovery

**Timeout Errors**
- Exponential backoff retry
- Connection health check
- Command resend with verification

**Connection Lost**
- Automatic reconnection attempt
- State synchronization after reconnect
- Buffer recovery if needed

**Buffer Overflow**
- Pause command sending
- Wait for buffer to clear
- Resume with flow control

## Error Classification

### GRBL Error Codes

The system includes comprehensive mapping of GRBL error codes:

```javascript
const grblErrors = {
  1: { type: 'syntax_error', severity: 'high', retryable: false },
  2: { type: 'syntax_error', severity: 'high', retryable: false },
  8: { type: 'state_error', severity: 'medium', retryable: true },
  9: { type: 'state_error', severity: 'medium', retryable: true },
  10: { type: 'limit_error', severity: 'high', retryable: false }
  // ... additional mappings
};
```

### Error Severity Levels

- **Critical** - Immediate manual intervention required
- **High** - Automatic recovery possible with caution
- **Medium** - Standard retry logic applicable
- **Low** - Minor issue, simple retry sufficient

### Retryability Assessment

Errors are classified as retryable or non-retryable based on:
- Error type and cause
- Current machine state
- Historical success rates
- Safety considerations

## Pattern Learning

### Machine Learning Integration

The ErrorClassifier supports pattern learning to improve classification accuracy:

```javascript
// Learn from error patterns
classifier.learnFromError(error, commandHistory);

// Predict potential errors
const prediction = classifier.predictError(commandHistory);
if (prediction.likelihood > 0.8) {
  console.log('High risk of:', prediction.predictedErrorType);
}

// Export training data
const trainingData = classifier.exportTrainingData();

// Import pre-trained model
classifier.importModel(modelData);
```

### Pattern Recognition

- Command sequence analysis
- Temporal pattern detection
- Contextual correlation
- Frequency-based learning

## Circuit Breaker Pattern

The RetryManager implements a circuit breaker to prevent cascading failures:

### Circuit States

**Closed** - Normal operation, errors trigger retries
**Open** - Too many failures, all requests fail immediately
**Half-Open** - Testing recovery, single request allowed

### Configuration

```javascript
const retryManager = new RetryManager({
  enableCircuitBreaker: true,
  circuitBreakerThreshold: 5,    // Failures before opening
  circuitBreakerTimeout: 30000   // Time before trying half-open
});
```

## Recovery Workflow Customization

### Custom Recovery Workflows

```javascript
// Define custom recovery for specific alarm
recoveryManager.setCustomRecoveryWorkflow(2, async (context) => {
  // Custom soft limit recovery logic
  await commandManager.sendCommand('$X');
  await customHomingSequence();
  await restoreCustomState(context.machineState);
  
  return { success: true, customRecovery: true };
});

// Fallback to default if custom fails
recoveryManager.config.enableFallback = true;
```

### Conditional Strategies

```javascript
// Different strategies based on context
retryManager.setConditionalStrategy('movement', (error, context) => {
  if (context.machineState === 'ALARM') {
    return { maxRetries: 0 }; // Don't retry in alarm state
  }
  
  if (context.timeOfDay > 18) {
    return { maxRetries: 1, requiresConfirmation: true }; // Cautious after hours
  }
  
  return { maxRetries: 3 }; // Normal operation
});
```

## State Management

### Machine State Tracking

The recovery system maintains comprehensive machine state:

```javascript
const machineState = {
  lastKnownPosition: { x: 10.5, y: 20.3, z: 5.0 },
  lastKnownWorkOffset: { x: 0, y: 0, z: 0 },
  lastKnownSpindleState: { running: true, speed: 1000 },
  lastKnownCoolantState: true,
  isHomed: true,
  coordinateSystem: 'G54',
  modalGroups: { motion: 'G1', coordinate: 'G54', plane: 'G17' }
};
```

### State Restoration

After recovery, the system can restore:
- Machine position
- Work coordinate offsets
- Tool offsets
- Modal states (motion, coordinate, plane)
- Spindle state (if enabled)
- Coolant state
- Feed and speed overrides

## Statistics and Monitoring

### Recovery Statistics

```javascript
const stats = recoveryManager.getRecoveryStatistics();
console.log('Success rate:', stats.successRate);
console.log('Average recovery time:', stats.averageRecoveryTime);
console.log('Most common alarms:', stats.alarmTypeStats);
```

### Error Analytics

```javascript
const analytics = classifier.getErrorStatistics();
console.log('Error frequency:', analytics.errorCounts);
console.log('Error trends:', analytics.errorTrends);
console.log('Correlation patterns:', analytics.correlations);
```

### Retry Metrics

```javascript
const metrics = retryManager.getRetryStatistics();
console.log('Retry success rate:', metrics.retrySuccessRate);
console.log('Circuit breaker activations:', metrics.circuitBreakerActivations);
console.log('Command type performance:', metrics.commandTypeStats);
```

## Testing

The module includes comprehensive test coverage:

```bash
npm test src/cnc/recovery/
```

Test coverage includes:
- Alarm recovery sequences
- Error classification accuracy
- Retry logic and backoff timing
- Circuit breaker behavior
- Pattern learning capabilities
- State restoration verification
- Mock integration for isolated testing

## Configuration

### AlarmRecoveryManager Configuration

```javascript
{
  enableAutoRecovery: true,         // Enable automatic recovery
  maxRecoveryAttempts: 3,           // Max attempts per alarm
  recoveryTimeout: 30000,           // Timeout for recovery sequence
  safeHeight: 5.0,                  // Safe Z height for recovery
  homingTimeout: 60000,             // Timeout for homing sequence
  positionTolerance: 0.1,           // Position verification tolerance
  enablePositionRestore: true,      // Restore position after recovery
  enableWorkOffsetRestore: true,    // Restore work offsets
  enableSpindleRestore: false,      // Restore spindle state (safety)
  enableCoolantRestore: true        // Restore coolant state
}
```

### ErrorClassifier Configuration

```javascript
{
  enableLearning: true,             // Enable pattern learning
  confidenceThreshold: 0.8,        // Minimum confidence for classification
  maxPatternHistory: 1000,          // Maximum patterns to remember
  patternMatchingDepth: 5,          // Commands to look back for patterns
  enableContextualAnalysis: true    // Consider context when classifying
}
```

### RetryManager Configuration

```javascript
{
  maxRetries: 3,                    // Maximum retry attempts per command
  initialDelay: 500,                // Initial retry delay (ms)
  maxDelay: 10000,                  // Maximum retry delay (ms)
  backoffMultiplier: 2,             // Exponential backoff multiplier
  jitterMax: 100,                   // Maximum random jitter (ms)
  enableCircuitBreaker: true,       // Enable circuit breaker pattern
  circuitBreakerThreshold: 5,       // Failures before opening circuit
  circuitBreakerTimeout: 30000      // Circuit breaker reset timeout
}
```

## Safety Considerations

### Recovery Safety

- Automatic recovery only for safe alarm types
- Manual intervention required for critical alarms
- Position verification after recovery
- Safe height movement before position restore
- Spindle safety (disabled by default in restoration)

### Error Handling Safety

- Conservative retry limits for safety-critical commands
- No retry for probe operations (safety)
- Circuit breaker prevents cascade failures
- Manual confirmation for dangerous operations

### State Restoration Safety

- Verify machine state before restoration
- Safe movement sequences during restore
- Position tolerance checking
- Spindle safety interlocks

## Troubleshooting

### Recovery Issues

**Recovery Fails Immediately**
- Check machine connection status
- Verify alarm type is recoverable
- Check recovery attempt limits
- Review machine state validity

**Position Restoration Inaccurate**
- Verify homing accuracy
- Check position tolerance settings
- Inspect mechanical system
- Calibrate machine coordinates

**Repeated Recovery Attempts**
- Check root cause of alarms
- Verify machine configuration
- Inspect limit switch operation
- Review G-code for errors

### Classification Issues

**Low Classification Confidence**
- Increase pattern learning data
- Verify error message formats
- Check contextual information
- Review classification rules

**Incorrect Error Classification**
- Update error mappings
- Provide more training data
- Adjust confidence thresholds
- Review pattern learning

### Retry Issues

**Excessive Retries**
- Review retry strategies
- Check error retryability
- Verify circuit breaker settings
- Analyze error patterns

**Circuit Breaker Opens Frequently**
- Investigate root error causes
- Adjust failure thresholds
- Review retry strategies
- Check system stability

## Integration Examples

### Basic Recovery Setup

```javascript
import { AlarmRecoveryManager, ErrorClassifier, RetryManager } from './recovery/index.js';

// Setup integrated recovery system
const classifier = new ErrorClassifier({ enableLearning: true });
const retryManager = new RetryManager({ enableCircuitBreaker: true });
const recoveryManager = new AlarmRecoveryManager(commandManager);

// Connect components
retryManager.setErrorClassifier(classifier);
recoveryManager.setErrorClassifier(classifier);

// Setup event handling
recoveryManager.on('recoveryCompleted', (result) => {
  console.log('Recovery successful:', result);
});

classifier.on('patternLearned', (pattern) => {
  console.log('New pattern learned:', pattern);
});
```

### Advanced Error Handling

```javascript
// Custom error handler with full recovery integration
class AdvancedErrorHandler {
  constructor(commandManager) {
    this.commandManager = commandManager;
    this.classifier = new ErrorClassifier();
    this.retryManager = new RetryManager();
    this.recoveryManager = new AlarmRecoveryManager(commandManager);
    
    this.setupIntegration();
  }
  
  async handleError(error, context = {}) {
    // Classify the error
    const classification = this.classifier.classifyError(error, context.type);
    
    if (classification.type === 'alarm') {
      // Use recovery manager for alarms
      return await this.recoveryManager.recoverFromAlarm(error.code);
    } else if (classification.retryable) {
      // Use retry manager for retryable errors
      return await this.retryManager.executeWithRetry(
        context.originalOperation,
        { errorType: classification.type }
      );
    } else {
      // Require manual intervention
      return { success: false, requiresManualIntervention: true };
    }
  }
}
```