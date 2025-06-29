/**
 * ConfigurationManager Test Suite
 * 
 * Tests for configuration management functionality including
 * storage, validation, backup/restore, and GRBL settings synchronization.
 */

import { ConfigurationManager } from '../ConfigurationManager.js';
import { MockCommandManager } from '../__mocks__/MockCommandManager.js';

describe('ConfigurationManager', () => {
  let configManager;
  let mockCommandManager;

  beforeEach(() => {
    mockCommandManager = new MockCommandManager();
    configManager = new ConfigurationManager({
      enableValidation: true,
      enableBackups: true,
      maxBackupCount: 5,
      enableGrblSync: true
    });
    
    // Set up command manager for GRBL settings
    configManager.setCommandManager(mockCommandManager);
  });

  afterEach(() => {
    configManager.cleanup();
  });

  describe('constructor', () => {
    test('should create ConfigurationManager with default configuration', () => {
      const defaultManager = new ConfigurationManager();
      expect(defaultManager).toBeInstanceOf(ConfigurationManager);
      expect(defaultManager.config.enableValidation).toBe(true);
    });

    test('should apply custom configuration', () => {
      expect(configManager.config.enableValidation).toBe(true);
      expect(configManager.config.enableBackups).toBe(true);
      expect(configManager.config.maxBackupCount).toBe(5);
    });

    test('should initialize component managers', () => {
      expect(configManager.storage).toBeDefined();
      expect(configManager.backupManager).toBeDefined();
      expect(configManager.validator).toBeDefined();
    });
  });

  describe('configuration loading', () => {
    test('should load configuration from storage', async () => {
      const testConfig = {
        machine: {
          name: 'Test CNC',
          type: 'mill',
          limits: { x: 200, y: 200, z: 100 }
        },
        connection: {
          port: '/dev/ttyUSB0',
          baudRate: 115200
        }
      };

      // Mock storage to return test config
      configManager.storage.setMockConfig(testConfig);

      const loadedConfig = await configManager.loadConfiguration();

      expect(loadedConfig).toEqual(testConfig);
      expect(configManager.currentConfig).toEqual(testConfig);
    });

    test('should handle missing configuration file', async () => {
      configManager.storage.setMockError('load', new Error('File not found'));

      const loadedConfig = await configManager.loadConfiguration();

      // Should return default configuration
      expect(loadedConfig).toBeDefined();
      expect(configManager.currentConfig).toBeDefined();
    });

    test('should emit configuration loaded event', async () => {
      const loadedSpy = jest.fn();
      configManager.on('configurationLoaded', loadedSpy);

      await configManager.loadConfiguration();

      expect(loadedSpy).toHaveBeenCalled();
    });
  });

  describe('configuration saving', () => {
    test('should save configuration to storage', async () => {
      const testConfig = {
        machine: { name: 'Updated CNC' },
        connection: { port: '/dev/ttyUSB1' }
      };

      await configManager.saveConfiguration(testConfig);

      expect(configManager.currentConfig).toEqual(testConfig);
      expect(configManager.storage.getSavedConfig()).toEqual(testConfig);
    });

    test('should validate configuration before saving', async () => {
      const invalidConfig = {
        machine: { name: '' }, // Invalid empty name
        connection: { baudRate: 'invalid' } // Invalid baud rate
      };

      await expect(configManager.saveConfiguration(invalidConfig))
        .rejects.toThrow('Configuration validation failed');
    });

    test('should create backup before saving when enabled', async () => {
      const backupSpy = jest.fn();
      configManager.backupManager.on('backupCreated', backupSpy);

      const testConfig = { machine: { name: 'Test' } };
      await configManager.saveConfiguration(testConfig);

      expect(backupSpy).toHaveBeenCalled();
    });

    test('should emit configuration saved event', async () => {
      const savedSpy = jest.fn();
      configManager.on('configurationSaved', savedSpy);

      const testConfig = { machine: { name: 'Test' } };
      await configManager.saveConfiguration(testConfig);

      expect(savedSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          config: testConfig
        })
      );
    });
  });

  describe('configuration validation', () => {
    test('should validate valid configuration', () => {
      const validConfig = {
        machine: {
          name: 'Test CNC',
          type: 'mill',
          limits: { x: 200, y: 200, z: 100 }
        },
        connection: {
          port: '/dev/ttyUSB0',
          baudRate: 115200
        }
      };

      const result = configManager.validateConfiguration(validConfig);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should detect invalid configuration', () => {
      const invalidConfig = {
        machine: {
          name: '', // Invalid empty name
          type: 'invalid_type',
          limits: { x: -100 } // Invalid negative limit
        },
        connection: {
          baudRate: 'not_a_number'
        }
      };

      const result = configManager.validateConfiguration(invalidConfig);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    test('should provide detailed validation errors', () => {
      const invalidConfig = {
        machine: { name: '' },
        connection: { baudRate: 'invalid' }
      };

      const result = configManager.validateConfiguration(invalidConfig);
      
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'machine.name',
          message: expect.any(String)
        })
      );
    });
  });

  describe('backup and restore', () => {
    test('should create configuration backup', async () => {
      const testConfig = { machine: { name: 'Test' } };
      configManager.currentConfig = testConfig;

      const backup = await configManager.createBackup('manual_backup');

      expect(backup).toHaveProperty('id');
      expect(backup).toHaveProperty('timestamp');
      expect(backup).toHaveProperty('config', testConfig);
      expect(backup).toHaveProperty('reason', 'manual_backup');
    });

    test('should restore configuration from backup', async () => {
      const originalConfig = { machine: { name: 'Original' } };
      const backupConfig = { machine: { name: 'Backup' } };

      // Create backup
      configManager.currentConfig = backupConfig;
      const backup = await configManager.createBackup('test');

      // Change current config
      configManager.currentConfig = originalConfig;

      // Restore from backup
      await configManager.restoreFromBackup(backup.id);

      expect(configManager.currentConfig).toEqual(backupConfig);
    });

    test('should handle invalid backup ID', async () => {
      await expect(configManager.restoreFromBackup('invalid_id'))
        .rejects.toThrow('Backup not found');
    });

    test('should list available backups', async () => {
      // Create multiple backups
      await configManager.createBackup('backup1');
      await configManager.createBackup('backup2');

      const backups = await configManager.listBackups();

      expect(backups.length).toBe(2);
      expect(backups[0]).toHaveProperty('id');
      expect(backups[0]).toHaveProperty('timestamp');
    });
  });

  describe('GRBL settings synchronization', () => {
    test('should sync configuration with GRBL settings', async () => {
      const grblSettings = {
        '$100': '250.000', // X steps/mm
        '$101': '250.000', // Y steps/mm
        '$102': '250.000', // Z steps/mm
        '$110': '500.000', // X max rate
        '$130': '200.000'  // X max travel
      };

      mockCommandManager.setMockGrblSettings(grblSettings);

      await configManager.syncWithGrbl();

      // Should update configuration with GRBL values
      expect(configManager.currentConfig.grbl).toEqual(grblSettings);
    });

    test('should handle GRBL communication errors', async () => {
      mockCommandManager.setMockError('$$', new Error('Communication failed'));

      await expect(configManager.syncWithGrbl())
        .rejects.toThrow('Failed to sync with GRBL');
    });

    test('should emit GRBL sync events', async () => {
      const syncSpy = jest.fn();
      configManager.on('grblSyncCompleted', syncSpy);

      await configManager.syncWithGrbl();

      expect(syncSpy).toHaveBeenCalled();
    });
  });

  describe('configuration sections', () => {
    test('should get specific configuration section', () => {
      const testConfig = {
        machine: { name: 'Test' },
        connection: { port: '/dev/ttyUSB0' },
        ui: { theme: 'dark' }
      };

      configManager.currentConfig = testConfig;

      const machineConfig = configManager.getSection('machine');
      expect(machineConfig).toEqual({ name: 'Test' });

      const connectionConfig = configManager.getSection('connection');
      expect(connectionConfig).toEqual({ port: '/dev/ttyUSB0' });
    });

    test('should update specific configuration section', async () => {
      configManager.currentConfig = {
        machine: { name: 'Original' },
        connection: { port: '/dev/ttyUSB0' }
      };

      await configManager.updateSection('machine', { name: 'Updated' });

      expect(configManager.currentConfig.machine.name).toBe('Updated');
      expect(configManager.currentConfig.connection.port).toBe('/dev/ttyUSB0');
    });

    test('should validate section updates', async () => {
      configManager.currentConfig = {
        machine: { name: 'Original' }
      };

      await expect(configManager.updateSection('machine', { name: '' }))
        .rejects.toThrow('Section validation failed');
    });
  });

  describe('configuration merging', () => {
    test('should merge configurations properly', () => {
      const baseConfig = {
        machine: { name: 'Base', type: 'mill' },
        connection: { port: '/dev/ttyUSB0' }
      };

      const updateConfig = {
        machine: { name: 'Updated' },
        ui: { theme: 'dark' }
      };

      const merged = configManager.mergeConfigurations(baseConfig, updateConfig);

      expect(merged).toEqual({
        machine: { name: 'Updated', type: 'mill' },
        connection: { port: '/dev/ttyUSB0' },
        ui: { theme: 'dark' }
      });
    });

    test('should handle deep merging', () => {
      const baseConfig = {
        machine: {
          limits: { x: 200, y: 200, z: 100 },
          settings: { rapid: 1000 }
        }
      };

      const updateConfig = {
        machine: {
          limits: { x: 300 },
          settings: { feed: 500 }
        }
      };

      const merged = configManager.mergeConfigurations(baseConfig, updateConfig);

      expect(merged.machine.limits).toEqual({ x: 300, y: 200, z: 100 });
      expect(merged.machine.settings).toEqual({ rapid: 1000, feed: 500 });
    });
  });

  describe('configuration presets', () => {
    test('should load configuration preset', async () => {
      const presetConfig = {
        machine: { name: 'Preset CNC', type: 'mill' },
        connection: { baudRate: 115200 }
      };

      configManager.storage.setMockPreset('standard_mill', presetConfig);

      await configManager.loadPreset('standard_mill');

      expect(configManager.currentConfig).toEqual(presetConfig);
    });

    test('should save configuration as preset', async () => {
      const currentConfig = {
        machine: { name: 'Custom CNC' },
        connection: { port: '/dev/ttyUSB0' }
      };

      configManager.currentConfig = currentConfig;

      await configManager.saveAsPreset('custom_preset', 'Custom Configuration');

      const savedPreset = configManager.storage.getMockPreset('custom_preset');
      expect(savedPreset.config).toEqual(currentConfig);
    });

    test('should list available presets', async () => {
      configManager.storage.setMockPreset('preset1', { machine: { name: 'P1' } });
      configManager.storage.setMockPreset('preset2', { machine: { name: 'P2' } });

      const presets = await configManager.listPresets();

      expect(presets.length).toBe(2);
      expect(presets).toContainEqual(
        expect.objectContaining({ name: 'preset1' })
      );
    });
  });

  describe('configuration import/export', () => {
    test('should export configuration', () => {
      const testConfig = {
        machine: { name: 'Test' },
        connection: { port: '/dev/ttyUSB0' }
      };

      configManager.currentConfig = testConfig;

      const exported = configManager.exportConfiguration();

      expect(exported).toHaveProperty('config', testConfig);
      expect(exported).toHaveProperty('version');
      expect(exported).toHaveProperty('timestamp');
    });

    test('should import configuration', async () => {
      const importData = {
        config: {
          machine: { name: 'Imported' },
          connection: { port: '/dev/ttyUSB1' }
        },
        version: '1.0',
        timestamp: Date.now()
      };

      await configManager.importConfiguration(importData);

      expect(configManager.currentConfig).toEqual(importData.config);
    });

    test('should validate imported configuration', async () => {
      const invalidImport = {
        config: {
          machine: { name: '' } // Invalid
        },
        version: '1.0'
      };

      await expect(configManager.importConfiguration(invalidImport))
        .rejects.toThrow('Invalid configuration data');
    });
  });

  describe('change tracking', () => {
    test('should track configuration changes', async () => {
      const changesSpy = jest.fn();
      configManager.on('configurationChanged', changesSpy);

      const originalConfig = { machine: { name: 'Original' } };
      const updatedConfig = { machine: { name: 'Updated' } };

      configManager.currentConfig = originalConfig;
      await configManager.saveConfiguration(updatedConfig);

      expect(changesSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          changes: expect.any(Array),
          previousConfig: originalConfig,
          newConfig: updatedConfig
        })
      );
    });

    test('should detect specific field changes', async () => {
      configManager.currentConfig = {
        machine: { name: 'Original', type: 'mill' },
        connection: { port: '/dev/ttyUSB0' }
      };

      const updatedConfig = {
        machine: { name: 'Updated', type: 'mill' },
        connection: { port: '/dev/ttyUSB1' }
      };

      const changes = configManager.detectChanges(updatedConfig);

      expect(changes).toContainEqual(
        expect.objectContaining({
          field: 'machine.name',
          oldValue: 'Original',
          newValue: 'Updated'
        })
      );

      expect(changes).toContainEqual(
        expect.objectContaining({
          field: 'connection.port',
          oldValue: '/dev/ttyUSB0',
          newValue: '/dev/ttyUSB1'
        })
      );
    });
  });

  describe('error handling', () => {
    test('should handle storage errors gracefully', async () => {
      configManager.storage.setMockError('save', new Error('Storage failed'));

      await expect(configManager.saveConfiguration({ machine: { name: 'Test' } }))
        .rejects.toThrow('Failed to save configuration');
    });

    test('should emit error events', async () => {
      const errorSpy = jest.fn();
      configManager.on('error', errorSpy);

      configManager.storage.setMockError('load', new Error('Load failed'));

      try {
        await configManager.loadConfiguration();
      } catch (err) {
        // Expected to fail
      }

      expect(errorSpy).toHaveBeenCalled();
    });
  });

  describe('cleanup', () => {
    test('should clean up resources', () => {
      configManager.cleanup();

      expect(configManager.listenerCount()).toBe(0);
    });
  });
});