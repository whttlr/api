/**
 * Alarms Module Public API
 * 
 * Exports the public interface for alarm detection, analysis, and recovery.
 */

export { AlarmManager } from './AlarmManager.js';

// Re-export alarm-related constants
import i18n from '../../i18n.js';

export const ALARM_TYPES = {
  1: i18n.t('alarmManager.alarmType1'),
  2: i18n.t('alarmManager.alarmType2'),
  3: i18n.t('alarmManager.alarmType3'),
  4: i18n.t('alarmManager.alarmType4'),
  5: i18n.t('alarmManager.alarmType5'),
  6: i18n.t('alarmManager.alarmType6'),
  7: i18n.t('alarmManager.alarmType7'),
  8: i18n.t('alarmManager.alarmType8'),
  9: i18n.t('alarmManager.alarmType9')
};

export const ALARM_SEVERITY = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical'
};

export const RECOVERY_STATUS = {
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  FAILED: 'failed'
};