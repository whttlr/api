/**
 * ProgressIndicator Component
 * 
 * Standardized progress indicator component that unifies all progress display
 * patterns across the application. Supports various styles and indeterminate progress.
 * 
 * @module ProgressIndicator
 */

import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';

/**
 * ProgressIndicator Component
 * Unified component for all progress display patterns
 */
export function ProgressIndicator({
  percentage = 0,
  variant = 'bar',
  size = 'medium',
  color = 'blue',
  showPercentage = true,
  showLabel = true,
  label = '',
  indeterminate = false,
  width = null
}) {
  const [animationFrame, setAnimationFrame] = useState(0);
  
  // Animation for indeterminate progress
  useEffect(() => {
    if (!indeterminate) return;
    
    const interval = setInterval(() => {
      setAnimationFrame(prev => (prev + 1) % 10);
    }, 200);
    
    return () => clearInterval(interval);
  }, [indeterminate]);
  
  /**
   * Get size-specific dimensions
   */
  const getSizeDimensions = () => {
    const sizes = {
      small: { barWidth: 20, dotCount: 5 },
      medium: { barWidth: 30, dotCount: 8 },
      large: { barWidth: 40, dotCount: 12 }
    };
    
    return sizes[size] || sizes.medium;
  };
  
  /**
   * Get color for progress elements
   */
  const getProgressColor = () => {
    const colors = {
      blue: 'blue',
      green: 'green',
      yellow: 'yellow',
      red: 'red',
      cyan: 'cyan',
      magenta: 'magenta'
    };
    
    return colors[color] || 'blue';
  };
  
  /**
   * Render bar-style progress
   */
  const renderBar = () => {
    const dimensions = getSizeDimensions();
    const barWidth = width || dimensions.barWidth;
    const progressColor = getProgressColor();
    
    if (indeterminate) {
      // Animated indeterminate bar
      const position = animationFrame % barWidth;
      const bar = Array(barWidth).fill('░')
        .map((char, index) => {
          const distance = Math.abs(index - position);
          if (distance === 0) return '█';
          if (distance === 1) return '▓';
          if (distance === 2) return '▒';
          return char;
        })
        .join('');
      
      return (
        <Text color={progressColor}>{bar}</Text>
      );
    }
    
    // Standard percentage bar
    const filled = Math.round((percentage / 100) * barWidth);
    const empty = barWidth - filled;
    const bar = '█'.repeat(filled) + '░'.repeat(empty);
    
    return (
      <Text color={progressColor}>{bar}</Text>
    );
  };
  
  /**
   * Render dots-style progress
   */
  const renderDots = () => {
    const dimensions = getSizeDimensions();
    const dotCount = dimensions.dotCount;
    const progressColor = getProgressColor();
    
    if (indeterminate) {
      // Animated dots
      const dots = Array(dotCount).fill('○')
        .map((dot, index) => {
          const frame = (animationFrame + index) % 4;
          if (frame === 0) return '●';
          if (frame === 1) return '◐';
          if (frame === 2) return '○';
          return '◑';
        })
        .join(' ');
      
      return (
        <Text color={progressColor}>{dots}</Text>
      );
    }
    
    // Standard percentage dots
    const filled = Math.round((percentage / 100) * dotCount);
    const dots = Array(dotCount).fill('○')
      .map((dot, index) => index < filled ? '●' : dot)
      .join(' ');
    
    return (
      <Text color={progressColor}>{dots}</Text>
    );
  };
  
  /**
   * Render circle-style progress
   */
  const renderCircle = () => {
    const progressColor = getProgressColor();
    
    if (indeterminate) {
      const frames = ['◐', '◓', '◑', '◒'];
      const frame = frames[animationFrame % frames.length];
      return <Text color={progressColor}>{frame}</Text>;
    }
    
    // Simple circle based on percentage ranges
    let circle = '○';
    if (percentage >= 25) circle = '◔';
    if (percentage >= 50) circle = '◑';
    if (percentage >= 75) circle = '◕';
    if (percentage >= 100) circle = '●';
    
    return <Text color={progressColor}>{circle}</Text>;
  };
  
  /**
   * Render text-only progress
   */
  const renderText = () => {
    const progressColor = getProgressColor();
    
    if (indeterminate) {
      const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
      const frame = frames[animationFrame % frames.length];
      return <Text color={progressColor}>{frame}</Text>;
    }
    
    return (
      <Text color={progressColor}>
        {percentage.toFixed(0)}%
      </Text>
    );
  };
  
  /**
   * Render progress element based on variant
   */
  const renderProgress = () => {
    switch (variant) {
      case 'dots':
        return renderDots();
      case 'circle':
        return renderCircle();
      case 'text':
        return renderText();
      case 'bar':
      default:
        return renderBar();
    }
  };
  
  return (
    <Box flexDirection="column">
      {/* Label */}
      {showLabel && label && (
        <Box marginBottom={1}>
          <Text>{label}</Text>
        </Box>
      )}
      
      {/* Progress indicator */}
      <Box>
        {renderProgress()}
        
        {/* Percentage display (if not text variant) */}
        {showPercentage && variant !== 'text' && !indeterminate && (
          <Box marginLeft={1}>
            <Text dimColor>{percentage.toFixed(0)}%</Text>
          </Box>
        )}
      </Box>
    </Box>
  );
}

/**
 * Progress helper for creating timed progress animations
 */
export function useProgressAnimation(duration = 1000, onComplete = () => {}) {
  const [percentage, setPercentage] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  
  useEffect(() => {
    const interval = setInterval(() => {
      setPercentage(prev => {
        const next = prev + (100 / (duration / 100));
        if (next >= 100) {
          setIsComplete(true);
          onComplete();
          clearInterval(interval);
          return 100;
        }
        return next;
      });
    }, 100);
    
    return () => clearInterval(interval);
  }, [duration, onComplete]);
  
  return { percentage, isComplete, reset: () => setPercentage(0) };
}

export default ProgressIndicator;