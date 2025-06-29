# Job Progress Feature

Real-time job monitoring and control interface with progress tracking, time estimates, and override controls for active G-code execution.

## Components

### JobProgressScreen
Main interface for monitoring and controlling running G-code jobs.

**Features:**
- Real-time progress tracking
- Time estimates and elapsed time
- Current operation display
- Feed rate and spindle speed overrides
- Job control (pause/resume/stop)
- Error handling and recovery

**Usage:**
```jsx
import { JobProgressScreen } from '../features/job-progress';

<JobProgressScreen />
```

### ProgressDisplay
Visual progress bar with completion statistics.

**Features:**
- Animated progress bar
- Line completion tracking
- Percentage display
- Visual progress indicators

**Usage:**
```jsx
import { ProgressDisplay } from '../features/job-progress';

<ProgressDisplay job={jobData} formatTime={timeFormatter} />
```

### TimeTracking
Comprehensive time information display.

**Features:**
- Elapsed time tracking
- Remaining time estimates
- Total execution time
- Time formatting utilities

**Usage:**
```jsx
import { TimeTracking } from '../features/job-progress';

<TimeTracking job={jobData} formatTime={timeFormatter} />
```

### CurrentOperation
Display of currently executing G-code command with context.

**Features:**
- Current command display
- Line number tracking
- Command context information
- Operation type indicators

**Usage:**
```jsx
import { CurrentOperation } from '../features/job-progress';

<CurrentOperation job={jobData} />
```

### OverrideControls
Real-time feed rate and spindle speed override controls.

**Features:**
- Live override adjustment
- Input validation (10-200%)
- Visual feedback for editing
- Safety range warnings

**Usage:**
```jsx
import { OverrideControls } from '../features/job-progress';

<OverrideControls
  job={jobData}
  selectedControl={controlIndex}
  editingOverride={overrideType}
  feedOverrideInput={feedInput}
  spindleOverrideInput={spindleInput}
/>
```

### JobControls
Main job control interface with pause, resume, and stop capabilities.

**Features:**
- Pause/resume toggle
- Job cancellation
- Control selection
- Keyboard shortcuts

**Usage:**
```jsx
import { JobControls } from '../features/job-progress';

<JobControls
  job={jobData}
  selectedControl={controlIndex}
  editingOverride={overrideType}
/>
```

## Hooks

### useJobProgress
Comprehensive job progress state management and control.

**Features:**
- Job state monitoring
- Override control management
- Job action handlers
- Progress calculations
- Status determination

**Usage:**
```jsx
import { useJobProgress } from '../features/job-progress';

const {
  selectedControl,
  setSelectedControl,
  editingOverride,
  setEditingOverride,
  feedOverrideInput,
  setFeedOverrideInput,
  spindleOverrideInput,
  setSpindleOverrideInput,
  jobActions,
  formatTime,
  getJobStatusColor,
  getJobStatusText,
  canControlJob
} = useJobProgress();
```

### useOverrideValidation
Input validation for override values.

**Usage:**
```jsx
import { useOverrideValidation } from '../features/job-progress';

const validation = useOverrideValidation('feed', inputValue);
// Returns: { isValid, value, errors, warnings }
```

### useJobTiming
Job timing utilities and calculations.

**Usage:**
```jsx
import { useJobTiming } from '../features/job-progress';

const {
  eta,
  averageSpeed,
  timeRemaining,
  hasEstimates
} = useJobTiming(jobData);
```

## Services

### JobProgressService
Comprehensive job progress calculations and analysis utilities.

**Functions:**
- `calculateProgress(currentLine, totalLines)` - Progress percentage
- `estimateRemainingTime(elapsed, progress)` - Time estimation
- `formatTime(seconds, includeHours)` - Time formatting
- `calculateExecutionSpeed(lines, time)` - Speed calculation
- `analyzeJobPerformance(job)` - Performance analysis
- `validateOverride(value, type)` - Override validation
- `generateJobSummary(job)` - Job summary report
- `getJobStatus(job)` - Status description
- `isJobControllable(job)` - Control availability

**Usage:**
```jsx
import { JobProgressService } from '../features/job-progress';

const progress = JobProgressService.calculateProgress(150, 300);
const timeLeft = JobProgressService.estimateRemainingTime(60, 50);
const analysis = JobProgressService.analyzeJobPerformance(job);
```

## Job Progress Tracking

### Progress Calculation
Progress is calculated based on:
- **Line-based**: Current line vs total lines
- **Time-based**: Elapsed vs estimated total time
- **Real-time updates**: Updates as job executes

### Time Estimation
Time estimates use:
- **Historical data**: Previous execution speeds
- **Current performance**: Real-time speed calculation
- **Override adjustments**: Feed rate impact on timing

### Status Indicators
Job status includes:
- **Running**: Active execution (green)
- **Paused**: Temporarily stopped (yellow)
- **Error**: Execution failed (red)
- **Stopped**: Completed or cancelled (gray)

## Override Controls

### Feed Rate Override
- **Range**: 10% - 200% of programmed feed rate
- **Impact**: Affects cutting speed and execution time
- **Safety**: Warnings for extreme values
- **Real-time**: Changes apply immediately

### Spindle Speed Override
- **Range**: 10% - 200% of programmed spindle speed
- **Impact**: Affects surface finish and tool life
- **Safety**: High speed warnings
- **Coordination**: Works with feed rate changes

### Override Safety
- **Minimum values**: Prevent stalling (10% minimum)
- **Maximum values**: Prevent damage (200% maximum)
- **Warnings**: Alert for extreme settings
- **Validation**: Real-time input checking

## Job Control Features

### Pause/Resume
- **Immediate**: Stops motion without losing position
- **Safe**: Maintains work coordinates
- **Resumable**: Continues from exact pause point
- **Visual feedback**: Clear status indication

### Stop/Cancel
- **Confirmation**: Prevents accidental stops
- **Clean exit**: Proper job cleanup
- **Position retention**: Maintains machine position
- **Error handling**: Graceful failure recovery

### Emergency Stop
- **Immediate**: Hardware-level stop
- **Safety**: Highest priority action
- **Recovery**: Clear alarm states
- **Integration**: Connected to main emergency systems

## Performance Analysis

### Execution Speed
Tracks and analyzes:
- **Lines per second**: Average execution rate
- **Efficiency rating**: Performance classification
- **Bottleneck detection**: Slow operation identification
- **Optimization suggestions**: Performance improvements

### Performance Ratings
- **Excellent**: > 5 lines/second
- **Good**: 2-5 lines/second
- **Moderate**: 0.5-2 lines/second
- **Slow**: < 0.5 lines/second

## Architecture

This feature follows the established modular architecture:

```
job-progress/
├── components/
│   ├── JobProgressScreen.jsx       # Main progress interface
│   ├── ProgressDisplay.jsx        # Progress bar and statistics
│   ├── TimeTracking.jsx          # Time information display
│   ├── CurrentOperation.jsx       # Current command display
│   ├── OverrideControls.jsx      # Real-time override controls
│   └── JobControls.jsx           # Job control interface
├── hooks/
│   └── useJobProgress.js          # Progress state management
├── services/
│   └── JobProgressService.js      # Progress calculations
├── __tests__/                     # Unit tests (to be added)
├── README.md                      # This file
└── index.js                       # Public API
```

## Dependencies

- `../shared/contexts` - CNC and app state management
- `../shared/components` - Shared UI components

## Future Enhancements

- [ ] Historical job performance tracking
- [ ] Job execution logging and analytics
- [ ] Advanced time estimation algorithms
- [ ] Job scheduling and queue management
- [ ] Performance optimization suggestions
- [ ] Custom override presets
- [ ] Job progress notifications
- [ ] Remote job monitoring
- [ ] Job execution reports
- [ ] Integration with machine learning for better estimates