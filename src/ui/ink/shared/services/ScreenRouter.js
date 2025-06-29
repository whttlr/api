import { screens, navigation } from '../../config/screens.js';

export class ScreenRouter {
  constructor() {
    this.history = [];
  }

  navigateTo(screenId, params = {}) {
    if (!screens[screenId]) {
      throw new Error(`Screen '${screenId}' not found`);
    }

    this.history.push({
      screenId,
      params,
      timestamp: Date.now()
    });

    return {
      screen: screens[screenId],
      params
    };
  }

  goBack() {
    if (this.history.length <= 1) {
      return this.navigateTo('main-menu');
    }

    this.history.pop();
    const previous = this.history[this.history.length - 1];
    
    return {
      screen: screens[previous.screenId],
      params: previous.params
    };
  }

  getCurrentScreen() {
    if (this.history.length === 0) {
      return this.navigateTo('main-menu');
    }

    const current = this.history[this.history.length - 1];
    return {
      screen: screens[current.screenId],
      params: current.params
    };
  }

  canNavigateTo(targetScreenId) {
    const current = this.getCurrentScreen();
    const currentNavigation = navigation[current.screen.component] || [];
    
    return currentNavigation.includes(targetScreenId) || 
           targetScreenId === 'main-menu';
  }

  getAvailableScreens() {
    const current = this.getCurrentScreen();
    const currentNavigation = navigation[current.screen.component] || [];
    
    return currentNavigation.map(screenId => ({
      id: screenId,
      ...screens[screenId]
    }));
  }

  clearHistory() {
    this.history = [];
  }

  getHistory() {
    return [...this.history];
  }
}