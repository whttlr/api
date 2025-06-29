/**
 * Parse command line arguments
 */

import process from 'process';

function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    port: null,
    command: null,
    file: null,
    interactive: false,
    help: false,
    listPorts: false,
    diagnose: false,
    limits: false,
    shared: false,
    status: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else if (arg === '--port' || arg === '-p') {
      options.port = args[++i];
    } else if (arg === '--list-ports' || arg === '-l') {
      options.listPorts = true;
    } else if (arg === '--interactive' || arg === '-i') {
      options.interactive = true;
    } else if (arg === '--diagnose' || arg === '-d') {
      options.diagnose = true;
    } else if (arg === '--limits') {
      options.limits = true;
    } else if (arg === '--shared' || arg === '-s') {
      options.shared = true;
    } else if (arg === '--status') {
      options.status = true;
    } else if (arg === '--file' || arg === '-f') {
      options.file = args[++i];
    } else if (!options.command) {
      options.command = arg;
    }
  }

  // If no command specified and not listing ports, diagnosing, showing limits, or checking status, enable interactive mode
  if (!options.command && !options.file && !options.listPorts && !options.help && !options.diagnose && !options.limits && !options.status) {
    options.interactive = true;
  }

  return options;
}

export { parseArgs };