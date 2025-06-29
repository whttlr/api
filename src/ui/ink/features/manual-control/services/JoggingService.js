import { log, warn, error as logError } from '../../../../../lib/logger/LoggerService.js';

export class JoggingService {
  constructor() {
    this.isJogging = false;
    this.currentStepSize = 1;
    this.availableStepSizes = [0.001, 0.01, 0.1, 1, 10, 100];
    this.limits = {
      x: { min: -200, max: 200 },
      y: { min: -200, max: 200 },
      z: { min: -100, max: 100 }
    };
    this.maxFeedRate = 8000;
    this.defaultFeedRate = 1000;
  }

  async jogAxis(axis, direction, distance = null, feedRate = null) {
    if (this.isJogging) {
      warn('Jog command ignored: already jogging');
      return false;
    }

    if (!['x', 'y', 'z'].includes(axis.toLowerCase())) {
      logError('Invalid axis for jogging', { axis });
      return false;
    }

    const jogDistance = distance || this.currentStepSize;
    const jogFeedRate = feedRate || this.defaultFeedRate;
    const actualDistance = direction > 0 ? jogDistance : -jogDistance;

    try {
      this.isJogging = true;
      
      log('Starting jog operation', {
        axis: axis.toUpperCase(),
        distance: actualDistance,
        feedRate: jogFeedRate
      });

      const command = this.buildJogCommand(axis, actualDistance, jogFeedRate);
      
      await this.executeJogCommand(command);
      
      log('Jog operation completed successfully');
      return true;

    } catch (error) {
      logError('Jog operation failed', { 
        axis, 
        distance: actualDistance, 
        error: error.message 
      });
      return false;
    } finally {
      this.isJogging = false;
    }
  }

  async homeAxis(axis = null) {
    if (this.isJogging) {
      warn('Home command ignored: jogging in progress');
      return false;
    }

    try {
      this.isJogging = true;
      
      if (axis) {
        log(`Homing ${axis.toUpperCase()} axis`);
        const command = `$H${axis.toUpperCase()}`;
        await this.executeJogCommand(command);
      } else {
        log('Homing all axes');
        const command = '$H';
        await this.executeJogCommand(command);
      }
      
      log('Homing completed successfully');
      return true;

    } catch (error) {
      logError('Homing failed', { axis, error: error.message });
      return false;
    } finally {
      this.isJogging = false;
    }
  }

  async emergencyStop() {
    try {
      log('Emergency stop triggered');
      
      const command = '!';
      await this.executeJogCommand(command);
      
      this.isJogging = false;
      log('Emergency stop executed');
      return true;

    } catch (error) {
      logError('Emergency stop failed', { error: error.message });
      return false;
    }
  }

  setStepSize(stepSize) {
    if (!this.availableStepSizes.includes(stepSize)) {
      warn('Invalid step size', { stepSize, available: this.availableStepSizes });
      return false;
    }

    this.currentStepSize = stepSize;
    log('Step size changed', { stepSize });
    return true;
  }

  getNextStepSize(direction = 1) {
    const currentIndex = this.availableStepSizes.indexOf(this.currentStepSize);
    const nextIndex = currentIndex + direction;
    
    if (nextIndex >= 0 && nextIndex < this.availableStepSizes.length) {
      return this.availableStepSizes[nextIndex];
    }
    
    return this.currentStepSize;
  }

  cycleStepSize(direction = 1) {
    const nextStepSize = this.getNextStepSize(direction);
    return this.setStepSize(nextStepSize);
  }

  validateJogMove(axis, distance, currentPosition = { x: 0, y: 0, z: 0 }) {
    const axisLower = axis.toLowerCase();
    const newPosition = currentPosition[axisLower] + distance;
    const limits = this.limits[axisLower];

    if (newPosition < limits.min || newPosition > limits.max) {
      return {
        valid: false,
        reason: `Move would exceed ${axisLower.toUpperCase()} axis limits (${limits.min} to ${limits.max})`,
        newPosition
      };
    }

    return {
      valid: true,
      newPosition
    };
  }

  buildJogCommand(axis, distance, feedRate) {
    return `$J=G91 G01 ${axis.toUpperCase()}${distance} F${feedRate}`;
  }

  async executeJogCommand(command) {
    await this.simulateCommandExecution(command);
  }

  async simulateCommandExecution(command) {
    return new Promise((resolve) => {
      setTimeout(() => {
        log('Command executed', { command });
        resolve();
      }, 100);
    });
  }

  getStatus() {
    return {
      isJogging: this.isJogging,
      currentStepSize: this.currentStepSize,
      availableStepSizes: [...this.availableStepSizes],
      limits: { ...this.limits },
      maxFeedRate: this.maxFeedRate,
      defaultFeedRate: this.defaultFeedRate
    };
  }

  setLimits(newLimits) {
    this.limits = { ...this.limits, ...newLimits };
    log('Jog limits updated', { limits: this.limits });
  }

  setFeedRate(feedRate) {
    if (feedRate > 0 && feedRate <= this.maxFeedRate) {
      this.defaultFeedRate = feedRate;
      log('Default feed rate updated', { feedRate });
      return true;
    }
    
    warn('Invalid feed rate', { feedRate, max: this.maxFeedRate });
    return false;
  }
}