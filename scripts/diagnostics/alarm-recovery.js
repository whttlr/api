#!/usr/bin/env node

import { GcodeSender } from '../../core/GcodeSender.js';
import { Config } from '../../core/config.js';
import { log, info, warn, error } from '../../services/logger/index.js';

async function fixAlarm(portPath = null) {
  const sender = new GcodeSender();
  const config = Config.get();
  
  // Use provided port, config default, or hardcoded fallback
  const port = portPath || config.defaultPort || '/dev/tty.usbmodem1101';
  
  try {
    log('🔍 Connecting to fix ALARM state...');
    log(`Using port: ${port}`);
    await sender.connect(port);
    
    log('\n📍 Step 1: Confirm ALARM state...');
    const statusResult = await sender._sendRawGcode('?', 3000);
    log('Current Status:', statusResult.response);
    
    if (statusResult.response.includes('Alarm')) {
      log('✅ CONFIRMED: Machine is in ALARM state');
      
      log('\n🔓 Step 2: Unlocking machine with $X...');
      const unlockResult = await sender._sendRawGcode('$X', 5000);
      log('Unlock Result:', unlockResult.response);
      
      // Wait a moment
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      log('\n📍 Step 3: Check status after unlock...');
      const statusAfterUnlock = await sender._sendRawGcode('?', 3000);
      log('Status After Unlock:', statusAfterUnlock.response);
      
      log('\n🏠 Step 4: Homing machine with $H...');
      warn('⚠️  WARNING: Machine will move to home position!');
      
      const homeResult = await sender._sendRawGcode('$H', 30000);
      log('Homing Result:', homeResult.response);
      
      // Wait for homing to complete
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      log('\n📍 Step 5: Check status after homing...');
      const statusAfterHome = await sender._sendRawGcode('?', 3000);
      log('Status After Homing:', statusAfterHome.response);
      
      log('\n🔧 Step 6: Test movement commands...');
      
      // Test G0 command
      log('Testing G0 X1...');
      const g0Result = await sender._sendRawGcode('G0X1', 5000);
      log('G0 Result:', g0Result.response);
      
      // Test G1 command
      log('Testing G1 X0 F100...');
      const g1Result = await sender._sendRawGcode('G1X0F100', 5000);
      log('G1 Result:', g1Result.response);
      
      info('\n✅ ALARM fix complete - movement should now work!');
      
    } else {
      info('ℹ️  Machine is not in ALARM state');
    }
    
  } catch (error) {
    error('❌ Fix failed:', error.message);
  } finally {
    if (sender.isConnected) {
      await sender.disconnect();
    }
  }
}

// Handle command line arguments
const args = process.argv.slice(2);
const portArg = args.find(arg => arg.startsWith('--port='));
const port = portArg ? portArg.split('=')[1] : null;

if (args.includes('--help') || args.includes('-h')) {
  console.log(`
Usage: node alarm-recovery.js [options]

Options:
  --port=<path>    Serial port path (default: from config.json)
  --help, -h       Show this help message

Examples:
  node alarm-recovery.js
  node alarm-recovery.js --port=/dev/tty.usbmodem1101

Description:
  Automatically recovers from GRBL ALARM state by:
  1. Unlocking the machine ($X command)
  2. Homing the machine ($H command)  
  3. Testing movement commands
`);
  process.exit(0);
}

fixAlarm(port).catch(console.error);