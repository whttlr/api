/**
 * CNC Integrated Application Entry Point
 * 
 * This is the entry point for the bundled CNC application.
 * It simply exports the main CNCApp component.
 * 
 * @module cnc-integrated-app
 */

import React from 'react';
import { CNCApp } from './CNCApp.jsx';

/**
 * Default export for bundled application
 */
export default function CNCIntegratedApp() {
  return React.createElement(CNCApp);
}