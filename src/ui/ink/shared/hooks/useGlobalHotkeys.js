import { useInput } from 'ink';
import { useAppState } from '../context/AppStateContext.jsx';
import { useSettings } from '../context/SettingsContext.jsx';
import { useMachine } from '../context/MachineContext.jsx';
import { globalHotkeys, screenHotkeys } from '../../config/hotkeys.js';

export function useGlobalHotkeys() {
  const { state: appState, navigateTo, showModal, hideModal } = useAppState();
  const { state: settings, updateUserSetting } = useSettings();
  const { setUnits } = useMachine();

  useInput((input, key) => {
    if (key.ctrl && input === 'c') {
      process.exit(0);
    }

    const globalAction = globalHotkeys[input];
    if (globalAction) {
      handleGlobalAction(globalAction);
      return;
    }

    const contextualHotkeys = screenHotkeys[appState.currentScreen];
    if (contextualHotkeys) {
      const keyCombo = key.ctrl ? `ctrl+${input}` : input;
      const contextualAction = contextualHotkeys[keyCombo];
      if (contextualAction) {
        handleContextualAction(contextualAction);
        return;
      }
    }

    if (key.escape) {
      if (appState.modal) {
        hideModal();
      } else if (appState.currentScreen !== 'main-menu') {
        navigateTo('main-menu');
      }
    }
  });

  function handleGlobalAction(action) {
    switch (action) {
      case 'showGcodeReference':
        showModal({
          type: 'gcode-reference',
          title: 'G-Code Reference'
        });
        break;
      case 'toggleUnits':
        const newUnits = settings.user.units === 'mm' ? 'inch' : 'mm';
        updateUserSetting('units', newUnits);
        setUnits(newUnits);
        break;
      case 'openSettings':
        navigateTo('settings');
        break;
      case 'showHelp':
        showModal({
          type: 'hotkey-help',
          title: 'Keyboard Shortcuts'
        });
        break;
      case 'quit':
        process.exit(0);
        break;
    }
  }

  function handleContextualAction(action) {
    switch (action) {
      case 'executeGcode':
        break;
      case 'goBack':
        navigateTo('main-menu');
        break;
      case 'saveFile':
        break;
      case 'emergencyStop':
        break;
      case 'homeAll':
        break;
      case 'homeX':
      case 'homeY':
      case 'homeZ':
        break;
      case 'gcodeExecution':
        navigateTo('gcode-execution');
        break;
      case 'manualControl':
        navigateTo('manual-control');
        break;
      case 'settings':
        navigateTo('settings');
        break;
      case 'saveSettings':
        break;
      default:
        break;
    }
  }

  return {
    handleGlobalAction,
    handleContextualAction
  };
}