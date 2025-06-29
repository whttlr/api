/**
 * Backup Manager
 * 
 * Handles automated backups, backup rotation, and backup restoration
 * for machine configurations and settings.
 */

import { promises as fs } from 'fs';
import { join, basename } from 'path';
import { debug, info, warn, error } from '../../lib/logger/LoggerService.js';

export class BackupManager {
  constructor(configStorage, config = {}) {
    this.configStorage = configStorage;
    this.config = {
      backupDirectory: './backups',
      enableAutoBackup: true,
      backupInterval: 24 * 60 * 60 * 1000, // 24 hours
      maxBackups: 10,
      compressionEnabled: false,
      ...config
    };
    
    this.autoBackupTimer = null;
  }
  
  /**
   * Start automatic backup timer
   */
  startAutoBackup() {
    if (this.autoBackupTimer) {
      clearInterval(this.autoBackupTimer);
    }
    
    this.autoBackupTimer = setInterval(async () => {
      try {
        await this.createBackup('auto');
        debug('Automatic backup completed');
      } catch (err) {
        warn('Automatic backup failed', { error: err.message });
      }
    }, this.config.backupInterval);
    
    info('Auto-backup started', { interval: this.config.backupInterval });
  }
  
  /**
   * Stop automatic backup timer
   */
  stopAutoBackup() {
    if (this.autoBackupTimer) {
      clearInterval(this.autoBackupTimer);
      this.autoBackupTimer = null;
      info('Auto-backup stopped');
    }
  }
  
  /**
   * Create a backup
   */
  async createBackup(type = 'manual') {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupName = `config-backup-${type}-${timestamp}.json`;
      const backupPath = join(this.config.backupDirectory, backupName);
      
      // Ensure backup directory exists
      await fs.mkdir(this.config.backupDirectory, { recursive: true });
      
      // Export all configuration data
      const configData = await this.configStorage.exportAllConfigurations();
      
      // Add backup metadata
      const backupData = {
        type,
        createdAt: Date.now(),
        timestamp,
        version: '1.0',
        configuration: configData
      };
      
      // Save backup
      await fs.writeFile(backupPath, JSON.stringify(backupData, null, 2));
      
      // Rotate old backups if necessary
      await this.rotateBackups();
      info('Backup created successfully', { path: backupPath, type });
      return { path: backupPath, name: backupName, type, timestamp };
      
    } catch (err) {
      error('Failed to create backup', { error: err.message, type });
      throw err;
    }
  }
  
  /**
   * Restore from backup
   */
  async restoreBackup(backupPath) {
    try {
      // Validate backup file exists
      if (!await this.fileExists(backupPath)) {
        throw new Error(`Backup file not found: ${backupPath}`);
      }
      
      // Load backup data
      const backupData = await fs.readFile(backupPath, 'utf-8');
      const parsedBackup = JSON.parse(backupData);
      
      if (!parsedBackup.configuration) {
        throw new Error('Invalid backup format: missing configuration data');
      }
      
      // Create a backup of current state before restoring
      await this.createBackup('pre-restore');
      
      // Restore configuration
      await this.configStorage.importAllConfigurations(parsedBackup.configuration);
      
      info('Backup restored successfully', { 
        path: backupPath, 
        backupType: parsedBackup.type,
        backupTimestamp: parsedBackup.timestamp 
      });
      
      return parsedBackup;
      
    } catch (err) {
      error('Failed to restore backup', { error: err.message, path: backupPath });
      throw err;
    }
  }
  
  /**
   * List available backups
   */
  async listBackups() {
    try {
      const backups = [];
      
      if (await this.directoryExists(this.config.backupDirectory)) {
        const files = await fs.readdir(this.config.backupDirectory);
        
        for (const file of files) {
          if (file.endsWith('.json') && file.includes('config-backup')) {
            try {
              const backupPath = join(this.config.backupDirectory, file);
              const stats = await fs.stat(backupPath);
              
              // Try to read backup metadata
              let metadata = null;
              try {
                const backupData = await fs.readFile(backupPath, 'utf-8');
                const parsedBackup = JSON.parse(backupData);
                metadata = {
                  type: parsedBackup.type,
                  timestamp: parsedBackup.timestamp,
                  version: parsedBackup.version
                };
              } catch {
                // If can't parse metadata, use file stats
                metadata = {
                  type: 'unknown',
                  timestamp: stats.mtime.toISOString(),
                  version: 'unknown'
                };
              }
              
              backups.push({
                name: file,
                path: backupPath,
                size: stats.size,
                created: stats.mtime,
                ...metadata
              });
              
            } catch (err) {
              warn('Failed to read backup file info', { file, error: err.message });
            }
          }
        }
      }
      
      // Sort by creation date (newest first)
      backups.sort((a, b) => new Date(b.created) - new Date(a.created));
      
      debug('Backups listed', { count: backups.length });
      return backups;
      
    } catch (err) {
      error('Failed to list backups', { error: err.message });
      throw err;
    }
  }
  
  /**
   * Delete a backup
   */
  async deleteBackup(backupPath) {
    try {
      if (await this.fileExists(backupPath)) {
        await fs.unlink(backupPath);
        info('Backup deleted', { path: backupPath });
        return true;
      }
      
      warn('Backup file not found for deletion', { path: backupPath });
      return false;
      
    } catch (err) {
      error('Failed to delete backup', { error: err.message, path: backupPath });
      throw err;
    }
  }
  
  /**
   * Rotate old backups (keep only maxBackups)
   */
  async rotateBackups() {
    try {
      const backups = await this.listBackups();
      
      if (backups.length > this.config.maxBackups) {
        const backupsToDelete = backups.slice(this.config.maxBackups);
        
        for (const backup of backupsToDelete) {
          await this.deleteBackup(backup.path);
        }
        
        info('Old backups rotated', { 
          deleted: backupsToDelete.length, 
          remaining: this.config.maxBackups 
        });
      }
      
    } catch (err) {
      warn('Failed to rotate backups', { error: err.message });
    }
  }
  
  /**
   * Get backup statistics
   */
  async getBackupStatistics() {
    try {
      const backups = await this.listBackups();
      
      const stats = {
        totalBackups: backups.length,
        totalSize: backups.reduce((sum, backup) => sum + backup.size, 0),
        oldestBackup: backups.length > 0 ? backups[backups.length - 1].created : null,
        newestBackup: backups.length > 0 ? backups[0].created : null,
        backupTypes: {}
      };
      
      // Count backup types
      backups.forEach(backup => {
        stats.backupTypes[backup.type] = (stats.backupTypes[backup.type] || 0) + 1;
      });
      
      return stats;
      
    } catch (err) {
      error('Failed to get backup statistics', { error: err.message });
      throw err;
    }
  }
  
  /**
   * Verify backup integrity
   */
  async verifyBackup(backupPath) {
    try {
      const backupData = await fs.readFile(backupPath, 'utf-8');
      const parsedBackup = JSON.parse(backupData);
      
      const errors = [];
      
      // Check required fields
      if (!parsedBackup.configuration) {
        errors.push('Missing configuration data');
      }
      
      if (!parsedBackup.createdAt) {
        errors.push('Missing creation timestamp');
      }
      
      if (!parsedBackup.version) {
        errors.push('Missing version information');
      }
      
      // Check configuration structure
      if (parsedBackup.configuration) {
        if (!parsedBackup.configuration.machine && 
            !parsedBackup.configuration.grbl && 
            !parsedBackup.configuration.presets) {
          errors.push('Backup contains no valid configuration sections');
        }
      }
      
      const isValid = errors.length === 0;
      
      debug('Backup verification completed', { 
        path: backupPath, 
        isValid, 
        errors: errors.length 
      });
      
      return {
        isValid,
        errors,
        metadata: {
          type: parsedBackup.type,
          createdAt: parsedBackup.createdAt,
          version: parsedBackup.version
        }
      };
      
    } catch (err) {
      error('Failed to verify backup', { error: err.message, path: backupPath });
      return {
        isValid: false,
        errors: [`Failed to parse backup file: ${err.message}`],
        metadata: null
      };
    }
  }
  
  /**
   * Cleanup expired backups
   */
  async cleanupExpiredBackups(maxAge = 30 * 24 * 60 * 60 * 1000) { // 30 days default
    try {
      const backups = await this.listBackups();
      const cutoffDate = new Date(Date.now() - maxAge);
      let deletedCount = 0;
      
      for (const backup of backups) {
        if (backup.created < cutoffDate) {
          await this.deleteBackup(backup.path);
          deletedCount++;
        }
      }
      
      info('Expired backups cleaned up', { deletedCount, maxAge });
      return deletedCount;
      
    } catch (err) {
      error('Failed to cleanup expired backups', { error: err.message });
      throw err;
    }
  }
  
  /**
   * Check if file exists
   */
  async fileExists(filePath) {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }
  
  /**
   * Check if directory exists
   */
  async directoryExists(dirPath) {
    try {
      const stats = await fs.stat(dirPath);
      return stats.isDirectory();
    } catch {
      return false;
    }
  }
  
  /**
   * Cleanup resources
   */
  cleanup() {
    this.stopAutoBackup();
  }
}