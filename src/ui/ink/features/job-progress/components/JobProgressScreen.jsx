/**
 * Job Progress Screen Component
 * 
 * Real-time job monitoring interface with progress tracking, time estimates,
 * override controls, and job management capabilities.
 * 
 * @module JobProgressScreen
 */

import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { useAppState, useCNC } from '../../../shared/contexts/index.js';
import { ProgressDisplay } from './ProgressDisplay.jsx';
import { TimeTracking } from './TimeTracking.jsx';
import { CurrentOperation } from './CurrentOperation.jsx';
import { OverrideControls } from './OverrideControls.jsx';
import { JobControls } from './JobControls.jsx';
import { useJobProgress } from '../hooks/useJobProgress.js';

/**
 * No Job Display Component
 */
function NoJobDisplay() {
  return (
    <Box flexDirection="column" height="100%">
      <Box flex={1} flexDirection="column" alignItems="center" justifyContent="center">
        <Text color="yellow">No job currently running</Text>
        <Text dimColor>Press ESC to go back</Text>
      </Box>
    </Box>
  );
}

/**
 * Job Header Component
 * @param {Object} props - Component props
 * @param {Object} props.job - Job information object
 */
function JobHeader({ job }) {
  return (
    <Box marginBottom={2} paddingX={1}>
      <Text bold color="green">
        ⚡ Job Execution: {job.fileName}
      </Text>
    </Box>
  );
}

/**
 * Job Status Component
 * @param {Object} props - Component props
 * @param {Object} props.job - Job information object
 * @param {Function} props.getJobStatusColor - Status color function
 * @param {Function} props.getJobStatusText - Status text function
 */
function JobStatus({ job, getJobStatusColor, getJobStatusText }) {
  return (
    <Box marginBottom={2} paddingX={1}>
      <Text>
        Status: <Text color={getJobStatusColor()} bold>{getJobStatusText()}</Text>
      </Text>
    </Box>
  );
}

/**
 * Error Display Component
 * @param {Object} props - Component props
 * @param {string} props.error - Error message
 */
function ErrorDisplay({ error }) {
  if (!error) return null;

  return (
    <Box marginBottom={2} paddingX={1}>
      <Text color="red">
        Error: {error}
      </Text>
    </Box>
  );
}

/**
 * Job Progress Screen Component
 * Main interface for monitoring and controlling running jobs
 */
export function JobProgressScreen() {
  const { goBack } = useAppState();
  const { state } = useCNC();
  const job = state.job || {};
  
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
    getJobStatusText
  } = useJobProgress();

  useInput((input, key) => {
    if (key.escape) {
      if (editingOverride) {
        setEditingOverride(null);
      } else {
        goBack();
      }
    } else if (editingOverride) {
      handleOverrideInput(input, key);
    } else {
      handleJobControls(input, key);
    }
  });

  /**
   * Handle job control input
   */
  const handleJobControls = async (input, key) => {
    if (input === ' ' || input === 'p') {
      // Toggle pause/resume
      if (job.isPaused) {
        await jobActions.resumeJob();
      } else {
        await jobActions.pauseJob();
      }
    } else if (input === 's') {
      // Stop job
      await jobActions.cancelJob();
    } else if (input === 'f') {
      // Edit feed override
      setEditingOverride('feed');
      setFeedOverrideInput(job.feedOverride?.toString() || '100');
    } else if (input === 'r') {
      // Edit spindle override
      setEditingOverride('spindle');
      setSpindleOverrideInput(job.spindleOverride?.toString() || '100');
    } else if (key.upArrow) {
      setSelectedControl(Math.max(0, selectedControl - 1));
    } else if (key.downArrow) {
      setSelectedControl(Math.min(3, selectedControl + 1));
    }
  };

  /**
   * Handle override input editing
   */
  const handleOverrideInput = async (input, key) => {
    if (key.return) {
      // Apply override
      const value = parseInt(editingOverride === 'feed' ? feedOverrideInput : spindleOverrideInput);
      if (!isNaN(value) && value >= 10 && value <= 200) {
        if (editingOverride === 'feed') {
          await jobActions.setFeedOverride(value);
        } else {
          await jobActions.setSpindleOverride(value);
        }
      }
      setEditingOverride(null);
    } else if (key.backspace) {
      if (editingOverride === 'feed') {
        setFeedOverrideInput(prev => prev.slice(0, -1));
      } else {
        setSpindleOverrideInput(prev => prev.slice(0, -1));
      }
    } else if (input && input.match(/[0-9]/)) {
      if (editingOverride === 'feed') {
        setFeedOverrideInput(prev => prev + input);
      } else {
        setSpindleOverrideInput(prev => prev + input);
      }
    }
  };

  // Show no job display if no job is running
  if (!job.fileName) {
    return <NoJobDisplay />;
  }

  return (
    <Box flexDirection="column" height="100%">
      <Box flex={1} flexDirection="column" paddingY={1}>
        <JobHeader job={job} />
        
        <JobStatus 
          job={job} 
          getJobStatusColor={getJobStatusColor} 
          getJobStatusText={getJobStatusText} 
        />

        <ProgressDisplay job={job} formatTime={formatTime} />
        
        <TimeTracking job={job} formatTime={formatTime} />
        
        <CurrentOperation job={job} />
        
        <OverrideControls
          job={job}
          selectedControl={selectedControl}
          editingOverride={editingOverride}
          feedOverrideInput={feedOverrideInput}
          spindleOverrideInput={spindleOverrideInput}
        />
        
        <ErrorDisplay error={job.error} />
        
        <JobControls
          job={job}
          selectedControl={selectedControl}
          editingOverride={editingOverride}
        />
      </Box>
    </Box>
  );
}

// Default export
export default JobProgressScreen;