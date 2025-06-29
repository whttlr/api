/**
 * GrblSettingsManager Test Suite
 * 
 * Tests for GRBL settings management functionality including
 * settings query, validation, synchronization, and backup.
 */

import { GrblSettingsManager } from '../GrblSettingsManager.js';
import { MockCommandManager } from '../__mocks__/MockCommandManager.js';

describe('GrblSettingsManager', () => {
  let grblManager;
  let mockCommandManager;

  beforeEach(() => {
    mockCommandManager = new MockCommandManager();
    grblManager = new GrblSettingsManager(mockCommandManager, {
      enableValidation: true,
      enableBackups: true,
      autoSync: false,
      syncInterval: 5000
    });
  });

  afterEach(() => {
    grblManager.cleanup();
  });

  describe('constructor', () => {
    test('should create GrblSettingsManager with valid command manager', () => {
      expect(grblManager).toBeInstanceOf(GrblSettingsManager);
      expect(grblManager.commandManager).toBe(mockCommandManager);
    });

    test('should throw error without command manager', () => {
      expect(() => new GrblSettingsManager()).toThrow('GrblSettingsManager requires a command manager');
    });

    test('should apply custom configuration', () => {
      expect(grblManager.config.enableValidation).toBe(true);
      expect(grblManager.config.enableBackups).toBe(true);
      expect(grblManager.config.autoSync).toBe(false);
    });
  });

  describe('settings query', () => {
    test('should query all GRBL settings', async () => {
      const mockSettings = {
        '$0': '10',      // Step pulse time
        '$1': '25',      // Step idle delay
        '$100': '250.000', // X steps/mm
        '$101': '250.000', // Y steps/mm
        '$110': '500.000', // X max rate
        '$130': '200.000'  // X max travel
      };

      mockCommandManager.setMockGrblSettings(mockSettings);

      const settings = await grblManager.queryAllSettings();

      expect(settings).toEqual(mockSettings);
      expect(grblManager.currentSettings).toEqual(mockSettings);
    });

    test('should query specific setting', async () => {
      mockCommandManager.setMockGrblSettings({
        '$100': '250.000'
      });

      const value = await grblManager.querySetting('$100');

      expect(value).toBe('250.000');
    });

    test('should handle query errors', async () => {
      mockCommandManager.setMockError('$$', new Error('Communication failed'));

      await expect(grblManager.queryAllSettings())
        .rejects.toThrow('Failed to query GRBL settings');
    });

    test('should emit settings queried event', async () => {
      const queriedSpy = jest.fn();
      grblManager.on('settingsQueried', queriedSpy);

      await grblManager.queryAllSettings();

      expect(queriedSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          settings: expect.any(Object)
        })
      );
    });
  });

  describe('settings update', () => {
    test('should update single setting', async () => {
      const updatedSpy = jest.fn();
      grblManager.on('settingUpdated', updatedSpy);

      await grblManager.updateSetting('$100', '300.000');

      expect(mockCommandManager.getSentCommand()).toBe('$100=300.000');
      expect(updatedSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          setting: '$100',
          value: '300.000'
        })
      );
    });

    test('should validate setting before update', async () => {
      grblManager.config.enableValidation = true;

      await expect(grblManager.updateSetting('$100', 'invalid_value'))
        .rejects.toThrow('Invalid setting value');
    });

    test('should update multiple settings', async () => {
      const settings = {
        '$100': '300.000',
        '$101': '300.000',
        '$110': '600.000'
      };

      await grblManager.updateMultipleSettings(settings);

      const sentCommands = mockCommandManager.getSentCommands();
      expect(sentCommands).toContain('$100=300.000');
      expect(sentCommands).toContain('$101=300.000');
      expect(sentCommands).toContain('$110=600.000');
    });

    test('should handle update errors', async () => {
      mockCommandManager.setMockError('$100=250', new Error('Update failed'));

      await expect(grblManager.updateSetting('$100', '250'))
        .rejects.toThrow('Failed to update setting');
    });
  });

  describe('settings validation', () => {
    test('should validate numeric settings', () => {
      const result = grblManager.validateSetting('$100', '250.000');
      expect(result.isValid).toBe(true);
    });

    test('should detect invalid numeric values', () => {
      const result = grblManager.validateSetting('$100', 'not_a_number');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('must be a number');
    });

    test('should validate boolean settings', () => {
      const result1 = grblManager.validateSetting('$20', '1'); // Soft limits
      const result2 = grblManager.validateSetting('$20', '0');
      
      expect(result1.isValid).toBe(true);
      expect(result2.isValid).toBe(true);
    });

    test('should detect invalid boolean values', () => {
      const result = grblManager.validateSetting('$20', '2'); // Invalid boolean
      expect(result.isValid).toBe(false);
    });

    test('should validate setting ranges', () => {
      // Max spindle speed should be positive
      const validResult = grblManager.validateSetting('$30', '1000');
      const invalidResult = grblManager.validateSetting('$30', '-100');
      
      expect(validResult.isValid).toBe(true);
      expect(invalidResult.isValid).toBe(false);
    });

    test('should validate all settings', () => {
      const settings = {
        '$100': '250.000',
        '$101': '250.000',
        '$20': '1',
        '$30': '1000'
      };

      const result = grblManager.validateAllSettings(settings);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should detect multiple validation errors', () => {
      const invalidSettings = {
        '$100': 'invalid',
        '$20': '2',
        '$30': '-100'
      };

      const result = grblManager.validateAllSettings(invalidSettings);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('settings backup and restore', () => {
    test('should create settings backup', async () => {
      const testSettings = {
        '$100': '250.000',
        '$101': '250.000',
        '$110': '500.000'
      };

      grblManager.currentSettings = testSettings;

      const backup = await grblManager.createBackup('manual_backup');

      expect(backup).toHaveProperty('id');
      expect(backup).toHaveProperty('timestamp');
      expect(backup).toHaveProperty('settings', testSettings);
      expect(backup).toHaveProperty('reason', 'manual_backup');
    });

    test('should restore settings from backup', async () => {
      const backupSettings = {
        '$100': '300.000',
        '$101': '300.000'
      };

      const backup = await grblManager.createBackup('test');
      backup.settings = backupSettings;

      await grblManager.restoreFromBackup(backup.id);

      // Should send commands to restore each setting
      const sentCommands = mockCommandManager.getSentCommands();
      expect(sentCommands).toContain('$100=300.000');
      expect(sentCommands).toContain('$101=300.000');
    });

    test('should list available backups', async () => {
      await grblManager.createBackup('backup1');
      await grblManager.createBackup('backup2');

      const backups = await grblManager.listBackups();

      expect(backups.length).toBe(2);
      expect(backups[0]).toHaveProperty('id');
      expect(backups[0]).toHaveProperty('timestamp');
    });

    test('should handle invalid backup ID', async () => {
      await expect(grblManager.restoreFromBackup('invalid_id'))
        .rejects.toThrow('Backup not found');
    });
  });

  describe('settings synchronization', () => {
    test('should sync settings with hardware', async () => {
      const hardwareSettings = {
        '$100': '250.000',
        '$101': '250.000',
        '$110': '500.000'
      };

      mockCommandManager.setMockGrblSettings(hardwareSettings);

      await grblManager.syncWithHardware();

      expect(grblManager.currentSettings).toEqual(hardwareSettings);
    });

    test('should detect settings drift', async () => {
      const driftSpy = jest.fn();
      grblManager.on('settingsDrift', driftSpy);

      // Set current settings
      grblManager.currentSettings = {
        '$100': '250.000',
        '$110': '500.000'
      };

      // Mock hardware with different values
      mockCommandManager.setMockGrblSettings({
        '$100': '300.000', // Different value
        '$110': '500.000'  // Same value
      });

      await grblManager.detectDrift();

      expect(driftSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          driftedSettings: expect.arrayContaining(['$100'])
        })
      );
    });

    test('should auto-sync when enabled', async () => {
      grblManager.config.autoSync = true;
      grblManager.config.syncInterval = 100;

      const syncSpy = jest.fn();
      grblManager.on('autoSyncCompleted', syncSpy);

      grblManager.startAutoSync();

      // Wait for auto sync
      await new Promise(resolve => setTimeout(resolve, 150));

      expect(syncSpy).toHaveBeenCalled();

      grblManager.stopAutoSync();
    });
  });

  describe('settings presets', () => {
    test('should load settings preset', async () => {
      const presetSettings = {
        '$100': '200.000',
        '$101': '200.000',
        '$110': '400.000'
      };

      grblManager.storage.setMockPreset('small_mill', presetSettings);

      await grblManager.loadPreset('small_mill');

      // Should apply preset settings to hardware
      const sentCommands = mockCommandManager.getSentCommands();
      expect(sentCommands).toContain('$100=200.000');
      expect(sentCommands).toContain('$101=200.000');
    });

    test('should save current settings as preset', async () => {
      const currentSettings = {
        '$100': '250.000',
        '$101': '250.000'
      };

      grblManager.currentSettings = currentSettings;

      await grblManager.saveAsPreset('custom_preset', 'Custom Configuration');

      const savedPreset = grblManager.storage.getMockPreset('custom_preset');
      expect(savedPreset.settings).toEqual(currentSettings);
    });

    test('should list available presets', async () => {
      grblManager.storage.setMockPreset('preset1', { '$100': '200' });
      grblManager.storage.setMockPreset('preset2', { '$100': '300' });

      const presets = await grblManager.listPresets();

      expect(presets.length).toBe(2);
      expect(presets).toContainEqual(
        expect.objectContaining({ name: 'preset1' })
      );
    });
  });

  describe('settings interpretation', () => {
    test('should get setting description', () => {
      const description = grblManager.getSettingDescription('$100');
      expect(description).toContain('X-axis travel resolution');
    });

    test('should get setting units', () => {
      const units = grblManager.getSettingUnits('$100');
      expect(units).toBe('step/mm');
    });

    test('should get setting type', () => {
      const numericType = grblManager.getSettingType('$100');
      const booleanType = grblManager.getSettingType('$20');
      
      expect(numericType).toBe('numeric');
      expect(booleanType).toBe('boolean');
    });

    test('should format setting value', () => {
      const formatted = grblManager.formatSettingValue('$100', '250.000');
      expect(formatted).toBe('250.000 step/mm');
    });

    test('should parse setting value', () => {
      const parsed = grblManager.parseSettingValue('$100', '250.000');
      expect(parsed).toBe(250.0);
    });
  });

  describe('settings comparison', () => {
    test('should compare settings sets', () => {
      const settings1 = {
        '$100': '250.000',
        '$101': '250.000',
        '$110': '500.000'
      };

      const settings2 = {
        '$100': '300.000', // Different
        '$101': '250.000', // Same
        '$110': '600.000'  // Different
      };

      const comparison = grblManager.compareSettings(settings1, settings2);

      expect(comparison.identical).toBe(false);
      expect(comparison.differences).toHaveLength(2);
      expect(comparison.differences).toContainEqual(
        expect.objectContaining({
          setting: '$100',
          value1: '250.000',
          value2: '300.000'
        })
      );
    });

    test('should identify identical settings', () => {
      const settings1 = { '$100': '250.000', '$101': '250.000' };
      const settings2 = { '$100': '250.000', '$101': '250.000' };

      const comparison = grblManager.compareSettings(settings1, settings2);

      expect(comparison.identical).toBe(true);
      expect(comparison.differences).toHaveLength(0);
    });
  });

  describe('error handling', () => {
    test('should handle communication timeouts', async () => {
      mockCommandManager.setMockDelay(10000); // Long delay to simulate timeout

      await expect(grblManager.queryAllSettings())
        .rejects.toThrow('Query timeout');
    });

    test('should emit error events', async () => {
      const errorSpy = jest.fn();
      grblManager.on('error', errorSpy);

      mockCommandManager.setMockError('$$', new Error('Communication error'));

      try {
        await grblManager.queryAllSettings();
      } catch (err) {
        // Expected to fail
      }

      expect(errorSpy).toHaveBeenCalled();
    });

    test('should handle malformed setting responses', async () => {
      mockCommandManager.setMockResponse('$$', 'invalid response format');

      await expect(grblManager.queryAllSettings())
        .rejects.toThrow('Malformed settings response');
    });
  });

  describe('settings export/import', () => {
    test('should export settings', () => {
      const testSettings = {
        '$100': '250.000',
        '$101': '250.000'
      };

      grblManager.currentSettings = testSettings;

      const exported = grblManager.exportSettings();

      expect(exported).toHaveProperty('settings', testSettings);
      expect(exported).toHaveProperty('version');
      expect(exported).toHaveProperty('timestamp');
    });

    test('should import settings', async () => {
      const importData = {
        settings: {
          '$100': '300.000',
          '$101': '300.000'
        },
        version: '1.0',
        timestamp: Date.now()
      };

      await grblManager.importSettings(importData);

      expect(grblManager.currentSettings).toEqual(importData.settings);
    });

    test('should validate imported settings', async () => {
      const invalidImport = {
        settings: {
          '$100': 'invalid_value'
        },
        version: '1.0'
      };

      await expect(grblManager.importSettings(invalidImport))
        .rejects.toThrow('Invalid settings data');
    });
  });

  describe('cleanup', () => {
    test('should clean up resources', () => {
      grblManager.startAutoSync();
      
      grblManager.cleanup();

      expect(grblManager.syncTimer).toBeNull();
      expect(grblManager.listenerCount()).toBe(0);
    });
  });
});