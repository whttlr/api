/**
 * Toast Context
 * 
 * Provides toast notification system with auto-dismiss functionality
 * and error translation capabilities.
 * 
 * @module ToastContext
 */

import React, { createContext, useContext, useState } from 'react';
import { translateError } from '../services/ErrorTranslator.js';

const ToastContext = createContext();

/**
 * Toast Provider Component
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Child components
 */
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  
  /**
   * Add a new toast notification
   * @param {string} message - Toast message
   * @param {string} type - Toast type ('info', 'success', 'warning', 'error')
   * @param {number} duration - Auto-dismiss duration in milliseconds
   * @returns {string} Toast ID
   */
  const addToast = (message, type = 'info', duration = 4000) => {
    const id = Date.now() + Math.random();
    const toast = { id, message, type, duration };
    
    setToasts(prev => [...prev, toast]);
    
    // Auto-remove after duration
    setTimeout(() => {
      removeToast(id);
    }, duration);
    
    return id;
  };
  
  /**
   * Remove a toast by ID
   * @param {string} id - Toast ID to remove
   */
  const removeToast = (id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };
  
  /**
   * Show error toast with user-friendly translation
   * @param {Error|string} error - Error object or message
   * @param {string} context - Error context for better translation
   * @returns {string} Toast ID
   */
  const showError = (error, context = '') => {
    const userError = translateError(error, context);
    return addToast(userError.message, 'error', 6000);
  };
  
  /**
   * Show success toast
   * @param {string} message - Success message
   * @returns {string} Toast ID
   */
  const showSuccess = (message) => {
    return addToast(message, 'success', 3000);
  };
  
  /**
   * Show warning toast
   * @param {string} message - Warning message
   * @returns {string} Toast ID
   */
  const showWarning = (message) => {
    return addToast(message, 'warning', 4000);
  };
  
  /**
   * Show info toast
   * @param {string} message - Info message
   * @returns {string} Toast ID
   */
  const showInfo = (message) => {
    return addToast(message, 'info', 3000);
  };
  
  /**
   * Clear all toasts
   */
  const clearAll = () => {
    setToasts([]);
  };
  
  const contextValue = {
    toasts,
    addToast,
    removeToast,
    showError,
    showSuccess,
    showWarning,
    showInfo,
    clearAll
  };
  
  return (
    <ToastContext.Provider value={contextValue}>
      {children}
    </ToastContext.Provider>
  );
}

/**
 * Hook to use toast functionality
 * @returns {Object} Toast context methods and state
 */
export function useToast() {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

export default ToastContext;