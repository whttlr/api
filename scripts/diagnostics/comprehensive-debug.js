#!/usr/bin/env node

import { GcodeSender } from '../../core/GcodeSender.js';
import { Config } from '../../core/config.js';

async function comprehensiveAlarmDebug(portPath = null) {
  const sender = new GcodeSender();
  const config = Config.get();
  
  // Use provided port, config default, or hardcoded fallback
  const port = portPath || config.defaultPort || '/dev/tty.usbmodem1101';
  
  try {
    console.log('🔍 COMPREHENSIVE ALARM DEBUGGING');
    console.log('='.repeat(60));
    console.log(`Using port: ${port}`);
    
    // Step 1: Connect and get initial state
    console.log('\n📡 STEP 1: Connecting and checking initial state...');
    await sender.connect(port);
    
    let initialStatus;
    try {
      initialStatus = await sender._sendRawGcode('?', 3000);
      console.log(`Initial Status: ${initialStatus.response}`);
    } catch (error) {
      console.log(`Initial Status Error: ${error.message}`);
      // Extract status from error message if it contains alarm info
      if (error.message.includes('Alarm')) {
        const alarmMatch = error.message.match(/<[^>]+>/);
        if (alarmMatch) {
          initialStatus = { response: alarmMatch[0] };
          console.log(`Extracted Status: ${initialStatus.response}`);
        }
      }
    }
    
    // Step 2: Get GRBL settings to check soft limits and travel distances
    console.log('\n⚙️  STEP 2: Analyzing GRBL settings for soft limits...');
    let settingsResult;
    try {
      settingsResult = await sender._sendRawGcode('$$', 5000);
      console.log('GRBL Settings Response:');
      console.log(settingsResult.response);
    } catch (error) {
      console.log(`Settings query failed: ${error.message}`);
      console.log('⚠️  Cannot retrieve settings while in ALARM state - need to unlock first');
      settingsResult = { response: '' };
    }
    
    // Parse critical settings
    const settings = parseGRBLSettings(settingsResult.response);
    console.log('\n🎯 CRITICAL SETTINGS ANALYSIS:');
    console.log(`Soft Limits Enabled ($20): ${settings.$20 || 'NOT SET'}`);
    console.log(`Hard Limits Enabled ($21): ${settings.$21 || 'NOT SET'}`);
    console.log(`Homing Enabled ($22): ${settings.$22 || 'NOT SET'}`);
    console.log(`X Max Travel ($130): ${settings.$130 || 'NOT SET'} mm`);
    console.log(`Y Max Travel ($131): ${settings.$131 || 'NOT SET'} mm`);
    console.log(`Z Max Travel ($132): ${settings.$132 || 'NOT SET'} mm`);
    
    // Step 3: Check coordinate systems
    console.log('\n📍 STEP 3: Checking coordinate systems...');
    let coordResult;
    try {
      coordResult = await sender._sendRawGcode('$#', 3000);
      console.log('Coordinate Systems:');
      console.log(coordResult.response);
    } catch (error) {
      console.log(`Coordinate systems query failed: ${error.message}`);
      console.log('⚠️  Cannot retrieve coordinates while in ALARM state');
      coordResult = { response: '' };
    }
    
    // Step 4: Attempt unlock sequence with detailed monitoring
    console.log('\n🔓 STEP 4: Testing unlock sequence with monitoring...');
    
    const isInAlarm = initialStatus && (initialStatus.response.includes('Alarm') || initialStatus.response.includes('<Alarm'));
    if (isInAlarm) {
      console.log('Machine is in ALARM state - attempting unlock...');
      
      const unlockResult = await sender._sendRawGcode('$X', 5000);
      console.log(`Unlock command result: ${unlockResult.response}`);
      
      // Wait and check status
      await new Promise(resolve => setTimeout(resolve, 1000));
      const statusAfterUnlock = await sender._sendRawGcode('?', 3000);
      console.log(`Status after unlock: ${statusAfterUnlock.response}`);
      
      // Step 5: Attempt homing with detailed monitoring
      console.log('\n🏠 STEP 5: Testing homing sequence with monitoring...');
      console.log('⚠️  WARNING: Machine will attempt to home!');
      
      try {
        const homeResult = await sender._sendRawGcode('$H', 30000);
        console.log(`Homing command result: ${homeResult.response}`);
        
        // Wait for homing to complete
        await new Promise(resolve => setTimeout(resolve, 3000));
        const statusAfterHome = await sender._sendRawGcode('?', 3000);
        console.log(`Status after homing: ${statusAfterHome.response}`);
        
      } catch (homeError) {
        console.log(`❌ Homing failed: ${homeError.message}`);
        const statusCheck = await sender._sendRawGcode('?', 3000);
        console.log(`Status after failed homing: ${statusCheck.response}`);
      }
    }
    
    // Step 6: Test movement commands with detailed analysis
    console.log('\n🔧 STEP 6: Testing movement commands with detailed analysis...');
    
    // Get current status before movement tests
    const preMovementStatus = await sender._sendRawGcode('?', 3000);
    console.log(`Pre-movement status: ${preMovementStatus.response}`);
    
    // Test small movements first
    const testMovements = [
      { cmd: 'G0 Y0.1', desc: 'Small positive Y movement' },
      { cmd: 'G0 Y-0.1', desc: 'Small negative Y movement' },
      { cmd: 'G0 Y0', desc: 'Return to Y origin' },
      { cmd: 'G0 Y1', desc: 'Medium positive Y movement' },
      { cmd: 'G0 Y-1', desc: 'Medium negative Y movement' },
      { cmd: 'G0 Y0', desc: 'Return to Y origin again' },
      { cmd: 'G0 Y5', desc: 'Large positive Y movement (original failing command)' },
      { cmd: 'G0 Y-5', desc: 'Large negative Y movement (original failing command)' }
    ];
    
    for (const test of testMovements) {
      console.log(`\n  Testing: ${test.cmd} (${test.desc})`);
      
      try {
        const moveResult = await sender._sendRawGcode(test.cmd, 10000);
        console.log(`  ✅ Success: ${moveResult.response}`);
        
        // Check status after each movement
        const statusAfterMove = await sender._sendRawGcode('?', 3000);
        console.log(`  Status after move: ${statusAfterMove.response}`);
        
      } catch (moveError) {
        console.log(`  ❌ Failed: ${moveError.message}`);
        
        // Check status after failed movement
        const statusAfterFail = await sender._sendRawGcode('?', 3000);
        console.log(`  Status after failure: ${statusAfterFail.response}`);
        
        // If we get an alarm, try to identify the specific alarm code
        if (statusAfterFail.response.includes('Alarm')) {
          console.log(`  🚨 ALARM TRIGGERED by ${test.cmd}`);
          
          // Try to get more details about the alarm
          const alarmDetails = parseAlarmCode(statusAfterFail.response);
          if (alarmDetails) {
            console.log(`  🎯 Alarm Code: ${alarmDetails.code} - ${alarmDetails.description}`);
          }
        }
      }
      
      // Small delay between tests
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    // Step 7: Final analysis and recommendations
    console.log('\n📊 STEP 7: FINAL ANALYSIS');
    console.log('='.repeat(60));
    
    // Analyze soft limit violations
    if (settings.$20 === '1' && settings.$131) {
      const yMaxTravel = parseFloat(settings.$131);
      console.log(`\n🎯 SOFT LIMIT ANALYSIS:`);
      console.log(`Y Max Travel Setting: ${yMaxTravel} mm`);
      console.log(`Requested Y5: ${yMaxTravel >= 5 ? '✅ WITHIN LIMITS' : '❌ EXCEEDS LIMITS'}`);
      console.log(`Requested Y-5: ${yMaxTravel >= 5 ? '✅ WITHIN LIMITS' : '❌ EXCEEDS LIMITS'}`);
      
      if (yMaxTravel < 5) {
        console.log(`\n🚨 ROOT CAUSE IDENTIFIED: Y max travel (${yMaxTravel}mm) is less than requested movement (5mm)`);
        console.log(`💡 SOLUTION: Either increase $131 setting or use smaller movements`);
      }
    }
    
    console.log('\n✅ Comprehensive debugging complete');
    
  } catch (error) {
    console.error('❌ Debug failed:', error.message);
  } finally {
    if (sender.isConnected) {
      await sender.disconnect();
    }
  }
}

function parseGRBLSettings(settingsResponse) {
  const settings = {};
  const lines = settingsResponse.split('\n');
  
  for (const line of lines) {
    const match = line.match(/\$(\d+)=([^\s]+)/);
    if (match) {
      settings[`$${match[1]}`] = match[2];
    }
  }
  
  return settings;
}

function parseAlarmCode(statusResponse) {
  const alarmMatch = statusResponse.match(/Alarm:(\d+)/);
  if (!alarmMatch) return null;
  
  const alarmCode = alarmMatch[1];
  const alarmDescriptions = {
    '1': 'Hard limit triggered',
    '2': 'G-code motion target exceeds machine travel',
    '3': 'Reset while in motion',
    '4': 'Probe fail',
    '5': 'Probe fail',
    '6': 'Homing fail',
    '7': 'Homing fail',
    '8': 'Homing fail',
    '9': 'Homing fail'
  };
  
  return {
    code: alarmCode,
    description: alarmDescriptions[alarmCode] || 'Unknown alarm'
  };
}

// Handle command line arguments
const args = process.argv.slice(2);
const portArg = args.find(arg => arg.startsWith('--port='));
const port = portArg ? portArg.split('=')[1] : null;

if (args.includes('--help') || args.includes('-h')) {
  console.log(`
Usage: node comprehensive-debug.js [options]

Options:
  --port=<path>    Serial port path (default: from config.json)
  --help, -h       Show this help message

Examples:
  node comprehensive-debug.js
  node comprehensive-debug.js --port=/dev/tty.usbmodem1101
`);
  process.exit(0);
}

comprehensiveAlarmDebug(port).catch(console.error);