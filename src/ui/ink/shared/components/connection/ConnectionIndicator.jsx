/**
 * Connection Indicator Component
 * 
 * Visual indicator showing current CNC machine connection status with
 * colored symbols and port information.
 * 
 * @module ConnectionIndicator
 */

import React from 'react';
import { Text } from 'ink';
import { useCNC } from '../../contexts/index.js';

/**
 * Connection Indicator Component
 * Displays connection status with colored symbol and port info
 */
export function ConnectionIndicator() {
  const { state } = useCNC();
  const { connection } = state;
  
  /**
   * Get status color based on connection state
   * @returns {string} Color name for Text component
   */
  const getStatusColor = () => {
    switch (connection.status) {
      case 'connected': return 'green';
      case 'connecting': return 'yellow';
      case 'error': return 'red';
      default: return 'gray';
    }
  };
  
  /**
   * Get status symbol based on connection state
   * @returns {string} Unicode symbol representing status
   */
  const getStatusSymbol = () => {
    switch (connection.status) {
      case 'connected': return '●';
      case 'connecting': return '◐';
      case 'error': return '✖';
      default: return '○';
    }
  };
  
  return (
    <Text color={getStatusColor()}>
      {getStatusSymbol()} {connection.port || 'Not connected'}
    </Text>
  );
}

// Default export
export default ConnectionIndicator;