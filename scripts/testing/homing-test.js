#!/usr/bin/env node

import { GcodeSender } from '../../core/GcodeSender.js';
import { Config } from '../../core/config.js';
import { log, info, warn, error } from '../../services/logger/index.js';

async function testHoming(portPath = null) {
  const sender = new GcodeSender();
  const config = Config.get();
  
  // Use provided port, config default, or hardcoded fallback
  const port = portPath || config.defaultPort || '/dev/tty.usbmodem1101';
  
  try {
    log('🔍 Connecting to test homing...');
    log(`Using port: ${port}`);
    await sender.connect(port);
    
    log('\n📍 Step 1: Check current status...');
    const statusResult = await sender._sendRawGcode('?', 3000);
    log('Current Status:', statusResult.response);
    
    log('\n🏠 Step 2: Sending homing command ($H)...');
    warn('⚠️  WARNING: Machine will move to home position!');
    
    try {
      const homeResult = await sender._sendRawGcode('$H', 30000); // 30 second timeout for homing
      log('Homing Result:', homeResult.response);
      
      // Wait a moment for homing to complete
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      log('\n📍 Step 3: Check status after homing...');
      const statusAfterHome = await sender._sendRawGcode('?', 3000);
      log('Status After Homing:', statusAfterHome.response);
      
      log('\n🔧 Step 4: Test movement commands after homing...');
      
      // Test G0 command
      log('Testing G0 X1 after homing...');
      const g0Result = await sender._sendRawGcode('G0X1', 5000);
      log('G0 Result:', g0Result.response);
      
      // Test G1 command
      log('Testing G1 X0 F100 (return to origin)...');
      const g1Result = await sender._sendRawGcode('G1X0F100', 5000);
      log('G1 Result:', g1Result.response);
      
      info('\n✅ Homing test complete - movement should now work!');
      
    } catch (homeError) {
      error('❌ Homing failed:', homeError.message);
      
      // Check if it's because machine is already homed or other issue
      log('\n📍 Checking status after homing attempt...');
      const statusCheck = await sender._sendRawGcode('?', 3000);
      log('Status Check:', statusCheck.response);
    }
    
  } catch (error) {
    error('❌ Test failed:', error.message);
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
Usage: node homing-test.js [options]

Options:
  --port=<path>    Serial port path (default: from config.json)
  --help, -h       Show this help message

Examples:
  node homing-test.js
  node homing-test.js --port=/dev/tty.usbmodem1101

Description:
  Tests the homing sequence and verifies movement works afterward:
  1. Check machine status
  2. Send homing command ($H)
  3. Verify homing completed successfully
  4. Test movement commands
`);
  process.exit(0);
}

testHoming(port).catch(console.error);