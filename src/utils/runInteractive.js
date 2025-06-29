/**
 * Interactive mode
 */

import readline from 'readline';
import process from 'process';
import { Config } from '../cnc/config.js';
import { info, warn, error } from '../lib/logger/LoggerService.js';

// Load configuration
const CONFIG = Config.get();

async function runInteractive(sender, initialPort = null) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: 'gcode> '
  });

  info('\n=== G-code Sender Interactive Mode ===');
  info('Type "help" for available commands, "quit" to exit');
  info('Use "limits" to check machine travel limits and avoid lockups');
  info(`Z-axis limits configured: Min: ${CONFIG.machineLimits.z.min}mm, Max: ${CONFIG.machineLimits.z.max}mm\n`);

  // List available ports first
  try {
    info('Scanning for available serial ports...');
    const ports = await sender.getAvailablePorts();
    
    if (ports.length === 0) {
      warn('No serial ports found. You may need to connect your device first.\n');
    } else {
      info('Available serial ports:');
      ports.forEach(port => {
        const isDefault = port.path === CONFIG.defaultPort ? ' (default)' : '';
        info(`  ${port.path}${isDefault}`);
        if (port.manufacturer) info(`    Manufacturer: ${port.manufacturer}`);
        if (port.serialNumber) info(`    Serial: ${port.serialNumber}`);
      });
      info('');
    }
  } catch (err) {
    error(`Error listing ports: ${err.message}\n`);
  }

  // Auto-connect if port specified
  if (initialPort) {
    try {
      info(`Attempting to connect to specified port: ${initialPort}`);
      await sender.connect(initialPort);
      info(`✅ Connected to ${initialPort} successfully`);
    } catch (err) {
      if (err.message.includes('temporarily unavailable') || err.message.includes('Cannot lock port')) {
        error(`⚠️  Port ${initialPort} is in use by another process.`);
        error(`   Try closing other applications that might be using the port.`);
        error(`   You can still use the 'connect' command to try again later.\n`);
      } else {
        error(`Failed to connect to ${initialPort}: ${err.message}`);
      }
    }
  }

  rl.prompt();

  rl.on('line', async (input) => {
    const line = input.trim();
    
    if (!line) {
      rl.prompt();
      return;
    }

    const [command, ...args] = line.split(' ');

    try {
      switch (command.toLowerCase()) {
        case 'help':
          info(`
Available commands:
  help                  Show this help
  status               Show connection status
  connect <port>       Connect to serial port
  disconnect           Disconnect from current port
  ports                List available ports
  file <path>          Execute G-code from file (e.g., file ./.gcode/example.txt)
  diagnose             Run movement diagnostics
  position             Show current machine position
  limits               Show machine limits and position (IMPORTANT: Check before moving)
  unlock               Send unlock command ($X)
  home                 Send homing command ($H)
  reset                Send soft reset
  stop                 Emergency stop (M112)
  quit, exit           Exit program
  <gcode>              Send G-code command (e.g., G0 X10)

Safety Tips:
  • Always check machine limits with the 'limits' command before moving
  • Z values below ${CONFIG.machineLimits.z.min}mm may cause the machine to lock up
  • Z values above ${CONFIG.machineLimits.z.max}mm may exceed machine limits
  • The system will warn you about potentially unsafe commands
  • Start with small movements and gradually test limits
`);
          break;

        case 'status':
          const status = sender.getStatus();
          info('Status:', status);
          break;

        case 'connect':
          if (!args[0]) {
            info('Usage: connect <port>');
            break;
          }
          await sender.connect(args[0]);
          break;

        case 'disconnect':
          await sender.disconnect();
          break;

        case 'ports':
          const ports = await sender.getAvailablePorts();
          info('Available ports:');
          ports.forEach(port => {
            info(`  ${port.path} (${port.manufacturer || 'Unknown'})`);
          });
          break;

        case 'diagnose':
          if (!sender.isConnected) {
            warn('❌ Must be connected to machine before running diagnostics');
            break;
          }
          info('🔍 Running comprehensive movement diagnostics...');
          await sender.runMovementDiagnostics();
          break;

        case 'limits':
          if (!sender.isConnected) {
            warn('❌ Must be connected to machine before checking limits');
            break;
          }
          info('🎯 Retrieving machine limits and position...');
          const limitsInfo = await sender.getLimitsInfo();
          sender.displayLimitsInfo(limitsInfo);
          break;

        case 'position':
          if (!sender.isConnected) {
            warn('❌ Must be connected to machine before checking position');
            break;
          }
          info('📍 Retrieving current machine position...');
          try {
            // Send status query to get current position
            const statusResult = await sender._sendRawGcode('?', 3000);
            const status = sender.parseMachineStatus(statusResult.response);
            
            info('\n============================================');
            info('           📍 CURRENT POSITION 📍');
            info('============================================');
            
            if (status && status.position) {
              const mPos = status.position;
              const wPos = status.workPosition || status.position;
              
              info(`\n🔹 MACHINE COORDINATES:`);
              info(`   X: ${mPos.x.toFixed(3)}mm`);
              info(`   Y: ${mPos.y.toFixed(3)}mm`);
              info(`   Z: ${mPos.z}mm`);
              
              info(`\n🔸 WORK COORDINATES:`);
              info(`   X: ${wPos.x.toFixed(3)}mm`);
              info(`   Y: ${wPos.y.toFixed(3)}mm`);
              info(`   Z: ${wPos.z}mm`);
              
              info(`\n🔄 OFFSET (Work - Machine):`);
              info(`   X: ${(wPos.x - mPos.x).toFixed(3)}mm`);
              info(`   Y: ${(wPos.y - mPos.y).toFixed(3)}mm`);
              info(`   Z: ${(wPos.z, mPos.z)}mm`);
              
              info('\n📊 MACHINE STATE:');
              info(`   ${status.state}`);
              
              info('\n============================================');
            } else {
              warn('❌ Unable to retrieve position information');
            }
          } catch (err) {
            error(`❌ Error retrieving position: ${err.message}`);
          }
          break;

        case 'unlock':
          const unlockResult = await sender.sendGcode('$X');
          info(`✓ Unlock command sent: ${unlockResult.response}`);
          break;

        case 'home':
          const homeResult = await sender.sendGcode('$H');
          info(`✓ Homing command sent: ${homeResult.response}`);
          break;

        case 'reset':
          const resetResult = await sender.sendGcode('\x18');
          info(`✓ Soft reset sent: ${resetResult.response}`);
          break;

        case 'stop':
          await sender.emergencyStop();
          break;

        case 'file':
          if (!args[0]) {
            info('Usage: file <path>');
            info('Example: file ./.gcode/example.txt');
            break;
          }
          
          if (!sender.isConnected) {
            warn('❌ Must be connected to machine before executing files');
            break;
          }
          
          try {
            info(`📄 Executing G-code file: ${args[0]}`);
            const result = await sender.executeGcodeFile(args[0]);
            info(`✓ File execution completed: ${args[0]}`);
            info(`  Total commands: ${result.totalCommands}`);
            info(`  Successful: ${result.results.filter(r => r.success).length}`);
            info(`  Failed: ${result.results.filter(r => !r.success).length}`);
          } catch (fileError) {
            error(`✗ File execution error: ${fileError.message}`);
          }
          break;

        case 'quit':
        case 'exit':
          if (sender.isConnected) {
            await sender.disconnect();
          }
          rl.close();
          return;

        default:
          // Treat as G-code command
          try {
            const result = await sender.sendGcode(line);
            info(`✓ ${result.response} (${result.duration}ms)`);
          } catch (cmdError) {
            error(`✗ Command Error: ${cmdError.message}`);
          } finally {
            // Always prompt for next command
            setTimeout(() => rl.prompt(), 100);
          }
          return; // Return early to avoid double prompting
      }
    } catch (err) {
      error(`✗ Error: ${err.message}`);
    }

    // Prompt for next command with a small delay to ensure output is complete
    setTimeout(() => rl.prompt(), 100);
  });

  // Prevent accidental closing
  rl.on('close', () => {
    info('\nGoodbye!');
    process.exit(0);
  });
  
  // Force the prompt to appear initially
  setTimeout(() => {
    rl.prompt();
    
    // Add a message to show available commands
    info('\nTip: Type "help" to see available commands or "ports" to list available ports');
    rl.prompt();
  }, 500);
}

export { runInteractive };