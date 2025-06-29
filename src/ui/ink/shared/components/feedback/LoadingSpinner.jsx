/**
 * Loading Spinner Component
 * 
 * Animated loading overlay with customizable message and spinner animation.
 * 
 * @module LoadingSpinner
 */

import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';

/**
 * Loading Overlay Component
 * @param {Object} props - Component props
 * @param {string} props.message - Loading message to display
 * @param {boolean} props.show - Whether to show the loading overlay
 * @param {string} props.variant - Spinner variant ('dots', 'bars', 'arrows')
 * @param {number} props.speed - Animation speed in milliseconds
 * @returns {React.Component|null} Loading overlay or null
 */
export function LoadingOverlay({ 
  message = 'Loading...', 
  show = false, 
  variant = 'dots',
  speed = 100
}) {
  if (!show) return null;

  // Different spinner animations
  const spinners = {
    dots: ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'],
    bars: ['▁', '▃', '▄', '▅', '▆', '▇', '█', '▇', '▆', '▅', '▄', '▃'],
    arrows: ['←', '↖', '↑', '↗', '→', '↘', '↓', '↙'],
    circle: ['◐', '◓', '◑', '◒'],
    square: ['◰', '◳', '◲', '◱']
  };

  const frames = spinners[variant] || spinners.dots;
  const [frameIndex, setFrameIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setFrameIndex(prev => (prev + 1) % frames.length);
    }, speed);
    return () => clearInterval(interval);
  }, [frames.length, speed]);

  return (
    <Box
      position="absolute"
      top={0}
      left={0}
      right={0}
      bottom={0}
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      backgroundColor="gray"
    >
      <Box 
        borderStyle="round" 
        paddingX={4} 
        paddingY={2}
        backgroundColor="black"
        borderColor="cyan"
      >
        <Text color="cyan">
          {frames[frameIndex]} {message}
        </Text>
      </Box>
    </Box>
  );
}

/**
 * Inline Loading Spinner (smaller version)
 * @param {Object} props - Component props
 * @param {string} props.variant - Spinner variant
 * @param {number} props.speed - Animation speed
 * @returns {React.Component} Inline spinner
 */
export function InlineSpinner({ variant = 'dots', speed = 100 }) {
  const spinners = {
    dots: ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'],
    simple: ['|', '/', '─', '\\']
  };

  const frames = spinners[variant] || spinners.dots;
  const [frameIndex, setFrameIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setFrameIndex(prev => (prev + 1) % frames.length);
    }, speed);
    return () => clearInterval(interval);
  }, [frames.length, speed]);

  return <Text color="cyan">{frames[frameIndex]}</Text>;
}

/**
 * Progress Bar Component
 * @param {Object} props - Component props
 * @param {number} props.progress - Progress percentage (0-100)
 * @param {number} props.width - Bar width in characters
 * @param {string} props.color - Progress bar color
 * @param {boolean} props.showPercentage - Whether to show percentage text
 * @returns {React.Component} Progress bar
 */
export function ProgressBar({ 
  progress = 0, 
  width = 20, 
  color = 'green',
  showPercentage = true 
}) {
  const normalizedProgress = Math.max(0, Math.min(100, progress));
  const filledWidth = Math.round((normalizedProgress / 100) * width);
  const emptyWidth = width - filledWidth;
  
  const filled = '█'.repeat(filledWidth);
  const empty = '░'.repeat(emptyWidth);
  
  return (
    <Box>
      <Text color={color}>{filled}</Text>
      <Text color="gray">{empty}</Text>
      {showPercentage && (
        <Text color="white"> {normalizedProgress.toFixed(1)}%</Text>
      )}
    </Box>
  );
}

/**
 * Loading Dots Component (simple three dots animation)
 * @param {Object} props - Component props
 * @param {string} props.color - Dots color
 * @param {number} props.speed - Animation speed
 * @returns {React.Component} Loading dots
 */
export function LoadingDots({ color = 'cyan', speed = 500 }) {
  const [dotCount, setDotCount] = useState(1);

  useEffect(() => {
    const interval = setInterval(() => {
      setDotCount(prev => (prev % 3) + 1);
    }, speed);
    return () => clearInterval(interval);
  }, [speed]);

  return (
    <Text color={color}>
      {'.'.repeat(dotCount)}
      {' '.repeat(3 - dotCount)}
    </Text>
  );
}

// Named exports for compatibility
export { LoadingOverlay as LoadingSpinner };

// Default export
export default LoadingOverlay;