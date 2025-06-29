/**
 * Query Operations Module
 * 
 * Handles machine status queries, GRBL settings, coordinate systems, and limits.
 * Centralizes all query operations to eliminate duplicate wrapper patterns.
 */

import i18n from '../../i18n.js';
import { log, info } from '../../lib/logger/LoggerService.js';
import {
  queryMachineStatus,
  queryGrblSettings,
  queryCoordinateSystems,
  queryParserState,
  getLimitsInfo,
  displayLimitsInfo,
  getStatus as getStatusHelper
} from '../../lib/status/index.js';

export class QueryManager {
  constructor(config) {
    this.config = config;
  }

  /**
   * Create a standardized query wrapper for raw G-code sending
   */
  createQueryWrapper(commandExecutor, port, isConnected) {
    return (gcode, timeout) => commandExecutor.createCommandWrapper(port, isConnected)(gcode, timeout);
  }

  /**
   * Query machine status
   */
  async queryMachineStatus(commandExecutor, port, isConnected) {
    const queryWrapper = this.createQueryWrapper(commandExecutor, port, isConnected);
    return await queryMachineStatus(queryWrapper);
  }

  /**
   * Query GRBL settings
   */
  async queryGrblSettings(commandExecutor, port, isConnected) {
    const queryWrapper = this.createQueryWrapper(commandExecutor, port, isConnected);
    return await queryGrblSettings(queryWrapper);
  }

  /**
   * Query coordinate systems
   */
  async queryCoordinateSystems(commandExecutor, port, isConnected) {
    const queryWrapper = this.createQueryWrapper(commandExecutor, port, isConnected);
    return await queryCoordinateSystems(queryWrapper);
  }

  /**
   * Query parser state
   */
  async queryParserState(commandExecutor, port, isConnected) {
    const queryWrapper = this.createQueryWrapper(commandExecutor, port, isConnected);
    return await queryParserState(queryWrapper);
  }

  /**
   * Get comprehensive limits information
   */
  async getLimitsInfo(isConnected, machineStatusQuery, grblSettingsQuery) {
    return await getLimitsInfo(isConnected, machineStatusQuery, grblSettingsQuery);
  }

  /**
   * Display comprehensive limits information
   */
  displayLimitsInfo(limitsInfo) {
    return displayLimitsInfo(limitsInfo);
  }

  /**
   * Get current connection and command status
   */
  getStatus(isConnected, currentPort, responseCallbacks) {
    return getStatusHelper(isConnected, currentPort, responseCallbacks);
  }

  /**
   * Run a comprehensive query suite
   */
  async runFullQuery(commandExecutor, port, isConnected) {
    const results = {
      timestamp: new Date().toISOString(),
      machineStatus: null,
      grblSettings: null,
      coordinateSystems: null,
      parserState: null,
      limitsInfo: null,
      errors: []
    };

    try {
      // Query machine status
      try {
        results.machineStatus = await this.queryMachineStatus(commandExecutor, port, isConnected);
      } catch (error) {
        results.errors.push(i18n.t('queryManager.queryError', { error: error.message }));
      }

      // Query GRBL settings
      try {
        results.grblSettings = await this.queryGrblSettings(commandExecutor, port, isConnected);
      } catch (error) {
        results.errors.push(i18n.t('queryManager.queryError', { error: error.message }));
      }

      // Query coordinate systems
      try {
        results.coordinateSystems = await this.queryCoordinateSystems(commandExecutor, port, isConnected);
      } catch (error) {
        results.errors.push(i18n.t('queryManager.queryError', { error: error.message }));
      }

      // Query parser state
      try {
        results.parserState = await this.queryParserState(commandExecutor, port, isConnected);
      } catch (error) {
        results.errors.push(i18n.t('queryManager.queryError', { error: error.message }));
      }

      // Get limits info if we have the required data
      if (results.machineStatus && results.grblSettings) {
        try {
          results.limitsInfo = await this.getLimitsInfo(
            isConnected,
            () => Promise.resolve(results.machineStatus),
            () => Promise.resolve(results.grblSettings)
          );
        } catch (error) {
          results.errors.push(i18n.t('queryManager.queryError', { error: error.message }));
        }
      }

    } catch (error) {
      results.errors.push(i18n.t('queryManager.queryError', { error: error.message }));
    }

    return results;
  }

  /**
   * Generate a summary report from query results
   */
  generateQueryReport(queryResults) {
    const separator = this.config.ui?.reportSeparator || '============================================';
    const reportTitle = this.config.ui?.queryReportTitle || i18n.t('queryManager.reportTitle');
    
    info(`\n${separator}`);
    info(i18n.t('queryManager.reportHeader', { reportTitle }));
    info(`${separator}\n`);

    // Connection status
    info(i18n.t('queryManager.connectionStatusHeader'));
    info(i18n.t('queryManager.timestamp', { timestamp: queryResults.timestamp }));
    info(i18n.t('queryManager.errorsCount', { count: queryResults.errors.length }));

    // Machine status
    if (queryResults.machineStatus) {
      info(i18n.t('queryManager.machineStatusHeader'));
      if (queryResults.machineStatus.parsed) {
        const status = queryResults.machineStatus.parsed;
        info(i18n.t('queryManager.state', { state: status.state }));
        if (status.position) {
          info(i18n.t('queryManager.position', { x: status.position.x, y: status.position.y, z: status.position.z }));
        }
      } else {
        info(i18n.t('queryManager.failedToParseMachineStatus'));
      }
    }

    // GRBL settings summary
    if (queryResults.grblSettings) {
      info(i18n.t('queryManager.grblSettingsHeader'));
      if (queryResults.grblSettings.parsed) {
        const settingsCount = Object.keys(queryResults.grblSettings.parsed).length;
        info(i18n.t('queryManager.settingsRetrieved', { count: settingsCount }));
      } else {
        info(i18n.t('queryManager.failedToParseGrblSettings'));
      }
    }

    // Limits info
    if (queryResults.limitsInfo) {
      info(i18n.t('queryManager.limitsInfoHeader'));
      info(i18n.t('queryManager.limitsInfoAvailable'));
    }

    // Errors
    if (queryResults.errors.length > 0) {
      info(i18n.t('queryManager.errorsHeader'));
      queryResults.errors.forEach(error => {
        info(i18n.t('queryManager.errorItem', { error }));
      });
    }

    info(`\n${separator}\n`);
    return queryResults;
  }
}