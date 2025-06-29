/**
 * File Operations Module
 * 
 * Handles G-code file reading, validation, preprocessing, and execution.
 * Separated from main GcodeSender to follow single responsibility principle.
 */

import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import i18n from '../../i18n.js';
import { info, warn, error } from '../../lib/logger/index.js';
import { structuredLogger, createFileExecutionSummary } from '../../lib/reporting/index.js';

export class FileProcessor {
  constructor(config) {
    this.config = config;
  }

  /**
   * Execute G-code from a file
   */
  async executeGcodeFile(filePath, commandExecutor, port, isConnected) {
    try {
      // Validate file path
      const resolvedPath = resolve(filePath);
      if (!existsSync(resolvedPath)) {
        throw new Error(i18n.t('fileProcessor.fileNotFound', { filePath }));
      }

      // Validate file extension
      const validExtensions = this.config.validation?.gcodeFileExtensions || ['.gcode', '.nc', '.txt'];
      const hasValidExtension = validExtensions.some(ext => 
        resolvedPath.toLowerCase().endsWith(ext)
      );
      
      if (!hasValidExtension) {
        const expectedExts = validExtensions.join(', ');
        warn(i18n.t('fileProcessor.unrecognizedFileExtension', { expectedExts }));
        info(i18n.t('fileProcessor.proceedingAnyway'));
      }

      info(i18n.t('fileProcessor.readingGcodeFile', { resolvedPath }));
      
      // Read and process file
      const fileContent = readFileSync(resolvedPath, 'utf8');
      const lines = this.preprocessGcodeFile(fileContent);
      
      if (lines.length === 0) {
        throw new Error(i18n.t('fileProcessor.noValidCommandsFound'));
      }

      info(i18n.t('fileProcessor.commandsToExecute', { count: lines.length }));
      
      // Execute commands sequentially, waiting for each response
      const results = [];
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const lineNumber = i + 1;
        
        try {
          const progressFormat = this.config.ui?.progressFormat || '[{current}/{total}]';
          const progressMsg = progressFormat
            .replace('{current}', lineNumber)
            .replace('{total}', lines.length);
          
          info(i18n.t('fileProcessor.executingCommand', { progressMsg, line }));
          const result = await commandExecutor.sendGcode(port, isConnected, line);
          results.push({
            line: lineNumber,
            command: line,
            success: true,
            response: result.response,
            duration: result.duration
          });
          
          // The sendGcode method already waits for response, no additional delay needed
          
        } catch (err) {
          error(i18n.t('fileProcessor.failedToExecuteLine', { lineNumber, line }));
          error(i18n.t('fileProcessor.errorDetail', { error: err.message }));
          
          results.push({
            line: lineNumber,
            command: line,
            success: false,
            error: err.message
          });
          
          // Ask user if they want to continue on error
          const shouldContinue = await this.promptContinueOnError(lineNumber, line, err.message);
          if (!shouldContinue) {
            info(i18n.t('fileProcessor.fileExecutionStopped'));
            break;
          }
        }
      }
      
      // Generate execution summary
      this.generateFileExecutionSummary(filePath, results);
      
      return {
        success: true,
        filePath: resolvedPath,
        totalCommands: lines.length,
        results: results
      };
      
    } catch (err) {
      error(i18n.t('fileProcessor.fileExecutionFailed', { error: err.message }));
      throw err;
    }
  }

  /**
   * Preprocess G-code file content
   */
  preprocessGcodeFile(content) {
    const lines = content.split('\n');
    const processedLines = [];
    
    const gcodeRegex = new RegExp(this.config.validation?.gcodeCommandRegex || '^[GMT]\\d+', 'i');
    
    for (let line of lines) {
      // Remove comments (everything after semicolon or parentheses)
      line = line.replace(/;.*$/, '').replace(/\(.*?\)/g, '');
      
      // Trim whitespace
      line = line.trim();
      
      // Skip empty lines
      if (line.length === 0) {
        continue;
      }
      
      // Skip lines that don't start with G, M, or T commands
      if (!gcodeRegex.test(line)) {
        continue;
      }
      
      processedLines.push(line.toUpperCase());
    }
    
    return processedLines;
  }

  /**
   * Validate G-code file
   */
  validateGcodeFile(filePath) {
    const validation = {
      valid: true,
      warnings: [],
      errors: [],
      stats: {
        totalLines: 0,
        validCommands: 0,
        comments: 0,
        emptyLines: 0
      }
    };

    try {
      const resolvedPath = resolve(filePath);
      
      // Check file exists
      if (!existsSync(resolvedPath)) {
        validation.errors.push(i18n.t('fileProcessor.fileNotFoundValidation', { filePath }));
        validation.valid = false;
        return validation;
      }

      // Check file extension
      const validExtensions = this.config.validation?.gcodeFileExtensions || ['.gcode', '.nc', '.txt'];
      const hasValidExtension = validExtensions.some(ext => 
        resolvedPath.toLowerCase().endsWith(ext)
      );
      
      if (!hasValidExtension) {
        validation.warnings.push(i18n.t('fileProcessor.unrecognizedFileExtensionValidation', { expectedExts: validExtensions.join(', ') }));
      }

      // Read and analyze content
      const content = readFileSync(resolvedPath, 'utf8');
      const lines = content.split('\n');
      
      validation.stats.totalLines = lines.length;
      
      const gcodeRegex = new RegExp(this.config.validation?.gcodeCommandRegex || '^[GMT]\\d+', 'i');
      
      for (const line of lines) {
        const trimmed = line.trim();
        
        if (trimmed.length === 0) {
          validation.stats.emptyLines++;
        } else if (trimmed.startsWith(';') || trimmed.startsWith('(')) {
          validation.stats.comments++;
        } else if (gcodeRegex.test(trimmed)) {
          validation.stats.validCommands++;
        }
      }

      if (validation.stats.validCommands === 0) {
        validation.errors.push(i18n.t('fileProcessor.noValidCommandsFoundValidation'));
        validation.valid = false;
      }

    } catch (err) {
      validation.errors.push(i18n.t('fileProcessor.fileValidationFailed', { error: err.message }));
      validation.valid = false;
    }

    return validation;
  }

  /**
   * Prompt user to continue on error (simplified for CLI)
   */
  async promptContinueOnError(lineNumber, command, errorMessage) {
    const continueMsg = this.config.ui?.continueOnErrorMsg ||
      i18n.t('fileProcessor.errorOnLineContinue', { lineNumber });
    
    warn(continueMsg);
    return true; // For now, always continue
  }

  /**
   * Generate file execution summary (structured)
   */
  generateFileExecutionSummary(filePath, results, startTime = null, outputMode = 'console') {
    // Create structured report data
    const reportData = createFileExecutionSummary(filePath, results, startTime);
    
    // Configure logger output mode and log the structured data
    structuredLogger.config.outputMode = outputMode;
    structuredLogger.config.ui = this.config.ui;
    
    return structuredLogger.logStructured(reportData);
  }

  /**
   * Legacy method for backward compatibility (console output only)
   * @deprecated Use generateFileExecutionSummary with outputMode instead
   */
  displayFileExecutionSummary(filePath, results) {
    return this.generateFileExecutionSummary(filePath, results, null, 'console');
  }

  /**
   * Get file statistics without execution
   */
  getFileStats(filePath) {
    try {
      const resolvedPath = resolve(filePath);
      if (!existsSync(resolvedPath)) {
        throw new Error(`File not found: ${filePath}`);
      }

      const content = readFileSync(resolvedPath, 'utf8');
      const lines = this.preprocessGcodeFile(content);
      
      return {
        filePath: resolvedPath,
        totalLines: content.split('\n').length,
        validCommands: lines.length,
        estimatedDuration: this.estimateExecutionTime(lines),
        commands: lines
      };
    } catch (err) {
      throw new Error(i18n.t('fileProcessor.failedToAnalyzeFile', { error: err.message }));
    }
  }

  /**
   * Estimate execution time for G-code file
   */
  estimateExecutionTime(commands) {
    // Simple estimation based on command types and typical execution times
    const avgCommandTime = this.config.estimation?.avgCommandTime || 500; // ms
    const movementCommandTime = this.config.estimation?.movementCommandTime || 1000; // ms
    
    let totalTime = 0;
    
    for (const command of commands) {
      if (command.startsWith('G0') || command.startsWith('G1')) {
        totalTime += movementCommandTime;
      } else {
        totalTime += avgCommandTime;
      }
    }
    
    return {
      milliseconds: totalTime,
      seconds: Math.round(totalTime / 1000),
      minutes: Math.round(totalTime / 60000)
    };
  }
}